import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export default async function Dashboard() {
  const session = await auth();
  const memberships = await db.familyMember.findMany({ where: { userId: session!.user.id, deletedAt: null }, include: { family: true, learnerProfile: true } });
  const profile = memberships.find((m) => m.learnerProfile)?.learnerProfile;
  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">今日学习</p><h1 className="mt-2 text-4xl font-black">你好，{session?.user.name ?? "学习者"}</h1><p className="mt-2 text-muted">阶段 1 基础平台已经就绪。学习任务将在核心学习 MVP 中接入。</p>
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="metric"><span className="text-muted">今日学习</span><strong className="text-3xl">0 分钟</strong></div><div className="metric"><span className="text-muted">连续学习</span><strong className="text-3xl">0 天</strong></div><div className="metric"><span className="text-muted">当前等级</span><strong className="text-3xl">{profile?.cefrLevel?.replace("_", "-") ?? "待测试"}</strong></div><div className="metric"><span className="text-muted">总经验值</span><strong className="text-3xl">{profile?.totalXp ?? 0} XP</strong></div>
    </section>
    <section className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_.6fr]"><div className="card"><h2 className="text-xl font-bold">下一步</h2><p className="mt-2 text-muted">先完善家庭成员和学习档案。水平测试及个性化任务将在后续阶段开放。</p><Link href="/family" className="button-primary mt-6 inline-block">管理家庭成员</Link></div><div className="card"><h2 className="font-bold">家庭</h2><p className="mt-4 text-3xl font-black">{memberships.length}</p><p className="text-muted">个关联档案</p></div></section>
  </div>;
}
