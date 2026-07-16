"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireProfileAccess } from "@/modules/learner/access";
import { updateGrammarMastery } from "./scoring";

export async function submitGrammar(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = z.object({ profileId: z.string().uuid(), topicId: z.string().uuid() }).parse(Object.fromEntries(formData)); const profile = await requireProfileAccess(session.user.id, input.profileId);
  const topic = await db.grammarTopic.findUniqueOrThrow({ where: { id: input.topicId }, include: { exercises: true } });
  const progress = await db.grammarProgress.upsert({ where: { learnerProfileId_topicId: { learnerProfileId: input.profileId, topicId: input.topicId } }, update: {}, create: { learnerProfileId: input.profileId, topicId: input.topicId } });
  const answers = topic.exercises.map((exercise) => { const answer = String(formData.get(`exercise_${exercise.id}`) ?? "").trim(); return { exercise, answer, correct: answer.toLowerCase() === exercise.answerKey.trim().toLowerCase() }; }); const correct = answers.filter((a) => a.correct).length; const passed = answers.length ? correct / answers.length >= 0.6 : true; const next = updateGrammarMastery(progress.mastery, passed); const now = new Date(); const nextReviewAt = new Date(now); nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + next.reviewAfterDays);
  await db.$transaction([db.grammarAttempt.createMany({ data: answers.map((a) => ({ progressId: progress.id, exerciseId: a.exercise.id, answer: a.answer, isCorrect: a.correct })) }), db.grammarProgress.update({ where: { id: progress.id }, data: { mastery: next.mastery, weaknessScore: next.weaknessScore, lastPracticedAt: now, nextReviewAt, correctCount: { increment: correct }, incorrectCount: { increment: answers.length - correct } } }), db.learningActivity.create({ data: { learnerProfileId: input.profileId, familyId: profile.familyId, activityType: "GRAMMAR_PRACTICE", module: "GRAMMAR", score: answers.length ? correct / answers.length : 1, sourceType: "GrammarTopic", sourceId: topic.id } })]); revalidatePath(`/learn/grammar/${topic.id}`); revalidatePath("/learn/grammar");
}
