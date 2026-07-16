import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAccessContext } from "./context";
import { canManageSystem } from "./policy";

export async function requireSystemAdmin() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  const context = await getAccessContext(session.user.id);
  if (!canManageSystem(context)) notFound();
  return session.user;
}
