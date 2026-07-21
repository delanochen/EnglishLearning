import { Worker, type Job } from "bullmq";
import { db } from "@/lib/db";
import { CONTENT_QUEUE_NAME, contentJobQueue, redisConnection } from "./bullmq";
import type { ContentQueueMessage } from "./queue";
import { prepareContentJob, processNextContentItem } from "./processor";
import { processNextImportItem } from "./importer";

const integer = (value: string | undefined, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.parseInt(value ?? "", 10) || fallback));

export const workerSettings = () => ({
  concurrency: integer(process.env.CONTENT_WORKER_CONCURRENCY, 2, 1, 20),
  rateMax: integer(process.env.CONTENT_WORKER_RATE_MAX, 20, 1, 1_000),
  rateDuration: integer(process.env.CONTENT_WORKER_RATE_DURATION_MS, 60_000, 1_000, 3_600_000),
  lockDuration: integer(process.env.CONTENT_WORKER_LOCK_MS, 120_000, 30_000, 1_800_000),
});

async function processQueueJob(job: Job<ContentQueueMessage>) {
  const current = await db.contentGenerationJob.findUnique({ where: { id: job.data.jobId } });
  if (!current || current.status !== "PROCESSING") return { skipped: true, status: current?.status ?? "MISSING" };
  if (current.type !== "PUBLIC_RESOURCE_IMPORT") await prepareContentJob(current.id);
  const result = current.type === "PUBLIC_RESOURCE_IMPORT" ? await processNextImportItem(current.id) : await processNextContentItem(current.id);
  const refreshed = await db.contentGenerationJob.findUnique({ where: { id: current.id } });
  if (result.processed && refreshed?.status === "PROCESSING") {
    await contentJobQueue().enqueue({ jobId: current.id, priority: current.priority });
  }
  return result;
}

export async function recoverProcessingJobs() {
  await db.contentGenerationItem.updateMany({
    where: { status: "PROCESSING", job: { status: "PROCESSING" } },
    data: { status: "PENDING", startedAt: null },
  });
  const jobs = await db.contentGenerationJob.findMany({
    where: { status: "PROCESSING", type: { in: ["VOCABULARY_GENERATION", "READING_GENERATION", "GRAMMAR_GENERATION", "SCENARIO_GENERATION", "PUBLIC_RESOURCE_IMPORT"] } },
    select: { id: true, priority: true },
  });
  const queue = contentJobQueue();
  await Promise.all(jobs.map((job) => queue.enqueue({ jobId: job.id, priority: job.priority })));
  return jobs.length;
}

export function startContentWorker() {
  const settings = workerSettings();
  return new Worker<ContentQueueMessage>(CONTENT_QUEUE_NAME, processQueueJob, {
    connection: redisConnection(),
    concurrency: settings.concurrency,
    limiter: { max: settings.rateMax, duration: settings.rateDuration },
    lockDuration: settings.lockDuration,
  });
}
