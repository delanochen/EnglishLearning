"use server";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { z } from "zod";

export async function loginAction(_: { error?: string } | undefined, formData: FormData) {
  try {
    await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return { error: "邮箱或密码不正确，或登录尝试过于频繁。" };
    throw error;
  }
}

export async function logoutAction() { await signOut({ redirectTo: "/login" }); redirect("/login"); }

export async function changePasswordAction(_: { error?: string; success?: string } | undefined, formData: FormData) {
  const session = await auth(); if (!session?.user.id) return { error: "登录已失效，请重新登录。" };
  const parsed = z.object({ currentPassword: z.string().min(8).max(128), newPassword: z.string().min(12, "新密码至少 12 个字符").max(128), confirmation: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }; if (parsed.data.newPassword !== parsed.data.confirmation) return { error: "两次输入的新密码不一致。" };
  const user = await db.user.findUnique({ where: { id: session.user.id } }); if (!user?.passwordHash || !await verifyPassword(user.passwordHash, parsed.data.currentPassword)) return { error: "当前密码不正确。" };
  const passwordHash = await hashPassword(parsed.data.newPassword); await db.$transaction([db.user.update({ where: { id: user.id }, data: { passwordHash } }), db.auditLog.create({ data: { actorUserId: user.id, action: "PASSWORD_CHANGED", resourceType: "User", resourceId: user.id } })]);
  return { success: "密码已更新。请退出后使用新密码重新登录。" };
}
