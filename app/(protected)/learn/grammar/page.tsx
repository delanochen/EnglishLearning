import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { getActiveProfile } from "@/modules/learner/selection";

export default async function GrammarPage() {
  const session = await auth(); const english = (await cookies()).get("ui_locale")?.value === "en";
  const selected = await getActiveProfile(await getAccessibleProfiles(session!.user.id));
  const topics = await db.grammarTopic.findMany({ where: { status: "PUBLISHED", ...(selected?.level ? { level: selected.level } : {}) }, include: { progress: selected ? { where: { learnerProfileId: selected.id } } : false }, orderBy: { title: "asc" } });
  const t = english ? { title: "Grammar practice", mastery: "Mastery", learn: "Learn and practice", apply: "Use with AI Tutor", empty: "No grammar lessons are available for this level yet." } : { title: "语法训练", mastery: "掌握度", learn: "学习与练习", apply: "在 AI 对话中应用", empty: "当前级别还没有语法内容。" };
  return <div className="mx-auto max-w-5xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Grammar</p><h1 className="mt-2 text-4xl font-black">{t.title}</h1><div className="mt-7 grid gap-4 md:grid-cols-2">{selected && topics.map((topic) => <article className="card" key={topic.id}><span className="text-sm font-bold text-brand">{topic.level}</span><h2 className="mt-2 text-2xl font-black">{topic.title}</h2><p className="mt-3 line-clamp-2 text-muted">{english ? topic.ruleEn : topic.ruleZh}</p><p className="mt-4 font-bold">{t.mastery} {Math.round((topic.progress[0]?.mastery ?? 0) * 100)}%</p><div className="mt-4 flex flex-wrap gap-2"><Link className="button-primary" href={`/learn/grammar/${topic.id}`}>{t.learn}</Link><Link className="button-ghost" href={`/learn/tutor?topic=${encodeURIComponent(`Use ${topic.title} in a guided conversation`)}&style=STRICT`}>{t.apply}</Link></div></article>)}</div>{selected && !topics.length && <div className="card mt-7">{t.empty}</div>}</div>;
}


