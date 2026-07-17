import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  getAccessContext: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { family: { findMany: mocks.findMany } } }));
vi.mock("@/modules/authorization/context", () => ({ getAccessContext: mocks.getAccessContext }));

import { getAccessibleProfiles, requireProfileAccess } from "@/modules/learner/access";

const families = [
  { id: "family-a", members: [
    { id: "member-self", displayName: "Self", learnerProfile: { id: "profile-self", cefrLevel: "A2", dailyMinutes: 20 } },
    { id: "member-sibling", displayName: "Sibling", learnerProfile: { id: "profile-sibling", cefrLevel: "B1", dailyMinutes: 30 } },
  ] },
  { id: "family-b", members: [
    { id: "member-other", displayName: "Other", learnerProfile: { id: "profile-other", cefrLevel: "C1", dailyMinutes: 45 } },
  ] },
];

describe("learner profile data isolation", () => {
  beforeEach(() => {
    mocks.findMany.mockReset().mockResolvedValue(families);
    mocks.getAccessContext.mockReset();
  });

  it("returns only the learner's own profile even if another family is returned by the repository", async () => {
    mocks.getAccessContext.mockResolvedValue({ userId: "user-a", systemRoleCodes: [], familyRoles: [{ familyId: "family-a", code: "LEARNER" }], memberIds: ["member-self"] });
    await expect(getAccessibleProfiles("user-a")).resolves.toEqual([{ id: "profile-self", name: "Self", familyId: "family-a", level: "A2", dailyMinutes: 20 }]);
  });

  it("allows a parent to read all profiles in their family but rejects another family", async () => {
    mocks.getAccessContext.mockResolvedValue({ userId: "parent-a", systemRoleCodes: [], familyRoles: [{ familyId: "family-a", code: "PARENT" }], memberIds: [] });
    const profiles = await getAccessibleProfiles("parent-a");
    expect(profiles.map((profile) => profile.id)).toEqual(["profile-self", "profile-sibling"]);
    await expect(requireProfileAccess("parent-a", "profile-other")).rejects.toThrow("PROFILE_FORBIDDEN");
  });
});
