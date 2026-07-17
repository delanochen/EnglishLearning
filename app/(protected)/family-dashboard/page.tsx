import { auth } from "@/auth";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getAccessContext } from "@/modules/authorization/context";
import { canManageFamily } from "@/modules/authorization/policy";
import { updateFamilyLearningSettings } from "@/modules/family/actions";

const DAY = 86_400_000;

export default async function FamilyDashboardPage() {
  const session = await auth();
  const english = (await cookies()).get("ui_locale")?.value === "en";
  const context = await getAccessContext(session!.user.id);
  const now = new Date();
  const currentWeekStart = new Date(now.getTime() - 7 * DAY);
  const previousWeekStart = new Date(now.getTime() - 14 * DAY);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const families = await db.family.findMany({
    where: { deletedAt: null, OR: [{ ownerUserId: session!.user.id }, { members: { some: { userId: session!.user.id, deletedAt: null } } }] },
    include: { members: { where: { deletedAt: null, learnerProfile: { isNot: null } }, include: { learnerProfile: { include: { studyStreak: true, vocabularyProgress: { where: { state: "MASTERED" } }, dailyTasks: { where: { taskDate: { gte: currentWeekStart } } }, activities: { where: { occurredAt: { gte: previousWeekStart } }, orderBy: { occurredAt: "desc" } }, weeklyReports: { take: 1, orderBy: { generatedAt: "desc" } } } } } } },
  });
  const t = english ? { title: "Family learning dashboard", goal: "Shared goal", noGoal: "Not set", leaderboard: "Family leaderboard enabled", member: "Member", time: "Today / week", progress: "Weekly change", compared: "vs previous 7 days", streak: "Streak", tasks: "Tasks", mastered: "Words mastered", accuracy: "Accuracy", recent: "Recent learning", advice: "Alert / next-week advice", minutes: "min", days: "days", none: "None", inactive: "No activity for 7 days", fallbackLow: "Reduce the task load and prioritize weak areas", fallbackGood: "Keep the current pace", sharedGoal: "Family shared goal", goalPlaceholder: "For example: study five days per week as a family", enableLeaderboard: "Enable leaderboard", save: "Save settings" } : { title: "家庭学习仪表盘", goal: "共同目标", noGoal: "尚未设置", leaderboard: "家庭排行榜已开启", member: "成员", time: "今日 / 本周", progress: "本周进步", compared: "较前 7 天", streak: "连续", tasks: "任务", mastered: "掌握单词", accuracy: "正确率", recent: "最近内容", advice: "提醒 / 下周建议", minutes: "分钟", days: "天", none: "暂无", inactive: "7 天无活动", fallbackLow: "减少任务量并优先完成薄弱项", fallbackGood: "保持当前节奏", sharedGoal: "家庭共同目标", goalPlaceholder: "例如：全家每周学习 5 天", enableLeaderboard: "开启排行榜", save: "保存设置" };

  return <div className="mx-auto max-w-7xl">
    <p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Family learning</p>
    <h1 className="mt-2 text-4xl font-black">{t.title}</h1>
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
        return { id: member.id, name: member.displayName, xp: profile.totalXp, rate, minutes, todayMinutes, progress, streak: profile.studyStreak?.currentDays ?? 0, tasks: completed, mastered: profile.vocabularyProgress.length, accuracy, recent: currentActivities.slice(0, 3).map((activity) => activity.module).join(english ? ", " : "、"), suggestion: profile.weeklyReports[0]?.recommendations[0] ?? (rate < 50 ? t.fallbackLow : t.fallbackGood), inactive: currentActivities.length === 0 };
      }).sort((a, b) => b.xp - a.xp);
      const manageable = canManageFamily(context, family.id);
      return <section className="card" key={family.id}>
        <div className="flex flex-wrap justify-between gap-4"><div><h2 className="text-2xl font-black">{family.name}</h2><p className="mt-1 text-muted">{t.goal}: {family.sharedGoal ?? t.noGoal}</p></div>{family.leaderboardEnabled && <span className="rounded-full bg-brand/10 px-4 py-2 font-bold text-brand">{t.leaderboard}</span>}</div>
        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1150px] text-left text-sm"><thead><tr className="border-b"><th className="p-3">{t.member}</th><th>{t.time}</th><th>{t.progress}</th><th>{t.streak}</th><th>{t.tasks}</th><th>{t.mastered}</th><th>{t.accuracy}</th><th>XP</th><th>{t.recent}</th><th>{t.advice}</th></tr></thead><tbody>{rows.map((row, index) => <tr className="border-b border-slate-100 dark:border-slate-800" key={row.id}><td className="p-3 font-bold">{family.leaderboardEnabled ? `${index + 1}. ` : ""}{row.name}</td><td>{row.todayMinutes} / {row.minutes} {t.minutes}</td><td><span className={row.progress > 0 ? "text-green-700" : row.progress < 0 ? "text-amber-700" : "text-muted"}>{row.progress > 0 ? "+" : ""}{row.progress} {t.minutes}</span><p className="text-xs text-muted">{t.compared}</p></td><td>{row.streak} {t.days}</td><td>{row.tasks} · {row.rate}%</td><td>{row.mastered}</td><td>{row.accuracy}%</td><td>{row.xp}</td><td>{row.recent || t.none}</td><td>{row.inactive ? <span className="text-amber-700">{t.inactive}</span> : row.suggestion}</td></tr>)}</tbody></table></div>
        {manageable && <form action={updateFamilyLearningSettings} className="mt-6 grid gap-4 border-t pt-5 md:grid-cols-[1fr_auto_auto]"><input type="hidden" name="familyId" value={family.id}/><label><span className="label">{t.sharedGoal}</span><input className="input" name="sharedGoal" defaultValue={family.sharedGoal ?? ""} placeholder={t.goalPlaceholder}/></label><label className="flex items-center gap-2 self-end pb-3"><input type="checkbox" name="leaderboardEnabled" defaultChecked={family.leaderboardEnabled}/>{t.enableLeaderboard}</label><button className="button-primary self-end">{t.save}</button></form>}
      </section>;
    })}</div>
  </div>;
}
