import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { VocabularySlideDeck } from "@/components/vocabulary-slide-deck";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { getActiveProfile } from "@/modules/learner/selection";

export default async function VocabularyPage() {
  const session = await auth();
  const english = (await cookies()).get("ui_locale")?.value === "en";
  const selected = await getActiveProfile(await getAccessibleProfiles(session!.user.id));
  const learner = selected ? await db.learnerProfile.findUnique({ where: { id: selected.id }, select: { cefrLevel: true, dailyVocabularyGoal: true } }) : null;
  const now = new Date();
  const words = learner?.cefrLevel ? await db.vocabulary.findMany({
    where: { status: "PUBLISHED", level: learner.cefrLevel, ...(selected ? { OR: [{ progress: { some: { learnerProfileId: selected.id, nextReviewAt: { lte: now } } } }, { progress: { some: { learnerProfileId: selected.id, nextReviewAt: null } } }, { progress: { none: { learnerProfileId: selected.id } } }] } : {}) },
    include: { meanings: true, examples: true, relationsFrom: { include: { target: true } }, progress: selected ? { where: { learnerProfileId: selected.id } } : false },
    orderBy: [{ topic: "asc" }, { word: "asc" }],
    take: learner?.dailyVocabularyGoal ?? 10
  }) : [];
  const t = english
    ? { title: "Vocabulary learning and review", help: `Today's ${learner?.dailyVocabularyGoal ?? 10}-word lesson follows your ${learner?.cefrLevel?.replace("_", "-") ?? "placement-pending"} level.`, noZh: "No Chinese explanation", empty: "No vocabulary is due for this level today." }
    : { title: "单词学习与复习", help: `今日目标 ${learner?.dailyVocabularyGoal ?? 10} 个单词，难度跟随水平测试结果 ${learner?.cefrLevel?.replace("_", "-") ?? "待测试"}。`, noZh: "暂无中文解释", empty: "今天暂时没有该等级需要学习或复习的单词。" };

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

  return <div className="mx-auto max-w-6xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Vocabulary Studio</p><h1 className="mt-2 text-4xl font-black">{t.title}</h1><p className="mt-2 text-muted">{t.help}</p>{selected && slides.length > 0 && <VocabularySlideDeck profileId={selected.id} slides={slides} english={english}/>} {selected && !slides.length && <div className="card mt-7">{t.empty}</div>}</div>;
}
