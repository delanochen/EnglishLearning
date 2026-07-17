"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireProfileAccess } from "@/modules/learner/access";
import { recordMistakeResult } from "@/modules/mistakes/service";

export async function submitReading(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = z.object({ profileId: z.string().uuid(), articleId: z.string().uuid(), readingSeconds: z.coerce.number().int().min(0).max(86400).default(0) }).parse(Object.fromEntries(formData));
  const profile = await requireProfileAccess(session.user.id, input.profileId);
  const article = await db.readingArticle.findUniqueOrThrow({ where: { id: input.articleId }, include: { questions: true } });
  const results = article.questions.map((question) => {
    const answer = String(formData.get(`question_${question.id}`) ?? "").trim();
    const normalized = answer.toLocaleLowerCase(); const key = question.answerKey.trim().toLocaleLowerCase(); const keyWords = new Set(key.match(/[a-z']+/g) ?? []); const answerWords = new Set(normalized.match(/[a-z']+/g) ?? []); const overlap = keyWords.size ? [...keyWords].filter((word) => answerWords.has(word)).length / keyWords.size : 0; const correct = question.type === "SHORT_ANSWER" ? answerWords.size >= 3 && overlap >= 0.35 : normalized === key;
    return { question, answer, correct };
  });
  const correctCount = results.filter((item) => item.correct).length; const score = article.questions.length ? correctCount / article.questions.length : 1;
  await db.$transaction(async (tx) => {
    const progress = await tx.readingProgress.upsert({ where: { learnerProfileId_articleId: { learnerProfileId: input.profileId, articleId: article.id } }, update: { progressPercent: 100, completedAt: new Date(), readingSeconds: { increment: input.readingSeconds }, score }, create: { learnerProfileId: input.profileId, articleId: article.id, progressPercent: 100, completedAt: new Date(), readingSeconds: input.readingSeconds, score } });
    await tx.readingAnswer.deleteMany({ where: { progressId: progress.id } });
    if (results.length) await tx.readingAnswer.createMany({ data: results.map((item) => ({ progressId: progress.id, questionId: item.question.id, answer: item.answer, isCorrect: item.correct, score: item.correct ? 1 : 0, feedback: item.correct ? "回答正确" : item.question.explanation })) });
    for (const item of results) await recordMistakeResult(tx, { learnerProfileId: input.profileId, familyId: profile.familyId, module: "READING", sourceType: "ReadingArticle", sourceId: article.id, questionId: item.question.id, prompt: item.question.prompt, answer: item.answer, correctAnswer: item.question.answerKey, explanation: item.question.explanation, correct: item.correct });
    await tx.learningActivity.create({ data: { learnerProfileId: input.profileId, familyId: profile.familyId, activityType: "READING_COMPLETE", module: "READING", durationSeconds: input.readingSeconds, score, sourceType: "ReadingArticle", sourceId: article.id } });
  });
  revalidatePath(`/learn/reading/${article.id}`); revalidatePath("/learn/reading");
}

export async function saveReadingProgress(raw: { profileId: string; articleId: string; progressPercent: number; currentPosition: number; readingSeconds: number }) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED"); const input = z.object({ profileId: z.string().uuid(), articleId: z.string().uuid(), progressPercent: z.number().int().min(0).max(99), currentPosition: z.number().int().min(0), readingSeconds: z.number().int().min(0).max(86400) }).parse(raw); await requireProfileAccess(session.user.id, input.profileId); await db.readingProgress.upsert({ where: { learnerProfileId_articleId: { learnerProfileId: input.profileId, articleId: input.articleId } }, update: { progressPercent: input.progressPercent, currentPosition: input.currentPosition, readingSeconds: { increment: input.readingSeconds } }, create: { learnerProfileId: input.profileId, articleId: input.articleId, progressPercent: input.progressPercent, currentPosition: input.currentPosition, readingSeconds: input.readingSeconds } }); revalidatePath(`/learn/reading/${input.articleId}`);
}

export async function collectReadingWord(raw: { profileId: string; word: string }) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED"); const input = z.object({ profileId: z.string().uuid(), word: z.string().trim().min(1).max(80) }).parse(raw); await requireProfileAccess(session.user.id, input.profileId); const vocabulary = await db.vocabulary.findFirst({ where: { word: { equals: input.word, mode: "insensitive" }, status: "PUBLISHED" } }); if (!vocabulary) throw new Error("VOCABULARY_NOT_FOUND"); await db.userVocabularyProgress.upsert({ where: { learnerProfileId_vocabularyId: { learnerProfileId: input.profileId, vocabularyId: vocabulary.id } }, update: {}, create: { learnerProfileId: input.profileId, vocabularyId: vocabulary.id } }); revalidatePath("/learn/vocabulary");
}
