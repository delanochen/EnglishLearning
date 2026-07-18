import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { getActiveProfile } from "@/modules/learner/selection";
import { ensureDailyReading } from "@/modules/reading/daily";

export default async function ReadingPage() {
  const session = await auth();
  const english = (await cookies()).get("ui_locale")?.value === "en";
  const selected = await getActiveProfile(await getAccessibleProfiles(session!.user.id));
  const today = selected ? await ensureDailyReading(session!.user.id, selected.id) : null;
  const articles = selected ? await db.readingArticle.findMany({ where: { status: "PUBLISHED", level: selected.level ?? undefined, id: { not: today?.articleId } }, include: { progress: { where: { learnerProfileId: selected.id } } }, orderBy: { createdAt: "desc" }, take: 12 }) : [];
  const t = english
    ? { title: "Continuous personalized reading", help: "Your unfinished article is preserved. After completion, a new article is generated at your exact placement level—even on the same day.", today: "Current lesson", generated: "AI generated for your exact level", fallback: "Exact-level content", words: "words", audience: "For", done: "Completed", start: "Start reading", library: "More at your exact level", empty: "Complete placement first, or check the READING AI route. Other levels are never substituted." }
    : { title: "连续个性化分级阅读", help: "未完成文章会一直保留；完成后即使仍是当天，也会按当前成员的准确测试等级生成下一篇。", today: "当前阅读", generated: "AI 按本人准确等级生成", fallback: "准确等级内容", words: "词", audience: "适合", done: "已完成", start: "开始阅读", library: "本人准确等级的更多文章", empty: "请先完成水平测试，或检查 READING 路由；系统不会用其他等级文章兜底。" };

  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Daily Reading</p><h1 className="mt-2 text-4xl font-black">{t.title}</h1><p className="mt-2 text-muted">{t.help}</p>
    {selected && today && <Link className="mt-8 block overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-950 via-indigo-800 to-cyan-700 p-7 text-white shadow-xl transition hover:-translate-y-1 md:p-10" href={`/learn/reading/${today.article.id}`}><div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black">{t.today} · {today.article.level}</span><span className="text-sm text-white/70">{today.generationSource === "AI" ? t.generated : t.fallback}</span></div><h2 className="mt-8 max-w-4xl text-4xl font-black md:text-6xl">{today.article.title}</h2><p className="mt-4 text-lg text-white/75">{today.article.topic} · {today.article.wordCount} {t.words} · {t.audience} {today.article.audience}</p><p className="mt-8 text-xl font-black">{today.article.progress[0]?.completedAt ? `${t.done} · ${Math.round((today.article.progress[0].score ?? 0) * 100)}` : `${t.start} →`}</p></Link>}
    {selected && !today && <div className="card mt-8">{t.empty}</div>}
    {articles.length > 0 && <section className="mt-10"><h2 className="text-2xl font-black">{t.library}</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{articles.map((article) => <Link className="card transition hover:-translate-y-1 hover:border-brand" href={`/learn/reading/${article.id}`} key={article.id}><div className="flex justify-between"><span className="text-sm font-bold text-brand">{article.level} · {article.topic}</span><span className="text-sm text-muted">{article.wordCount} {t.words}</span></div><h3 className="mt-3 text-2xl font-black">{article.title}</h3><p className="mt-4 font-semibold">{article.progress[0]?.completedAt ? `${t.done} · ${Math.round((article.progress[0].score ?? 0) * 100)}` : `${t.start} →`}</p></Link>)}</div></section>}
  </div>;
}

