"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessContext } from "@/modules/authorization/context";
import { canManageFamily } from "@/modules/authorization/policy";
import { familySchema, familyUpdateSchema, memberSchema, memberStateSchema, memberUpdateSchema } from "./schemas";
import { z } from "zod";

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

export async function updateFamily(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = familyUpdateSchema.parse(Object.fromEntries(formData));
  const context = await getAccessContext(session.user.id); if (!canManageFamily(context, input.familyId)) throw new Error("FORBIDDEN");
  const existing = await db.family.findFirst({ where: { id: input.familyId, deletedAt: null } });
  if (!existing) throw new Error("FAMILY_NOT_FOUND");
  await db.$transaction([
    db.family.update({ where: { id: existing.id }, data: { name: input.name, timezone: input.timezone } }),
    db.auditLog.create({ data: { actorUserId: session.user.id, familyId: existing.id, action: "family.update", resourceType: "Family", resourceId: existing.id, metadata: { before: { name: existing.name, timezone: existing.timezone }, after: { name: input.name, timezone: input.timezone } } } })
  ]);
  revalidatePath("/family");
}

export async function createMember(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = memberSchema.parse(Object.fromEntries(formData));
  const context = await getAccessContext(session.user.id); if (!canManageFamily(context, input.familyId)) throw new Error("FORBIDDEN");
  await db.$transaction(async (tx) => {
    const member = await tx.familyMember.create({ data: { familyId: input.familyId, displayName: input.displayName, nickname: input.nickname || null, memberType: input.memberType } });
    await tx.learnerProfile.create({ data: { familyMemberId: member.id, ageBand: input.ageBand, dailyMinutes: input.dailyMinutes, dailyVocabularyGoal: input.dailyVocabularyGoal, goals: [], interests: [], weakAreas: [] } });
    await tx.auditLog.create({ data: { actorUserId: session.user.id, familyId: input.familyId, action: "family-member.create", resourceType: "FamilyMember", resourceId: member.id } });
  });
  revalidatePath("/family");
}

export async function updateMember(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = memberUpdateSchema.parse(Object.fromEntries(formData));
  const context = await getAccessContext(session.user.id); if (!canManageFamily(context, input.familyId)) throw new Error("FORBIDDEN");
  const existing = await db.familyMember.findFirst({
    where: { id: input.memberId, familyId: input.familyId, deletedAt: null },
    include: { learnerProfile: true }
  });
  if (!existing) throw new Error("MEMBER_NOT_FOUND");

  const memberType = existing.memberType === "OWNER" ? "OWNER" : input.memberType;
  await db.$transaction(async (tx) => {
    await tx.familyMember.update({
      where: { id: existing.id },
      data: { displayName: input.displayName, nickname: input.nickname || null, memberType }
    });
    if (existing.learnerProfile) {
      await tx.learnerProfile.update({
        where: { id: existing.learnerProfile.id },
        data: { ageBand: input.ageBand ?? existing.learnerProfile.ageBand, dailyMinutes: input.dailyMinutes ?? existing.learnerProfile.dailyMinutes, dailyVocabularyGoal: input.dailyVocabularyGoal ?? existing.learnerProfile.dailyVocabularyGoal, goals: input.goals?.split(/[，,]/).map((x) => x.trim()).filter(Boolean) ?? existing.learnerProfile.goals, interests: input.interests?.split(/[，,]/).map((x) => x.trim()).filter(Boolean) ?? existing.learnerProfile.interests, weakAreas: input.weakAreas?.split(/[，,]/).map((x) => x.trim()).filter(Boolean) ?? existing.learnerProfile.weakAreas }
      });
    }
    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        familyId: input.familyId,
        action: "family-member.update",
        resourceType: "FamilyMember",
        resourceId: existing.id,
        metadata: {
          before: { displayName: existing.displayName, nickname: existing.nickname, memberType: existing.memberType, ageBand: existing.learnerProfile?.ageBand, dailyMinutes: existing.learnerProfile?.dailyMinutes, dailyVocabularyGoal: existing.learnerProfile?.dailyVocabularyGoal },
          after: { displayName: input.displayName, nickname: input.nickname || null, memberType, ageBand: input.ageBand, dailyMinutes: input.dailyMinutes, dailyVocabularyGoal: input.dailyVocabularyGoal, goals: input.goals, interests: input.interests, weakAreas: input.weakAreas }
        }
      }
    });
  });
  revalidatePath("/family"); revalidatePath("/profiles"); revalidatePath("/dashboard"); revalidatePath("/tasks"); revalidatePath("/learn/vocabulary");
  redirect(`/family?saved=${existing.id}`);
}

async function setMemberArchived(formData: FormData, archived: boolean) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = memberStateSchema.parse(Object.fromEntries(formData));
  const context = await getAccessContext(session.user.id); if (!canManageFamily(context, input.familyId)) throw new Error("FORBIDDEN");
  const existing = await db.familyMember.findFirst({ where: { id: input.memberId, familyId: input.familyId } });
  if (!existing) throw new Error("MEMBER_NOT_FOUND");
  if (existing.memberType === "OWNER") throw new Error("OWNER_CANNOT_BE_ARCHIVED");
  const deletedAt = archived ? new Date() : null;
  await db.$transaction([
    db.familyMember.update({ where: { id: existing.id }, data: { deletedAt, status: archived ? "ARCHIVED" : "ACTIVE" } }),
    db.auditLog.create({ data: { actorUserId: session.user.id, familyId: input.familyId, action: archived ? "family-member.archive" : "family-member.restore", resourceType: "FamilyMember", resourceId: existing.id } })
  ]);
  revalidatePath("/family");
}

export async function archiveMember(formData: FormData) { await setMemberArchived(formData, true); }
export async function restoreMember(formData: FormData) { await setMemberArchived(formData, false); }

export async function updateFamilyLearningSettings(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = z.object({ familyId: z.string().uuid(), sharedGoal: z.string().trim().max(300).optional(), leaderboardEnabled: z.enum(["on"]).optional() }).parse(Object.fromEntries(formData));
  const context = await getAccessContext(session.user.id); if (!canManageFamily(context, input.familyId)) throw new Error("FORBIDDEN");
  await db.$transaction([db.family.update({ where: { id: input.familyId }, data: { sharedGoal: input.sharedGoal || null, leaderboardEnabled: input.leaderboardEnabled === "on" } }), db.auditLog.create({ data: { actorUserId: session.user.id, familyId: input.familyId, action: "family.learning-settings.update", resourceType: "Family", resourceId: input.familyId } })]);
  revalidatePath("/family-dashboard"); revalidatePath("/family");
}
