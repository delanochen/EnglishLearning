import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAccessContext } from "@/modules/authorization/context";
import { canManageSystem } from "@/modules/authorization/policy";
import { AppShell } from "@/components/app-shell";
import { cookies } from "next/headers";
import { getAccessibleProfiles } from "@/modules/learner/access";
import { getActiveProfile } from "@/modules/learner/selection";
import { ensureDailyTasks } from "@/modules/tasks/service";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth(); if (!session?.user?.id) redirect("/login");
  const context = await getAccessContext(session.user.id);
  const activeProfile = await getActiveProfile(await getAccessibleProfiles(session.user.id));
  if(activeProfile)await ensureDailyTasks(session.user.id,activeProfile.id);
  const locale = (await cookies()).get("ui_locale")?.value === "en" ? "en" : "zh";
  return <AppShell userName={session.user.name ?? session.user.email ?? "家庭成员"} activeProfileName={activeProfile?.name} isAdmin={canManageSystem(context)} locale={locale}>{children}</AppShell>;
}
