"use client";

import { useEffect, useMemo, useState } from "react";
import { browserSpeechDefaults, type SpeechPreferences } from "@/modules/speech/types";
import { selectPreferredVoiceName } from "@/modules/speech/voice-selection";

const storageKey = "homelingua.speech.preferences";

export function SpeechPlayer({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [english, setEnglish] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [preferences, setPreferences] = useState<SpeechPreferences>(browserSpeechDefaults);
  const availableVoices = useMemo(() => voices.filter((voice) => voice.lang.toLowerCase().startsWith(preferences.language.toLowerCase())), [voices, preferences.language]);
  const t = english ? { play: "Play audio", unsupported: "Speech unavailable", stop: "Stop", settings: "Voice settings", accent: "Accent", us: "American English", uk: "British English", voice: "Voice", automatic: "Automatic", rate: "Speed", pitch: "Pitch", gender: "Voice preference", neutral: "Neutral", female: "Female", male: "Male", cache: "Cache generated audio when an external TTS service is configured", nativeNote: "Browser speech is generated locally when supported; exact voices depend on this device." } : { play: "播放英语音频", unsupported: "浏览器不支持朗读", stop: "停止", settings: "语音设置", accent: "口音", us: "美式英语", uk: "英式英语", voice: "声音", automatic: "自动选择", rate: "语速", pitch: "音调", gender: "声音偏好", neutral: "中性", female: "女声", male: "男声", cache: "接入外部 TTS 后缓存生成音频", nativeNote: "浏览器原生朗读优先使用本地声音；可用声音由当前设备决定。" };

  useEffect(() => {
    setEnglish(document.documentElement.lang === "en");
    setSupported("speechSynthesis" in window);
    try { const saved = localStorage.getItem(storageKey); if (saved) setPreferences((current) => ({ ...current, ...JSON.parse(saved) })); } catch { /* ignore an invalid local preference */ }
    const loadVoices = () => setVoices(window.speechSynthesis?.getVoices() ?? []);
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, []);

  function update(next: Partial<SpeechPreferences>) { setPreferences((current) => { const value = { ...current, ...next }; localStorage.setItem(storageKey, JSON.stringify(value)); return value; }); }
  function play() { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = preferences.language; utterance.rate = preferences.rate; utterance.pitch = preferences.pitch; const preferredName = preferences.voice ?? selectPreferredVoiceName(availableVoices, preferences.genderPreference ?? "neutral"); const selected = voices.find((voice) => voice.name === preferredName); if (selected) utterance.voice = selected; window.speechSynthesis.speak(utterance); }

  return <div>
    <div className="flex flex-wrap items-center gap-3"><button type="button" className="button-primary" disabled={!supported} onClick={play}>{supported ? `▶ ${t.play}` : t.unsupported}</button><button type="button" className="button-ghost" onClick={() => window.speechSynthesis?.cancel()}>{t.stop}</button></div>
    <details className="mt-3"><summary className="cursor-pointer text-sm font-bold text-brand">{t.settings}</summary><div className="mt-3 grid gap-3 rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm">{t.accent}<select className="input mt-1" value={preferences.language} onChange={(event) => update({ language: event.target.value as "en-US" | "en-GB", voice: undefined })}><option value="en-US">{t.us}</option><option value="en-GB">{t.uk}</option></select></label>
      <label className="text-sm">{t.voice}<select className="input mt-1" value={preferences.voice ?? ""} onChange={(event) => update({ voice: event.target.value || undefined })}><option value="">{t.automatic}</option>{availableVoices.map((voice) => <option value={voice.name} key={`${voice.name}-${voice.lang}`}>{voice.name}{voice.localService ? " · local" : ""}</option>)}</select></label>
      <label className="text-sm">{t.rate} · {preferences.rate.toFixed(2)}<input className="mt-3 w-full" type="range" min="0.5" max="1.5" step="0.05" value={preferences.rate} onChange={(event) => update({ rate: Number(event.target.value) })}/></label>
      <label className="text-sm">{t.pitch} · {preferences.pitch.toFixed(2)}<input className="mt-3 w-full" type="range" min="0.5" max="1.5" step="0.05" value={preferences.pitch} onChange={(event) => update({ pitch: Number(event.target.value) })}/></label>
      <label className="text-sm">{t.gender}<select className="input mt-1" value={preferences.genderPreference} onChange={(event) => update({ genderPreference: event.target.value as "female" | "male" | "neutral" })}><option value="neutral">{t.neutral}</option><option value="female">{t.female}</option><option value="male">{t.male}</option></select></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3"><input type="checkbox" checked={preferences.cacheAudio} onChange={(event) => update({ cacheAudio: event.target.checked })}/>{t.cache}</label>
      <p className="text-xs text-muted sm:col-span-2 lg:col-span-4">{t.nativeNote}</p>
    </div></details>
  </div>;
}
