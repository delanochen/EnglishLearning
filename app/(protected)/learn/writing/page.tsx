import { auth } from "@/auth";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { getActiveProfile } from "@/modules/learner/selection";
import { submitWriting } from "@/modules/writing/actions";
import {vocabularyLevelFallbacks} from "@/modules/vocabulary/levels";
import {selectClosestLevelItems} from "@/modules/content/level-selection";

export default async function WritingPage() {
  const session = await auth();
  const english = (await cookies()).get("ui_locale")?.value === "en";
  const selected = await getActiveProfile(await getAccessibleProfiles(session!.user.id));
  const preferredLevels=selected?.level?vocabularyLevelFallbacks(selected.level):[];const assignmentsRaw = selected ? await db.writingAssignment.findMany({
    where: { status: "PUBLISHED", ...(preferredLevels.length ? { level:{in:preferredLevels} } : {}) },
    include: { submissions: { where: { learnerProfileId: selected.id }, include: { feedback: true }, orderBy: { version: "desc" } } },
    orderBy: { createdAt: "desc" }
  }) : [];const assignments=selectClosestLevelItems(assignmentsRaw,selected?.level,item=>item.level);

  const t = english ? { title: "Writing practice", target: "Target", words: "words", revise: "Submit revision", submit: "Submit for feedback", version: "Version", feedback: "feedback", grammar: "Grammar", spelling: "Spelling", vocabulary: "Vocabulary", structure: "Structure", naturalness: "Naturalness", issues: "Detailed issues and suggestions", full: "Whole text", suggestion: "Suggestion", rewrite: "View suggested rewrite", saved: "saved versions", empty: "No writing assignments are available for this level yet." } : { title: "写作练习", target: "目标", words: "词", revise: "提交新版本", submit: "提交并批改", version: "第", feedback: "版反馈", grammar: "语法", spelling: "拼写", vocabulary: "词汇", structure: "结构", naturalness: "自然度", issues: "逐条问题与修改建议", full: "全文建议", suggestion: "建议", rewrite: "查看参考改写", saved: "个已保存版本", empty: "当前级别还没有写作题目。" };
  return <div className="mx-auto max-w-5xl">
    <p className="text-sm font-bold uppercase tracking-[.2em] text-brand">Writing</p><h1 className="mt-2 text-4xl font-black">{t.title}</h1>
    
    <div className="mt-7 space-y-5">{selected && assignments.map((assignment) => {
      const latest = assignment.submissions[0];
      const annotations = Array.isArray(latest?.feedback?.annotations) ? latest.feedback.annotations as Array<{ excerpt?: string; issue?: string; suggestion?: string }> : [];
      return <article className="card" key={assignment.id}><p className="text-sm font-bold text-brand">{assignment.level} · {assignment.type} · {t.target} {assignment.targetWords} {t.words}</p><h2 className="mt-2 text-2xl font-black">{assignment.title}</h2><p className="mt-3 leading-7">{assignment.prompt}</p><form action={submitWriting} className="mt-5"><input type="hidden" name="profileId" value={selected.id}/><input type="hidden" name="assignmentId" value={assignment.id}/><textarea className="input min-h-48" name="content" defaultValue={latest?.content} placeholder="Write in English here…" required/><button className="button-primary mt-3">{latest ? t.revise : t.submit}</button></form>{latest?.feedback && <div className="mt-6 rounded-2xl bg-slate-100 p-5 dark:bg-slate-800"><h3 className="font-black">{t.version} {latest.version} {t.feedback} · {Math.round(latest.feedback.overallScore)}</h3><p className="mt-2">{t.grammar} {Math.round(latest.feedback.grammarScore)} · {t.spelling} {Math.round(latest.feedback.spellingScore)} · {t.vocabulary} {Math.round(latest.feedback.vocabularyScore)} · {t.structure} {Math.round(latest.feedback.structureScore)} · {t.naturalness} {Math.round(latest.feedback.naturalnessScore)}</p><p className="mt-3 whitespace-pre-wrap text-muted">{latest.feedback.suggestions}</p>{annotations.length > 0 && <details className="mt-3"><summary className="cursor-pointer font-bold text-brand">{t.issues} ({annotations.length})</summary><div className="mt-3 space-y-2">{annotations.map((annotation, index) => <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700" key={`${index}-${annotation.excerpt}`}><strong>{annotation.excerpt || t.full}</strong><p className="mt-1 text-sm text-amber-700">{annotation.issue}</p><p className="mt-1 text-sm">{t.suggestion}: {annotation.suggestion}</p></div>)}</div></details>}{latest.feedback.rewrittenVersion && <details className="mt-3"><summary className="cursor-pointer font-bold text-brand">{t.rewrite}</summary><p className="mt-2 whitespace-pre-wrap">{latest.feedback.rewrittenVersion}</p></details>}<p className="mt-3 text-xs text-muted">{assignment.submissions.length} {t.saved}</p></div>}</article>;
    })}</div>
    {selected && !assignments.length && <div className="card mt-7">{t.empty}</div>}
  </div>;
}


