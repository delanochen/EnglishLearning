"use server";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";

export async function loginAction(_: { error?: string } | undefined, formData: FormData) {
  try {
    await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return { error: "邮箱或密码不正确，或登录尝试过于频繁。" };
    throw error;
  }
}

export async function logoutAction() { await signOut({ redirectTo: "/login" }); redirect("/login"); }
