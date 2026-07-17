import { describe, expect, it } from "vitest";
import { buildTutorSystemPrompt, tutorUnavailableMessage } from "@/modules/tutor/prompt";

describe("AI tutor language policy", () => {
  it("uses English-first behavior in immersion mode", () => {
    const prompt = buildTutorSystemPrompt("gentle", "A2", "restaurants", true);
    expect(prompt).toContain("Use English by default");
    expect(prompt).toContain("explicitly asks for Chinese help");
    expect(prompt).toContain("natural expression");
  });
  it("localizes provider outage guidance", () => {
    expect(tutorUnavailableMessage(true)).toContain("temporarily unavailable");
    expect(tutorUnavailableMessage(false)).toContain("暂时不可用");
  });

  it("keeps level-aware Chinese assistance in Chinese mode", () => {
    expect(buildTutorSystemPrompt("academic", "B1", "school", false)).toContain("Use Chinese support for PRE-A1/A1/A2");
  });
});
