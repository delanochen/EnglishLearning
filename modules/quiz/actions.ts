"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { completeTaskForUser } from "@/modules/tasks/completion";
import { scoreQuiz } from "./scoring";

export async function submitQuiz(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const sessionId = String(formData.get("sessionId") ?? "");
  const quiz = await db.quizSession.findUniqueOrThrow({ where: { id: sessionId }, include: { questions: true, task: true } });
  if (quiz.completedAt) redirect(`/learn/quiz?task=${quiz.taskId}`);
  const result = scoreQuiz(quiz.questions, Object.fromEntries(quiz.questions.map((question) => [question.id, String(formData.get(`question_${question.id}`) ?? "")])));
  const score = result.score;
  await db.quizSession.update({ where: { id: quiz.id }, data: { score, completedAt: new Date() } });
  await completeTaskForUser(session.user.id, quiz.taskId, quiz.task.estimatedMinutes * 60, score);
  revalidatePath("/tasks"); revalidatePath("/learn/quiz");
  redirect(`/learn/quiz?task=${quiz.taskId}`);
}
