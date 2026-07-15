import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  if (await auth()) redirect("/dashboard");
  return <main className="grid min-h-screen place-items-center px-6"><section className="card w-full max-w-md"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand">HomeLingua</p><h1 className="mt-3 text-3xl font-black">欢迎回家</h1><p className="mb-8 mt-2 text-muted">登录后继续今天的英语学习。</p><LoginForm /></section></main>;
}
