import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";

export async function GET(request: Request) {
  await requireSystemAdmin();
  const input = z.object({ passed: z.enum(["true", "false"]).optional(), limit: z.coerce.number().int().min(1).max(200).default(100) }).parse(Object.fromEntries(new URL(request.url).searchParams));
  const reports = await db.contentQualityReport.findMany({ where: { passed: input.passed === undefined ? undefined : input.passed === "true" }, orderBy: { createdAt: "desc" }, take: input.limit });
  return NextResponse.json({ reports });
}
