import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { contentApiError } from "./api";
import { transitionContentJob } from "./jobs";
import type { PipelineStatus } from "./state-machine";

export function contentJobCommand(to: PipelineStatus, event: string) {
  return async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
    const actor = await requireSystemAdmin();
    try {
      const id = z.string().uuid().parse((await params).id);
      return NextResponse.json({ job: await transitionContentJob(id, to, actor.id, event) });
    } catch (error) { return contentApiError(error); }
  };
}
