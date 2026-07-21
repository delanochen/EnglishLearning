import { contentJobQueue } from "../modules/content-pipeline/bullmq";
import { recoverProcessingJobs, startContentWorker } from "../modules/content-pipeline/worker";
import { db } from "../lib/db";

async function main() {
  const worker = startContentWorker();
  worker.on("completed", (job) => console.log(`[content-worker] completed ${job.id}`));
  worker.on("failed", (job, error) => console.error(`[content-worker] failed ${job?.id ?? "unknown"}: ${error.message}`));
  worker.on("error", (error) => console.error(`[content-worker] error: ${error.message}`));

  const recovered = await recoverProcessingJobs();
  console.log(`[content-worker] ready; recovered ${recovered} processing job(s)`);

  let stopping = false;
  async function shutdown(signal: string) {
    if (stopping) return;
    stopping = true;
    console.log(`[content-worker] ${signal}; closing gracefully`);
    await worker.close();
    await contentJobQueue().close();
    await db.$disconnect();
    process.exit(0);
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch(async (error) => {
  console.error(`[content-worker] startup failed: ${error instanceof Error ? error.message : "UNKNOWN"}`);
  await db.$disconnect();
  process.exit(1);
});
