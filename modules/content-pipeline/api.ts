import { NextResponse } from "next/server";

export function contentApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "CONTENT_PIPELINE_ERROR";
  if (message === "CONTENT_JOB_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
  if (message.startsWith("INVALID_JOB_TRANSITION") || message === "CONTENT_JOB_CONCURRENT_UPDATE") return NextResponse.json({ error: message }, { status: 409 });
  return NextResponse.json({ error: message }, { status: 400 });
}
