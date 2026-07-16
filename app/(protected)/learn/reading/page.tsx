import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProfilePicker } from "@/components/profile-picker";
import { getAccessibleProfiles } from "@/modules/learner/access";

export default async function ReadingPage({ searchParams }: { searchParams: Promise<{ profile?: string }> }) {
  const session = await auth(); const params = await searchParams; const profiles = await getAccessibleProfiles(session!.user.id); const selected = profiles.find((p) => p.id === params.profile) ?? profiles[0];
  const articles = await db.readingArticle.findMany({ where: { status: "PUBLISHED", ...(selected?.level ? { level: selected.level } : {}) }, include: { progress: selected ? { where: { learnerProfileId: selected.id } } : false }, orderBy: { createdAt: "desc" } });
  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Reading</p><h1 className="mt-2 text-4xl font-black">分级阅读</h1><ProfilePicker profiles={profiles} selectedId={selected?.id} pathname="/learn/reading"/><div className="mt-7 grid gap-4 md:grid-cols-2">{selected && articles.map((article) => <Link className="card transition hover:-translate-y-1 hover:border-brand" href={`/learn/reading/${article.id}?profile=${selected.id}`} key={article.id}><div className="flex justify-between"><span className="text-sm font-bold text-brand">{article.level} · {article.topic}</span><span className="text-sm text-muted">{article.wordCount} 词</span></div><h2 className="mt-3 text-2xl font-black">{article.title}</h2><p className="mt-3 text-muted">适合：{article.audience}</p><p className="mt-4 font-semibold">{article.progress[0]?.completedAt ? `已完成 · ${Math.round((article.progress[0].score ?? 0) * 100)} 分` : "开始阅读 →"}</p></Link>)}</div>{selected && !articles.length && <div className="card mt-7">当前级别还没有阅读内容。</div>}</div>;
}
