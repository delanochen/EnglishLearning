import { z } from "zod";

export const jobTypeSchema = z.enum([
  "VOCABULARY_GENERATION", "READING_GENERATION", "GRAMMAR_GENERATION", "SCENARIO_GENERATION",
  "QUESTION_GENERATION", "TRANSLATION_GENERATION", "AUDIO_SCRIPT_GENERATION", "VIDEO_SCRIPT_GENERATION",
  "PUBLIC_RESOURCE_IMPORT", "CONTENT_RECHECK", "DUPLICATE_SCAN", "DIFFICULTY_RECALCULATION",
]);

export const jobStatusSchema = z.enum([
  "PENDING", "PROCESSING", "PAUSED", "DRAFT", "REVIEW_REQUIRED", "APPROVED", "PUBLISHED",
  "REJECTED", "FAILED", "CANCELED", "ARCHIVED",
]);

export const createContentJobSchema = z.object({
  type: jobTypeSchema,
  totalItems: z.coerce.number().int().min(1).max(10_000),
  priority: z.coerce.number().int().min(1).max(1_000).default(100),
  maxRetries: z.coerce.number().int().min(0).max(5).default(1),
  aiProviderId: z.string().uuid().nullable().optional(),
  aiModelId: z.string().uuid().nullable().optional(),
  maxTokens: z.coerce.number().int().min(1).max(10_000_000).nullable().optional(),
  maxBudget: z.coerce.number().min(0).max(100_000).nullable().optional(),
  configuration: z.record(z.unknown()).default({}),
});

export const listContentJobsSchema = z.object({
  status: jobStatusSchema.optional(),
  type: jobTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().uuid().optional(),
});

export type CreateContentJobInput = z.infer<typeof createContentJobSchema>;
