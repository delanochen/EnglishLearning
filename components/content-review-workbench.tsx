"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ReviewRow = { id: string; contentType: string; contentId: string; reason: string | null; qualityScore: number | null; errors: unknown; warnings: unknown; createdAt: string };

export function ContentReviewWorkbench({ rows }: { rows: ReviewRow[] }) {
  const router = useRouter(); const [selected, setSelected] = useState<string[]>([]); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function decide(ids: string[], decision: "APPROVED" | "REJECTED") {
    if (!ids.length) return; if (decision === "REJECTED" && reason.trim().length < 2) { setError("拒绝时请填写原因。"); return; }
    setBusy(true); setError("");
    const response = await fetch("/api/admin/content/review/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, decision, reason: reason.trim() || undefined }) });
    if (!response.ok) setError((await response.json()).error ?? "审核失败"); else { setSelected([]); setReason(""); router.refresh(); }
    setBusy(false);
  }
  return <div>
    <div className="mb-4 flex flex-wrap items-end gap-3"><label className="min-w-72 flex-1"><span className="label">审核说明 / 拒绝原因</span><input className="input" value={reason} onChange={(event)=>setReason(event.target.value)} maxLength={2000}/></label><button className="button-primary" disabled={busy||!selected.length} onClick={()=>decide(selected,"APPROVED")}>批量批准</button><button className="button-ghost text-red-700" disabled={busy||!selected.length} onClick={()=>decide(selected,"REJECTED")}>批量拒绝</button></div>
    {error&&<p className="mb-3 text-sm text-red-600">{error}</p>}
    <div className="space-y-3">{rows.map((row)=><article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700" key={row.id}><div className="flex flex-wrap items-start gap-3"><input aria-label="选择审核项" type="checkbox" checked={selected.includes(row.id)} onChange={(event)=>setSelected(event.target.checked?[...selected,row.id]:selected.filter((id)=>id!==row.id))}/><div className="min-w-0 flex-1"><strong>{row.contentType}</strong><p className="font-mono text-xs text-muted">{row.contentId}</p><p className="mt-2 text-sm">质量分：{row.qualityScore??"—"} · {new Date(row.createdAt).toLocaleString()}</p>{row.reason&&<p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{row.reason}</p>}<details className="mt-2 text-xs text-muted"><summary className="cursor-pointer">检查详情</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap">{JSON.stringify({errors:row.errors,warnings:row.warnings},null,2)}</pre></details></div><div className="flex gap-2"><button className="button-primary" disabled={busy} onClick={()=>decide([row.id],"APPROVED")}>批准</button><button className="button-ghost text-red-700" disabled={busy} onClick={()=>decide([row.id],"REJECTED")}>拒绝</button></div></div></article>)}{!rows.length&&<p className="text-muted">当前没有待审核内容。</p>}</div>
  </div>;
}
