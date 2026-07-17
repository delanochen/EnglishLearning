import { describe, expect, it } from "vitest";
import { dailyTaskOutputSchema, placementReportSchema, vocabularyCourseSchema, weeklyPlanOutputSchema } from "@/modules/ai/content-schemas";

describe("AI content schemas", () => {
  it("rejects incomplete vocabulary output", () => expect(vocabularyCourseSchema.safeParse({ word: "learn" }).success).toBe(false));
  it("accepts a structured daily task", () => expect(dailyTaskOutputSchema.safeParse({ taskType: "READING", title: "Read", description: "One article", estimatedMinutes: 10, xpReward: 10, reason: "level" }).success).toBe(true));
  it("bounds placement section scores", () => expect(placementReportSchema.safeParse({ assessedLevel: "A2", sectionScores: { reading: 120 }, strengths: [], weakAreas: [], recommendations: [] }).success).toBe(false));
  it("requires the complete personalized plan output", () => {
    const complete = { goals: ["Study five days"], focusAreas: ["listening"], recommendedCourses: ["A2 listening"], reviewContent: ["weak words"], stageGoals: ["Improve comprehension in four weeks"], monthlyEvaluation: "Compare all module scores at month end.", adjustmentSuggestions: ["Add shadowing"], items: [{ dayOffset: 0, module: "LISTENING", title: "Listen", target: "one lesson", durationMinutes: 15, reason: "weak area" }] };
    expect(weeklyPlanOutputSchema.safeParse(complete).success).toBe(true);
    expect(weeklyPlanOutputSchema.safeParse({ ...complete, monthlyEvaluation: undefined }).success).toBe(false);
  });
});
