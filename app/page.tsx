import Link from "next/link";
import { cookies } from "next/headers";
import { Preferences } from "@/components/preferences";

export default async function Home() {
  const english=(await cookies()).get("ui_locale")?.value==="en";
  const t=english?{headline:"Your own pace for",accent:"learning English",intro:"Graded content, daily tasks, and clear learning progress for every family member. Your data stays on your own NAS.",enter:"Enter platform",health:"Health status",start:"Start here today",items:["Complete a 10-minute vocabulary review","Read a short article at your level","Practice an everyday conversation with the AI tutor"]}:{headline:"每个人都有自己的",accent:"英语学习节奏",intro:"为家庭成员提供分级内容、每日任务和清晰的学习进度。数据保存在您自己的 NAS 中。",enter:"进入平台",health:"健康状态",start:"今天可以从这里开始",items:["完成 10 分钟单词复习","阅读一篇适合你水平的短文","和 AI 老师练习生活对话"]};
  return <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
    <section className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
      <div><div className="mb-4 flex items-center justify-between"><p className="text-sm font-bold uppercase tracking-[.24em] text-brand">HomeLingua</p><Preferences locale={english?"en":"zh"}/></div><h1 className="max-w-3xl text-5xl font-black leading-tight md:text-7xl">{t.headline}<br/><span className="text-brand">{t.accent}</span></h1><p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{t.intro}</p><div className="mt-8 flex gap-3"><Link className="button-primary" href="/login">{t.enter}</Link><Link className="button-ghost" href="/api/health/live">{t.health}</Link></div></div>
      <div className="card grid gap-4"><p className="font-bold">{t.start}</p>{t.items.map((x, i) => <div key={x} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><span className="grid size-9 place-items-center rounded-full bg-brand/15 font-bold text-brand">{i + 1}</span>{x}</div>)}</div>
    </section>
  </main>;
}
