import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { contentJobQueue } from "./bullmq";
import { validateImportUrl } from "./import-security";

export async function createPublicImportJob(input: { importSourceId: string; urls: string[]; priority: number; maxRetries: number }, actorUserId: string) {
  const source = await db.importSource.findUnique({ where: { id: input.importSourceId }, include: { license: true } });
  if (!source) throw new Error("IMPORT_SOURCE_NOT_FOUND");
  if (!source.enabled || !source.approved) throw new Error("IMPORT_SOURCE_NOT_APPROVED");
  const urls = [...new Set(input.urls.map((url) => validateImportUrl(url, source).toString()))];
  if (!urls.length) throw new Error("IMPORT_URLS_REQUIRED");
  const result = await db.$transaction(async (tx) => {
    const job = await tx.contentGenerationJob.create({ data: { type: "PUBLIC_RESOURCE_IMPORT", status: "PROCESSING", totalItems: urls.length, priority: input.priority, maxRetries: input.maxRetries, createdByUserId: actorUserId, startedAt: new Date(), configuration: { importSourceId: source.id }, logs: [{ at: new Date().toISOString(), event: "PUBLIC_IMPORT_CREATED" }] } });
    const importBatch = await tx.importBatch.create({ data: { importSourceId: source.id, generationJobId: job.id, status: "PROCESSING", totalItems: urls.length, startedAt: new Date() } });
    const generationBatch = await tx.contentGenerationBatch.create({ data: { jobId: job.id, sequence: 1, status: "PROCESSING", totalItems: urls.length, startedAt: new Date() } });
    await tx.contentGenerationItem.createMany({ data: urls.map((url, index) => ({ jobId: job.id, batchId: generationBatch.id, sequence: index + 1, contentType: "ImportedRawContent", input: { url, importBatchId: importBatch.id } as Prisma.InputJsonValue })) });
    await tx.auditLog.create({ data: { actorUserId, action: "PUBLIC_RESOURCE_IMPORT_CREATED", resourceType: "ImportBatch", resourceId: importBatch.id, metadata: { sourceId: source.id, count: urls.length } } });
    return { job, importBatch };
  });
  await contentJobQueue().enqueue({ jobId: result.job.id, priority: result.job.priority });
  return result;
}
