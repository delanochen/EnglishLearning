import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessContext } from "@/modules/authorization/context";
import { canManageFamily } from "@/modules/authorization/policy";
import { updateFamilyLearningSettings } from "@/modules/family/actions";

const DAY = 86_400_000;

export default async function FamilyDashboardPage() {
  const session = await auth();
  const context = await getAccessContext(session!.user.id);
  const now = new Date();
  const currentWeekStart = new Date(now.getTime() - 7 * DAY);
  const previousWeekStart = new Date(now.getTime() - 14 * DAY);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const families = await db.family.findMany({
    where: { deletedAt: null, OR: [{ ownerUserId: session!.user.id }, { members: { some: { userId: session!.user.id, deletedAt: null } } }] },
    include: { members: { where: { deletedAt: null, learnerProfile: { isNot: null } }, include: { learnerProfile: { include: { studyStreak: true, vocabularyProgress: { where: { state: "MASTERED" } }, dailyTasks: { where: { taskDate: { gte: currentWeekStart } } }, activities: { where: { occurredAt: { gte: previousWeekStart } }, orderBy: { occurredAt: "desc" } }, weeklyReports: { take: 1, orderBy: { generatedAt: "desc" } } } } } } },
  });

  return <div className="mx-auto max-w-7xl">
    <p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Family learning</p>
    <h1 className="mt-2 text-4xl font-black">家庭学习仪表盘</h1>
    <div className="mt-7 space-y-6">{families.map((family) => {
      const rows = family.members.map((member) => {
        const profile = member.learnerProfile!;
        const currentActivities = profile.activities.filter((activity) => activity.occurredAt >= currentWeekStart);
        const previousActivities = profile.activities.filter((activity) => activity.occurredAt < currentWeekStart);
        const completed = profile.dailyTasks.filter((task) => task.status === "COMPLETED").length;
        const rate = profile.dailyTasks.length ? Math.round(completed / profile.dailyTasks.length * 100) : 0;
        const minutes = Math.round(currentActivities.reduce((sum, activity) => sum + activity.durationSeconds, 0) / 60);
        const previousMinutes = Math.round(previousActivities.reduce((sum, activity) => sum + activity.durationSeconds, 0) / 60);
        const progress = minutes - previousMinutes;
        const todayMinutes = Math.round(currentActivities.filter((activity) => activity.occurredAt >= today).reduce((sum, activity) => sum + activity.durationSeconds, 0) / 60);
        const scores = currentActivities.flatMap((activity) => activity.score == null ? [] : [activity.score]);
        const accuracy = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 100) : 0;
        return { id: member.id, name: member.displayName, xp: profile.totalXp, rate, minutes, todayMinutes, progress, streak: profile.studyStreak?.currentDays ?? 0, tasks: completed, mastered: profile.vocabularyProgress.length, accuracy, recent: currentActivities.slice(0, 3).map((activity) => activity.module).join("、"), suggestion: profile.weeklyReports[0]?.recommendations[0] ?? (rate < 50 ? "减少任务量并优先完成薄弱项" : "保持当前节奏"), inactive: currentActivities.length === 0 };
      }).sort((a, b) => b.xp - a.xp);
      const manageable = canManageFamily(context, family.id);
      return <section className="card" key={family.id}>
        <div className="flex flex-wrap justify-between gap-4"><div><h2 className="text-2xl font-black">{family.name}</h2><p className="mt-1 text-muted">共同目标：{family.sharedGoal ?? "尚未设置"}</p></div>{family.leaderboardEnabled && <span className="rounded-full bg-brand/10 px-4 py-2 font-bold text-brand">家庭排行榜已开启</span>}</div>
        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1150px] text-left text-sm"><thead><tr className="border-b"><th className="p-3">成员</th><th>今日 / 本周</th><th>本周进步</th><th>连续</th><th>任务</th><th>掌握单词</th><th>正确率</th><th>XP</th><th>最近内容</th><th>提醒 / 下周建议</th></tr></thead><tbody>{rows.map((row, index) => <tr className="border-b border-slate-100 dark:border-slate-800" key={row.id}><td className="p-3 font-bold">{family.leaderboardEnabled ? `${index + 1}. ` : ""}{row.name}</td><td>{row.todayMinutes} / {row.minutes} 分钟</td><td><span className={row.progress > 0 ? "text-green-700" : row.progress < 0 ? "text-amber-700" : "text-muted"}>{row.progress > 0 ? "+" : ""}{row.progress} 分钟</span><p className="text-xs text-muted">较前 7 天</p></td><td>{row.streak} 天</td><td>{row.tasks} · {row.rate}%</td><td>{row.mastered}</td><td>{row.accuracy}%</td><td>{row.xp}</td><td>{row.recent || "暂无"}</td><td>{row.inactive ? <span className="text-amber-700">7 天无活动</span> : row.suggestion}</td></tr>)}</tbody></table></div>
        {manageable && <form action={updateFamilyLearningSettings} className="mt-6 grid gap-4 border-t pt-5 md:grid-cols-[1fr_auto_auto]"><input type="hidden" name="familyId" value={family.id}/><label><span className="label">家庭共同目标</span><input className="input" name="sharedGoal" defaultValue={family.sharedGoal ?? ""} placeholder="例如：全家每周学习 5 天"/></label><label className="flex items-center gap-2 self-end pb-3"><input type="checkbox" name="leaderboardEnabled" defaultChecked={family.leaderboardEnabled}/>开启排行榜</label><button className="button-primary self-end">保存设置</button></form>}
      </section>;
    })}</div>
  </div>;
}
