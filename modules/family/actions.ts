"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessContext } from "@/modules/authorization/context";
import { canManageFamily } from "@/modules/authorization/policy";
import { familySchema, memberSchema } from "./schemas";

export async function createFamily(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = familySchema.parse(Object.fromEntries(formData));
  await db.$transaction(async (tx) => {
    const family = await tx.family.create({ data: { ...input, ownerUserId: session.user.id } });
    const role = await tx.role.findUniqueOrThrow({ where: { code: "FAMILY_OWNER" } });
    await tx.userRole.create({ data: { userId: session.user.id, roleId: role.id, familyId: family.id } });
    await tx.familyMember.create({ data: { familyId: family.id, userId: session.user.id, displayName: session.user.name ?? "家庭管理员", memberType: "OWNER" } });
    await tx.auditLog.create({ data: { actorUserId: session.user.id, familyId: family.id, action: "family.create", resourceType: "Family", resourceId: family.id } });
  });
  revalidatePath("/family");
}

export async function createMember(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = memberSchema.parse(Object.fromEntries(formData));
  const context = await getAccessContext(session.user.id); if (!canManageFamily(context, input.familyId)) throw new Error("FORBIDDEN");
  await db.$transaction(async (tx) => {
    const member = await tx.familyMember.create({ data: { familyId: input.familyId, displayName: input.displayName, nickname: input.nickname || null, memberType: input.memberType } });
    await tx.learnerProfile.create({ data: { familyMemberId: member.id, ageBand: input.ageBand, dailyMinutes: input.dailyMinutes, goals: [], interests: [], weakAreas: [] } });
    await tx.auditLog.create({ data: { actorUserId: session.user.id, familyId: input.familyId, action: "family-member.create", resourceType: "FamilyMember", resourceId: member.id } });
  });
  revalidatePath("/family");
}
