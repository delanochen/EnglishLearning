import { describe, expect, it } from "vitest";
import { planDailyTasks } from "@/modules/tasks/planner";

describe("planDailyTasks", () => {
  it("keeps a short plan focused", () => expect(planDailyTasks(10)).toHaveLength(1));
  it("creates a balanced plan for 30 minutes", () => {
    const tasks = planDailyTasks(30);
    expect(tasks.map((task) => task.taskType)).toEqual(["VOCABULARY", "READING", "AI_TUTOR"]);
    expect(tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)).toBe(30);
  });
});
