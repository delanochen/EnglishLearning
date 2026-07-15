"use client";
import { useActionState } from "react";
import { loginAction } from "@/modules/identity/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return <form action={action} className="space-y-5">
    <label className="block"><span className="label">邮箱</span><input name="email" type="email" autoComplete="email" required className="input" /></label>
    <label className="block"><span className="label">密码</span><input name="password" type="password" autoComplete="current-password" minLength={8} required className="input" /></label>
    {state?.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{state.error}</p>}
    <button className="button-primary w-full" disabled={pending}>{pending ? "登录中…" : "登录"}</button>
  </form>;
}
