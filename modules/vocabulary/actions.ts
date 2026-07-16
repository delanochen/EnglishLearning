"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireProfileAccess } from "@/modules/learner/access";
import { calculateReview } from "./review";

export async function reviewVocabulary(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = z.object({ profileId: z.string().uuid(), vocabularyId: z.string().uuid(), quality: z.coerce.number().int().min(0).max(5) }).parse(Object.fromEntries(formData));
  const profile = await requireProfileAccess(session.user.id, input.profileId);
  const current = await db.userVocabularyProgress.upsert({
    where: { learnerProfileId_vocabularyId: { learnerProfileId: input.profileId, vocabularyId: input.vocabularyId } }, update: {},
    create: { learnerProfileId: input.profileId, vocabularyId: input.vocabularyId }
  });
  const next = calculateReview({ quality: input.quality, easeFactor: current.easeFactor, intervalDays: current.intervalDays, consecutiveCorrect: current.consecutiveCorrect, mastery: current.mastery });
  const now = new Date(); const nextReviewAt = new Date(now); nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + next.intervalDays);
  await db.$transaction([
    db.userVocabularyProgress.update({ where: { id: current.id }, data: { state: next.state, firstLearnedAt: current.firstLearnedAt ?? now, lastReviewedAt: now, nextReviewAt, correctCount: { increment: next.correct ? 1 : 0 }, incorrectCount: { increment: next.correct ? 0 : 1 }, mastery: next.mastery, easeFactor: next.easeFactor, intervalDays: next.intervalDays, consecutiveCorrect: next.consecutiveCorrect } }),
    db.reviewSchedule.create({ data: { progressId: current.id, scheduledAt: current.nextReviewAt ?? now, completedAt: now, result: next.correct, quality: next.quality, oldInterval: current.intervalDays, newInterval: next.intervalDays, oldEase: current.easeFactor, newEase: next.easeFactor } }),
    db.learningActivity.create({ data: { learnerProfileId: input.profileId, familyId: profile.familyId, activityType: "VOCAB_REVIEW", module: "VOCABULARY", score: next.quality / 5, sourceType: "Vocabulary", sourceId: input.vocabularyId } })
  ]);
  revalidatePath("/learn/vocabulary");
}
