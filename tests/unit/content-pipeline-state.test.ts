import { describe, expect, it } from "vitest";
import { assertContentJobTransition, canTransitionContentJob } from "@/modules/content-pipeline/state-machine";

describe("content pipeline state machine", () => {
  it("allows operational pause, resume and retry paths", () => {
    expect(canTransitionContentJob("PENDING", "PROCESSING")).toBe(true);
    expect(canTransitionContentJob("PROCESSING", "PAUSED")).toBe(true);
    expect(canTransitionContentJob("PAUSED", "PROCESSING")).toBe(true);
    expect(canTransitionContentJob("FAILED", "PENDING")).toBe(true);
  });

  it("prevents publication and terminal-state shortcuts", () => {
    expect(canTransitionContentJob("PENDING", "PUBLISHED")).toBe(false);
    expect(canTransitionContentJob("CANCELED", "PROCESSING")).toBe(false);
    expect(() => assertContentJobTransition("DRAFT", "PUBLISHED")).toThrow("INVALID_JOB_TRANSITION:DRAFT:PUBLISHED");
  });
});
