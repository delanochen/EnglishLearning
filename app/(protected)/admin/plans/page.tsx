import { db } from "@/lib/db";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";

export default async function AdminPlansPage() {
  await requireSystemAdmin();
  const plans = await db.learningPlan.findMany({ take: 100, orderBy: { createdAt: "desc" }, include: { learnerProfile: { include: { familyMember: { include: { family: true } } } }, items: true } });
  return <div className="mx-auto max-w-6xl"><h1 className="text-4xl font-black">学习计划管理</h1><div className="card mt-6 space-y-3">{plans.map((plan) => <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800" key={plan.id}><div className="flex flex-wrap justify-between gap-2"><strong>{plan.learnerProfile.familyMember.displayName} · {plan.type} 计划</strong><span>{plan.status} · v{plan.version}</span></div><p className="text-sm text-muted">{plan.learnerProfile.familyMember.family.name} · {plan.items.length} 项 · {plan.periodStart.toLocaleDateString("zh-CN")} 至 {plan.periodEnd.toLocaleDateString("zh-CN")}</p></div>)}</div></div>;
}
