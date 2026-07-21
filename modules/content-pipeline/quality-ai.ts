import { z } from "zod";
import type { AIUsagePurpose, CefrLevel } from "@prisma/client";
import { routedStructured } from "@/modules/ai/gateway";
import { pipelineGrammarSchema, pipelineReadingSchema, pipelineScenarioSchema, pipelineVocabularySchema } from "./generation-schemas";
import type { SupportedGenerationType } from "./generator";

const assessmentSchema = z.object({
  suggestedLevel: z.enum(["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"]),
  confidence: z.number().min(0).max(1),
  qualityScore: z.number().min(0).max(100),
  safe: z.boolean(),
  grammarCorrect: z.boolean(),
  translationAccurate: z.boolean(),
  uniqueAnswers: z.boolean(),
  issues: z.array(z.string().max(300)).max(20),
});

export type AIQualityAssessment = z.infer<typeof assessmentSchema>;

function purpose(type: SupportedGenerationType): AIUsagePurpose {
  if (type === "VOCABULARY_GENERATION") return "VOCABULARY";
  if (type === "READING_GENERATION") return "READING";
  if (type === "GRAMMAR_GENERATION") return "GRAMMAR";
  return "SCENARIO";
}

export async function assessContentWithAI(type: SupportedGenerationType, output: unknown, actorUserId?: string, preferredModelId?: string) {
  return routedStructured("CONTENT_REVIEW", {
    schema: assessmentSchema,
    schemaName: "ContentQualityAssessment",
    schemaInstructions: JSON.stringify({ suggestedLevel: "A2", confidence: 0.9, qualityScore: 90, safe: true, grammarCorrect: true, translationAccurate: true, uniqueAnswers: true, issues: [] }),
    messages: [
      { role: "system", content: "You are a strict bilingual English-learning content reviewer. Evaluate the supplied content; do not rewrite it. Flag unsafe, unnatural, inaccurate, ambiguous, age-inappropriate, or level-mismatched material." },
      { role: "user", content: JSON.stringify({ contentType: type, content: output }) },
    ],
    temperature: 0.1,
    maxTokens: 1_500,
  }, actorUserId, preferredModelId);
}

export async function repairGeneratedContent(type: SupportedGenerationType, output: unknown, issues: string[], actorUserId?: string, preferredModelId?: string) {
  const request = {
    schemaInstructions: "Return the same complete content object shape as the supplied original. Correct every listed issue without adding unsafe or copyrighted material.",
    messages: [
      { role: "system" as const, content: "Repair this original bilingual educational JSON. Preserve its learning goal and CEFR audience. Return one complete corrected JSON object only." },
      { role: "user" as const, content: JSON.stringify({ issues, original: output }) },
    ],
    temperature: 0.2,
    maxTokens: 6_000,
  };
  const selectedPurpose = purpose(type);
  switch (type) {
    case "VOCABULARY_GENERATION": return routedStructured(selectedPurpose, { ...request, schema: pipelineVocabularySchema, schemaName: "RepairedVocabulary" }, actorUserId, preferredModelId);
    case "READING_GENERATION": return routedStructured(selectedPurpose, { ...request, schema: pipelineReadingSchema, schemaName: "RepairedReading" }, actorUserId, preferredModelId);
    case "GRAMMAR_GENERATION": return routedStructured(selectedPurpose, { ...request, schema: pipelineGrammarSchema, schemaName: "RepairedGrammar" }, actorUserId, preferredModelId);
    case "SCENARIO_GENERATION": return routedStructured(selectedPurpose, { ...request, schema: pipelineScenarioSchema, schemaName: "RepairedScenario" }, actorUserId, preferredModelId);
  }
}

export function reconcileLevel(ruleBasedLevel: CefrLevel, assessment: AIQualityAssessment) {
  return assessment.confidence >= 0.7 ? assessment.suggestedLevel : ruleBasedLevel;
}
