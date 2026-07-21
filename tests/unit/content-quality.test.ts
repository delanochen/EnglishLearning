import { describe, expect, it } from "vitest";
import { inspectGeneratedContent, levelDistance, ngramSimilarity, readingMetrics } from "@/modules/content-pipeline/quality";

describe("content quality rules", () => {
  it("calculates deterministic readability and CEFR evidence", () => {
    const metrics = readingMetrics("I live in a small house. My family eats dinner together every day.");
    expect(metrics.wordCount).toBeGreaterThan(10);
    expect(metrics.sentenceCount).toBe(2);
    expect(Number.isFinite(metrics.grade)).toBe(true);
    expect(levelDistance("A1", "B1")).toBe(2);
  });

  it("blocks scripts, exposed keys, and invalid answer options", () => {
    const result = inspectGeneratedContent("READING_GENERATION", {
      title: "Unsafe lesson", body: `<script>alert(1)</script> ${"ordinary learning text ".repeat(20)}`, translation: "中文辅助",
      questions: [{ prompt: "Choose one", options: ["a", "b"], answerKey: "c" }], secret: "api_key=abcdefghijklmnopqrstuv",
    });
    expect(result.errors).toEqual(expect.arrayContaining(["SCRIPT_INJECTION", "HTML_CONTENT", "API_KEY_EXPOSURE", "INVALID_ANSWER_KEY"]));
    expect(result.score).toBeLessThan(50);
  });

  it("detects repeated and near-duplicate normalized text", () => {
    expect(ngramSimilarity("a family goes to the grocery store", "a family goes to the grocery store")).toBe(1);
    expect(ngramSimilarity("a family goes to the grocery store", "quantum mechanics and stars")).toBeLessThan(0.2);
  });
});
