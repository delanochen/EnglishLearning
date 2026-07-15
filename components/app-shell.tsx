import Link from "next/link";
import { Home, Users, ShieldCheck, LogOut } from "lucide-react";
import { Preferences } from "./preferences";
import { logoutAction } from "@/modules/identity/actions";

export function AppShell({ children, userName, isAdmin }: { children: React.ReactNode; userName: string; isAdmin: boolean }) {
  const links = [{ href: "/dashboard", label: "首页", icon: Home }, { href: "/family", label: "家庭", icon: Users }, ...(isAdmin ? [{ href: "/admin", label: "管理", icon: ShieldCheck }] : [])];
  return <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
    <aside className="border-b border-slate-200 bg-white/80 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between lg:block"><Link href="/dashboard" className="text-xl font-black text-brand">HomeLingua</Link><Preferences /></div>
      <nav className="mt-5 flex gap-2 lg:flex-col">{links.map(({ href, label, icon: Icon }) => <Link className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold hover:bg-brand/10" href={href} key={href}><Icon size={19}/>{label}</Link>)}</nav>
      <div className="mt-8 hidden border-t border-slate-200 pt-5 dark:border-slate-800 lg:block"><p className="mb-3 truncate text-sm text-muted">{userName}</p><form action={logoutAction}><button className="button-ghost flex w-full items-center gap-2"><LogOut size={17}/>退出</button></form></div>
    </aside>
    <main className="p-5 md:p-8 lg:p-10">{children}</main>
  </div>;
}
