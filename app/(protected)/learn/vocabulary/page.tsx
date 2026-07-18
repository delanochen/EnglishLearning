import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { VocabularySlideDeck } from "@/components/vocabulary-slide-deck";
import { VocabularyGame } from "@/components/vocabulary-game";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { getActiveProfile } from "@/modules/learner/selection";
import { updateVocabularyGoal } from "@/modules/vocabulary/actions";
import { vocabularyLevelFallbacks } from "@/modules/vocabulary/levels";

export default async function VocabularyPage() {
  const session = await auth();
  const english = (await cookies()).get("ui_locale")?.value === "en";
  const selected = await getActiveProfile(await getAccessibleProfiles(session!.user.id));
  const learner = selected ? await db.learnerProfile.findUnique({ where: { id: selected.id }, select: { cefrLevel: true, dailyVocabularyGoal: true } }) : null;
  const now = new Date();
  const preferredLevels=learner?.cefrLevel?vocabularyLevelFallbacks(learner.cefrLevel):[];
  const availableWords = learner?.cefrLevel ? await db.vocabulary.findMany({
    where: { status: "PUBLISHED", level: {in:preferredLevels}, ...(selected ? { OR: [{ progress: { some: { learnerProfileId: selected.id, nextReviewAt: { lte: now } } } }, { progress: { some: { learnerProfileId: selected.id, nextReviewAt: null } } }, { progress: { none: { learnerProfileId: selected.id } } }] } : {}) },
    include: { meanings: true, examples: true, relationsFrom: { include: { target: true } }, progress: selected ? { where: { learnerProfileId: selected.id } } : false },
    orderBy: [{ topic: "asc" }, { word: "asc" }],
    take: (learner?.dailyVocabularyGoal ?? 10)*preferredLevels.length
  }) : [];
  const levelRank=new Map(preferredLevels.map((level,index)=>[level,index]));
  const words=availableWords.sort((a,b)=>(levelRank.get(a.level)??99)-(levelRank.get(b.level)??99)).slice(0,learner?.dailyVocabularyGoal??10);
  const t = english
    ? { title: "Vocabulary learning and review", help: `Your suggested batch follows your ${learner?.cefrLevel?.replace("_", "-") ?? "placement-pending"} level. Finishing a batch never stops you from learning more.`,goal:"Words per batch",save:"Update goal",noZh: "No Chinese explanation", empty: "No vocabulary is due for this level today." }
    : { title: "单词学习与复习", help: `每组数量只是自定义学习目标，不是每日上限；完成后仍可继续下一组。优先选择测试等级 ${learner?.cefrLevel?.replace("_", "-") ?? "待测试"}，不足时由相邻等级补充。`,goal:"每组单词数量",save:"更新目标", noZh: "暂无中文解释", empty: "词库中还没有可用单词，请先由管理员导入或发布词条。" };

  const slides = words.map((word) => {
    const progress = word.progress[0];
    const example = word.examples[0];
    return {
      id: word.id,
      word: word.word,
      phonetic: word.phonetic,
      partOfSpeech: word.partOfSpeech ?? "word",
      definitionEn: word.definitionEn,
      meaning: word.meanings[0]?.definition ?? t.noZh,
      topic: word.topic,
      state: progress?.state ?? "NEW",
      mastery: progress?.mastery ?? 0,
      nextReview: progress?.nextReviewAt?.toLocaleDateString(english ? "en-US" : "zh-CN") ?? null,
      example: example?.sentence ?? null,
      translation: example?.translation ?? null,
      collocations: example?.collocations ?? [],
      synonyms: word.relationsFrom.filter((item) => item.type === "SYNONYM").map((item) => item.target.word),
      antonyms: word.relationsFrom.filter((item) => item.type === "ANTONYM").map((item) => item.target.word)
    };
  });

  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Vocabulary Studio</p><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="mt-2 text-4xl font-black">{t.title}</h1><p className="mt-2 text-muted">{t.help}</p></div>{selected&&learner&&<form action={updateVocabularyGoal} className="flex items-end gap-2"><input type="hidden" name="profileId" value={selected.id}/><label><span className="label">{t.goal}</span><input className="input mt-0 w-28" name="dailyVocabularyGoal" type="number" min="1" max="100" defaultValue={learner.dailyVocabularyGoal}/></label><button className="button-ghost">{t.save}</button></form>}</div>{selected && slides.length > 0 && <><VocabularyGame profileId={selected.id} slides={slides} english={english}/><details className="mt-6"><summary className="cursor-pointer text-lg font-black text-brand">{english?"Open PPT learning deck":"打开 PPT 单词学习卡"}</summary><VocabularySlideDeck profileId={selected.id} slides={slides} english={english}/></details></>} {selected && !slides.length && <div className="card mt-7">{t.empty}</div>}<p className="mt-8 text-xs text-muted">{english?"Optional open dictionary data: Open English WordNet 2025, CC BY 4.0.":"可选开放词库来源：Open English WordNet 2025，采用 CC BY 4.0 许可。"} <a className="underline" href="https://en-word.net/" target="_blank" rel="noreferrer">en-word.net</a></p></div>;
}
