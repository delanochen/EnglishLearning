import Link from "next/link";
import { auth } from "@/auth";
import { ensurePracticeQuizTask, ensureQuizSession } from "@/modules/quiz/service";
import { submitQuiz } from "@/modules/quiz/actions";
import {getAccessibleProfiles}from"@/modules/learner/access";import{getActiveProfile}from"@/modules/learner/selection";

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ task?: string }> }) {
  const session = await auth(); const { task } = await searchParams;const selected=await getActiveProfile(await getAccessibleProfiles(session!.user.id));
  if(!selected)return <div className="card">请先选择学习成员。</div>;const activeTask=task??(await ensurePracticeQuizTask(session!.user.id,selected.id)).id;
  const quiz = await ensureQuizSession(session!.user.id, activeTask);
  if (quiz.completedAt) return <div className="mx-auto max-w-3xl text-center"><p className="font-bold text-brand">QUIZ COMPLETE</p><h1 className="mt-3 text-5xl font-black">{Math.round((quiz.score ?? 0) * 100)}%</h1><p className="mt-3 text-muted">正确率由系统根据提交答案自动计算。</p><div className="mt-8 space-y-3 text-left">{quiz.questions.map((question) => <div className="card" key={question.id}><p className="font-bold">{question.order}. {question.prompt}</p><p className="mt-2 text-brand">正确答案：{question.answerKey}</p>{question.explanation && <p className="mt-1 text-sm text-muted">{question.explanation}</p>}</div>)}</div><div className="mt-8 flex justify-center gap-3"><Link className="button-primary" href="/learn/quiz">再来一轮</Link><Link className="button-ghost" href="/tasks">返回每日任务</Link></div></div>;
  return <div className="mx-auto max-w-3xl"><p className="font-bold text-brand">MIXED REVIEW</p><h1 className="mt-2 text-4xl font-black">综合小测验</h1><p className="mt-2 text-muted">题目根据你的等级、已学词汇和近期错题生成；提交后自动判分。</p><form action={submitQuiz} className="mt-7 space-y-5"><input type="hidden" name="sessionId" value={quiz.id}/>{quiz.questions.map((question) => <fieldset className="card" key={question.id}><legend className="px-2 text-lg font-black">{question.order}. {question.prompt}</legend>{question.options.length ? <div className="mt-4 grid gap-2">{question.options.map((option) => <label className="rounded-xl border border-slate-200 p-3 hover:border-brand dark:border-slate-700" key={option}><input className="mr-3" type="radio" name={`question_${question.id}`} value={option} required/>{option}</label>)}</div> : <input className="input" name={`question_${question.id}`} required placeholder="输入答案"/>}</fieldset>)}<button className="button-primary w-full text-lg">提交并自动判分</button></form></div>;
}
