import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";
export const dynamic = "force-dynamic";
export function GET() { return NextResponse.json({ status: "ok", service: "homelingua", version: APP_VERSION, timestamp: new Date().toISOString() }); }
