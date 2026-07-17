import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProfilePicker } from "@/components/profile-picker";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { submitWriting } from "@/modules/writing/actions";

export default async function WritingPage({ searchParams }: { searchParams: Promise<{ profile?: string }> }) {
  const session = await auth();
  const query = await searchParams;
  const profiles = await getAccessibleProfiles(session!.user.id);
  const selected = profiles.find((profile) => profile.id === query.profile) ?? profiles[0];
  const assignments = selected ? await db.writingAssignment.findMany({
    where: { status: "PUBLISHED", ...(selected.level ? { level: selected.level } : {}) },
    include: { submissions: { where: { learnerProfileId: selected.id }, include: { feedback: true }, orderBy: { version: "desc" } } },
    orderBy: { createdAt: "desc" }
  }) : [];

  return <div className="mx-auto max-w-5xl">
    <p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Writing</p><h1 className="mt-2 text-4xl font-black">写作练习</h1>
    <ProfilePicker profiles={profiles} selectedId={selected?.id} pathname="/learn/writing"/>
    <div className="mt-7 space-y-5">{selected && assignments.map((assignment) => {
      const latest = assignment.submissions[0];
      const annotations = Array.isArray(latest?.feedback?.annotations) ? latest.feedback.annotations as Array<{ excerpt?: string; issue?: string; suggestion?: string }> : [];
      return <article className="card" key={assignment.id}><p className="text-sm font-bold text-brand">{assignment.level} · {assignment.type} · 目标 {assignment.targetWords} 词</p><h2 className="mt-2 text-2xl font-black">{assignment.title}</h2><p className="mt-3 leading-7">{assignment.prompt}</p><form action={submitWriting} className="mt-5"><input type="hidden" name="profileId" value={selected.id}/><input type="hidden" name="assignmentId" value={assignment.id}/><textarea className="input min-h-48" name="content" defaultValue={latest?.content} placeholder="Write in English here…" required/><button className="button-primary mt-3">{latest ? "提交新版本" : "提交并批改"}</button></form>{latest?.feedback && <div className="mt-6 rounded-2xl bg-slate-100 p-5 dark:bg-slate-800"><h3 className="font-black">第 {latest.version} 版反馈 · {Math.round(latest.feedback.overallScore)} 分</h3><p className="mt-2">语法 {Math.round(latest.feedback.grammarScore)} · 拼写 {Math.round(latest.feedback.spellingScore)} · 词汇 {Math.round(latest.feedback.vocabularyScore)} · 结构 {Math.round(latest.feedback.structureScore)} · 自然度 {Math.round(latest.feedback.naturalnessScore)}</p><p className="mt-3 whitespace-pre-wrap text-muted">{latest.feedback.suggestions}</p>{annotations.length > 0 && <details className="mt-3"><summary className="cursor-pointer font-bold text-brand">逐条问题与修改建议（{annotations.length}）</summary><div className="mt-3 space-y-2">{annotations.map((annotation, index) => <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700" key={`${index}-${annotation.excerpt}`}><strong>{annotation.excerpt || "全文建议"}</strong><p className="mt-1 text-sm text-amber-700">{annotation.issue}</p><p className="mt-1 text-sm">建议：{annotation.suggestion}</p></div>)}</div></details>}{latest.feedback.rewrittenVersion && <details className="mt-3"><summary className="cursor-pointer font-bold text-brand">查看参考改写</summary><p className="mt-2 whitespace-pre-wrap">{latest.feedback.rewrittenVersion}</p></details>}<p className="mt-3 text-xs text-muted">共保存 {assignment.submissions.length} 个版本</p></div>}</article>;
    })}</div>
    {selected && !assignments.length && <div className="card mt-7">当前级别还没有写作题目。</div>}
  </div>;
}
