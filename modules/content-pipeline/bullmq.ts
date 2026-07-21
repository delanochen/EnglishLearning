import { Queue, type ConnectionOptions } from "bullmq";
import type { ContentJobQueue, ContentQueueMessage } from "./queue";

export const CONTENT_QUEUE_NAME = "homelingua-content";

export function redisConnection(): ConnectionOptions {
  return {
    host: process.env.REDIS_HOST ?? "redis",
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB ?? 0),
    maxRetriesPerRequest: null,
  };
}

export class BullContentJobQueue implements ContentJobQueue {
  private readonly queue = new Queue<ContentQueueMessage>(CONTENT_QUEUE_NAME, {
    connection: redisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
    },
  });

  async enqueue(message: ContentQueueMessage) {
    await this.queue.add("generate-item", message, {
      jobId: `${message.jobId}-${Date.now()}-${crypto.randomUUID()}`,
      priority: message.priority,
    });
  }

  async close() {
    await this.queue.close();
  }
}

let sharedQueue: BullContentJobQueue | undefined;

export function contentJobQueue() {
  sharedQueue ??= new BullContentJobQueue();
  return sharedQueue;
}
