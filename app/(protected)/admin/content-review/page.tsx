import Link from "next/link";
import { ContentReviewWorkbench } from "@/components/content-review-workbench";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { listPendingReviews } from "@/modules/content-pipeline/reviews";

export default async function ContentReviewPage() {
  await requireSystemAdmin(); const reviews = await listPendingReviews(200);
  return <div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Quality review</p><h1 className="mt-2 text-4xl font-black">内容审核工作台</h1><p className="mt-2 text-muted">查看规则检查、AI 复核、难度差异和重复内容结果。批准只进入 APPROVED，仍需单独发布。</p></div><Link className="button-ghost" href="/admin/content-center">返回内容中心</Link></div><section className="card mt-7"><ContentReviewWorkbench rows={reviews.map((review)=>({id:review.id,contentType:review.contentType,contentId:review.contentId,reason:review.reason,qualityScore:review.qualityReport?.qualityScore??null,errors:review.qualityReport?.errors??[],warnings:review.qualityReport?.warnings??[],createdAt:review.createdAt.toISOString()}))}/></section></div>;
}
