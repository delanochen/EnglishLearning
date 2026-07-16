import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessibleProfiles } from "@/modules/learner/access";

export default async function Dashboard() {
  const session = await auth();
  const profiles = await getAccessibleProfiles(session!.user.id);
  const selected = profiles[0];
  const today = new Date(); const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const [learner, activities, tasks] = selected ? await Promise.all([
    db.learnerProfile.findUnique({ where: { id: selected.id }, include: { studyStreak: true } }),
    db.learningActivity.findMany({ where: { learnerProfileId: selected.id, occurredAt: { gte: todayStart } } }),
    db.dailyTask.findMany({ where: { learnerProfileId: selected.id, taskDate: todayStart } })
  ]) : [null, [], []];
  const minutes = Math.round(activities.reduce((sum, activity) => sum + activity.durationSeconds, 0) / 60);
  const completed = tasks.filter((task) => task.status === "COMPLETED").length;

  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">今日学习</p><h1 className="mt-2 text-4xl font-black">你好，{session?.user.name ?? "学习者"}</h1><p className="mt-2 text-muted">{selected ? `${selected.name} 的学习概览` : "请先创建一个学习档案"}</p>
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><div className="metric"><span className="text-muted">今日学习</span><strong className="text-3xl">{minutes} 分钟</strong></div><div className="metric"><span className="text-muted">今日任务</span><strong className="text-3xl">{completed}/{tasks.length}</strong></div><div className="metric"><span className="text-muted">连续学习</span><strong className="text-3xl">{learner?.studyStreak?.currentDays ?? 0} 天</strong></div><div className="metric"><span className="text-muted">当前等级</span><strong className="text-3xl">{learner?.cefrLevel?.replace("_", "-") ?? "待测试"}</strong></div><div className="metric"><span className="text-muted">总经验值</span><strong className="text-3xl">{learner?.totalXp ?? 0} XP</strong></div></section>
    <section className="mt-8 grid gap-5 lg:grid-cols-3"><div className="card"><h2 className="text-xl font-bold">今日任务</h2><p className="mt-2 text-muted">按每日目标自动安排词汇、阅读和口语等训练。</p><Link href={selected ? `/tasks?profile=${selected.id}` : "/family"} className="button-primary mt-6 inline-block">{selected ? "查看任务" : "创建档案"}</Link></div><div className="card"><h2 className="text-xl font-bold">本周计划</h2><p className="mt-2 text-muted">计划支持人工调整、版本历史和一键回滚。</p><Link href={selected ? `/plans?profile=${selected.id}` : "/family"} className="button-ghost mt-6 inline-block">打开计划</Link></div><div className="card"><h2 className="text-xl font-bold">学习报告</h2><p className="mt-2 text-muted">汇总完成率、学习时长、优势和改进建议。</p><Link href={selected ? `/reports?profile=${selected.id}` : "/family"} className="button-ghost mt-6 inline-block">查看报告</Link></div></section>
  </div>;
}
