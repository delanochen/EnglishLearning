"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Brain, ChevronLeft, ChevronRight, Eye, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { reviewVocabulary } from "@/modules/vocabulary/actions";

export type VocabularySlide = {
  id: string;
  word: string;
  phonetic: string | null;
  partOfSpeech: string;
  definitionEn: string;
  meaning: string;
  topic: string;
  state: string;
  mastery: number;
  nextReview: string | null;
  example: string | null;
  translation: string | null;
  collocations: string[];
  synonyms: string[];
  antonyms: string[];
};

const palettes = [
  "from-teal-950 via-teal-800 to-cyan-700",
  "from-indigo-950 via-indigo-800 to-violet-700",
  "from-rose-950 via-rose-800 to-orange-700",
  "from-slate-950 via-slate-800 to-emerald-700"
];

export function VocabularySlideDeck({ profileId, slides, english }: { profileId: string; slides: VocabularySlide[]; english: boolean }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();
  const slide = slides[index];
  const ui = english
    ? { session: "Vocabulary session", instruction: "Say the meaning before revealing the answer", reveal: "Reveal answer", hide: "Hide answer", example: "In context", collocations: "Word partners", synonyms: "Similar", antonyms: "Opposite", forgot: "Forgot", hard: "Almost", mastered: "Got it", rate: "How well did you remember it?", complete: "Session complete", completeHelp: "You reviewed every word in this session.", again: "Review again", next: "Next slide", previous: "Previous slide", progress: "Session progress", mastery: "Mastery", due: "Next review" }
    : { session: "今日单词课堂", instruction: "先在心里说出含义，再揭晓答案", reveal: "揭晓答案", hide: "隐藏答案", example: "情境例句", collocations: "常用搭配", synonyms: "近义词", antonyms: "反义词", forgot: "忘记了", hard: "有点难", mastered: "记住了", rate: "这次记得怎么样？", complete: "本轮学习完成", completeHelp: "这一组单词已经全部复习，系统已安排后续复习时间。", again: "再学一遍", next: "下一页", previous: "上一页", progress: "课程进度", mastery: "掌握度", due: "下次复习" };

  const completed = Object.keys(reviewed).length === slides.length;
  const percent = slides.length ? Math.round(((index + 1) / slides.length) * 100) : 0;
  const dots = useMemo(() => slides.slice(Math.max(0, index - 4), Math.min(slides.length, index + 5)), [slides, index]);

  const move = useCallback((next: number) => {
    setIndex(Math.max(0, Math.min(slides.length - 1, next)));
    setRevealed(false);
  }, [slides.length]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") move(index + 1);
      if (event.key === "ArrowLeft") move(index - 1);
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setRevealed((value) => !value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, move]);

  function speak() {
    if (!slide) return;
    const utterance = new SpeechSynthesisUtterance(slide.word);
    utterance.lang = "en-US";
    utterance.rate = 0.78;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function rate(quality: number) {
    if (!slide) return;
    const currentId = slide.id;
    const data = new FormData();
    data.set("profileId", profileId);
    data.set("vocabularyId", currentId);
    data.set("quality", String(quality));
    startTransition(async () => {
      await reviewVocabulary(data);
      setReviewed((value) => ({ ...value, [currentId]: quality }));
      if (index < slides.length - 1) move(index + 1);
    });
  }

  if (!slide) return null;

  if (completed) return <section className="mt-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-950 via-teal-800 to-cyan-700 p-8 text-center text-white shadow-2xl md:p-14">
    <Sparkles className="mx-auto" size={54}/><h2 className="mt-5 text-4xl font-black">{ui.complete}</h2><p className="mx-auto mt-3 max-w-xl text-lg text-white/75">{ui.completeHelp}</p>
    <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-3"><Result value={Object.values(reviewed).filter((v) => v === 1).length} label={ui.forgot}/><Result value={Object.values(reviewed).filter((v) => v === 3).length} label={ui.hard}/><Result value={Object.values(reviewed).filter((v) => v === 5).length} label={ui.mastered}/></div>
    <button className="mt-8 rounded-2xl bg-white px-6 py-3 font-black text-teal-900" type="button" onClick={() => { setReviewed({}); move(0); }}><RotateCcw className="mr-2 inline" size={18}/>{ui.again}</button>
  </section>;

  return <section className="mt-8">
    <div className="mb-4 flex items-end justify-between gap-4"><div><p className="font-bold text-brand">{ui.session}</p><p className="text-sm text-muted">{ui.instruction}</p></div><p className="shrink-0 text-sm font-bold">{index + 1} / {slides.length}</p></div>
    <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-label={ui.progress}><div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${percent}%` }}/></div>

    <article className={`relative min-h-[34rem] overflow-hidden rounded-[2rem] bg-gradient-to-br ${palettes[index % palettes.length]} p-6 text-white shadow-2xl md:min-h-[38rem] md:p-10`}>
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"/><div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-black/15 blur-2xl"/>
      <div className="relative z-10 flex h-full min-h-[30rem] flex-col">
        <header className="flex items-start justify-between gap-4"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">{slide.topic}</span><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{slide.state}</span></div><span className="text-sm text-white/70">{ui.mastery} {Math.round(slide.mastery * 100)}%</span></header>

        <div className={`flex flex-1 flex-col justify-center transition-all duration-500 ${revealed ? "md:grid md:grid-cols-[.9fr_1.1fr] md:items-center md:gap-10" : "items-center text-center"}`}>
          <div className={revealed ? "" : "py-16"}><p className="text-sm font-bold uppercase tracking-[.35em] text-white/60">{slide.partOfSpeech}</p><h2 className={`mt-4 break-words font-black tracking-tight ${revealed ? "text-5xl md:text-7xl" : "text-6xl md:text-8xl"}`}>{slide.word}</h2><button className="mt-5 rounded-full bg-white/15 p-4 transition hover:scale-105 hover:bg-white/25" type="button" onClick={speak} aria-label="Pronunciation"><Volume2 size={28}/></button><p className="mt-3 text-xl text-white/70">{slide.phonetic || ""}</p></div>

          {revealed && <div className="mt-8 rounded-3xl bg-white/95 p-6 text-slate-900 shadow-xl md:mt-0 md:p-8"><p className="text-xl font-bold text-teal-800">{slide.definitionEn}</p>{!english && <p className="mt-2 text-2xl font-black">{slide.meaning}</p>}{slide.example && <div className="mt-6 border-l-4 border-teal-500 pl-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{ui.example}</p><p className="mt-2 text-lg font-semibold">{slide.example}</p>{!english && slide.translation && <p className="mt-1 text-slate-500">{slide.translation}</p>}</div>}<Meta label={ui.collocations} values={slide.collocations}/><div className="mt-4 grid gap-3 sm:grid-cols-2"><Meta label={ui.synonyms} values={slide.synonyms}/><Meta label={ui.antonyms} values={slide.antonyms}/></div>{slide.nextReview && <p className="mt-5 text-xs text-slate-500">{ui.due}: {slide.nextReview}</p>}</div>}
        </div>

        <footer className="mt-6 border-t border-white/15 pt-5">{!revealed ? <button className="mx-auto flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-black text-slate-900 shadow-lg transition hover:scale-[1.02]" type="button" onClick={() => setRevealed(true)}><Eye size={20}/>{ui.reveal}</button> : <><div className="flex items-center justify-between gap-3"><button className="text-sm text-white/70 underline" type="button" onClick={() => setRevealed(false)}>{ui.hide}</button><p className="text-sm font-bold">{ui.rate}</p></div><div className="mt-4 grid grid-cols-3 gap-3"><RatingButton disabled={pending} onClick={() => rate(1)} icon="↺" label={ui.forgot}/><RatingButton disabled={pending} onClick={() => rate(3)} icon="~" label={ui.hard}/><RatingButton disabled={pending} onClick={() => rate(5)} icon="✓" label={ui.mastered} primary/></div></>}</footer>
      </div>
    </article>

    <nav className="mt-5 flex items-center justify-between gap-3"><button className="button-ghost flex items-center gap-1" disabled={index === 0} type="button" onClick={() => move(index - 1)}><ChevronLeft size={18}/><span className="hidden sm:inline">{ui.previous}</span></button><div className="flex items-center gap-2">{dots.map((item) => { const actual = slides.indexOf(item); return <button className={`h-2.5 rounded-full transition-all ${actual === index ? "w-8 bg-brand" : reviewed[item.id] ? "w-2.5 bg-emerald-500" : "w-2.5 bg-slate-300 dark:bg-slate-700"}`} key={item.id} type="button" onClick={() => move(actual)} aria-label={`${actual + 1}`}/>; })}</div><button className="button-ghost flex items-center gap-1" disabled={index === slides.length - 1} type="button" onClick={() => move(index + 1)}><span className="hidden sm:inline">{ui.next}</span><ChevronRight size={18}/></button></nav>
    <p className="mt-3 text-center text-xs text-muted"><Brain className="mr-1 inline" size={14}/>← → {english ? "navigate" : "切换"} · Space / Enter {english ? "reveal" : "揭晓"}</p>
  </section>;
}

function Meta({ label, values }: { label: string; values: string[] }) { return values.length ? <div className="mt-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 font-semibold">{values.join(" · ")}</p></div> : null; }
function RatingButton({ label, icon, primary, ...props }: { label: string; icon: string; primary?: boolean; disabled: boolean; onClick: () => void }) { return <button className={`rounded-2xl px-2 py-3 font-black transition hover:-translate-y-0.5 disabled:opacity-50 ${primary ? "bg-white text-teal-900" : "bg-white/15 text-white hover:bg-white/25"}`} type="button" {...props}><span className="mr-1">{icon}</span>{label}</button>; }
function Result({ value, label }: { value: number; label: string }) { return <div className="rounded-2xl bg-white/15 p-4"><strong className="block text-3xl">{value}</strong><span className="text-sm text-white/70">{label}</span></div>; }
