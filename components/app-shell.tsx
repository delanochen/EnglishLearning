import Link from "next/link";
import { Home, Users, ShieldCheck, LogOut, MessageCircle, BookOpen, ListChecks, Languages, BookCheck, Headphones, Mic, PencilLine, BarChart3, CalendarRange, FileChartColumn, Clapperboard, Gauge, Bell, KeyRound } from "lucide-react";
import { Preferences } from "./preferences";
import { logoutAction } from "@/modules/identity/actions";

export function AppShell({ children, userName, isAdmin, locale }: { children: React.ReactNode; userName: string; isAdmin: boolean; locale: "zh" | "en" }) {
  const t = locale === "en" ? { account:"Account",home:"Home",placement:"Placement",tutor:"AI Tutor",vocabulary:"Vocabulary",reading:"Reading",grammar:"Grammar",listening:"Listening",speaking:"Speaking",writing:"Writing",scenarios:"US Life",tasks:"Daily Tasks",plans:"Plans",reports:"Reports",familyLearning:"Family Learning",family:"Family",notifications:"Notifications",admin:"Admin" } : { account:"账号安全",home:"首页",placement:"水平测试",tutor:"AI 老师",vocabulary:"单词",reading:"阅读",grammar:"语法",listening:"听力",speaking:"口语",writing:"写作",scenarios:"生活场景",tasks:"每日任务",plans:"学习计划",reports:"学习报告",familyLearning:"家庭学习",family:"家庭",notifications:"通知",admin:"管理" };
  const links = [
    { href: "/account", label: t.account, icon: KeyRound },
    { href: "/dashboard", label: t.home, icon: Home }, { href: "/placement", label: t.placement, icon: Gauge }, { href: "/learn/tutor", label: t.tutor, icon: MessageCircle }, { href: "/learn/vocabulary", label: t.vocabulary, icon: Languages }, { href: "/learn/reading", label: t.reading, icon: BookOpen }, { href: "/learn/grammar", label: t.grammar, icon: BookCheck }, { href: "/learn/listening", label: t.listening, icon: Headphones }, { href: "/learn/speaking", label: t.speaking, icon: Mic }, { href: "/learn/writing", label: t.writing, icon: PencilLine }, { href: "/learn/scenarios", label: t.scenarios, icon: Clapperboard }, { href: "/tasks", label: t.tasks, icon: ListChecks }, { href: "/plans", label: t.plans, icon: CalendarRange }, { href: "/reports", label: t.reports, icon: FileChartColumn }, { href: "/family-dashboard", label: t.familyLearning, icon: BarChart3 }, { href: "/family", label: t.family, icon: Users }, { href: "/notifications", label: t.notifications, icon: Bell }, ...(isAdmin ? [{ href: "/admin", label: t.admin, icon: ShieldCheck }] : [])
  ];
  return <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
    <aside className="border-b border-slate-200 bg-white/80 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between lg:block"><Link href="/dashboard" className="text-xl font-black text-brand">HomeLingua</Link><Preferences locale={locale}/></div>
      <nav className="mt-5 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">{links.map(({ href, label, icon: Icon }) => <Link className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 font-semibold hover:bg-brand/10" href={href} key={href}><Icon size={19}/>{label}</Link>)}</nav>
      <div className="mt-8 hidden border-t border-slate-200 pt-5 dark:border-slate-800 lg:block"><p className="mb-3 truncate text-sm text-muted">{userName}</p><form action={logoutAction}><button className="button-ghost flex w-full items-center gap-2"><LogOut size={17}/>退出</button></form></div>
    </aside>
    <main className="p-5 md:p-8 lg:p-10">{children}</main>
  </div>;
}
