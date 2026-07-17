"use client";

import { useEffect, useRef, useState } from "react";
import { browserSpeechDefaults, type SpeechPreferences } from "@/modules/speech/types";
import { saveSpeakingAttempt } from "@/modules/speaking/actions";

type ResultEvent = { results: ArrayLike<{ 0: { transcript: string } }> };
type Recognition = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((event: ResultEvent) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
type RecognitionCtor = new () => Recognition;
type Mode = "READ_ALOUD" | "SHADOWING" | "FREE_CONVERSATION" | "ROLE_PLAY";
const storageKey = "homelingua.speech.preferences";

export function SpeakingRecorder({ profileId, prompt, mode = "READ_ALOUD", english = false }: { profileId: string | undefined; prompt: string; mode?: Mode; english?: boolean }) {
  const [transcript, setTranscript] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioFileId, setAudioFileId] = useState("");
  const [status, setStatus] = useState("");
  const [duration, setDuration] = useState(0);
  const [preferences, setPreferences] = useState(browserSpeechDefaults);
  const recognition = useRef<Recognition | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const stopTimer = useRef<number | undefined>(undefined);
  const t = english ? { interrupted: "Speech recognition stopped. Retry or type manually.", unsupportedRecording: "Recording is not supported in this browser.", saving: "Saving recording securely…", saved: "Recording saved", saveFailed: "Could not save recording", microphone: "Microphone access failed. Check browser permissions.", recording: "Recording…", demo: "Play example", settings: "Speech recognition settings", accent: "Recognition accent", us: "American English", uk: "British English", max: "Maximum duration (seconds)", auto: "Stop automatically at the time limit", keep: "Allow saving the original recording", startRecognition: "Start speech recognition", stopRecognition: "Stop recognition", saveRecording: "Save recording", stopRecording: "Stop recording", clear: "Clear text", unsupportedRecognition: "Speech recognition is unavailable; type manually. Recording support is detected separately.", placeholder: "Recognition text appears here and can be edited", submit: "Save and score" } : { interrupted: "语音识别中断，可重试或手动输入", unsupportedRecording: "当前浏览器不支持录音", saving: "正在安全保存录音…", saved: "录音已保存", saveFailed: "录音保存失败", microphone: "无法使用麦克风，请检查浏览器权限", recording: "录音中…", demo: "听示范", settings: "语音识别设置", accent: "识别口音", us: "美式英语", uk: "英式英语", max: "最长时长（秒）", auto: "到时自动停止", keep: "允许保存原始录音", startRecognition: "开始语音识别", stopRecognition: "停止识别", saveRecording: "保存录音", stopRecording: "停止录音", clear: "清空文字", unsupportedRecognition: "当前浏览器不支持语音识别，可手动输入；录音能力会单独检测。", placeholder: "识别结果会显示在这里，也可以手动修改", submit: "保存并评分" };

  useEffect(() => {
    try { setPreferences({ ...browserSpeechDefaults, ...JSON.parse(localStorage.getItem(storageKey) ?? "{}") }); } catch { /* Keep safe defaults. */ }
    const win = window as typeof window & { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    setSupported(Boolean(Ctor));
    if (Ctor) {
      const instance = new Ctor();
      instance.continuous = true;
      instance.interimResults = false;
      instance.onresult = (event) => setTranscript((value) => `${value} ${event.results[event.results.length - 1][0].transcript}`.trim());
      instance.onend = () => setRecognizing(false);
      instance.onerror = () => { setRecognizing(false); setStatus(t.interrupted); };
      recognition.current = instance;
    }
    return () => {
      recognition.current?.stop();
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      if (stopTimer.current) window.clearTimeout(stopTimer.current);
    };
  }, [t.interrupted]);

  useEffect(() => { if (recognition.current) recognition.current.lang = preferences.language; }, [preferences.language]);

  function updatePreferences(patch: Partial<SpeechPreferences>) {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function finishDuration() {
    if (started.current) setDuration(Math.max(1, Math.round((Date.now() - started.current) / 1000)));
  }

  function startRecognition() {
    started.current = Date.now();
    setRecognizing(true);
    setStatus("");
    recognition.current?.start();
    if (preferences.autoStop) stopTimer.current = window.setTimeout(stopRecognition, preferences.timeoutMs);
  }

  function stopRecognition() {
    recognition.current?.stop();
    setRecognizing(false);
    finishDuration();
    if (stopTimer.current) window.clearTimeout(stopTimer.current);
  }

  async function startRecording() {
    if (!profileId || !navigator.mediaDevices || !("MediaRecorder" in window)) { setStatus(t.unsupportedRecording); return; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream.current, MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : undefined);
      chunks.current = [];
      media.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      media.onstop = async () => {
        stream.current?.getTracks().forEach((track) => track.stop());
        const mime = media.mimeType.split(";", 1)[0] || "audio/webm";
        const form = new FormData();
        form.set("profileId", profileId);
        form.set("file", new File([new Blob(chunks.current, { type: mime })], "speaking.webm", { type: mime }));
        setStatus(t.saving);
        const response = await fetch("/api/uploads", { method: "POST", body: form });
        const result = await response.json();
        if (response.ok) { setAudioFileId(result.id); setStatus(t.saved); } else setStatus(`${t.saveFailed}: ${result.error}`);
      };
      recorder.current = media;
      started.current = Date.now();
      media.start(500);
      setRecording(true);
      setStatus(t.recording);
      if (preferences.autoStop) stopTimer.current = window.setTimeout(stopRecording, preferences.timeoutMs);
    } catch { setStatus(t.microphone); }
  }

  function stopRecording() {
    if (recorder.current?.state === "recording") recorder.current.stop();
    setRecording(false);
    finishDuration();
    if (stopTimer.current) window.clearTimeout(stopTimer.current);
  }

  const showDemo = !(["FREE_CONVERSATION", "ROLE_PLAY"] as Mode[]).includes(mode);
  return <div>
    {showDemo && <SpeechPlayer text={prompt} preferences={preferences} label={t.demo} />}
    <details className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><summary className="cursor-pointer font-semibold">{t.settings}</summary><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm">{t.accent}<select className="input mt-1" value={preferences.language} onChange={(event) => updatePreferences({ language: event.target.value as SpeechPreferences["language"] })}><option value="en-US">{t.us}</option><option value="en-GB">{t.uk}</option></select></label>
      <label className="text-sm">{t.max}<input className="input mt-1" type="number" min="10" max="300" value={preferences.timeoutMs / 1000} onChange={(event) => updatePreferences({ timeoutMs: Math.max(10, Math.min(300, Number(event.target.value) || 60)) * 1000 })}/></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={preferences.autoStop} onChange={(event) => updatePreferences({ autoStop: event.target.checked })}/>{t.auto}</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={preferences.saveRecording} onChange={(event) => updatePreferences({ saveRecording: event.target.checked })}/>{t.keep}</label>
    </div></details>
    <div className="mt-4 flex flex-wrap gap-2">{supported && !recognizing && <button type="button" className="button-primary" onClick={startRecognition}>{t.startRecognition}</button>}{recognizing && <button type="button" className="button-primary" onClick={stopRecognition}>{t.stopRecognition}</button>}{preferences.saveRecording && (!recording ? <button type="button" className="button-ghost" onClick={startRecording}>● {t.saveRecording}</button> : <button type="button" className="button-ghost" onClick={stopRecording}>■ {t.stopRecording}</button>)}<button type="button" className="button-ghost" onClick={() => setTranscript("")}>{t.clear}</button></div>
    {!supported && <p className="mt-3 text-sm text-muted">{t.unsupportedRecognition}</p>}{status && <p className="mt-3 text-sm text-brand">{status}</p>}{audioFileId && <audio className="mt-3 w-full" controls src={`/api/uploads/${audioFileId}`}/>}<form action={saveSpeakingAttempt} className="mt-4"><input type="hidden" name="profileId" value={profileId}/><input type="hidden" name="mode" value={mode}/><input type="hidden" name="prompt" value={prompt}/><input type="hidden" name="provider" value={supported ? `Web Speech API (${preferences.language})` : "manual"}/><input type="hidden" name="durationSeconds" value={duration}/><input type="hidden" name="audioFileId" value={audioFileId}/><textarea className="input min-h-28" name="transcript" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder={t.placeholder} required/><button className="button-primary mt-3">{t.submit}</button></form>
  </div>;
}

function SpeechPlayer({ text, preferences, label }: { text: string; preferences: SpeechPreferences; label: string }) {
  function play() { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = preferences.language; utterance.rate = preferences.rate; utterance.pitch = preferences.pitch; window.speechSynthesis.speak(utterance); }
  return <button type="button" className="button-ghost" onClick={play}>▶ {label}</button>;
}
