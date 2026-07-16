import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProfilePicker } from "@/components/profile-picker";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { reviewVocabulary } from "@/modules/vocabulary/actions";

export default async function VocabularyPage({ searchParams }: { searchParams: Promise<{ profile?: string }> }) {
  const session = await auth(); const params = await searchParams;
  const profiles = await getAccessibleProfiles(session!.user.id); const selected = profiles.find((p) => p.id === params.profile) ?? profiles[0];
  const words = await db.vocabulary.findMany({ where: { status: "PUBLISHED", ...(selected?.level ? { level: selected.level } : {}) }, include: { meanings: true, examples: true, progress: selected ? { where: { learnerProfileId: selected.id } } : false }, orderBy: [{ topic: "asc" }, { word: "asc" }], take: 30 });
  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Vocabulary</p><h1 className="mt-2 text-4xl font-black">单词复习</h1><p className="mt-2 text-muted">根据记忆结果自动安排下次复习。</p><ProfilePicker profiles={profiles} selectedId={selected?.id} pathname="/learn/vocabulary" />
    {selected && <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{words.map((word) => { const progress = word.progress[0]; return <article className="card" key={word.id}><div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-black">{word.word}</h2><p className="text-sm text-muted">{word.phonetic} · {word.partOfSpeech}</p></div><span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">{progress?.state ?? "NEW"}</span></div><p className="mt-4">{word.definitionEn}</p><p className="mt-2 text-muted">{word.meanings[0]?.definition}</p>{word.examples[0] && <blockquote className="mt-4 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">{word.examples[0].sentence}<br/><span className="text-muted">{word.examples[0].translation}</span></blockquote>}<form action={reviewVocabulary} className="mt-5"><input type="hidden" name="profileId" value={selected.id}/><input type="hidden" name="vocabularyId" value={word.id}/><p className="label mb-2">这次记得怎么样？</p><div className="grid grid-cols-3 gap-2"><button className="button-ghost" name="quality" value="1">忘记</button><button className="button-ghost" name="quality" value="3">困难</button><button className="button-primary" name="quality" value="5">熟练</button></div></form>{progress?.nextReviewAt && <p className="mt-3 text-xs text-muted">下次：{progress.nextReviewAt.toLocaleDateString("zh-CN")}</p>}</article>; })}</div>}
    {selected && !words.length && <div className="card mt-7">当前级别还没有词汇内容，管理员运行最新种子数据后即可显示。</div>}
  </div>;
}
