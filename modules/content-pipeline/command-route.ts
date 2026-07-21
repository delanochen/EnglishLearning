import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { contentApiError } from "./api";
import { transitionContentJob } from "./jobs";
import { contentJobQueue } from "./bullmq";
import type { PipelineStatus } from "./state-machine";

export function contentJobCommand(to: PipelineStatus, event: string, enqueue = false) {
  return async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
    const actor = await requireSystemAdmin();
    try {
      const id = z.string().uuid().parse((await params).id);
      const job = await transitionContentJob(id, to, actor.id, event);
      if (enqueue) await contentJobQueue().enqueue({ jobId: id, priority: job.priority });
      return NextResponse.json({ job });
    } catch (error) { return contentApiError(error); }
  };
}
