"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireProfileAccess } from "@/modules/learner/access";
import { recordMistakeResult } from "@/modules/mistakes/service";
import { scoreGrammarAnswer, updateGrammarMastery } from "./scoring";

export async function submitGrammar(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = z.object({ profileId: z.string().uuid(), topicId: z.string().uuid() }).parse(Object.fromEntries(formData));
  const profile = await requireProfileAccess(session.user.id, input.profileId);
  const topic = await db.grammarTopic.findUniqueOrThrow({ where: { id: input.topicId }, include: { exercises: true } });
  const progress = await db.grammarProgress.upsert({ where: { learnerProfileId_topicId: { learnerProfileId: input.profileId, topicId: input.topicId } }, update: {}, create: { learnerProfileId: input.profileId, topicId: input.topicId } });
  const answers = topic.exercises.map((exercise) => { const answer = String(formData.get(`exercise_${exercise.id}`) ?? "").trim(); return { exercise, answer, correct: scoreGrammarAnswer(exercise.type, answer, exercise.answerKey) }; });
  const correct = answers.filter((answer) => answer.correct).length;
  const passed = answers.length ? correct / answers.length >= .6 : true;
  const next = updateGrammarMastery(progress.mastery, passed);
  const now = new Date(); const nextReviewAt = new Date(now); nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + next.reviewAfterDays);
  await db.$transaction(async (tx) => {
    await tx.grammarAttempt.createMany({ data: answers.map((answer) => ({ progressId: progress.id, exerciseId: answer.exercise.id, answer: answer.answer, isCorrect: answer.correct })) });
    for (const answer of answers) await recordMistakeResult(tx, { learnerProfileId: input.profileId, familyId: profile.familyId, module: "GRAMMAR", sourceType: "GrammarTopic", sourceId: topic.id, questionId: answer.exercise.id, prompt: answer.exercise.prompt, answer: answer.answer, correctAnswer: answer.exercise.answerKey, explanation: answer.exercise.explanation, correct: answer.correct });
    await tx.grammarProgress.update({ where: { id: progress.id }, data: { mastery: next.mastery, weaknessScore: next.weaknessScore, lastPracticedAt: now, nextReviewAt, correctCount: { increment: correct }, incorrectCount: { increment: answers.length - correct } } });
    await tx.learningActivity.create({ data: { learnerProfileId: input.profileId, familyId: profile.familyId, activityType: "GRAMMAR_PRACTICE", module: "GRAMMAR", score: answers.length ? correct / answers.length : 1, sourceType: "GrammarTopic", sourceId: topic.id } });
  });
  revalidatePath(`/learn/grammar/${topic.id}`); revalidatePath("/learn/grammar"); revalidatePath("/dashboard");
}
