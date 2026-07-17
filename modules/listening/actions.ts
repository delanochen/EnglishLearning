"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireProfileAccess } from "@/modules/learner/access";
import { recordMistakeResult } from "@/modules/mistakes/service";
import { completeTodayTaskForModule } from "@/modules/tasks/module-completion";

export async function submitListening(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = z.object({ profileId: z.string().uuid(), exerciseId: z.string().uuid() }).parse(Object.fromEntries(formData));
  const profile = await requireProfileAccess(session.user.id, input.profileId);
  const exercise = await db.listeningExercise.findUniqueOrThrow({ where: { id: input.exerciseId }, include: { questions: true } });
  const results = exercise.questions.map((question) => { const answer = String(formData.get(`question_${question.id}`) ?? "").trim(); return { question, answer, correct: answer.toLowerCase() === question.answerKey.trim().toLowerCase() }; });
  const score = results.length ? results.filter((item) => item.correct).length / results.length : 1;
  await db.$transaction(async (tx) => {
    await tx.listeningProgress.upsert({ where: { learnerProfileId_exerciseId: { learnerProfileId: input.profileId, exerciseId: input.exerciseId } }, update: { attempts: { increment: 1 }, score, completedAt: new Date() }, create: { learnerProfileId: input.profileId, exerciseId: input.exerciseId, attempts: 1, score, completedAt: new Date() } });
    for (const item of results) await recordMistakeResult(tx, { learnerProfileId: input.profileId, familyId: profile.familyId, module: "LISTENING", sourceType: "ListeningExercise", sourceId: exercise.id, questionId: item.question.id, prompt: item.question.prompt, answer: item.answer, correctAnswer: item.question.answerKey, explanation: item.question.explanation, correct: item.correct });
    await tx.learningActivity.create({ data: { learnerProfileId: input.profileId, familyId: profile.familyId, activityType: "LISTENING_COMPLETE", module: "LISTENING", score, sourceType: "ListeningExercise", sourceId: exercise.id } });
  });
  await completeTodayTaskForModule(session.user.id, input.profileId, "LISTENING", score);
  revalidatePath("/learn/listening");
}
