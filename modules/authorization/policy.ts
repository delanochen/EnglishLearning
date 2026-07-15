export type AccessContext = {
  userId: string;
  systemRoleCodes: string[];
  familyRoles: Array<{ familyId: string; code: string }>;
  memberIds: string[];
};

export function canManageSystem(ctx: AccessContext) {
  return ctx.systemRoleCodes.includes("SYSTEM_ADMIN");
}

export function canManageFamily(ctx: AccessContext, familyId: string) {
  return canManageSystem(ctx) || ctx.familyRoles.some((r) => r.familyId === familyId && ["FAMILY_OWNER", "PARENT"].includes(r.code));
}

export function canReadProfile(ctx: AccessContext, familyId: string, familyMemberId: string) {
  return canManageFamily(ctx, familyId) || ctx.memberIds.includes(familyMemberId);
}
