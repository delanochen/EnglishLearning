import { access, constants } from "node:fs/promises";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export async function GET() {
  const checks: Record<string, string> = {};
  try { await db.$queryRaw`SELECT 1`; checks.database = "ok"; } catch { checks.database = "unavailable"; }
  for (const [name, path] of Object.entries({ uploads: process.env.UPLOAD_DIR ?? "/app/uploads", logs: process.env.LOG_DIR ?? "/app/logs" })) {
    try { await access(path, constants.W_OK); checks[name] = "ok"; } catch { checks[name] = "not-writable"; }
  }
  const ok = Object.values(checks).every((v) => v === "ok");
  return NextResponse.json({ status: ok ? "ready" : "not-ready", checks }, { status: ok ? 200 : 503 });
}
