import { describe, expect, it } from "vitest";
import { calculateSpeakingTrend } from "@/modules/speaking/trend";

const attempt = (score: number) => ({ accuracyScore: score, fluencyScore: score, grammarScore: score, completenessScore: score, naturalnessScore: score });

describe("speaking improvement trend", () => {
  it("compares the latest five attempts with the preceding five", () => {
    const trend = calculateSpeakingTrend([.9, .8, .85, .75, .7, .6, .55, .65, .5, .6].map(attempt));
    expect(trend.recentAverage).toBeCloseTo(.8);
    expect(trend.previousAverage).toBeCloseTo(.58);
    expect(trend.delta).toBeCloseTo(.22);
    expect(trend.sampleSize).toBe(5);
  });

  it("does not invent a delta before enough historical data exists", () => {
    expect(calculateSpeakingTrend([attempt(.8)]).delta).toBeNull();
  });
});
