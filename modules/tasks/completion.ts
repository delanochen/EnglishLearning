import { db } from "@/lib/db";
import { requireProfileAccess } from "@/modules/learner/access";
import { updateStreak } from "@/modules/streaks/streak";

function startOfToday() { const date = new Date(); return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }

export async function completeTaskForUser(userId: string, taskId: string, durationSeconds: number, score?: number) {
  const task = await db.dailyTask.findUniqueOrThrow({ where: { id: taskId }, include: { completions: true } });
  const profile = await requireProfileAccess(userId, task.learnerProfileId);
  if (task.status === "COMPLETED") return;
  const today = startOfToday();
  await db.$transaction(async (tx) => {
    await tx.dailyTask.update({ where: { id: task.id }, data: { status: "COMPLETED" } });
    await tx.taskCompletion.create({ data: { taskId: task.id, attemptNo: task.completions.length + 1, completedAt: new Date(), durationSeconds, accuracy: score, earnedXp: task.xpReward } });
    const learner = await tx.learnerProfile.update({ where: { id: task.learnerProfileId }, data: { totalXp: { increment: task.xpReward } } });
    await tx.learningActivity.create({ data: { learnerProfileId: task.learnerProfileId, familyId: profile.familyId, activityType: "TASK_COMPLETE", module: task.taskType, durationSeconds, score, sourceType: "DailyTask", sourceId: task.id } });
    const streak = await tx.studyStreak.upsert({ where: { learnerProfileId: task.learnerProfileId }, update: {}, create: { learnerProfileId: task.learnerProfileId } });
    const next = updateStreak(streak.currentDays, streak.longestDays, streak.lastStudyDate, today);
    if (next.changed) { await tx.studyStreak.update({ where: { id: streak.id }, data: { currentDays: next.currentDays, longestDays: next.longestDays, lastStudyDate: today } }); await tx.studyStreakEvent.create({ data: { streakId: streak.id, studyDate: today, eventType: "STUDY" } }); }
    const completedTasks = await tx.taskCompletion.count({ where: { task: { learnerProfileId: task.learnerProfileId }, earnedXp: { gt: 0 } } });
    const achievements = await tx.achievement.findMany({ where: { active: true } });
    for (const achievement of achievements) { const progress = achievement.metric === "TASKS" ? completedTasks : achievement.metric === "STREAK" ? next.currentDays : learner.totalXp; await tx.userAchievement.upsert({ where: { learnerProfileId_achievementId: { learnerProfileId: task.learnerProfileId, achievementId: achievement.id } }, update: { progress, ...(progress >= achievement.threshold ? { earnedAt: new Date() } : {}) }, create: { learnerProfileId: task.learnerProfileId, achievementId: achievement.id, progress, earnedAt: progress >= achievement.threshold ? new Date() : null } }); }
  });
}
