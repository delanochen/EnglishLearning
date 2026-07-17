"use client";
import { useActionState } from "react";
import { loginAction } from "@/modules/identity/actions";

export function LoginForm({ english = false }: { english?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const t = english
    ? { email: "Email", password: "Password", pending: "Signing in…", submit: "Sign in" }
    : { email: "邮箱", password: "密码", pending: "登录中…", submit: "登录" };
  const error = english && state?.error === "邮箱或密码不正确，或登录尝试过于频繁。"
    ? "The email or password is incorrect, or there have been too many sign-in attempts."
    : state?.error;
  return <form action={action} className="space-y-5">
    <label className="block"><span className="label">{t.email}</span><input name="email" type="email" autoComplete="email" required className="input" /></label>
    <label className="block"><span className="label">{t.password}</span><input name="password" type="password" autoComplete="current-password" minLength={8} required className="input" /></label>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
    <button className="button-primary w-full" disabled={pending}>{pending ? t.pending : t.submit}</button>
  </form>;
}
