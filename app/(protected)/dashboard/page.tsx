import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { getActiveProfile } from "@/modules/learner/selection";
import { xpLevel } from "@/modules/achievements/level";
import { ensureDailyTasks } from "@/modules/tasks/service";

export default async function Dashboard() {
  const session = await auth();
  const english = (await cookies()).get("ui_locale")?.value === "en";
  const selected = await getActiveProfile(await getAccessibleProfiles(session!.user.id));
  if(selected)await ensureDailyTasks(session!.user.id,selected.id);
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [learner, activities, tasks, recentWords, mistakes] = selected ? await Promise.all([
    db.learnerProfile.findUnique({ where: { id: selected.id }, include: { studyStreak: { include: { events: { orderBy: { studyDate: "desc" }, take: 14 } } }, achievements: { where: { earnedAt: { not: null } }, include: { achievement: true }, orderBy: { earnedAt: "desc" }, take: 3 } } }),
    db.learningActivity.findMany({ where: { learnerProfileId: selected.id, occurredAt: { gte: todayStart } }, orderBy: { occurredAt: "desc" } }),
    db.dailyTask.findMany({ where: { learnerProfileId: selected.id, OR:[{status:{in:["PENDING","IN_PROGRESS","SKIPPED"]}},{taskDate:todayStart}] } }),
    db.userVocabularyProgress.findMany({ where: { learnerProfileId: selected.id }, take: 5, orderBy: { updatedAt: "desc" }, include: { vocabulary: true } }),
    db.mistakeRecord.findMany({ where: { learnerProfileId: selected.id, status: "OPEN" }, take: 5, orderBy: { updatedAt: "desc" } }),
  ]) : [null, [], [], [], []];
  const minutes = Math.round(activities.reduce((sum, activity) => sum + activity.durationSeconds, 0) / 60);
  const completed = tasks.filter((task) => task.status === "COMPLETED").length;
  const checkedIn = completed > 0;
  const level = xpLevel(learner?.totalXp ?? 0);
  const t = english ? {
    eyebrow: "Today’s learning", hello: "Hello", learner: "Learner", overview: "learning overview", noProfile: "Create a learner profile to begin", todayStudy: "Today", minutes: "minutes", todayTasks: "Tasks", streak: "Streak", days: "days", level: "Level", pending: "Not assessed", xp: "Total XP", checkin:"Daily check-in",checked:"Checked in today!",notChecked:"Complete at least one learning task to check in",badges:"Badge wall",unlocked:"Recently unlocked",taskTitle: "Today’s tasks", taskBody: "Your daily goal is divided into vocabulary, reading, speaking, and other practice.", viewTasks: "View tasks", createProfile: "Create profile", recommended: "Recommended course", recommendedBody: "Prioritized from your level, interests, and weak areas.", enterCourse: "Open recommendation", tutor: "AI English tutor", tutorBody: "Get graded explanations, corrections, hints, and natural expressions.", start: "Start now", recentWords: "Recent words", noWords: "Vocabulary activity will appear here.", recentMistakes: "Recent mistakes", noMistakes: "No recent grammar mistakes.", plan: "Learning plan", report: "Learning report", family: "Family overview",
  } : {
    eyebrow: "今日学习", hello: "你好", learner: "学习者", overview: "的学习概览", noProfile: "请先创建一个学习档案", todayStudy: "今日学习", minutes: "分钟", todayTasks: "今日任务", streak: "连续学习", days: "天", level: "当前等级", pending: "待测试", xp: "总经验值",checkin:"每日打卡",checked:"今天已成功打卡！",notChecked:"至少完成一项学习任务才算打卡成功",badges:"勋章墙",unlocked:"最近解锁", taskTitle: "今日任务", taskBody: "按每日目标自动安排词汇、阅读和口语等训练。", viewTasks: "查看任务", createProfile: "创建档案", recommended: "推荐课程", recommendedBody: "根据当前等级优先安排生活场景、阅读与薄弱项复习。", enterCourse: "进入推荐课程", tutor: "AI 英语老师", tutorBody: "获得分级讲解、纠错、逐步提示与自然表达建议。", start: "快速开始", recentWords: "最近单词", noWords: "完成词汇练习后会显示在这里。", recentMistakes: "最近错题", noMistakes: "暂时没有语法错题。", plan: "学习计划", report: "学习报告", family: "家庭概况",
  };

  return <div className="mx-auto max-w-6xl">
    <p className="text-sm font-bold uppercase tracking-[.2em] text-brand">{t.eyebrow}</p>
    <h1 className="mt-2 text-4xl font-black">{t.hello}，{session?.user.name ?? t.learner}</h1>
    <p className="mt-2 text-muted">{selected ? `${selected.name} ${t.overview}` : t.noProfile}</p>
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {[[t.todayStudy, `${minutes} ${t.minutes}`], [t.todayTasks, `${completed}/${tasks.length}`], [t.streak, `${learner?.studyStreak?.currentDays ?? 0} ${t.days}`], [t.level, learner?.cefrLevel?.replace("_", "-") ?? t.pending], [t.xp, `${learner?.totalXp ?? 0} XP`]].map(([label, value]) => <div className="metric" key={label}><span className="text-muted">{label}</span><strong className="text-3xl">{value}</strong></div>)}
    </section>
    {learner && <section className="card mt-6 bg-gradient-to-r from-brand/10 to-amber-50 dark:to-slate-900"><div className="flex flex-wrap items-center justify-between gap-5"><div><p className="text-sm font-bold text-brand">{t.checkin}</p><h2 className="mt-1 text-2xl font-black">{checkedIn?`✓ ${t.checked}`:t.notChecked}</h2><p className="mt-2 text-muted">🔥 {learner.studyStreak?.currentDays??0} {t.days} · {english?level.en:level.zh} · {learner.totalXp} XP</p></div><div className="flex items-center gap-3">{learner.achievements.map(item=><span className="text-3xl" title={english?(item.achievement.nameEn??item.achievement.name):item.achievement.name} key={item.id}>{item.achievement.icon}</span>)}<Link className="button-primary" href="/achievements">{t.badges}</Link></div></div><div className="mt-5 grid grid-cols-7 gap-2">{Array.from({length:7},(_,index)=>{const date=new Date(todayStart);date.setUTCDate(date.getUTCDate()-6+index);const active=learner.studyStreak?.events.some(event=>event.studyDate.getTime()===date.getTime());return <div className={active?"rounded-xl bg-brand p-2 text-center text-white dark:text-slate-950":"rounded-xl bg-white/70 p-2 text-center text-muted dark:bg-slate-800"} key={date.toISOString()}><span className="block text-xs">{date.toLocaleDateString(english?"en-US":"zh-CN",{weekday:"short",timeZone:"UTC"})}</span><strong>{date.getUTCDate()}</strong></div>})}</div></section>}
    <section className="mt-8 grid gap-5 lg:grid-cols-3">
      <div className="card"><h2 className="text-xl font-bold">{t.taskTitle}</h2><p className="mt-2 text-muted">{t.taskBody}</p><Link href={selected ? "/tasks" : "/family"} className="button-primary mt-6 inline-block">{selected ? t.viewTasks : t.createProfile}</Link></div>
      <div className="card"><h2 className="text-xl font-bold">{t.recommended}</h2><p className="mt-2 text-muted">{t.recommendedBody}</p><Link href="/learn/scenarios" className="button-ghost mt-6 inline-block">{t.enterCourse}</Link></div>
      <div className="card"><h2 className="text-xl font-bold">{t.tutor}</h2><p className="mt-2 text-muted">{t.tutorBody}</p><Link href="/learn/tutor" className="button-ghost mt-6 inline-block">{t.start}</Link></div>
    </section>
    <section className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="card"><h2 className="text-xl font-black">{t.recentWords}</h2>{recentWords.map((item) => <p className="mt-2" key={item.id}><strong>{item.vocabulary.word}</strong> · {Math.round(item.mastery * 100)}% · {item.state}</p>)}{!recentWords.length && <p className="mt-2 text-muted">{t.noWords}</p>}</div>
      <div className="card"><h2 className="text-xl font-black">{t.recentMistakes}</h2>{mistakes.map((item) => <details className="mt-2 rounded-xl border p-3" key={item.id}><summary className="cursor-pointer"><strong>{item.module}</strong> · {item.prompt}</summary><p className="mt-2 text-sm text-muted">{english ? "Your answer" : "你的答案"}：{item.answer || "—"}</p><p className="mt-1 text-sm">{english ? "Correct answer" : "正确答案"}：{item.correctAnswer}</p>{item.explanation && <p className="mt-1 text-sm text-muted">{item.explanation}</p>}</details>)}{!mistakes.length && <p className="mt-2 text-muted">{t.noMistakes}</p>}</div>
    </section>
    <div className="mt-5 flex gap-3"><Link href={selected ? "/plans" : "/family"} className="button-ghost">{t.plan}</Link><Link href={selected ? "/reports" : "/family"} className="button-ghost">{t.report}</Link><Link href="/family-dashboard" className="button-ghost">{t.family}</Link></div>
  </div>;
}
