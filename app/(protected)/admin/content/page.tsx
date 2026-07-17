import Link from "next/link";
import { db } from "@/lib/db";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { createGrammarTopic, createListeningExercise, createReadingArticle, createScenarioLesson, createVocabulary, updateContentDetails, updateContentStatus } from "@/modules/admin/actions";

const levels = ["PRE_A1", "A1", "A2", "B1", "B2", "C1"];
const labels: Record<string, string> = { vocabulary: "词汇", reading: "阅读", grammar: "语法", scenario: "场景", listening: "听力" };

export default async function AdminContentPage() {
  await requireSystemAdmin();
  const [vocabulary, reading, grammar, scenario, listening] = await Promise.all([
    db.vocabulary.findMany({ take: 100, orderBy: { updatedAt: "desc" }, include: { meanings: { where: { locale: "zh-CN", senseOrder: 1 }, take: 1 } } }),
    db.readingArticle.findMany({ take: 100, orderBy: { updatedAt: "desc" } }),
    db.grammarTopic.findMany({ take: 100, orderBy: { updatedAt: "desc" } }),
    db.scenarioLesson.findMany({ take: 100, orderBy: { updatedAt: "desc" } }),
    db.listeningExercise.findMany({ take: 100, orderBy: { updatedAt: "desc" } })
  ]);
  const rows = [
    ...vocabulary.map((item) => ({ type: "vocabulary", id: item.id, title: item.word, primary: item.definitionEn, secondary: item.meanings[0]?.definition ?? "", topic: item.topic, level: item.level, status: item.status })),
    ...reading.map((item) => ({ type: "reading", id: item.id, title: item.title, primary: item.body, secondary: item.translation ?? "", topic: item.topic, level: item.level, status: item.status })),
    ...grammar.map((item) => ({ type: "grammar", id: item.id, title: item.title, primary: item.ruleEn, secondary: item.ruleZh, topic: "", level: item.level, status: item.status })),
    ...scenario.map((item) => ({ type: "scenario", id: item.id, title: item.title, primary: item.intro, secondary: "", topic: item.category, level: item.level, status: item.status })),
    ...listening.map((item) => ({ type: "listening", id: item.id, title: item.title, primary: item.transcript, secondary: item.translation ?? "", topic: item.topic, level: item.level, status: item.status }))
  ];
  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-4xl font-black">课程与内容</h1><p className="mt-2 text-muted">人工或 AI 创建后先保存为草稿，审核无误再发布。</p></div><Link className="button-primary" href="/admin/content/generate-reading">AI 生成分级阅读</Link></div>
    <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <CreateCard title="新增词汇" action={createVocabulary}><Text name="word" label="单词"/><Text name="phonetic" label="音标" optional/><Text name="partOfSpeech" label="词性"/><Text name="definitionEn" label="英文解释"/><Text name="definitionZh" label="中文解释"/><Text name="topic" label="主题"/><Level/></CreateCard>
      <CreateCard title="新增阅读" action={createReadingArticle}><Text name="title" label="标题"/><Area name="body" label="英文正文"/><Area name="translation" label="中文翻译" optional/><Text name="audience" label="年龄/受众"/><Text name="topic" label="主题"/><Text name="targetVocabulary" label="目标词汇，逗号分隔" optional/><Text name="targetGrammar" label="目标语法，逗号分隔" optional/><Level/></CreateCard>
      <CreateCard title="新增听力" action={createListeningExercise}><Text name="title" label="标题"/><Area name="transcript" label="英文听力稿"/><Area name="translation" label="中文翻译" optional/><Text name="topic" label="主题"/><Text name="audioUrl" label="可选音频 URL" optional/><Level/></CreateCard>
      <CreateCard title="新增语法" action={createGrammarTopic}><Text name="slug" label="slug，例如 present-perfect"/><Text name="title" label="标题"/><Area name="ruleEn" label="英文规则"/><Area name="ruleZh" label="中文解释"/><Area name="useCases" label="适用场景，每行一项" optional/><Area name="commonErrors" label="常见错误，每行一项" optional/><Level/></CreateCard>
      <CreateCard title="新增场景课程" action={createScenarioLesson}><Text name="category" label="分类"/><Text name="title" label="标题"/><Area name="intro" label="场景介绍"/><Level/></CreateCard>
    </section>
    <div className="card mt-6 space-y-3">{rows.map((row) => <details key={`${row.type}-${row.id}`} className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3"><div><span className="mr-3 rounded-full bg-brand/10 px-2 py-1 text-xs font-bold text-brand">{labels[row.type]}</span><strong>{row.title}</strong><span className="ml-2 text-xs text-muted">{row.level} · {row.status}</span></div><span className="text-sm text-brand">编辑内容</span></summary><div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]"><form action={updateContentDetails} className="grid gap-3 md:grid-cols-2"><input type="hidden" name="type" value={row.type}/><input type="hidden" name="id" value={row.id}/><Text name="title" label="标题/单词" value={row.title}/><Text name="topic" label="主题/分类" value={row.topic} optional/><label className="md:col-span-2"><span className="label">英文正文/规则/解释</span><textarea className="input min-h-32" name="primary" defaultValue={row.primary} required/></label><label className="md:col-span-2"><span className="label">中文翻译/解释</span><textarea className="input min-h-24" name="secondary" defaultValue={row.secondary}/></label><Level value={row.level}/><button className="button-primary">保存修订</button></form><form action={updateContentStatus} className="flex items-end gap-2"><input type="hidden" name="type" value={row.type}/><input type="hidden" name="id" value={row.id}/><select className="input" name="status" defaultValue={row.status}><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select><button className="button-ghost">更新状态</button></form></div></details>)}{!rows.length && <p className="text-muted">暂无内容，请新增内容或运行幂等 seed。</p>}</div>
  </div>;
}

function CreateCard({ title, action, children }: { title: string; action: (formData: FormData) => Promise<void>; children: React.ReactNode }) { return <details className="card"><summary className="cursor-pointer text-lg font-black">{title}</summary><form action={action} className="mt-4 space-y-3">{children}<button className="button-primary w-full">保存草稿</button></form></details>; }
function Text({ name, label, optional = false, value }: { name: string; label: string; optional?: boolean; value?: string }) { return <input className="input" name={name} placeholder={label} defaultValue={value} required={!optional}/>; }
function Area({ name, label, optional = false }: { name: string; label: string; optional?: boolean }) { return <textarea className="input min-h-24" name={name} placeholder={label} required={!optional}/>; }
function Level({ value = "A2" }: { value?: string }) { return <select className="input" name="level" defaultValue={value}>{levels.map((level) => <option key={level}>{level}</option>)}</select>; }
