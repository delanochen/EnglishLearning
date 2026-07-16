"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireProfileAccess } from "@/modules/learner/access";
import { updateStreak } from "@/modules/streaks/streak";
import { planDailyTasks } from "./planner";

function startOfToday() { const date = new Date(); return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }

export async function generateDailyTasks(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED"); const profileId = z.string().uuid().parse(formData.get("profileId")); await requireProfileAccess(session.user.id, profileId);
  const [learner, mode] = await Promise.all([db.learnerProfile.findUniqueOrThrow({ where: { id: profileId } }), db.studyStreak.upsert({ where: { learnerProfileId: profileId }, update: {}, create: { learnerProfileId: profileId } })]);
  const taskDate = startOfToday(); const existing = await db.dailyTask.count({ where: { learnerProfileId: profileId, taskDate } }); const vacation = mode.vacationUntil && mode.vacationUntil >= taskDate;
  if (!existing && !mode.planPaused && !vacation) { const weekend = [0, 6].includes(taskDate.getUTCDay()); const minutes = weekend && mode.weekendMode ? Math.min(10, learner.dailyMinutes) : learner.dailyMinutes; await db.dailyTask.createMany({ data: planDailyTasks(minutes).map((task) => ({ learnerProfileId: profileId, taskDate, ...task, generationReason: weekend && mode.weekendMode ? "周末轻量模式" : `按每日 ${learner.dailyMinutes} 分钟目标自动生成` })) }); }
  revalidatePath("/tasks");
}

export async function completeDailyTask(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED"); const input = z.object({ taskId: z.string().uuid(), durationSeconds: z.coerce.number().int().min(0).max(86400).default(0), accuracy: z.coerce.number().min(0).max(100).optional() }).parse(Object.fromEntries(formData));
  const task = await db.dailyTask.findUniqueOrThrow({ where: { id: input.taskId }, include: { completions: true } }); const profile = await requireProfileAccess(session.user.id, task.learnerProfileId); if (task.status === "COMPLETED") return; const today = startOfToday();
  await db.$transaction(async (tx) => {
    await tx.dailyTask.update({ where: { id: task.id }, data: { status: "COMPLETED" } });
    await tx.taskCompletion.create({ data: { taskId: task.id, attemptNo: task.completions.length + 1, completedAt: new Date(), durationSeconds: input.durationSeconds, accuracy: input.accuracy == null ? null : input.accuracy / 100, earnedXp: task.xpReward } });
    const learner = await tx.learnerProfile.update({ where: { id: task.learnerProfileId }, data: { totalXp: { increment: task.xpReward } } });
    await tx.learningActivity.create({ data: { learnerProfileId: task.learnerProfileId, familyId: profile.familyId, activityType: "TASK_COMPLETE", module: task.taskType, durationSeconds: input.durationSeconds, score: input.accuracy == null ? null : input.accuracy / 100, sourceType: "DailyTask", sourceId: task.id } });
    const streak = await tx.studyStreak.upsert({ where: { learnerProfileId: task.learnerProfileId }, update: {}, create: { learnerProfileId: task.learnerProfileId } }); const next = updateStreak(streak.currentDays, streak.longestDays, streak.lastStudyDate, today); if (next.changed) { await tx.studyStreak.update({ where: { id: streak.id }, data: { currentDays: next.currentDays, longestDays: next.longestDays, lastStudyDate: today } }); await tx.studyStreakEvent.create({ data: { streakId: streak.id, studyDate: today, eventType: "STUDY" } }); }
    const completedTasks = await tx.taskCompletion.count({ where: { task: { learnerProfileId: task.learnerProfileId }, earnedXp: { gt: 0 } } }); const achievements = await tx.achievement.findMany({ where: { active: true } }); for (const achievement of achievements) { const progress = achievement.metric === "TASKS" ? completedTasks : achievement.metric === "STREAK" ? next.currentDays : learner.totalXp; await tx.userAchievement.upsert({ where: { learnerProfileId_achievementId: { learnerProfileId: task.learnerProfileId, achievementId: achievement.id } }, update: { progress, ...(progress >= achievement.threshold ? { earnedAt: new Date() } : {}) }, create: { learnerProfileId: task.learnerProfileId, achievementId: achievement.id, progress, earnedAt: progress >= achievement.threshold ? new Date() : null } }); }
  }); revalidatePath("/tasks"); revalidatePath("/dashboard");
}

export async function skipDailyTask(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED"); const input = z.object({ taskId: z.string().uuid(), reason: z.string().trim().min(2).max(300) }).parse(Object.fromEntries(formData)); const task = await db.dailyTask.findUniqueOrThrow({ where: { id: input.taskId }, include: { completions: true } }); await requireProfileAccess(session.user.id, task.learnerProfileId); if (task.status === "COMPLETED") return; await db.$transaction([db.dailyTask.update({ where: { id: task.id }, data: { status: "SKIPPED" } }), db.taskCompletion.create({ data: { taskId: task.id, attemptNo: task.completions.length + 1, durationSeconds: 0, earnedXp: 0, unfinishedReason: input.reason, needsMakeup: true } })]); revalidatePath("/tasks");
}
