"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Dialogue = { id: string; speaker: string; roleName: string; textEn: string; textZh: string | null; sequence: number; cameraCue: string | null };
type SubtitleMode = "en" | "zh" | "both" | "none";

export function ScenarioPlayer({ dialogues }: { dialogues: Dialogue[] }) {
  const ordered = useMemo(() => [...dialogues].sort((a, b) => a.sequence - b.sequence), [dialogues]);
  const [index, setIndex] = useState(0);
  const [english, setEnglish] = useState(false);
  const [subtitle, setSubtitle] = useState<SubtitleMode>("both");
  const [autoPlay, setAutoPlay] = useState(false);
  const [loop, setLoop] = useState(false);
  const loopRef = useRef(false);
  const [rate, setRate] = useState(.88);
  const [role, setRole] = useState("");
  const [dictation, setDictation] = useState("");
  const [checked, setChecked] = useState(false);
  const current = ordered[index];
  const roles = useMemo(() => [...new Set(ordered.map((item) => item.roleName))], [ordered]);
  const t = english ? { noLines: "This lesson has no dialogue yet.", scene: "Scene", dialogue: "dialogue scene", yourTurn: "Your turn as", sayLine: "Say the line aloud.", play: "Play line", previous: "Previous", next: "Next", both: "Bilingual subtitles", en: "English subtitles", zh: "Chinese subtitles", none: "Hide subtitles", speed: "Speed", continuous: "Continuous", loop: "Loop line", allRoles: "Watch all roles", playRole: "Play", dictation: "Dictation", dictationHelp: "Hide subtitles, play the line, then type what you heard.", check: "Check", correct: "Correct!", answer: "Answer" } : { noLines: "课程尚无台词。", scene: "镜头", dialogue: "对话场景", yourTurn: "轮到你扮演", sayLine: "请说出台词。", play: "播放本句", previous: "上一句", next: "下一句", both: "双语字幕", en: "英文字幕", zh: "中文字幕", none: "隐藏字幕", speed: "速度", continuous: "连续", loop: "单句循环", allRoles: "观看全部角色", playRole: "扮演", dictation: "听写练习", dictationHelp: "先隐藏字幕并播放本句，然后输入听到的内容。", check: "检查", correct: "听写正确！", answer: "参考答案" };

  useEffect(() => { if (document.documentElement.lang === "en") { setEnglish(true); setSubtitle("en"); } }, []);
  useEffect(() => { loopRef.current = loop; if (!loop) window.speechSynthesis?.cancel(); }, [loop]);
  const speak = useCallback((item = current) => { if (!item || !("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const play = () => { const utterance = new SpeechSynthesisUtterance(item.textEn); utterance.lang = "en-US"; utterance.rate = rate; utterance.onend = () => { if (loopRef.current) return window.setTimeout(play, 350); if (autoPlay && index < ordered.length - 1) setIndex((value) => value + 1); }; window.speechSynthesis.speak(utterance); }; play(); }, [autoPlay, current, index, ordered.length, rate]);
  useEffect(() => { if (autoPlay && current) { const timer = window.setTimeout(() => speak(current), 100); return () => window.clearTimeout(timer); } }, [autoPlay, current, speak]);
  useEffect(() => { setDictation(""); setChecked(false); }, [index]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  if (!current) return <p>{t.noLines}</p>;
  const hiddenForRole = role === current.roleName;
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9']/g, "");
  const correct = normalize(dictation) === normalize(current.textEn);

  return <div>
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-950 to-slate-900 p-7 text-white">
      <p className="text-sm text-teal-200">{t.scene}: {current.cameraCue ?? t.dialogue}</p>
      <p className="mt-8 text-sm font-bold uppercase tracking-wider">{current.roleName} · {current.speaker}</p>
      {!hiddenForRole && (subtitle === "en" || subtitle === "both") && <p className="mt-3 text-2xl font-black leading-relaxed">{current.textEn}</p>}
      {hiddenForRole && <p className="mt-3 rounded-xl border border-dashed border-teal-300 p-4 text-teal-100">{t.yourTurn} {current.roleName}. {t.sayLine}</p>}
      {!hiddenForRole && (subtitle === "zh" || subtitle === "both") && <p className="mt-3 text-teal-100">{current.textZh}</p>}
      <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full bg-teal-300" style={{ width: `${(index + 1) / ordered.length * 100}%` }}/></div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" className="button-primary" onClick={() => speak()}>▶ {t.play}</button>
      <button type="button" className="button-ghost" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>{t.previous}</button>
      <button type="button" className="button-ghost" disabled={index === ordered.length - 1} onClick={() => setIndex((value) => Math.min(ordered.length - 1, value + 1))}>{t.next}</button>
      <select className="input w-auto" value={subtitle} onChange={(event) => setSubtitle(event.target.value as SubtitleMode)}><option value="both">{t.both}</option><option value="en">{t.en}</option><option value="zh">{t.zh}</option><option value="none">{t.none}</option></select>
      <label className="button-ghost">{t.speed} <select className="bg-transparent" value={rate} onChange={(event) => setRate(Number(event.target.value))}><option value="0.7">0.7×</option><option value="0.88">0.88×</option><option value="1">1×</option><option value="1.2">1.2×</option></select></label>
      <label className="button-ghost"><input className="mr-2" type="checkbox" checked={autoPlay} onChange={(event) => setAutoPlay(event.target.checked)}/>{t.continuous}</label>
      <label className="button-ghost"><input className="mr-2" type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)}/>{t.loop}</label>
      <select className="input w-auto" value={role} onChange={(event) => setRole(event.target.value)}><option value="">{t.allRoles}</option>{roles.map((item) => <option key={item} value={item}>{t.playRole} {item}</option>)}</select>
    </div>
    <details className="card mt-5"><summary className="cursor-pointer font-black">{t.dictation}</summary><p className="mt-2 text-sm text-muted">{t.dictationHelp}</p><div className="mt-3 flex gap-2"><input className="input" value={dictation} onChange={(event) => { setDictation(event.target.value); setChecked(false); }}/><button type="button" className="button-ghost" onClick={() => setChecked(true)}>{t.check}</button></div>{checked && <p className={correct ? "mt-2 text-green-700" : "mt-2 text-amber-700"}>{correct ? t.correct : `${t.answer}: ${current.textEn}`}</p>}</details>
    <div className="mt-5 grid gap-2 sm:grid-cols-2">{ordered.map((item, itemIndex) => <button type="button" className={itemIndex === index ? "rounded-xl border border-brand bg-brand/10 p-3 text-left" : "rounded-xl border p-3 text-left"} onClick={() => setIndex(itemIndex)} key={item.id}><strong>{item.roleName}</strong><span className="ml-2 line-clamp-1 text-sm text-muted">{item.textEn}</span></button>)}</div>
  </div>;
}
