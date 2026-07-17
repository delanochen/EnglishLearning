import { describe, expect, it } from "vitest";
import { buildTutorSystemPrompt } from "@/modules/tutor/prompt";

describe("AI tutor language policy", () => {
  it("uses English-first behavior in immersion mode", () => {
    const prompt = buildTutorSystemPrompt("gentle", "A2", "restaurants", true);
    expect(prompt).toContain("Use English by default");
    expect(prompt).toContain("explicitly asks for Chinese help");
    expect(prompt).toContain("natural expression");
  });

  it("keeps level-aware Chinese assistance in Chinese mode", () => {
    expect(buildTutorSystemPrompt("academic", "B1", "school", false)).toContain("Use Chinese support for PRE-A1/A1/A2");
  });
});
