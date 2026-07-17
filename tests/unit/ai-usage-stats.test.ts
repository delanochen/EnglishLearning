import { describe, expect, it } from "vitest";
import { summarizeAIUsage } from "@/modules/ai/usage-stats";

describe("AI usage statistics", () => {
  it("summarizes tokens, latency, failures, and providers", () => {
    const summary = summarizeAIUsage([
      { status: "SUCCESS", latencyMs: 100, inputTokens: 10, outputTokens: 20, errorType: null, provider: { name: "Primary" } },
      { status: "FAILED", latencyMs: 300, inputTokens: null, outputTokens: null, errorType: "RATE_LIMIT", provider: { name: "Primary" } },
      { status: "SUCCESS", latencyMs: 200, inputTokens: 5, outputTokens: 15, errorType: null, provider: { name: "Backup" } },
    ]);
    expect(summary).toMatchObject({ total: 3, successful: 2, successRate: 67, inputTokens: 15, outputTokens: 35, averageLatencyMs: 200 });
    expect(summary.errors).toEqual([["RATE_LIMIT", 1]]);
    expect(summary.providers.find((provider) => provider.name === "Primary")).toMatchObject({ total: 2, successRate: 50, averageLatencyMs: 200 });
  });
});
