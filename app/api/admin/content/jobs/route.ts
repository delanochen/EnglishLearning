import { NextResponse } from "next/server";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { contentApiError } from "@/modules/content-pipeline/api";
import { createContentJob, listContentJobs } from "@/modules/content-pipeline/jobs";
import { createContentJobSchema, listContentJobsSchema } from "@/modules/content-pipeline/schemas";

export async function GET(request: Request) {
  await requireSystemAdmin();
  try {
    const url = new URL(request.url);
    const input = listContentJobsSchema.parse(Object.fromEntries(url.searchParams));
    return NextResponse.json({ jobs: await listContentJobs(input) });
  } catch (error) { return contentApiError(error); }
}

export async function POST(request: Request) {
  const actor = await requireSystemAdmin();
  try {
    const input = createContentJobSchema.parse(await request.json());
    return NextResponse.json({ job: await createContentJob(input, actor.id) }, { status: 201 });
  } catch (error) { return contentApiError(error); }
}
