import { Prisma, type ContentReviewDecision, type ContentStatus } from "@prisma/client";
import { db } from "@/lib/db";

async function updateReviewedContent(tx: Prisma.TransactionClient, contentType: string, contentId: string, decision: ContentReviewDecision) {
  const status: ContentStatus = decision === "APPROVED" ? "APPROVED" : "REJECTED";
  const data = { status, reviewStatus: decision };
  if (contentType === "Vocabulary") return tx.vocabulary.update({ where: { id: contentId }, data });
  if (contentType === "ReadingArticle") return tx.readingArticle.update({ where: { id: contentId }, data });
  if (contentType === "GrammarTopic") return tx.grammarTopic.update({ where: { id: contentId }, data });
  if (contentType === "ScenarioLesson") return tx.scenarioLesson.update({ where: { id: contentId }, data });
  throw new Error(`UNSUPPORTED_CONTENT_REFERENCE:${contentType}`);
}

export async function decideContentReview(id: string, decision: "APPROVED" | "REJECTED", actorUserId: string, reason?: string) {
  return db.$transaction(async (tx) => {
    const review = await tx.contentReview.findUnique({ where: { id } });
    if (!review) throw new Error("CONTENT_REVIEW_NOT_FOUND");
    if (review.decision !== "PENDING" && review.decision !== "CHANGES_REQUESTED") throw new Error("CONTENT_REVIEW_ALREADY_DECIDED");
    await updateReviewedContent(tx, review.contentType, review.contentId, decision);
    const result = await tx.contentReview.update({ where: { id }, data: { decision, reviewerUserId: actorUserId, reason: reason || review.reason, reviewedAt: new Date() } });
    await tx.auditLog.create({ data: { actorUserId, action: `CONTENT_REVIEW_${decision}`, resourceType: review.contentType, resourceId: review.contentId, metadata: { reviewId: id } } });
    return result;
  });
}

export async function listPendingReviews(limit = 100) {
  const reviews = await db.contentReview.findMany({ where: { decision: { in: ["PENDING", "CHANGES_REQUESTED"] } }, orderBy: { createdAt: "asc" }, take: limit });
  const quality = await db.contentQualityReport.findMany({ where: { contentId: { in: reviews.map((review) => review.contentId) } }, orderBy: { createdAt: "desc" } });
  const latest = new Map<string, typeof quality[number]>();
  for (const report of quality) if (report.contentId && !latest.has(report.contentId)) latest.set(report.contentId, report);
  return reviews.map((review) => ({ ...review, qualityReport: latest.get(review.contentId) ?? null }));
}
