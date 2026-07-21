import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";
import { evaluatePublicationLicense } from "./license-policy";
import { assertPublicDns, cleanImportedText, robotsAllows, validateImportUrl } from "./import-security";
import { contentHash, normalizeContentText } from "./quality";
import { claimNextItem } from "./processor";

const limiters = new Map<string, FixedWindowRateLimiter>();
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["text/plain", "text/html", "application/json", "application/ld+json"];

function limiter(sourceId: string, perMinute: number) {
  let value = limiters.get(sourceId); if (!value) { value = new FixedWindowRateLimiter(Math.max(1, Math.min(120, perMinute)), 60_000); limiters.set(sourceId, value); }
  return value;
}

async function safeFetch(startUrl: URL, policy: Parameters<typeof validateImportUrl>[1], accept: string, maxRedirects = 3) {
  let current = startUrl;
  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    current = validateImportUrl(current.toString(), policy); await assertPublicDns(current);
    const response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(30_000), headers: { "User-Agent": "HomeLinguaContentImporter/1.0 (+licensed educational import)", Accept: accept } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location"); if (!location || redirect === maxRedirects) throw new Error("IMPORT_REDIRECT_REJECTED");
      current = new URL(location, current); continue;
    }
    return { response, finalUrl: current };
  }
  throw new Error("IMPORT_TOO_MANY_REDIRECTS");
}

async function verifyRobots(url: URL, source: { id: string; baseUrl: string; allowedDomains: string[]; allowedPathPrefixes: string[] }) {
  const robotsUrl = new URL("/robots.txt", url.origin);
  try {
    const { response } = await safeFetch(robotsUrl, { baseUrl: source.baseUrl, allowedDomains: source.allowedDomains, allowedPathPrefixes: [] }, "text/plain", 1);
    const declaredLength = Number(response.headers.get("content-length") ?? 0); if (declaredLength > 500_000) throw new Error("IMPORT_ROBOTS_TOO_LARGE");
    const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.byteLength > 500_000) throw new Error("IMPORT_ROBOTS_TOO_LARGE");
    const allowed = response.status === 404 ? true : response.ok && robotsAllows(new TextDecoder().decode(bytes), url.pathname);
    await db.importSource.update({ where: { id: source.id }, data: { robotsCheckedAt: new Date(), robotsAllowed: allowed } });
    if (!allowed) throw new Error("IMPORT_ROBOTS_DISALLOWED");
  } catch (error) {
    await db.importSource.update({ where: { id: source.id }, data: { robotsCheckedAt: new Date(), robotsAllowed: false } });
    if (error instanceof Error && error.message === "IMPORT_ROBOTS_DISALLOWED") throw error;
    throw new Error("IMPORT_ROBOTS_UNVERIFIED");
  }
}

export async function importPublicResource(importBatchId: string, rawUrl: string) {
  const batch = await db.importBatch.findUnique({ where: { id: importBatchId }, include: { generationJob: { select: { createdByUserId: true } }, importSource: { include: { license: true } } } });
  if (!batch) throw new Error("IMPORT_BATCH_NOT_FOUND");
  const source = batch.importSource;
  if (!source.enabled || !source.approved) throw new Error("IMPORT_SOURCE_NOT_APPROVED");
  const policy = { baseUrl: source.baseUrl, allowedDomains: source.allowedDomains, allowedPathPrefixes: source.allowedPathPrefixes };
  const url = validateImportUrl(rawUrl, policy); await assertPublicDns(url); await verifyRobots(url, source);
  if (!limiter(source.id, source.rateLimitPerMinute).check(source.id).allowed) throw new Error("IMPORT_SOURCE_RATE_LIMIT");
  const { response, finalUrl } = await safeFetch(url, policy, ALLOWED_TYPES.join(", "));
  if (!response.ok) throw new Error(`IMPORT_HTTP_${response.status}`);
  const declaredLength = Number(response.headers.get("content-length") ?? 0); if (declaredLength > MAX_BYTES) throw new Error("IMPORT_RESPONSE_TOO_LARGE");
  const contentType = (response.headers.get("content-type") ?? "text/plain").split(";")[0].toLowerCase();
  if (!ALLOWED_TYPES.includes(contentType)) throw new Error("IMPORT_CONTENT_TYPE_FORBIDDEN");
  const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.byteLength > MAX_BYTES) throw new Error("IMPORT_RESPONSE_TOO_LARGE");
  const rawContent = new TextDecoder("utf-8", { fatal: true }).decode(bytes); const cleanedContent = cleanImportedText(rawContent, contentType);
  if (cleanedContent.length < 20) throw new Error("IMPORT_CONTENT_EMPTY_AFTER_CLEANING");
  const originalHash = createHash("sha256").update(bytes).digest("hex"); const normalizedHash = contentHash(normalizeContentText(cleanedContent));
  const duplicate = await db.importedRawContent.findFirst({ where: { normalizedHash }, select: { id: true } });
  const configuration = source.configuration && typeof source.configuration === "object" && !Array.isArray(source.configuration) ? source.configuration as Record<string, unknown> : {};
  const author = typeof configuration.defaultAuthor === "string" ? configuration.defaultAuthor.trim() : "";
  const attributionText = `${author ? `${author} · ` : ""}${source.name} · ${finalUrl.toString()} · ${source.license.name}`;
  const licenseDecision = evaluatePublicationLicense({ type: source.license.type, publicationAllowed: source.license.publicationAllowed, requiresAttribution: source.license.requiresAttribution, attributionText });
  const status = duplicate || !licenseDecision.allowed ? "REVIEW_REQUIRED" : "DRAFT";
  const lastModified = response.headers.get("last-modified"); const published = lastModified && !Number.isNaN(Date.parse(lastModified)) ? new Date(lastModified) : null;
  const row = await db.importedRawContent.create({ data: {
    importBatchId, sourceUrl: finalUrl.toString(), author: author || null, originalPublishedAt: published, licenseId: source.licenseId, rawContent, cleanedContent, originalHash, normalizedHash, status,
    errorMessage: duplicate ? `DUPLICATE_RAW_CONTENT:${duplicate.id}` : licenseDecision.reason,
    metadata: { contentType, byteLength: bytes.byteLength, sourceName: source.name, licenseType: source.license.type, licenseUrl: source.license.url, attributionText, allowsModification: source.license.allowsModification, requiresAttribution: source.license.requiresAttribution, requiresShareAlike: source.license.requiresShareAlike, retrievedAt: new Date().toISOString() },
  } });
  await db.auditLog.create({ data: { actorUserId: batch.generationJob?.createdByUserId, action: "PUBLIC_RESOURCE_IMPORTED", resourceType: "ImportedRawContent", resourceId: row.id, metadata: { sourceId: source.id, licenseType: source.license.type, licenseAllowed: licenseDecision.allowed, duplicate: Boolean(duplicate), sourceUrl: finalUrl.toString() } } });
  return { row, duplicateId: duplicate?.id ?? null, licenseDecision };
}

export async function processNextImportItem(jobId: string) {
  const job = await db.contentGenerationJob.findUnique({ where: { id: jobId } });
  if (!job || job.type !== "PUBLIC_RESOURCE_IMPORT") throw new Error("IMPORT_JOB_NOT_FOUND");
  if (job.status !== "PROCESSING") return { processed: false, reason: "JOB_NOT_PROCESSING" };
  const item = await claimNextItem(jobId); if (!item) return { processed: false, reason: "NO_PENDING_ITEMS" };
  const input = item.input && typeof item.input === "object" && !Array.isArray(item.input) ? item.input as Record<string, unknown> : {};
  try {
    const result = await importPublicResource(String(input.importBatchId ?? ""), String(input.url ?? ""));
    const itemStatus = result.row.status === "DRAFT" ? "DRAFT" : "REVIEW_REQUIRED";
    await db.$transaction(async (tx) => {
      await tx.contentGenerationItem.update({ where: { id: item.id }, data: { status: itemStatus, contentType: "ImportedRawContent", contentId: result.row.id, originalHash: result.row.originalHash, normalizedHash: result.row.normalizedHash, output: { rawContentId: result.row.id, duplicateId: result.duplicateId, license: result.licenseDecision } as Prisma.InputJsonValue, finishedAt: new Date() } });
      await tx.contentGenerationJob.update({ where: { id: jobId }, data: { completedItems: { increment: 1 }, currentProgress: ((job.completedItems + job.failedItems + 1) / job.totalItems) * 100 } });
      if (item.batchId) await tx.contentGenerationBatch.update({ where: { id: item.batchId }, data: { completedItems: { increment: 1 } } });
      await tx.importBatch.update({ where: { id: String(input.importBatchId) }, data: { processedItems: { increment: 1 } } });
    });
    await finalizeImportJob(jobId, String(input.importBatchId)); return { processed: true, itemId: item.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "IMPORT_FAILED"; const retry = item.retryCount < job.maxRetries;
    await db.$transaction(async (tx) => {
      await tx.contentGenerationItem.update({ where: { id: item.id }, data: { status: retry ? "PENDING" : "FAILED", retryCount: { increment: 1 }, errorCode: message.split(":", 1)[0], errorMessage: message, finishedAt: retry ? null : new Date() } });
      if (!retry) { await tx.contentGenerationJob.update({ where: { id: jobId }, data: { failedItems: { increment: 1 } } }); await tx.importBatch.update({ where: { id: String(input.importBatchId) }, data: { failedItems: { increment: 1 } } }); }
    });
    await finalizeImportJob(jobId, String(input.importBatchId)); return { processed: true, itemId: item.id, error: message };
  }
}

async function finalizeImportJob(jobId: string, batchId: string) {
  const job = await db.contentGenerationJob.findUnique({ where: { id: jobId } }); if (!job || job.completedItems + job.failedItems < job.totalItems) return;
  const reviews = await db.contentGenerationItem.count({ where: { jobId, status: "REVIEW_REQUIRED" } }); const status = job.failedItems || reviews ? "REVIEW_REQUIRED" : "DRAFT";
  await db.$transaction([db.contentGenerationJob.update({ where: { id: jobId }, data: { status, currentProgress: 100, finishedAt: new Date() } }), db.contentGenerationBatch.updateMany({ where: { jobId }, data: { status, finishedAt: new Date() } }), db.importBatch.update({ where: { id: batchId }, data: { status, finishedAt: new Date() } })]);
}
