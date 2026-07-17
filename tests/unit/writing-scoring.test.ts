import { describe, expect, it } from "vitest";
import { calculateWritingOverall } from "@/modules/writing/scoring";

describe("writing scoring", () => {
  it("weights all five required feedback dimensions equally", () => {
    expect(calculateWritingOverall({ grammarScore: 80, spellingScore: 100, vocabularyScore: 70, structureScore: 60, naturalnessScore: 90 })).toBe(80);
  });
});
