"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireProfileAccess } from "@/modules/learner/access";

export async function submitReading(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = z.object({ profileId: z.string().uuid(), articleId: z.string().uuid(), readingSeconds: z.coerce.number().int().min(0).max(86400).default(0) }).parse(Object.fromEntries(formData));
  const profile = await requireProfileAccess(session.user.id, input.profileId);
  const article = await db.readingArticle.findUniqueOrThrow({ where: { id: input.articleId }, include: { questions: true } });
  const results = article.questions.map((question) => {
    const answer = String(formData.get(`question_${question.id}`) ?? "").trim();
    return { question, answer, correct: answer.toLocaleLowerCase() === question.answerKey.trim().toLocaleLowerCase() };
  });
  const correctCount = results.filter((item) => item.correct).length; const score = article.questions.length ? correctCount / article.questions.length : 1;
  await db.$transaction(async (tx) => {
    const progress = await tx.readingProgress.upsert({ where: { learnerProfileId_articleId: { learnerProfileId: input.profileId, articleId: article.id } }, update: { progressPercent: 100, completedAt: new Date(), readingSeconds: { increment: input.readingSeconds }, score }, create: { learnerProfileId: input.profileId, articleId: article.id, progressPercent: 100, completedAt: new Date(), readingSeconds: input.readingSeconds, score } });
    await tx.readingAnswer.deleteMany({ where: { progressId: progress.id } });
    if (results.length) await tx.readingAnswer.createMany({ data: results.map((item) => ({ progressId: progress.id, questionId: item.question.id, answer: item.answer, isCorrect: item.correct, score: item.correct ? 1 : 0, feedback: item.correct ? "回答正确" : item.question.explanation })) });
    await tx.learningActivity.create({ data: { learnerProfileId: input.profileId, familyId: profile.familyId, activityType: "READING_COMPLETE", module: "READING", durationSeconds: input.readingSeconds, score, sourceType: "ReadingArticle", sourceId: article.id } });
  });
  revalidatePath(`/learn/reading/${article.id}`); revalidatePath("/learn/reading");
}
