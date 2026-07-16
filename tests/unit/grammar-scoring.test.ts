import { describe, expect, it } from "vitest";
import { updateGrammarMastery } from "@/modules/grammar/scoring";
describe("grammar mastery", () => {
  it("increases and delays review after a correct answer", () => { const result = updateGrammarMastery(0.5, true); expect(result.mastery).toBeGreaterThan(0.5); expect(result.reviewAfterDays).toBeGreaterThan(1); });
  it("decreases and schedules tomorrow after a mistake", () => { const result = updateGrammarMastery(0.5, false); expect(result.mastery).toBeLessThan(0.5); expect(result.reviewAfterDays).toBe(1); });
});
