import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProfilePicker } from "@/components/profile-picker";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { adjustLearningPlan, generateLearningPlan, rollbackLearningPlan } from "@/modules/planning/actions";

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ profile?: string }> }) {
  const session = await auth(); const query = await searchParams; const profiles = await getAccessibleProfiles(session!.user.id); const selected = profiles.find((profile) => profile.id === query.profile) ?? profiles[0];
  const plans = selected ? await db.learningPlan.findMany({ where: { learnerProfileId: selected.id }, include: { items: { orderBy: { scheduledDate: "asc" } } }, orderBy: [{ periodStart: "desc" }, { version: "desc" }], take: 10 }) : [];
  const active = plans.find((plan) => plan.status === "ACTIVE");
  return <div className="mx-auto max-w-6xl">
    <p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Learning plan</p><h1 className="mt-2 text-4xl font-black">个性化学习计划</h1>
    <ProfilePicker profiles={profiles} selectedId={selected?.id} pathname="/plans"/>
    {selected && <div className="mt-6 flex justify-end"><form action={generateLearningPlan}><input type="hidden" name="profileId" value={selected.id}/><button className="button-primary">{active ? "依据最近表现重新生成" : "生成本周计划"}</button></form></div>}
    {active && <section className="card mt-5">
      <div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold text-brand">第 {active.version} 版 · {active.generationSource}</p><h2 className="mt-1 text-2xl font-black">{active.periodStart.toLocaleDateString("zh-CN")} — {active.periodEnd.toLocaleDateString("zh-CN")}</h2><p className="mt-2">本周目标：{active.goals.join("、")}</p><p className="mt-2 text-sm text-muted">{active.adjustmentReason}</p></div>{active.supersedesId && <form action={rollbackLearningPlan}><input type="hidden" name="planId" value={active.id}/><button className="button-ghost">回滚上一版</button></form>}</div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><PlanList title="重点薄弱项目" items={active.focusAreas}/><PlanList title="推荐课程" items={active.recommendedCourses}/><PlanList title="推荐复习内容" items={active.reviewContent}/><PlanList title="四周阶段目标" items={active.stageGoals}/><PlanList title="动态调整建议" items={active.adjustmentSuggestions}/><div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800"><h3 className="font-black">月度评估</h3><p className="mt-2 text-sm text-muted">{active.monthlyEvaluation ?? "月底根据所有模块表现重新评估。"}</p></div></div>
      <h3 className="mt-7 text-xl font-black">每日任务安排</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{active.items.map((item) => <div className="rounded-2xl border p-4" key={item.id}><p className="text-xs font-bold text-brand">{item.scheduledDate.toLocaleDateString("zh-CN")} · {item.module}</p><h4 className="mt-1 font-black">{item.title}</h4><p className="mt-2 text-sm text-muted">{item.target} · {item.durationMinutes} 分钟</p></div>)}</div>
      <details className="mt-6 border-t pt-4"><summary className="cursor-pointer font-bold text-brand">人工调整计划</summary><form action={adjustLearningPlan} className="mt-4 grid gap-3 md:grid-cols-2"><input type="hidden" name="planId" value={active.id}/><label><span className="label">新目标</span><input className="input" name="goal" defaultValue={active.goals[0]} required/></label><label><span className="label">调整原因</span><input className="input" name="reason" placeholder="例如：本周考试，增加语法练习" required/></label><button className="button-primary md:col-span-2">保存为新版本</button></form></details>
    </section>}
    {selected && !active && <div className="card mt-6 text-center">尚未生成学习计划。</div>}
    {plans.some((plan) => plan.status !== "ACTIVE") && <details className="card mt-5"><summary className="cursor-pointer font-bold">历史版本</summary><div className="mt-4 space-y-2">{plans.filter((plan) => plan.status !== "ACTIVE").map((plan) => <p className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800" key={plan.id}>第 {plan.version} 版 · {plan.status} · {plan.adjustmentReason ?? plan.generationSource}</p>)}</div></details>}
  </div>;
}

function PlanList({ title, items }: { title: string; items: string[] }) { return <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800"><h3 className="font-black">{title}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{items.map((item) => <li key={item}>{item}</li>)}{!items.length && <li>根据后续学习数据生成</li>}</ul></div>; }
