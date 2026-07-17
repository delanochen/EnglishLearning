import { z } from "zod";

export const contentTypeSchema = z.enum(["vocabulary", "reading", "grammar", "scenario", "listening"]);
export const cefrSchema = z.enum(["PRE_A1", "A1", "A2", "B1", "B2", "C1"]);

export const readingContentSchema = z.object({
  title: z.string().trim().min(1).max(160), body: z.string().trim().min(10).max(30_000), translation: z.string().trim().max(30_000).optional(),
  level: cefrSchema, audience: z.string().trim().min(1).max(120), topic: z.string().trim().min(1).max(120),
  targetVocabulary: z.string().trim().max(1000).optional(), targetGrammar: z.string().trim().max(1000).optional()
});

export const listeningContentSchema = z.object({
  title: z.string().trim().min(1).max(160), transcript: z.string().trim().min(10).max(30_000), translation: z.string().trim().max(30_000).optional(),
  level: cefrSchema, topic: z.string().trim().min(1).max(120), audioUrl: z.string().trim().url().max(1000).optional().or(z.literal(""))
});

export const contentEditSchema = z.object({
  id: z.string().uuid(), type: contentTypeSchema, title: z.string().trim().min(1).max(160),
  primary: z.string().trim().min(1).max(30_000), secondary: z.string().trim().max(30_000).optional(),
  topic: z.string().trim().max(120).optional(), level: cefrSchema
});

export function csv(value = "") { return value.split(",").map((item) => item.trim()).filter(Boolean); }
