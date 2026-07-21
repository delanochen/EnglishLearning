export const contentJobTransitions = {
  PENDING: ["PROCESSING", "CANCELED"],
  PROCESSING: ["PAUSED", "DRAFT", "REVIEW_REQUIRED", "FAILED", "CANCELED"],
  PAUSED: ["PROCESSING", "CANCELED"],
  DRAFT: ["REVIEW_REQUIRED", "APPROVED", "REJECTED", "ARCHIVED"],
  REVIEW_REQUIRED: ["APPROVED", "REJECTED", "DRAFT"],
  APPROVED: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED"],
  REJECTED: ["DRAFT", "ARCHIVED"],
  FAILED: ["PENDING", "ARCHIVED"],
  CANCELED: [],
  ARCHIVED: [],
} as const;

export type PipelineStatus = keyof typeof contentJobTransitions;

export function canTransitionContentJob(from: PipelineStatus, to: PipelineStatus) {
  return (contentJobTransitions[from] as readonly string[]).includes(to);
}

export function assertContentJobTransition(from: PipelineStatus, to: PipelineStatus) {
  if (!canTransitionContentJob(from, to)) throw new Error(`INVALID_JOB_TRANSITION:${from}:${to}`);
}
