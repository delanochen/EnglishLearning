import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { contentApiError } from "@/modules/content-pipeline/api";
import { contentJobQueue } from "@/modules/content-pipeline/bullmq";
import { retryFailedContentJob } from "@/modules/content-pipeline/jobs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireSystemAdmin();
  try {
    const id = z.string().uuid().parse((await params).id);
    const job = await retryFailedContentJob(id, actor.id);
    await contentJobQueue().enqueue({ jobId: id, priority: job.priority });
    return NextResponse.json({ job });
  } catch (error) {
    return contentApiError(error);
  }
}
