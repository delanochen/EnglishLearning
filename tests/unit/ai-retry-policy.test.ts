import { describe, expect, it } from "vitest";
import { canFallback, retryDelayMs, shouldRetrySameModel } from "@/modules/ai/retry-policy";

describe("AI gateway retry and fallback policy", () => {
  it("retries a recoverable timeout or provider failure once", () => {
    expect(shouldRetrySameModel("TIMEOUT", 0)).toBe(true);
    expect(shouldRetrySameModel("PROVIDER_5XX", 0)).toBe(true);
    expect(shouldRetrySameModel("TIMEOUT", 1)).toBe(false);
    expect(retryDelayMs(0)).toBe(250);
  });

  it("falls back immediately on 429 instead of retrying the same provider", () => {
    expect(canFallback("RATE_LIMIT")).toBe(true);
    expect(shouldRetrySameModel("RATE_LIMIT", 0)).toBe(false);
  });

  it("does not retry or fall back for authentication and client errors", () => {
    expect(canFallback("AUTH")).toBe(false);
    expect(canFallback("PROVIDER_4XX")).toBe(false);
    expect(shouldRetrySameModel("AUTH", 0)).toBe(false);
  });
});
