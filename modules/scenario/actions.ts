"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireProfileAccess } from "@/modules/learner/access";
import { recordMistakeResult } from "@/modules/mistakes/service";
import { scoreScenarioAnswers } from "./scoring";

export async function completeScenarioLesson(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = z.object({ profileId: z.string().uuid(), lessonId: z.string().uuid() }).parse(Object.fromEntries(formData));
  const profile = await requireProfileAccess(session.user.id, input.profileId);
  const lesson = await db.scenarioLesson.findUniqueOrThrow({ where: { id: input.lessonId }, include: { exercises: { orderBy: { order: "asc" } }, dialogues: true } });
  const answers = lesson.exercises.map((item) => String(formData.get(`exercise_${item.id}`) ?? ""));
  const score = scoreScenarioAnswers(lesson.exercises.map((item) => item.answerKey), answers);
  await db.$transaction(async (tx) => {
    await tx.scenarioProgress.upsert({ where: { learnerProfileId_lessonId: { learnerProfileId: input.profileId, lessonId: input.lessonId } }, update: { progressPercent: 100, score, completedAt: new Date(), lastDialogue: lesson.dialogues.length }, create: { learnerProfileId: input.profileId, lessonId: input.lessonId, progressPercent: 100, score, completedAt: new Date(), lastDialogue: lesson.dialogues.length } });
    for (let index = 0; index < lesson.exercises.length; index++) { const exercise = lesson.exercises[index]; const answer = answers[index]; await recordMistakeResult(tx, { learnerProfileId: input.profileId, familyId: profile.familyId, module: "SCENARIO", sourceType: "ScenarioLesson", sourceId: lesson.id, questionId: exercise.id, prompt: exercise.prompt, answer, correctAnswer: exercise.answerKey, explanation: exercise.explanation, correct: answer.trim().toLowerCase() === exercise.answerKey.trim().toLowerCase() }); }
    await tx.learningActivity.create({ data: { learnerProfileId: input.profileId, familyId: profile.familyId, activityType: "SCENARIO_COMPLETE", module: "SCENARIO", score, sourceType: "ScenarioLesson", sourceId: lesson.id } });
    await tx.learnerProfile.update({ where: { id: input.profileId }, data: { totalXp: { increment: 20 } } });
  });
  revalidatePath(`/learn/scenarios/${lesson.id}`); revalidatePath("/learn/scenarios");
}
