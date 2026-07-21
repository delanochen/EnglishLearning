import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { contentApiError } from "@/modules/content-pipeline/api";
import { createPublicImportJob } from "@/modules/content-pipeline/imports";

const schema = z.object({ importSourceId: z.string().uuid(), urls: z.array(z.string().url()).min(1).max(100), priority: z.number().int().min(1).max(1_000).default(100), maxRetries: z.number().int().min(0).max(3).default(1) });
export async function POST(request: Request) {
  const actor = await requireSystemAdmin();
  try { return NextResponse.json(await createPublicImportJob(schema.parse(await request.json()), actor.id), { status: 201 }); }
  catch (error) { return contentApiError(error); }
}
