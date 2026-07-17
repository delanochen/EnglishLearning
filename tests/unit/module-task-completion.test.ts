import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  completeTaskForUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { dailyTask: { findFirst: mocks.findFirst } } }));
vi.mock("@/modules/tasks/completion", () => ({ completeTaskForUser: mocks.completeTaskForUser }));

import { completeTodayTaskForModule } from "@/modules/tasks/module-completion";

describe("module task completion", () => {
  beforeEach(() => {
    mocks.findFirst.mockReset();
    mocks.completeTaskForUser.mockReset();
  });

  it("completes today's matching task with the verified module score", async () => {
    mocks.findFirst.mockResolvedValue({ id: "task-1", estimatedMinutes: 15 });

    await expect(completeTodayTaskForModule("user-1", "profile-1", "READING", 0.8, 420)).resolves.toBe(true);

    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        learnerProfileId: "profile-1",
        taskType: "READING",
        status: { in: ["PENDING", "SKIPPED"] },
      }),
    }));
    expect(mocks.completeTaskForUser).toHaveBeenCalledWith("user-1", "task-1", 420, 0.8);
  });

  it("uses the planned duration and does nothing when no task exists", async () => {
    mocks.findFirst.mockResolvedValueOnce({ id: "task-2", estimatedMinutes: 12 });
    await completeTodayTaskForModule("user-1", "profile-1", "LISTENING", 1);
    expect(mocks.completeTaskForUser).toHaveBeenLastCalledWith("user-1", "task-2", 720, 1);

    mocks.findFirst.mockResolvedValueOnce(null);
    await expect(completeTodayTaskForModule("user-1", "profile-1", "WRITING", 0.7)).resolves.toBe(false);
    expect(mocks.completeTaskForUser).toHaveBeenCalledTimes(1);
  });
});
