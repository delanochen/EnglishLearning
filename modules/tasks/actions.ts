"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireProfileAccess } from "@/modules/learner/access";
import { planDailyTasks } from "./planner";

function startOfToday() { const date = new Date(); return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }

export async function generateDailyTasks(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED"); const profileId = z.string().uuid().parse(formData.get("profileId")); await requireProfileAccess(session.user.id, profileId);
  const learner = await db.learnerProfile.findUniqueOrThrow({ where: { id: profileId } }); const taskDate = startOfToday(); const existing = await db.dailyTask.count({ where: { learnerProfileId: profileId, taskDate } });
  if (!existing) await db.dailyTask.createMany({ data: planDailyTasks(learner.dailyMinutes).map((task) => ({ learnerProfileId: profileId, taskDate, ...task, generationReason: `按每日 ${learner.dailyMinutes} 分钟目标自动生成` })) });
  revalidatePath("/tasks");
}

export async function completeDailyTask(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED"); const input = z.object({ taskId: z.string().uuid(), durationSeconds: z.coerce.number().int().min(0).max(86400).default(0) }).parse(Object.fromEntries(formData));
  const task = await db.dailyTask.findUniqueOrThrow({ where: { id: input.taskId }, include: { completions: true } }); const profile = await requireProfileAccess(session.user.id, task.learnerProfileId); if (task.status === "COMPLETED") return;
  await db.$transaction([
    db.dailyTask.update({ where: { id: task.id }, data: { status: "COMPLETED" } }),
    db.taskCompletion.create({ data: { taskId: task.id, attemptNo: task.completions.length + 1, completedAt: new Date(), durationSeconds: input.durationSeconds, earnedXp: task.xpReward } }),
    db.learnerProfile.update({ where: { id: task.learnerProfileId }, data: { totalXp: { increment: task.xpReward } } }),
    db.learningActivity.create({ data: { learnerProfileId: task.learnerProfileId, familyId: profile.familyId, activityType: "TASK_COMPLETE", module: task.taskType, durationSeconds: input.durationSeconds, sourceType: "DailyTask", sourceId: task.id } })
  ]); revalidatePath("/tasks"); revalidatePath("/dashboard");
}
