import { describe, expect, it } from "vitest";
import { canManageFamily, canManageSystem, canReadProfile, type AccessContext } from "@/modules/authorization/policy";

const learner: AccessContext = { userId: "u1", systemRoleCodes: [], familyRoles: [{ familyId: "f1", code: "LEARNER" }], memberIds: ["m1"] };

describe("authorization policy", () => {
  it("isolates other families", () => {
    expect(canManageFamily(learner, "f2")).toBe(false);
    expect(canReadProfile(learner, "f2", "m2")).toBe(false);
  });
  it("allows a learner to read only their member profile", () => {
    expect(canReadProfile(learner, "f1", "m1")).toBe(true);
    expect(canReadProfile(learner, "f1", "m2")).toBe(false);
  });
  it("allows system admin globally", () => {
    const admin = { ...learner, systemRoleCodes: ["SYSTEM_ADMIN"] };
    expect(canManageSystem(admin)).toBe(true);
    expect(canManageFamily(admin, "any")).toBe(true);
  });
});
