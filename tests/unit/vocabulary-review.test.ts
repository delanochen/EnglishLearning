import { describe, expect, it } from "vitest";
import { calculateReview } from "@/modules/vocabulary/review";

describe("calculateReview", () => {
  it("grows the interval after repeated correct answers", () => {
    const result = calculateReview({ quality: 5, easeFactor: 2.5, intervalDays: 3, consecutiveCorrect: 2, mastery: 0.5 });
    expect(result.correct).toBe(true);
    expect(result.intervalDays).toBeGreaterThan(3);
    expect(result.mastery).toBeGreaterThan(0.5);
  });

  it("resets repetition after a failed review", () => {
    const result = calculateReview({ quality: 1, easeFactor: 2.5, intervalDays: 10, consecutiveCorrect: 4, mastery: 0.8 });
    expect(result.correct).toBe(false);
    expect(result.consecutiveCorrect).toBe(0);
    expect(result.intervalDays).toBe(1);
  });
});
