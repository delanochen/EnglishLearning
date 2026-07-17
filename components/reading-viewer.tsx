"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { collectReadingWord, saveReadingProgress } from "@/modules/reading/actions";

type DictionaryEntry = { word: string; phonetic: string | null; definition: string; definitionEn: string };
type Props = { profileId: string; articleId: string; body: string; translation: string | null; targetVocabulary: string[]; targetGrammar: string[]; dictionary: DictionaryEntry[]; initialPercent?: number; initialPosition?: number; immersion?: boolean };

export function ReadingViewer({ profileId, articleId, body, translation, targetVocabulary, targetGrammar, dictionary, initialPercent = 0, initialPosition = 0, immersion = false }: Props) {
  const [showZh, setShowZh] = useState(!immersion);
  const [english, setEnglish] = useState(immersion);
  const [rate, setRate] = useState(0.9);
  const [selected, setSelected] = useState<DictionaryEntry | null>(null);
  const [position, setPosition] = useState(initialPosition);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const started = useRef(Date.now());
  const sentences = useMemo(() => body.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((value) => value.trim()).filter(Boolean) ?? [body], [body]);
  const targets = new Set(targetVocabulary.map((word) => word.toLowerCase()));
  const dictionaryMap = new Map(dictionary.map((item) => [item.word.toLowerCase(), item]));
  const t = english ? { speak: "Read sentence", previous: "Previous", next: "Next", speed: "Speed", slow: "Slow", normal: "Normal", fast: "Fast", showZh: "Show Chinese help", hideZh: "Hide Chinese help", pronunciation: "Pronounce", collect: "Save word", comparison: "English / Chinese", save: "Save progress", sentence: "sentence", saved: "Progress saved", collected: "saved for vocabulary review" } : { speak: "朗读当前句", previous: "上一句", next: "下一句", speed: "语速", slow: "慢", normal: "正常", fast: "快", showZh: "显示中文", hideZh: "隐藏中文", pronunciation: "播放发音", collect: "收藏单词", comparison: "中英文对照", save: "保存阅读进度", sentence: "句", saved: "进度已保存", collected: "已收藏到单词复习" };

  useEffect(() => { if (document.documentElement.lang === "en") { setEnglish(true); setShowZh(false); } }, []);

  function speak(text: string) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "en-US"; utterance.rate = rate; window.speechSynthesis.speak(utterance); }
  function save() { const percent = Math.min(99, Math.max(initialPercent, Math.round((position + 1) / sentences.length * 100))); const seconds = Math.round((Date.now() - started.current) / 1000); startTransition(async () => { await saveReadingProgress({ profileId, articleId, progressPercent: percent, currentPosition: position, readingSeconds: seconds }); setMessage(`${t.saved}: ${percent}%`); started.current = Date.now(); }); }

  return <section className="card mt-7">
    <div className="flex flex-wrap items-center gap-2">
      <button className="button-primary" type="button" onClick={() => speak(sentences[position])}>▶ {t.speak}</button>
      <button className="button-ghost" type="button" onClick={() => setPosition((value) => Math.max(0, value - 1))}>{t.previous}</button>
      <button className="button-ghost" type="button" onClick={() => setPosition((value) => Math.min(sentences.length - 1, value + 1))}>{t.next}</button>
      <label className="button-ghost">{t.speed} <select className="bg-transparent" value={rate} onChange={(event) => setRate(Number(event.target.value))}><option value="0.65">{t.slow}</option><option value="0.9">{t.normal}</option><option value="1.1">{t.fast}</option></select></label>
      <button className="button-ghost" type="button" onClick={() => setShowZh((value) => !value)}>{showZh ? t.hideZh : t.showZh}</button>
    </div>
    <div className="mt-6 space-y-4 text-lg leading-8">{sentences.map((sentence, sentenceIndex) => <p className={sentenceIndex === position ? "rounded-xl bg-brand/10 p-3" : "p-3"} key={`${sentenceIndex}-${sentence}`}>{sentence.split(/(\b[A-Za-z']+\b)/).map((token, tokenIndex) => { const lower = token.toLowerCase(); const entry = dictionaryMap.get(lower); return targets.has(lower) || entry ? <button type="button" className={targets.has(lower) ? "font-bold text-brand underline decoration-2" : "underline decoration-dotted"} onClick={() => entry ? setSelected(entry) : speak(token)} key={`${tokenIndex}-${token}`}>{token}</button> : <span className={targetGrammar.some((grammar) => sentence.toLowerCase().includes(grammar.toLowerCase())) ? "decoration-amber-500 decoration-2" : ""} key={`${tokenIndex}-${token}`}>{token}</span>; })}</p>)}</div>
    {selected && <div className="mt-5 rounded-2xl border border-brand/30 bg-brand/5 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-xl">{selected.word}</strong><span className="ml-2 text-muted">{selected.phonetic}</span></div><div className="flex gap-2"><button type="button" className="button-ghost" onClick={() => speak(selected.word)}>{t.pronunciation}</button><button type="button" className="button-primary" onClick={() => startTransition(async () => { await collectReadingWord({ profileId, word: selected.word }); setMessage(`${selected.word} ${t.collected}`); })}>{t.collect}</button></div></div><p className="mt-2">{selected.definitionEn}</p>{showZh && <p className="text-muted">{selected.definition}</p>}</div>}
    {showZh && translation && <details className="mt-5 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800"><summary className="cursor-pointer font-bold">{t.comparison}</summary><p className="mt-3 whitespace-pre-wrap leading-7">{translation}</p></details>}
    <div className="mt-5 flex items-center gap-3"><button type="button" className="button-primary" disabled={pending} onClick={save}>{t.save}</button><span className="text-sm text-muted">{position + 1}/{sentences.length} {t.sentence} {message}</span></div>
  </section>;
}
