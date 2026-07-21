import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { contentApiError } from "@/modules/content-pipeline/api";
import { decideContentReview } from "@/modules/content-pipeline/reviews";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireSystemAdmin();
  try {
    const id = z.string().uuid().parse((await params).id);
    const body = await request.json().catch(() => ({}));
    const reason = z.object({ reason: z.string().min(2).max(2_000) }).parse(body).reason;
    return NextResponse.json({ review: await decideContentReview(id, "REJECTED", actor.id, reason) });
  } catch (error) { return contentApiError(error); }
}
