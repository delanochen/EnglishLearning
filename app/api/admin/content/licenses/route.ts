import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { contentApiError } from "@/modules/content-pipeline/api";

const schema = z.object({ type: z.enum(["PUBLIC_DOMAIN", "CC0", "CC_BY", "CC_BY_SA", "GOVERNMENT_OPEN_DATA", "CUSTOM_ALLOWED", "UNKNOWN", "RESTRICTED"]), name: z.string().min(2).max(120), url: z.string().url().nullable().optional(), allowsModification: z.boolean().default(false), allowsCommercialUse: z.boolean().default(false), requiresAttribution: z.boolean().default(false), requiresShareAlike: z.boolean().default(false), publicationAllowed: z.boolean().default(false), notes: z.string().max(2_000).optional() });
export async function GET() { await requireSystemAdmin(); return NextResponse.json({ licenses: await db.contentLicense.findMany({ orderBy: [{ publicationAllowed: "desc" }, { name: "asc" }] }) }); }
export async function POST(request: Request) {
  const actor = await requireSystemAdmin();
  try {
    const input = schema.parse(await request.json());
    if (["UNKNOWN", "RESTRICTED"].includes(input.type) && input.publicationAllowed) throw new Error("LICENSE_PUBLICATION_FORBIDDEN");
    const license = await db.contentLicense.create({ data: input });
    await db.auditLog.create({ data: { actorUserId: actor.id, action: "CONTENT_LICENSE_CREATED", resourceType: "ContentLicense", resourceId: license.id, metadata: { type: license.type, publicationAllowed: license.publicationAllowed } } });
    return NextResponse.json({ license }, { status: 201 });
  } catch (error) { return contentApiError(error); }
}
