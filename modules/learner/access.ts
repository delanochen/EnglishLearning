import { db } from "@/lib/db";
import { getAccessContext } from "@/modules/authorization/context";
import { canManageFamily, canReadProfile } from "@/modules/authorization/policy";

export async function getAccessibleProfiles(userId: string) {
  const context = await getAccessContext(userId);
  const families = await db.family.findMany({
    where: { deletedAt: null, OR: [{ ownerUserId: userId }, { members: { some: { userId, deletedAt: null } } }] },
    include: { members: { where: { deletedAt: null, learnerProfile: { isNot: null } }, include: { learnerProfile: true } } }
  });
  return families.flatMap((family) => family.members
    .filter((member) => member.learnerProfile && (canManageFamily(context, family.id) || canReadProfile(context, family.id, member.id)))
    .map((member) => ({ id: member.learnerProfile!.id, name: member.displayName, familyId: family.id, level: member.learnerProfile!.cefrLevel, dailyMinutes: member.learnerProfile!.dailyMinutes })));
}

export async function requireProfileAccess(userId: string, profileId: string) {
  const profiles = await getAccessibleProfiles(userId);
  const profile = profiles.find((item) => item.id === profileId);
  if (!profile) throw new Error("PROFILE_FORBIDDEN");
  return profile;
}
