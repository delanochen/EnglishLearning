import { Prisma, type ContentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { CreateContentJobInput } from "./schemas";
import { assertContentJobTransition, type PipelineStatus } from "./state-machine";

export async function createContentJob(input: CreateContentJobInput, actorUserId: string) {
  return db.$transaction(async (tx) => {
    const job = await tx.contentGenerationJob.create({ data: {
      type: input.type,
      totalItems: input.totalItems,
      priority: input.priority,
      maxRetries: input.maxRetries,
      aiProviderId: input.aiProviderId,
      aiModelId: input.aiModelId,
      maxTokens: input.maxTokens,
      maxBudget: input.maxBudget === null || input.maxBudget === undefined ? undefined : new Prisma.Decimal(input.maxBudget),
      configuration: input.configuration as Prisma.InputJsonValue,
      createdByUserId: actorUserId,
      logs: [{ at: new Date().toISOString(), event: "JOB_CREATED" }],
    } });
    await tx.auditLog.create({ data: { actorUserId, action: "CONTENT_JOB_CREATED", resourceType: "ContentGenerationJob", resourceId: job.id, metadata: { type: job.type, totalItems: job.totalItems } } });
    return job;
  });
}

export async function listContentJobs(input: { status?: ContentStatus; type?: CreateContentJobInput["type"]; limit: number; cursor?: string }) {
  return db.contentGenerationJob.findMany({
    where: { status: input.status, type: input.type }, take: input.limit,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { batches: true, items: true } } },
  });
}

export async function getContentJob(id: string) {
  return db.contentGenerationJob.findUnique({ where: { id }, include: { batches: { orderBy: { sequence: "asc" } }, items: { take: 100, orderBy: { sequence: "asc" } }, _count: { select: { items: true, reviews: true, qualityReports: true } } } });
}

export async function transitionContentJob(id: string, to: PipelineStatus, actorUserId: string, event: string) {
  return db.$transaction(async (tx) => {
    const current = await tx.contentGenerationJob.findUnique({ where: { id } });
    if (!current) throw new Error("CONTENT_JOB_NOT_FOUND");
    assertContentJobTransition(current.status as PipelineStatus, to);
    const now = new Date();
    const logs = Array.isArray(current.logs) ? current.logs : [];
    const result = await tx.contentGenerationJob.updateMany({
      where: { id, status: current.status },
      data: {
        status: to as ContentStatus,
        startedAt: to === "PROCESSING" && !current.startedAt ? now : undefined,
        finishedAt: ["FAILED", "CANCELED", "PUBLISHED", "ARCHIVED"].includes(to) ? now : undefined,
        errorMessage: to === "PENDING" ? null : undefined,
        retryCount: current.status === "FAILED" && to === "PENDING" ? { increment: 1 } : undefined,
        logs: [...logs, { at: now.toISOString(), event, from: current.status, to }] as Prisma.InputJsonValue,
      },
    });
    if (result.count !== 1) throw new Error("CONTENT_JOB_CONCURRENT_UPDATE");
    await tx.auditLog.create({ data: { actorUserId, action: event, resourceType: "ContentGenerationJob", resourceId: id, metadata: { from: current.status, to } } });
    return tx.contentGenerationJob.findUniqueOrThrow({ where: { id } });
  });
}

export async function retryFailedContentJob(id: string, actorUserId: string) {
  return db.$transaction(async (tx) => {
    const current = await tx.contentGenerationJob.findUnique({ where: { id } });
    if (!current) throw new Error("CONTENT_JOB_NOT_FOUND");
    if (!(["FAILED", "REVIEW_REQUIRED"] as ContentStatus[]).includes(current.status)) throw new Error(`INVALID_JOB_RETRY:${current.status}`);
    const failedItems = await tx.contentGenerationItem.findMany({ where: { jobId: id, status: "FAILED" }, select: { batchId: true } });
    const failed = failedItems.length;
    if (!failed) throw new Error("CONTENT_JOB_HAS_NO_FAILED_ITEMS");
    const now = new Date();
    const logs = Array.isArray(current.logs) ? current.logs : [];
    await tx.contentGenerationItem.updateMany({ where: { jobId: id, status: "FAILED" }, data: { status: "PENDING", errorCode: null, errorMessage: null, finishedAt: null } });
    const failedBatchIds = [...new Set(failedItems.flatMap((item) => item.batchId ? [item.batchId] : []))];
    for (const batchId of failedBatchIds) {
      await tx.contentGenerationBatch.update({ where: { id: batchId }, data: { status: "PROCESSING", failedItems: 0, finishedAt: null } });
    }
    const job = await tx.contentGenerationJob.update({ where: { id }, data: {
      status: "PROCESSING", failedItems: 0, finishedAt: null, errorMessage: null, retryCount: { increment: 1 },
      currentProgress: current.totalItems ? (current.completedItems / current.totalItems) * 100 : 0,
      logs: [...logs, { at: now.toISOString(), event: "CONTENT_JOB_FAILED_ITEMS_RETRIED", count: failed }] as Prisma.InputJsonValue,
    } });
    await tx.auditLog.create({ data: { actorUserId, action: "CONTENT_JOB_FAILED_ITEMS_RETRIED", resourceType: "ContentGenerationJob", resourceId: id, metadata: { count: failed } } });
    return job;
  });
}
