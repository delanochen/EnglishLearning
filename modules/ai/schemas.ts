import { z } from "zod";

export const providerFormSchema = z.object({
  providerId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  type: z.enum(["OPENAI", "OPENROUTER", "GEMINI", "OPENAI_COMPATIBLE", "OLLAMA"]),
  baseUrl: z.string().url().max(500),
  apiKey: z.string().trim().max(1000).optional(),
  timeoutMs: z.coerce.number().int().min(1000).max(300000),
  priority: z.coerce.number().int().min(1).max(10000),
  notes: z.string().trim().max(1000).optional()
});

export const modelFormSchema = z.object({
  modelId: z.string().uuid().optional(), providerId: z.string().uuid(), name: z.string().trim().min(1).max(160), displayName: z.string().trim().min(1).max(160),
  temperature: z.coerce.number().min(0).max(2), maxTokens: z.coerce.number().int().min(1).max(200000), priority: z.coerce.number().int().min(1).max(10000),
  capabilities: z.string().trim().max(500).default("chat,structured-output"), enabled: z.string().optional(), isDefault: z.string().optional()
});

export const idSchema = z.object({ id: z.string().uuid() });
export const routeFormSchema = z.object({
  purpose: z.enum(["TUTOR", "VOCABULARY", "READING", "QUIZ", "GRAMMAR", "WRITING", "LEARNING_PLAN", "TRANSLATION", "SPEECH_RECOGNITION", "TTS", "IMAGE_GENERATION", "VIDEO_GENERATION"]),
  modelId: z.string().uuid(), priority: z.coerce.number().int().min(1).max(10000)
});
