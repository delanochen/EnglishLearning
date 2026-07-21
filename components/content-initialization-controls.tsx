"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ContentInitializationControls() {
  const router=useRouter();const[confirmation,setConfirmation]=useState("");const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");
  async function run(action:"PLAN"|"START"){setBusy(true);setMessage("");const response=await fetch("/api/admin/content/initialize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,confirmation})});const data=await response.json();setMessage(response.ok?(action==="PLAN"?`计划完成：新增 ${data.created} 个任务。`:`已启动 ${data.started} 个任务。`):(data.error??"操作失败"));setBusy(false);if(response.ok)router.refresh()}
  return <div className="grid gap-4"><div className="flex flex-wrap gap-2"><button className="button-ghost" disabled={busy} onClick={()=>run("PLAN")}>扫描库存并补齐计划</button></div><div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"><strong>费用确认</strong><p className="mt-1">完整空库约需 6,661 条内容生成，每条还会进行自动质量检查。请先确认 DeepSeek 预算、并发和限速。输入 START 后才能启动全部待处理任务。</p><div className="mt-3 flex flex-wrap gap-2"><input className="input mt-0 max-w-48" value={confirmation} onChange={(event)=>setConfirmation(event.target.value)} placeholder="输入 START"/><button className="button-primary" disabled={busy||confirmation!=="START"} onClick={()=>run("START")}>启动待处理任务</button></div></div>{message&&<p className="font-bold text-brand">{message}</p>}</div>;
}
