import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";

export default async function AdminPlansPage() {
  await requireSystemAdmin();
  const english = (await cookies()).get("ui_locale")?.value === "en";
  const plans = await db.learningPlan.findMany({ take: 100, orderBy: { createdAt: "desc" }, include: { learnerProfile: { include: { familyMember: { include: { family: true } } } }, items: true } });
  const t=english?{title:"Learning plan management",plan:"plan",items:"items",to:"to",empty:"No learning plans have been generated yet."}:{title:"学习计划管理",plan:"计划",items:"项",to:"至",empty:"尚未生成学习计划。"}; const locale=english?"en-US":"zh-CN";
  return <div className="mx-auto max-w-6xl"><h1 className="text-4xl font-black">{t.title}</h1><div className="card mt-6 space-y-3">{plans.map((plan) => <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800" key={plan.id}><div className="flex flex-wrap justify-between gap-2"><strong>{plan.learnerProfile.familyMember.displayName} · {plan.type} {t.plan}</strong><span>{plan.status} · v{plan.version}</span></div><p className="text-sm text-muted">{plan.learnerProfile.familyMember.family.name} · {plan.items.length} {t.items} · {plan.periodStart.toLocaleDateString(locale)} {t.to} {plan.periodEnd.toLocaleDateString(locale)}</p></div>)}{!plans.length&&<p className="text-muted">{t.empty}</p>}</div></div>;
}
