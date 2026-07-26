import type { AIUsagePurpose, ContentGenerationJobType } from "@prisma/client";
import { routedStructured } from "@/modules/ai/gateway";
import { pipelineGrammarSchema, pipelineReadingSchema, pipelineScenarioSchema, pipelineVocabularySchema } from "./generation-schemas";
import { generationMessages, type GenerationContext } from "./prompts";

const contracts = {
  VOCABULARY_GENERATION: { purpose: "VOCABULARY", schema: pipelineVocabularySchema, name: "PipelineVocabulary" },
  READING_GENERATION: { purpose: "READING", schema: pipelineReadingSchema, name: "PipelineReading" },
  GRAMMAR_GENERATION: { purpose: "GRAMMAR", schema: pipelineGrammarSchema, name: "PipelineGrammar" },
  SCENARIO_GENERATION: { purpose: "SCENARIO", schema: pipelineScenarioSchema, name: "PipelineScenario" },
} as const;

export type SupportedGenerationType = keyof typeof contracts;
export function isSupportedGenerationType(type: ContentGenerationJobType): type is SupportedGenerationType { return type in contracts; }

export async function generatePipelineContent(type: SupportedGenerationType, context: GenerationContext, actorUserId?: string, maxTokens?: number, preferredModelId?: string) {
  const request = { schemaInstructions: JSON.stringify(schemaExample[type]), messages: generationMessages(type, context), temperature: .65, maxTokens: maxTokens ?? 5000 };
  switch (type) {
    case "VOCABULARY_GENERATION": return routedStructured("VOCABULARY" satisfies AIUsagePurpose, { ...request, schema: pipelineVocabularySchema, schemaName: contracts[type].name }, actorUserId, preferredModelId);
    case "READING_GENERATION": return routedStructured("READING" satisfies AIUsagePurpose, { ...request, schema: pipelineReadingSchema, schemaName: contracts[type].name }, actorUserId, preferredModelId);
    case "GRAMMAR_GENERATION": return routedStructured("GRAMMAR" satisfies AIUsagePurpose, { ...request, schema: pipelineGrammarSchema, schemaName: contracts[type].name }, actorUserId, preferredModelId);
    case "SCENARIO_GENERATION": return routedStructured("SCENARIO" satisfies AIUsagePurpose, { ...request, schema: pipelineScenarioSchema, schemaName: contracts[type].name }, actorUserId, preferredModelId);
  }
}

const question = (i: number) => ({ type: "MULTIPLE_CHOICE", prompt: `distinct question ${i + 1}`, options: ["A", "B", "C"], answerKey: "A", explanation: "string" });
const schemaExample: Record<SupportedGenerationType, unknown> = {
  VOCABULARY_GENERATION: { word: "string", phonetic: "string", partOfSpeech: "string", definitionEn: "string", definitionZh: "string", level: "A1", topic: "string", collocations: ["string"], synonyms: [], antonyms: [], examples: [{ sentence: "string", translation: "string" }, { sentence: "string", translation: "string" }], pronunciationText: "string", exercises: Array.from({ length: 3 }, (_, i) => question(i)) },
  READING_GENERATION: { title: "string", body: "100+ chars", translation: "string", level: "A1", audience: "string", topic: "string", targetVocabulary: [], targetGrammar: [], summary: "string", questions: Array.from({ length: 5 }, (_, i) => question(i)), oralRetellingPrompt: "string", writingExtensionPrompt: "string" },
  GRAMMAR_GENERATION: { slug: "lowercase-hyphen", title: "string", ruleEn: "string", ruleZh: "string", level: "A1", commonErrors: ["string"], useCases: ["string"], contrastExamples: [{ correct: "string", incorrect: "string", note: "string" }], examples: [{ sentence: "string", translation: "string", isError: false, explanation: "string" }], exercises: Array.from({ length: 10 }, (_, i) => question(i)) },
  SCENARIO_GENERATION: { category: "string", title: "string", intro: "string", level: "A2", cultureTips: ["string"], misunderstandings: ["string"], naturalExpressions: ["string"], dialogues: Array.from({ length: 8 }, (_, i) => ({ speaker: i % 2 ? "Staff" : "Customer", roleName: i % 2 ? "工作人员" : "顾客", textEn: `dialogue line ${i + 1}`, textZh: `对话 ${i + 1}`, cameraCue: "string" })), exercises: Array.from({ length: 5 }, (_, i) => question(i)), listeningScript: "A practical listening script of at least 100 characters with a complete interaction.", rolePlayPrompt: "A detailed role-play prompt of at least twenty characters.", vocabulary: Array.from({ length: 6 }, (_, i) => ({ word: `word${i + 1}`, meaningZh: `释义${i + 1}`, example: `example ${i + 1}` })) },
};
