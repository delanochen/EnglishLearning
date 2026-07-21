export type ContentQueueMessage = { jobId: string; priority: number };

export interface ContentJobQueue {
  enqueue(message: ContentQueueMessage): Promise<void>;
}

// Stage 1 deliberately uses PostgreSQL as the queue. A worker claims PENDING rows
// with SELECT ... FOR UPDATE SKIP LOCKED. BullMQ can implement this interface later.
export class DatabaseContentJobQueue implements ContentJobQueue {
  async enqueue() { /* The persisted PENDING job is the queue message. */ }
}
