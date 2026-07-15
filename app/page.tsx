import Link from "next/link";

export default function Home() {
  return <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
    <section className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
      <div><p className="mb-4 text-sm font-bold uppercase tracking-[.24em] text-brand">HomeLingua</p><h1 className="max-w-3xl text-5xl font-black leading-tight md:text-7xl">每个人都有自己的<br/><span className="text-brand">英语学习节奏</span></h1><p className="mt-6 max-w-2xl text-lg leading-8 text-muted">为家庭成员提供分级内容、每日任务和清晰的学习进度。数据保存在您自己的 NAS 中。</p><div className="mt-8 flex gap-3"><Link className="button-primary" href="/login">进入平台</Link><Link className="button-ghost" href="/api/health/live">健康状态</Link></div></div>
      <div className="card grid gap-4"><p className="font-bold">今天可以从这里开始</p>{["完成 10 分钟单词复习", "阅读一篇适合你水平的短文", "和 AI 老师练习生活对话"].map((x, i) => <div key={x} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><span className="grid size-9 place-items-center rounded-full bg-brand/15 font-bold text-brand">{i + 1}</span>{x}</div>)}</div>
    </section>
  </main>;
}
