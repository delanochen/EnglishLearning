import { NextResponse } from "next/server";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { listPendingReviews } from "@/modules/content-pipeline/reviews";

export async function GET() {
  await requireSystemAdmin();
  return NextResponse.json({ reviews: await listPendingReviews() });
}
