"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Job = { id: string; status: string };
const actions: Record<string, Array<[string, string]>> = {
  PENDING: [["start", "启动"], ["cancel", "取消"]],
  PROCESSING: [["pause", "暂停"], ["cancel", "取消"]],
  PAUSED: [["resume", "恢复"], ["cancel", "取消"]],
  FAILED: [["retry", "重试"]],
};

export function ContentJobControls({ job }: { job: Job }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function run(action: string) {
    setBusy(true); setError("");
    const response = await fetch(`/api/admin/content/jobs/${job.id}/${action}`, { method: "POST" });
    if (!response.ok) setError((await response.json()).error ?? "操作失败"); else router.refresh();
    setBusy(false);
  }
  return <div className="flex flex-wrap items-center gap-2">{(actions[job.status] ?? []).map(([action,label])=><button className="button-ghost" disabled={busy} key={action} onClick={()=>run(action)}>{label}</button>)}{error&&<span className="text-xs text-red-600">{error}</span>}</div>;
}

export function CreateContentJobForm({ models }: { models: Array<{ id: string; label: string }> }) {
  const router=useRouter(); const[busy,setBusy]=useState(false); const[message,setMessage]=useState("");
  async function submit(formData:FormData){setBusy(true);setMessage("");const configuration={level:String(formData.get("level")),topic:String(formData.get("topic")??"").trim()};const response=await fetch("/api/admin/content/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:formData.get("type"),totalItems:Number(formData.get("totalItems")),aiModelId:formData.get("aiModelId")||null,configuration})});setMessage(response.ok?"任务已创建，等待启动。":((await response.json()).error??"创建失败"));setBusy(false);if(response.ok)router.refresh()}
  return <form action={submit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><select className="input" name="type">{["VOCABULARY_GENERATION","READING_GENERATION","GRAMMAR_GENERATION","SCENARIO_GENERATION","QUESTION_GENERATION","TRANSLATION_GENERATION","AUDIO_SCRIPT_GENERATION","VIDEO_SCRIPT_GENERATION","PUBLIC_RESOURCE_IMPORT","CONTENT_RECHECK","DUPLICATE_SCAN","DIFFICULTY_RECALCULATION"].map(x=><option key={x}>{x}</option>)}</select><select className="input" name="level">{["PRE_A1","A1","A2","B1","B2","C1","C2"].map(x=><option key={x}>{x}</option>)}</select><input className="input" name="topic" placeholder="主题（可选）"/><input className="input" type="number" name="totalItems" min="1" max="10000" defaultValue="20" required/><select className="input" name="aiModelId"><option value="">自动选择模型</option>{models.map(model=><option value={model.id} key={model.id}>{model.label}</option>)}</select><button className="button-primary md:col-span-2 xl:col-span-1" disabled={busy}>{busy?"创建中…":"创建任务"}</button>{message&&<p className="text-sm text-muted md:col-span-2 xl:col-span-4">{message}</p>}</form>;
}
