import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { contentApiError } from "@/modules/content-pipeline/api";

const schema = z.object({ name: z.string().min(2).max(120), baseUrl: z.string().url(), allowedDomains: z.array(z.string().min(1)).min(1).max(20), allowedPathPrefixes: z.array(z.string()).max(50).default([]), licenseId: z.string().uuid(), rateLimitPerMinute: z.number().int().min(1).max(120).default(10), defaultAuthor: z.string().max(200).optional(), approved: z.boolean().default(false), enabled: z.boolean().default(false) });

export async function GET() { await requireSystemAdmin(); return NextResponse.json({ sources: await db.importSource.findMany({ include: { license: true }, orderBy: { createdAt: "desc" } }) }); }
export async function POST(request: Request) {
  const actor = await requireSystemAdmin();
  try {
    const input = schema.parse(await request.json()); const base = new URL(input.baseUrl);
    if (base.protocol !== "https:" || base.username || base.password) throw new Error("IMPORT_HTTPS_REQUIRED");
    const license = await db.contentLicense.findUnique({ where: { id: input.licenseId } }); if (!license) throw new Error("CONTENT_LICENSE_NOT_FOUND");
    if ((input.approved || input.enabled) && (["UNKNOWN", "RESTRICTED"].includes(license.type) || !license.publicationAllowed)) throw new Error("IMPORT_LICENSE_NOT_APPROVABLE");
    const domains = [...new Set(input.allowedDomains.map((domain) => domain.trim().toLowerCase()))];
    if (domains.some((domain) => !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(domain))) throw new Error("IMPORT_DOMAIN_INVALID");
    const { defaultAuthor, ...sourceInput } = input;
    const source = await db.importSource.create({ data: { ...sourceInput, baseUrl: base.origin, allowedDomains: domains, configuration: { defaultAuthor: defaultAuthor?.trim() || null }, createdByUserId: actor.id } });
    await db.auditLog.create({ data: { actorUserId: actor.id, action: "IMPORT_SOURCE_CREATED", resourceType: "ImportSource", resourceId: source.id, metadata: { approved: source.approved, enabled: source.enabled } } });
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) { return contentApiError(error); }
}
