import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { contentApiError } from "@/modules/content-pipeline/api";
import { decideContentReview } from "@/modules/content-pipeline/reviews";

const schema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100), decision: z.enum(["APPROVED", "REJECTED"]), reason: z.string().max(2_000).optional() });

export async function POST(request: Request) {
  const actor = await requireSystemAdmin();
  try {
    const input = schema.parse(await request.json());
    if (input.decision === "REJECTED" && !input.reason?.trim()) throw new Error("REJECTION_REASON_REQUIRED");
    const reviews = [];
    for (const id of input.ids) reviews.push(await decideContentReview(id, input.decision, actor.id, input.reason));
    return NextResponse.json({ reviews });
  } catch (error) { return contentApiError(error); }
}
