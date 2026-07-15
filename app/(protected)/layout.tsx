import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAccessContext } from "@/modules/authorization/context";
import { canManageSystem } from "@/modules/authorization/policy";
import { AppShell } from "@/components/app-shell";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth(); if (!session?.user?.id) redirect("/login");
  const context = await getAccessContext(session.user.id);
  return <AppShell userName={session.user.name ?? session.user.email ?? "家庭成员"} isAdmin={canManageSystem(context)}>{children}</AppShell>;
}
