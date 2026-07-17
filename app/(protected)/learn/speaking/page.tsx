import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProfilePicker } from "@/components/profile-picker";
import { SpeakingRecorder } from "@/components/speaking-recorder";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { calculateSpeakingTrend } from "@/modules/speaking/trend";

const modes = [
  { id: "READ_ALOUD", zh: "朗读训练", en: "Read aloud", prompt: "Could I have a glass of water, please?" },
  { id: "SHADOWING", zh: "跟读训练", en: "Shadowing", prompt: "Excuse me, could you tell me where the nearest grocery store is?" },
  { id: "FREE_CONVERSATION", zh: "自由对话", en: "Free conversation", prompt: "Tell me about your day. Include one challenge, one success, and how you felt." },
  { id: "ROLE_PLAY", zh: "情景角色扮演", en: "Role play", prompt: "You are returning an item at a store. Explain the problem politely and ask for a refund or exchange." },
] as const;

export default async function SpeakingPage({ searchParams }: { searchParams: Promise<{ profile?: string; mode?: string }> }) {
  const session = await auth();
  const english = (await cookies()).get("ui_locale")?.value === "en";
  const query = await searchParams;
  const profiles = await getAccessibleProfiles(session!.user.id);
  const selected = profiles.find((profile) => profile.id === query.profile) ?? profiles[0];
  const practice = modes.find((mode) => mode.id === query.mode) ?? modes[0];
  const history = selected ? await db.speakingSession.findMany({ where: { learnerProfileId: selected.id }, include: { attempts: { include: { pronunciation: true, audioFile: true }, orderBy: { createdAt: "desc" } } }, orderBy: { startedAt: "desc" }, take: 20 }) : [];
  const allAttempts = history.flatMap((item) => item.attempts);
  const trend = calculateSpeakingTrend(allAttempts);
  const t = english ? { title: "Speaking practice", freeHelp: "Free conversation is scored for completeness, fluency, grammar, and naturalness; it does not require an exact match.", history: "Scores and improvement trend", recent: "Recent average", prior: "Previous five", improvement: "Change", needHistory: "Complete at least six attempts to compare improvement.", attempt: "attempt", youSaid: "You said", accuracy: "Accuracy", fluency: "Fluency", grammar: "Grammar", completeness: "Complete", naturalness: "Natural", rate: "Rate", wpm: "words/min", noRate: "not recorded", pauses: "pauses" } : { title: "口语训练", freeHelp: "自由表达按内容完整度、流利度、语法和自然度评分，不要求逐字匹配提示。", history: "评分历史与改进趋势", recent: "最近 5 次平均", prior: "此前 5 次", improvement: "进步幅度", needHistory: "完成至少 6 次练习后显示前后趋势。", attempt: "第", youSaid: "你说", accuracy: "准确", fluency: "流利", grammar: "语法", completeness: "完整", naturalness: "自然", rate: "语速", wpm: "词/分钟", noRate: "未记录", pauses: "停顿" };

  return <div className="mx-auto max-w-5xl">
    <p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Speaking</p><h1 className="mt-2 text-4xl font-black">{t.title}</h1>
    <ProfilePicker profiles={profiles} selectedId={selected?.id} pathname="/learn/speaking"/>
    {selected && <div className="mt-5 flex flex-wrap gap-2">{modes.map((mode) => <Link className={mode.id === practice.id ? "button-primary" : "button-ghost"} href={`/learn/speaking?profile=${selected.id}&mode=${mode.id}`} key={mode.id}>{english ? mode.en : mode.zh}</Link>)}</div>}
    {selected && <>
      <section className="card mt-7"><p className="label">{english ? practice.en : practice.zh}</p><h2 className="mt-2 text-2xl font-black">{practice.prompt}</h2>{practice.id === "FREE_CONVERSATION" && <p className="mt-2 text-muted">{t.freeHelp}</p>}<div className="mt-5"><SpeakingRecorder profileId={selected.id} prompt={practice.prompt} mode={practice.id} english={english}/></div></section>
      <section className="mt-7"><h2 className="text-2xl font-black">{t.history}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><TrendMetric label={t.recent} value={trend.recentAverage}/><TrendMetric label={t.prior} value={trend.previousAverage}/><TrendMetric label={t.improvement} value={trend.delta} signed/></div>
        {trend.delta == null && <p className="mt-2 text-sm text-muted">{t.needHistory}</p>}
        <div className="mt-4 space-y-3">{history.map((item) => { const attempt = item.attempts[0]; return <article className="card" key={item.id}><div className="flex flex-wrap justify-between gap-2"><p className="font-bold">[{item.mode}] {item.prompt}</p><span className="text-sm text-muted">{english ? `${t.attempt} ${attempt?.retryNo ?? 1}` : `${t.attempt} ${attempt?.retryNo ?? 1} 次`} · {item.startedAt.toLocaleString(english ? "en-US" : "zh-CN")}</span></div><p className="mt-2 text-muted">{t.youSaid}：{attempt?.transcript}</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5"><Score label={t.accuracy} value={attempt?.accuracyScore}/><Score label={t.fluency} value={attempt?.fluencyScore}/><Score label={t.grammar} value={attempt?.grammarScore}/><Score label={t.completeness} value={attempt?.completenessScore}/><Score label={t.naturalness} value={attempt?.naturalnessScore}/></div><p className="mt-3 text-sm">{t.rate}：{attempt?.speechRateWpm ? `${Math.round(attempt.speechRateWpm)} ${t.wpm}` : t.noRate} · {t.pauses}：{attempt?.pauseCount ?? 0}</p>{attempt?.audioFileId && <audio className="mt-3 w-full" controls src={`/api/uploads/${attempt.audioFileId}`}/>}<p className="mt-3 text-sm text-brand">{attempt?.feedback}</p>{attempt?.pronunciation.length ? <ul className="mt-3 list-disc pl-5 text-sm text-amber-800">{attempt.pronunciation.map((issue) => <li key={issue.id}>{issue.word}：{issue.suggestion}</li>)}</ul> : null}</article>; })}</div>
      </section>
    </>}
  </div>;
}

function Score({ label, value }: { label: string; value: number | null | undefined }) { return <div className="rounded-xl bg-slate-100 p-3 text-center dark:bg-slate-800"><span className="text-xs text-muted">{label}</span><p className="font-black">{Math.round((value ?? 0) * 100)}%</p></div>; }
function TrendMetric({ label, value, signed = false }: { label: string; value: number | null; signed?: boolean }) { const percent = value == null ? "—" : `${signed && value > 0 ? "+" : ""}${Math.round(value * 100)}%`; return <div className="metric"><span className="text-muted">{label}</span><strong className={signed && value != null ? value > 0 ? "text-3xl text-green-700" : value < 0 ? "text-3xl text-amber-700" : "text-3xl" : "text-3xl"}>{percent}</strong></div>; }
