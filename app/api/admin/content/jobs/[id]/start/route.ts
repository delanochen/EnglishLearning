import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { contentApiError } from "@/modules/content-pipeline/api";
import { transitionContentJob } from "@/modules/content-pipeline/jobs";
import { isSupportedGenerationType } from "@/modules/content-pipeline/generator";
import { prepareContentJob } from "@/modules/content-pipeline/processor";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireSystemAdmin();
  try {
    const id = z.string().uuid().parse((await params).id);
    const job = await transitionContentJob(id, "PROCESSING", actor.id, "CONTENT_JOB_STARTED");
    if (isSupportedGenerationType(job.type)) await prepareContentJob(id);
    return NextResponse.json({ job });
  } catch (error) {
    return contentApiError(error);
  }
}
