import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { contentApiError } from "@/modules/content-pipeline/api";
import { ensureInitializationPlan, initializationStatus, startInitializationJobs } from "@/modules/content-pipeline/initialization";

export async function GET() { await requireSystemAdmin(); return NextResponse.json(await initializationStatus()); }
export async function POST(request: Request) {
  const actor = await requireSystemAdmin();
  try {
    const input = z.object({ action: z.enum(["PLAN", "START"]), confirmation: z.string().optional() }).parse(await request.json());
    if (input.action === "PLAN") return NextResponse.json(await ensureInitializationPlan({ actorUserId: actor.id }));
    if (input.confirmation !== "START") throw new Error("INITIALIZATION_CONFIRMATION_REQUIRED");
    return NextResponse.json({ started: await startInitializationJobs(actor.id) });
  } catch (error) { return contentApiError(error); }
}
