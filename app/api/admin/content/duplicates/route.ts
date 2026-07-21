import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";

export async function GET(request: Request) {
  await requireSystemAdmin();
  const input = z.object({ status: z.enum(["PENDING", "CONFIRMED", "DISMISSED", "MERGED"]).optional(), limit: z.coerce.number().int().min(1).max(200).default(100) }).parse(Object.fromEntries(new URL(request.url).searchParams));
  const duplicates = await db.contentDuplicateMatch.findMany({ where: { status: input.status }, orderBy: [{ score: "desc" }, { createdAt: "desc" }], take: input.limit });
  return NextResponse.json({ duplicates });
}
