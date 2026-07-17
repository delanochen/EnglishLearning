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

export const scenarioMetadataSchema = z.object({
  lessonId: z.string().uuid(),
  category: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(160),
  intro: z.string().trim().min(20).max(5000),
  level: cefrSchema,
  cultureTips: z.string().max(5000),
  misunderstandings: z.string().max(5000),
  naturalExpressions: z.string().max(5000),
  sourceNote: z.string().trim().max(500).optional(),
});

export const scenarioDialogueSchema = z.object({
  lessonId: z.string().uuid(), speaker: z.string().trim().min(1).max(80), roleName: z.string().trim().min(1).max(80),
  textEn: z.string().trim().min(2).max(3000), textZh: z.string().trim().max(3000).optional(), cameraCue: z.string().trim().max(300).optional(),
});

export const scenarioVocabularySchema = z.object({
  lessonId: z.string().uuid(), word: z.string().trim().min(1).max(100), meaningZh: z.string().trim().min(1).max(300), example: z.string().trim().max(1000).optional(),
});

export const scenarioExerciseSchema = z.object({
  lessonId: z.string().uuid(), prompt: z.string().trim().min(2).max(2000), answerKey: z.string().trim().min(1).max(1000),
  options: z.string().max(5000), explanation: z.string().trim().max(2000).optional(),
});

export const grammarMetadataSchema = z.object({
  topicId: z.string().uuid(), slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/), title: z.string().trim().min(1).max(160),
  ruleEn: z.string().trim().min(10).max(5000), ruleZh: z.string().trim().min(5).max(5000), level: cefrSchema,
  useCases: z.string().max(5000), commonErrors: z.string().max(5000), contrastExamples: z.string().max(10_000),
});
export const grammarExampleSchema = z.object({ topicId: z.string().uuid(), sentence: z.string().trim().min(2).max(2000), translation: z.string().trim().max(2000).optional(), explanation: z.string().trim().max(2000).optional(), isError: z.string().optional() });
export const grammarExerciseSchema = z.object({ topicId: z.string().uuid(), type: z.enum(["MULTIPLE_CHOICE", "FILL_BLANK", "ERROR_CORRECTION", "REORDER", "TRANSLATION", "SENTENCE_CREATION", "AI_DIALOGUE"]), prompt: z.string().trim().min(2).max(2000), options: z.string().max(5000), answerKey: z.string().trim().min(1).max(2000), explanation: z.string().trim().max(2000).optional() });
export const readingMetadataSchema = z.object({ articleId: z.string().uuid(), title: z.string().trim().min(1).max(160), body: z.string().trim().min(50).max(30_000), translation: z.string().trim().max(30_000).optional(), level: cefrSchema, audience: z.string().trim().min(1).max(120), topic: z.string().trim().min(1).max(120), targetVocabulary: z.string().max(2000), targetGrammar: z.string().max(2000), summary: z.string().trim().min(10).max(5000), oralRetellingPrompt: z.string().trim().min(5).max(2000), writingExtensionPrompt: z.string().trim().min(5).max(2000) });
export const readingQuestionSchema = z.object({ articleId: z.string().uuid(), type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "VOCABULARY"]), prompt: z.string().trim().min(2).max(2000), options: z.string().max(5000), answerKey: z.string().trim().min(1).max(2000), explanation: z.string().trim().max(2000).optional() });
export const listeningMetadataSchema = listeningContentSchema.extend({ exerciseId: z.string().uuid() });
export const listeningQuestionSchema = z.object({ exerciseId: z.string().uuid(), prompt: z.string().trim().min(2).max(2000), options: z.string().max(5000), answerKey: z.string().trim().min(1).max(1000), explanation: z.string().trim().max(2000).optional() });
export const vocabularyMetadataSchema = z.object({ vocabularyId: z.string().uuid(), word: z.string().trim().min(1).max(80), phonetic: z.string().trim().max(80).optional(), partOfSpeech: z.string().trim().min(1).max(40), definitionEn: z.string().trim().min(2).max(1000), definitionZh: z.string().trim().min(1).max(1000), level: cefrSchema, topic: z.string().trim().min(1).max(100), audioUrl: z.string().trim().url().max(1000).optional().or(z.literal("")), imageUrl: z.string().trim().url().max(1000).optional().or(z.literal("")) });
export const vocabularyExampleSchema = z.object({ vocabularyId: z.string().uuid(), sentence: z.string().trim().min(2).max(2000), translation: z.string().trim().max(2000).optional(), collocations: z.string().max(2000), difficulty: cefrSchema });
export const vocabularyRelationSchema = z.object({ vocabularyId: z.string().uuid(), targetWord: z.string().trim().min(1).max(80), type: z.enum(["SYNONYM", "ANTONYM"]) });
export const writingAssignmentSchema = z.object({ assignmentId: z.string().uuid().optional(), title: z.string().trim().min(2).max(160), type: z.enum(["SENTENCES", "PARAGRAPH", "EMAIL", "HIGH_SCHOOL_ESSAY", "JOURNAL", "IMAGE_DESCRIPTION", "OPINION", "WORKPLACE"]), prompt: z.string().trim().min(20).max(5000), level: cefrSchema, targetWords: z.coerce.number().int().min(20).max(2000) });

export function lines(value = "") { return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
export function parseContrastLines(value = "") { return lines(value).map((line) => { const [correct = "", incorrect = "", note = ""] = line.split("|").map((item) => item.trim()); return { correct, incorrect, note }; }).filter((item) => item.correct && item.incorrect); }
export function scenarioPublishReadiness(counts: { dialogues: number; vocabulary: number; exercises: number; cultureTips: number; naturalExpressions: number }) {
  const missing: string[] = [];
  if (counts.dialogues < 8) missing.push("至少 8 句对话");
  if (counts.vocabulary < 3) missing.push("至少 3 个场景词汇");
  if (counts.exercises < 3) missing.push("至少 3 道练习题");
  if (counts.cultureTips < 1) missing.push("至少 1 条文化提示");
  if (counts.naturalExpressions < 2) missing.push("至少 2 条自然表达");
  return missing;
}
export function grammarPublishReadiness(counts: { examples: number; exercises: number; useCases: number; commonErrors: number }) {
  const missing: string[] = [];
  if (counts.examples < 2) missing.push("至少 2 个正误例句");
  if (counts.exercises < 3) missing.push("至少 3 道练习题");
  if (counts.useCases < 1) missing.push("至少 1 个适用场景");
  if (counts.commonErrors < 1) missing.push("至少 1 条常见错误");
  return missing;
}
export function readingPublishReadiness(input: { questions: number; targetVocabulary: number; summary: string; oralRetellingPrompt: string; writingExtensionPrompt: string }) {
  const missing: string[] = [];
  if (input.questions < 5) missing.push("至少 5 道阅读与延伸题");
  if (input.targetVocabulary < 2) missing.push("至少 2 个目标词汇");
  if (!input.summary.trim()) missing.push("文章总结");
  if (!input.oralRetellingPrompt.trim()) missing.push("口头复述任务");
  if (!input.writingExtensionPrompt.trim()) missing.push("写作延伸任务");
  return missing;
}
export function listeningPublishReadiness(input: { questions: number; transcript: string }) {
  const missing: string[] = [];
  if (input.transcript.trim().split(/\s+/).length < 20) missing.push("至少 20 个英文单词的听力稿");
  if (input.questions < 3) missing.push("至少 3 道自动判分题");
  return missing;
}
export function vocabularyPublishReadiness(input: { meanings: number; examples: number }) {
  const missing: string[] = [];
  if (input.meanings < 1) missing.push("至少 1 条中文释义");
  if (input.examples < 1) missing.push("至少 1 个情境例句");
  return missing;
}
export function writingPublishReadiness(input: { prompt: string; targetWords: number }) {
  const missing: string[] = [];
  if (input.prompt.trim().length < 20) missing.push("清晰完整的写作要求");
  if (input.targetWords < 20) missing.push("不少于 20 词的目标字数");
  return missing;
}

export function csv(value = "") { return value.split(",").map((item) => item.trim()).filter(Boolean); }
