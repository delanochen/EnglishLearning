import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";
import { Preferences } from "@/components/preferences";

export default async function LoginPage() {
  if (await auth()) redirect("/dashboard");
  const english = (await cookies()).get("ui_locale")?.value === "en";
  return <main className="grid min-h-screen place-items-center px-6"><section className="card w-full max-w-md"><div className="flex items-center justify-between"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">HomeLingua</p><Preferences locale={english ? "en" : "zh"}/></div><h1 className="mt-3 text-3xl font-black">{english ? "Welcome home" : "欢迎回家"}</h1><p className="mb-8 mt-2 text-muted">{english ? "Sign in to continue today's English learning." : "登录后继续今天的英语学习。"}</p><LoginForm english={english}/></section></main>;
}
