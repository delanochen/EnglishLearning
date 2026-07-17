import { auth } from "@/auth";
import { cookies } from "next/headers";
import Link from "next/link";
import { db } from "@/lib/db";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { getActiveProfile } from "@/modules/learner/selection";
import { generateDailyTasks, skipDailyTask } from "@/modules/tasks/actions";
import { updateStudyMode, useMakeupCredit } from "@/modules/streaks/actions";
import { ensureDailyTasks } from "@/modules/tasks/service";

function learningHref(taskType: string, taskId: string) {
  if (taskType === "QUIZ") return `/learn/quiz?task=${taskId}`;
  return {
    VOCABULARY: "/learn/vocabulary",
    READING: "/learn/reading",
    LISTENING: "/learn/listening",
    SPEAKING: "/learn/speaking",
    GRAMMAR: "/learn/grammar",
    WRITING: "/learn/writing",
    AI_TUTOR: "/learn/tutor",
  }[taskType] ?? "/learn";
}

export default async function TasksPage() {
  const session = await auth(); const english = (await cookies()).get("ui_locale")?.value === "en"; const selected = await getActiveProfile(await getAccessibleProfiles(session!.user.id)); if (selected) await ensureDailyTasks(session!.user.id, selected.id); const today = new Date(); const taskDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const tasks = selected ? await db.dailyTask.findMany({ where: { learnerProfileId: selected.id, taskDate }, include: { completions: true }, orderBy: { createdAt: "asc" } }) : [];
  const learner = selected ? await db.learnerProfile.findUnique({ where: { id: selected.id }, include: { studyStreak: true, achievements: { include: { achievement: true }, orderBy: { earnedAt: "desc" } } } }) : null; const mode = learner?.studyStreak; const vacation = mode?.vacationUntil && mode.vacationUntil >= taskDate;
  const taskCopy: Record<string, { title: string; description: string }> = {
    VOCABULARY: { title: "Vocabulary study and review", description: "Review due words and learn new vocabulary" },
    READING: { title: "Complete a graded reading", description: "Read an article and answer comprehension questions" },
    LISTENING: { title: "Listening comprehension", description: "Listen to the passage and complete comprehension questions" },
    SPEAKING: { title: "Speaking and shadowing", description: "Record your voice, review the transcript, and check your scores" },
    GRAMMAR: { title: "Weak grammar review", description: "Complete several types of grammar practice" },
    WRITING: { title: "English writing practice", description: "Submit a new version and review the feedback" },
    QUIZ: { title: "Mixed review quiz", description: "Review this week's vocabulary and mistakes" },
    AI_TUTOR: { title: "Talk with the AI tutor", description: "Practice useful expressions around an everyday topic" }
  };
  const t = english ? { title: "Daily learning tasks", streak: "Current streak", longest: "Longest streak", days: "days", credits: "Makeup credits", target: "Today's goal", minutes: "min", paused: "Plan paused", vacation: "Vacation mode", generated: "Today's plan is ready", generate: "Generate today's plan", settings: "Study schedule settings", pause: "Pause automatic planning", weekend: "Light weekend mode (10 min)", vacationEnd: "Vacation mode end date", saveMode: "Save study mode", useCredit: "Use one makeup credit", pendingMakeup: "Makeup required", start: "Start learning", makeup: "Do makeup", completed: "Completed", cannot: "Cannot complete today", reason: "Reason not completed", mark: "Mark for makeup", pausedEmpty: "The plan is paused.", vacationUntil: "Vacation mode until", noPlan: "No plan for today.", resume: "Resume the plan to distribute tasks from the daily time target.", achievements: "Achievements" } : { title: "每日学习任务", streak: "连续学习", longest: "最长纪录", days: "天", credits: "补签额度", target: "今日目标", minutes: "分钟", paused: "计划已暂停", vacation: "假期模式中", generated: "今日计划已生成", generate: "生成今日计划", settings: "学习节奏设置", pause: "暂停自动计划", weekend: "周末轻量模式（10 分钟）", vacationEnd: "假期模式截止日", saveMode: "保存学习模式", useCredit: "使用 1 次补签额度", pendingMakeup: "待补做", start: "开始学习", makeup: "开始补做", completed: "已完成", cannot: "今天无法完成", reason: "未完成原因", mark: "标记待补做", pausedEmpty: "计划处于暂停状态。", vacationUntil: "假期模式至", noPlan: "今天还没有计划。", resume: "恢复计划后可按每日时长自动分配任务。", achievements: "个人成就" };
  return <div className="mx-auto max-w-5xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Daily plan</p><h1 className="mt-2 text-4xl font-black">{t.title}</h1>{selected && <><section className="mt-6 grid gap-4 sm:grid-cols-3"><div className="metric"><span className="text-muted">{t.streak}</span><strong className="text-3xl">{mode?.currentDays ?? 0} {t.days}</strong></div><div className="metric"><span className="text-muted">{t.longest}</span><strong className="text-3xl">{mode?.longestDays ?? 0} {t.days}</strong></div><div className="metric"><span className="text-muted">{t.credits}</span><strong className="text-3xl">{mode?.freezeCredits ?? 1}</strong></div></section><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-muted">{t.target} {selected.dailyMinutes} {t.minutes} · {learner?.totalXp ?? 0} XP</p><form action={generateDailyTasks}><input type="hidden" name="profileId" value={selected.id}/><button className="button-primary" disabled={Boolean(mode?.planPaused || vacation)}>{mode?.planPaused ? t.paused : vacation ? t.vacation : tasks.length ? t.generated : t.generate}</button></form></div><details className="card mt-5"><summary className="cursor-pointer font-black">{t.settings}</summary><form action={updateStudyMode} className="mt-4 grid gap-4 md:grid-cols-2"><input type="hidden" name="profileId" value={selected.id}/><label className="flex items-center gap-2"><input type="checkbox" name="planPaused" defaultChecked={mode?.planPaused}/>{t.pause}</label><label className="flex items-center gap-2"><input type="checkbox" name="weekendMode" defaultChecked={mode?.weekendMode}/>{t.weekend}</label><label><span className="label">{t.vacationEnd}</span><input className="input" type="date" name="vacationUntil" defaultValue={mode?.vacationUntil?.toISOString().slice(0, 10)}/></label><button className="button-primary self-end">{t.saveMode}</button></form>{(mode?.freezeCredits ?? 1) > 0 && <form action={useMakeupCredit} className="mt-4 border-t pt-4"><input type="hidden" name="profileId" value={selected.id}/><button className="button-ghost">{t.useCredit}</button></form>}</details></>}
    <div className="mt-6 space-y-4">{tasks.map((task) => { const copy = english ? taskCopy[task.taskType] : null; return <article className="card" key={task.id}><div className="flex flex-wrap items-center justify-between gap-5"><div><span className="text-xs font-bold text-brand">{task.taskType}</span><h2 className="mt-1 text-xl font-black">{copy?.title ?? task.title}</h2><p className="mt-1 text-muted">{copy?.description ?? task.description} · {task.estimatedMinutes} {t.minutes} · +{task.xpReward} XP</p>{!english && <p className="mt-1 text-xs text-muted">{task.generationReason}</p>}{task.status === "SKIPPED" && <p className="mt-2 font-bold text-amber-700">{t.pendingMakeup} · {task.completions.at(-1)?.unfinishedReason}</p>}</div>{task.status === "COMPLETED" ? <span className="rounded-full bg-green-100 px-4 py-2 font-bold text-green-800">{t.completed} ✓</span> : <Link className="button-primary" href={learningHref(task.taskType, task.id)}>{task.status === "SKIPPED" ? t.makeup : t.start}</Link>}</div>{task.status === "PENDING" && <details className="mt-4 border-t pt-3"><summary className="cursor-pointer text-sm text-muted">{t.cannot}</summary><form action={skipDailyTask} className="mt-3 flex gap-2"><input type="hidden" name="taskId" value={task.id}/><input className="input mt-0" name="reason" placeholder={t.reason} required/><button className="button-ghost whitespace-nowrap">{t.mark}</button></form></details>}</article>; })}</div>
    {selected && !tasks.length && <div className="card mt-6 text-center"><p>{mode?.planPaused ? t.pausedEmpty : vacation ? `${t.vacationUntil} ${mode?.vacationUntil?.toLocaleDateString(english ? "en-US" : "zh-CN")}.` : t.noPlan}</p><p className="mt-2 text-sm text-muted">{t.resume}</p></div>}
    {learner && learner.achievements.length > 0 && <section className="card mt-6"><h2 className="text-xl font-black">{t.achievements}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{learner.achievements.map((item) => <div className={item.earnedAt ? "rounded-xl bg-brand/10 p-4" : "rounded-xl bg-slate-100 p-4 opacity-70 dark:bg-slate-800"} key={item.id}><span className="text-2xl">{item.achievement.icon}</span><strong className="ml-2">{item.achievement.name}</strong><p className="mt-1 text-sm text-muted">{item.achievement.description} · {Math.min(item.progress, item.achievement.threshold)}/{item.achievement.threshold}</p></div>)}</div></section>}
  </div>;
}

