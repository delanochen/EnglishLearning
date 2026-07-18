import { describe, expect, it } from "vitest";
import { memberUpdateSchema } from "@/modules/family/schemas";

const base = {
  familyId: "550e8400-e29b-41d4-a716-446655440000",
  memberId: "550e8400-e29b-41d4-a716-446655440001",
  displayName: "Alex",
  nickname: "Al",
  memberType: "LEARNER",
  ageBand: "ADULT",
  dailyMinutes: "30"
  ,dailyVocabularyGoal: "15"
};

describe("memberUpdateSchema", () => {
  it("normalizes editable member input", () => {
    const parsed = memberUpdateSchema.parse(base);
    expect(parsed.dailyMinutes).toBe(30);
    expect(parsed.dailyVocabularyGoal).toBe(15);
    expect(parsed.displayName).toBe("Alex");
  });

  it("rejects an excessive daily vocabulary goal", () => {
    expect(() => memberUpdateSchema.parse({ ...base, dailyVocabularyGoal: "101" })).toThrow();
  });

  it("rejects unsupported daily study time", () => {
    expect(() => memberUpdateSchema.parse({ ...base, dailyMinutes: "5" })).toThrow();
  });
});
