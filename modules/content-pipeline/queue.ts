export type ContentQueueMessage = { jobId: string; priority: number };

export interface ContentJobQueue {
  enqueue(message: ContentQueueMessage): Promise<void>;
  close?(): Promise<void>;
}

// PostgreSQL remains the durable source of truth and the safe fallback when Redis
// is intentionally disabled for local development.
export class DatabaseContentJobQueue implements ContentJobQueue {
  async enqueue() { /* The persisted PENDING job is the queue message. */ }
}
