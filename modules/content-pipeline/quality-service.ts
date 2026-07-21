import { Prisma, type CefrLevel } from "@prisma/client";
import { db } from "@/lib/db";
import type { SupportedGenerationType } from "./generator";
import { assessContentWithAI, reconcileLevel, type AIQualityAssessment } from "./quality-ai";
import { contentHash, inspectGeneratedContent, levelDistance, ngramSimilarity, normalizeContentText, type RuleQualityResult } from "./quality";

type ContentReference = { contentType: string; contentId: string };

async function duplicateCandidate(type: SupportedGenerationType, contentId: string, output: unknown, normalizedHash: string) {
  if (type === "READING_GENERATION") {
    const candidates = await db.readingArticle.findMany({ where: { id: { not: contentId } }, select: { id: true, title: true, body: true, normalizedHash: true }, take: 100, orderBy: { createdAt: "desc" } });
    const source = normalizeContentText({ title: (output as { title?: string }).title, body: (output as { body?: string }).body });
    return candidates.map((candidate) => ({ id: candidate.id, score: candidate.normalizedHash === normalizedHash ? 1 : ngramSimilarity(source, normalizeContentText({ title: candidate.title, body: candidate.body })) })).sort((a, b) => b.score - a.score)[0];
  }
  if (type === "GRAMMAR_GENERATION") {
    const candidates = await db.grammarTopic.findMany({ where: { id: { not: contentId } }, select: { id: true, title: true, ruleEn: true, normalizedHash: true }, take: 100, orderBy: { createdAt: "desc" } });
    const root = output as { title?: string; ruleEn?: string }; const source = normalizeContentText({ title: root.title, ruleEn: root.ruleEn });
    return candidates.map((candidate) => ({ id: candidate.id, score: candidate.normalizedHash === normalizedHash ? 1 : ngramSimilarity(source, normalizeContentText({ title: candidate.title, ruleEn: candidate.ruleEn })) })).sort((a, b) => b.score - a.score)[0];
  }
  if (type === "SCENARIO_GENERATION") {
    const candidates = await db.scenarioLesson.findMany({ where: { id: { not: contentId } }, select: { id: true, title: true, intro: true, normalizedHash: true }, take: 100, orderBy: { createdAt: "desc" } });
    const root = output as { title?: string; intro?: string }; const source = normalizeContentText({ title: root.title, intro: root.intro });
    return candidates.map((candidate) => ({ id: candidate.id, score: candidate.normalizedHash === normalizedHash ? 1 : ngramSimilarity(source, normalizeContentText({ title: candidate.title, intro: candidate.intro })) })).sort((a, b) => b.score - a.score)[0];
  }
  const root = output as { word?: string; partOfSpeech?: string; definitionEn?: string };
  const candidates = await db.vocabulary.findMany({ where: { id: { not: contentId }, partOfSpeech: root.partOfSpeech }, select: { id: true, word: true, definitionEn: true, normalizedHash: true }, take: 100 });
  const source = normalizeContentText({ word: root.word, definitionEn: root.definitionEn });
  return candidates.map((candidate) => ({ id: candidate.id, score: candidate.normalizedHash === normalizedHash ? 1 : ngramSimilarity(source, normalizeContentText({ word: candidate.word, definitionEn: candidate.definitionEn })) })).sort((a, b) => b.score - a.score)[0];
}

async function updateContent(reference: ContentReference, values: { qualityScore: number; status: "DRAFT" | "REVIEW_REQUIRED"; reviewStatus: "PENDING"; originalHash: string; normalizedHash: string; level: CefrLevel }) {
  const data = { qualityScore: values.qualityScore, status: values.status, reviewStatus: values.reviewStatus, originalHash: values.originalHash, normalizedHash: values.normalizedHash, level: values.level };
  if (reference.contentType === "Vocabulary") return db.vocabulary.update({ where: { id: reference.contentId }, data });
  if (reference.contentType === "ReadingArticle") return db.readingArticle.update({ where: { id: reference.contentId }, data });
  if (reference.contentType === "GrammarTopic") return db.grammarTopic.update({ where: { id: reference.contentId }, data });
  if (reference.contentType === "ScenarioLesson") return db.scenarioLesson.update({ where: { id: reference.contentId }, data });
  throw new Error(`UNSUPPORTED_CONTENT_REFERENCE:${reference.contentType}`);
}

export async function evaluatePersistedContent(input: {
  type: SupportedGenerationType;
  output: unknown;
  reference: ContentReference;
  jobId: string;
  itemId: string;
  actorUserId?: string;
  preferredModelId?: string;
  inspection?: RuleQualityResult;
  repairAttempted?: boolean;
  assessment?: AIQualityAssessment | null;
  aiError?: string | null;
}) {
  const inspection = input.inspection ?? inspectGeneratedContent(input.type, input.output);
  let assessment: AIQualityAssessment | null = input.assessment ?? null; let aiError: string | null = input.aiError ?? null;
  if (input.assessment === undefined && input.aiError === undefined) {
    try { assessment = await assessContentWithAI(input.type, input.output, input.actorUserId, input.preferredModelId); }
    catch (error) { aiError = error instanceof Error ? error.message : "AI_QUALITY_FAILED"; }
  }
  const candidate = await duplicateCandidate(input.type, input.reference.contentId, input.output, inspection.normalizedHash);
  const duplicate = candidate && candidate.score >= 0.85 ? candidate : null;
  const levelMismatch = assessment ? levelDistance(inspection.ruleBasedLevel, assessment.suggestedLevel) > 1 : true;
  const errors = [...inspection.errors, ...(assessment?.safe === false ? ["AI_UNSAFE"] : []), ...(assessment?.grammarCorrect === false ? ["AI_GRAMMAR_ERROR"] : []), ...(assessment?.translationAccurate === false ? ["AI_TRANSLATION_ERROR"] : []), ...(assessment?.uniqueAnswers === false ? ["AI_AMBIGUOUS_ANSWER"] : []), ...(duplicate ? ["POSSIBLE_DUPLICATE"] : []), ...(aiError ? ["AI_REVIEW_UNAVAILABLE"] : [])];
  const warnings = [...inspection.warnings, ...(assessment?.issues ?? []), ...(levelMismatch ? ["LEVEL_REVIEW_REQUIRED"] : [])];
  const score = Math.round((inspection.score * 0.55 + (assessment?.qualityScore ?? 50) * 0.45) * 100) / 100;
  const passed = !errors.length && !levelMismatch && score >= 75;
  const finalLevel = assessment ? reconcileLevel(inspection.ruleBasedLevel, assessment) : inspection.ruleBasedLevel;
  const originalHash = contentHash(JSON.stringify(input.output));
  await updateContent(input.reference, { qualityScore: score, status: passed ? "DRAFT" : "REVIEW_REQUIRED", reviewStatus: "PENDING", originalHash, normalizedHash: inspection.normalizedHash, level: finalLevel });
  await db.contentQualityReport.create({ data: {
    generationJobId: input.jobId, generationItemId: input.itemId, contentType: input.reference.contentType, contentId: input.reference.contentId,
    passed, qualityScore: score, ruleBasedLevel: inspection.ruleBasedLevel, aiSuggestedLevel: assessment?.suggestedLevel, finalLevel,
    confidence: assessment?.confidence, reviewReason: [...errors, ...warnings].join("; ") || null, checks: { ...inspection.checks, ai: assessment ?? { error: aiError }, duplicateScore: duplicate?.score ?? 0 },
    errors: errors as Prisma.InputJsonValue, warnings: warnings as Prisma.InputJsonValue, repairAttempted: input.repairAttempted ?? false,
  } });
  if (duplicate) await db.contentDuplicateMatch.create({ data: { sourceContentType: input.reference.contentType, sourceContentId: input.reference.contentId, candidateContentType: input.reference.contentType, candidateContentId: duplicate.id, method: "NORMALIZED_HASH_NGRAM", score: duplicate.score, details: { threshold: 0.85 } } });
  if (!passed) await db.contentReview.create({ data: { generationJobId: input.jobId, contentType: input.reference.contentType, contentId: input.reference.contentId, reason: [...errors, ...warnings].join("; ") } });
  return { passed, score, finalLevel, errors, warnings };
}
