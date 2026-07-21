import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { getContentJob } from "@/modules/content-pipeline/jobs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSystemAdmin();
  const id = z.string().uuid().parse((await params).id);
  const job = await getContentJob(id);
  return job ? NextResponse.json({ job }) : NextResponse.json({ error: "CONTENT_JOB_NOT_FOUND" }, { status: 404 });
}
