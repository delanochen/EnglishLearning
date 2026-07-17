import type { DailyTaskType } from "@prisma/client";
import { db } from "@/lib/db";
import { completeTaskForUser } from "./completion";

function startOfUtcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Connects a verified learning result to today's matching task. Learning modules
 * call this only after their own result has been persisted, so task accuracy is
 * always system-calculated rather than entered by the learner.
 */
export async function completeTodayTaskForModule(
  userId: string,
  learnerProfileId: string,
  taskType: DailyTaskType,
  score?: number,
  durationSeconds?: number,
) {
  const task = await db.dailyTask.findFirst({
    where: {
      learnerProfileId,
      taskType,
      taskDate: startOfUtcToday(),
      status: { in: ["PENDING", "SKIPPED"] },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!task) return false;

  await completeTaskForUser(
    userId,
    task.id,
    durationSeconds && durationSeconds > 0 ? durationSeconds : task.estimatedMinutes * 60,
    score,
  );
  return true;
}
