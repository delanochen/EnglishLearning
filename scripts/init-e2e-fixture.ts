import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const familyId = "10000000-0000-4000-8000-000000000001";
const ownerMemberId = "10000000-0000-4000-8000-000000000002";
const learnerMemberId = "10000000-0000-4000-8000-000000000003";
const learnerProfileId = "10000000-0000-4000-8000-000000000004";

async function main() {
  const email = process.env.E2E_ADMIN_EMAIL?.toLowerCase();
  if (!email) throw new Error("E2E_ADMIN_EMAIL is required");
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const ownerRole = await db.role.findUniqueOrThrow({ where: { code: "FAMILY_OWNER" } });
  await db.$transaction(async (tx) => {
    await tx.family.upsert({ where: { id: familyId }, update: { ownerUserId: user.id, name: "E2E Family", deletedAt: null }, create: { id: familyId, ownerUserId: user.id, name: "E2E Family", timezone: "America/Chicago" } });
    const assigned = await tx.userRole.findFirst({ where: { userId: user.id, roleId: ownerRole.id, familyId } });
    if (!assigned) await tx.userRole.create({ data: { userId: user.id, roleId: ownerRole.id, familyId } });
    await tx.familyMember.upsert({ where: { id: ownerMemberId }, update: { familyId, userId: user.id, displayName: "E2E Administrator", memberType: "OWNER", deletedAt: null }, create: { id: ownerMemberId, familyId, userId: user.id, displayName: "E2E Administrator", memberType: "OWNER" } });
    await tx.familyMember.upsert({ where: { id: learnerMemberId }, update: { familyId, displayName: "E2E Learner", memberType: "LEARNER", deletedAt: null }, create: { id: learnerMemberId, familyId, displayName: "E2E Learner", memberType: "LEARNER" } });
    await tx.learnerProfile.upsert({ where: { id: learnerProfileId }, update: { familyMemberId: learnerMemberId, dailyMinutes: 20 }, create: { id: learnerProfileId, familyMemberId: learnerMemberId, ageBand: "ADULT", dailyMinutes: 20, dailyVocabularyGoal: 10, goals: [], interests: [], weakAreas: [] } });
  });
  console.log("E2E family and learner fixture ready.");
}

main().finally(() => db.$disconnect());
