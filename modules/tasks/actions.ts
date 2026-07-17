"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireProfileAccess } from "@/modules/learner/access";
import { ensureDailyTasks } from "./service";
import { completeTaskForUser } from "./completion";

export async function generateDailyTasks(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED"); const profileId = z.string().uuid().parse(formData.get("profileId")); await ensureDailyTasks(session.user.id, profileId);
  revalidatePath("/tasks");
}

export async function completeDailyTask(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED"); const input = z.object({ taskId: z.string().uuid(), durationSeconds: z.coerce.number().int().min(0).max(86400).default(0) }).parse(Object.fromEntries(formData));
  await completeTaskForUser(session.user.id, input.taskId, input.durationSeconds); revalidatePath("/tasks"); revalidatePath("/dashboard");
}

export async function skipDailyTask(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED"); const input = z.object({ taskId: z.string().uuid(), reason: z.string().trim().min(2).max(300) }).parse(Object.fromEntries(formData)); const task = await db.dailyTask.findUniqueOrThrow({ where: { id: input.taskId }, include: { completions: true } }); await requireProfileAccess(session.user.id, task.learnerProfileId); if (task.status === "COMPLETED") return; await db.$transaction([db.dailyTask.update({ where: { id: task.id }, data: { status: "SKIPPED" } }), db.taskCompletion.create({ data: { taskId: task.id, attemptNo: task.completions.length + 1, durationSeconds: 0, earnedXp: 0, unfinishedReason: input.reason, needsMakeup: true } })]); revalidatePath("/tasks");
}
