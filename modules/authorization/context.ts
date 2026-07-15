import { db } from "@/lib/db";
import type { AccessContext } from "./policy";

export async function getAccessContext(userId: string): Promise<AccessContext> {
  const [roles, members] = await Promise.all([
    db.userRole.findMany({ where: { userId }, include: { role: true } }),
    db.familyMember.findMany({ where: { userId, deletedAt: null }, select: { id: true } })
  ]);
  return {
    userId,
    systemRoleCodes: roles.filter((r) => !r.familyId).map((r) => r.role.code),
    familyRoles: roles.filter((r) => r.familyId).map((r) => ({ familyId: r.familyId!, code: r.role.code })),
    memberIds: members.map((m) => m.id)
  };
}
