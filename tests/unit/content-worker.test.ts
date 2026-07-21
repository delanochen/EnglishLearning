import { afterEach, describe, expect, it } from "vitest";
import { workerSettings } from "@/modules/content-pipeline/worker";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("content worker settings", () => {
  it("uses conservative NAS defaults", () => {
    delete process.env.CONTENT_WORKER_CONCURRENCY;
    delete process.env.CONTENT_WORKER_RATE_MAX;
    delete process.env.CONTENT_WORKER_RATE_DURATION_MS;
    expect(workerSettings()).toMatchObject({ concurrency: 2, rateMax: 20, rateDuration: 60_000 });
  });

  it("clamps unsafe concurrency and limiter values", () => {
    process.env.CONTENT_WORKER_CONCURRENCY = "999";
    process.env.CONTENT_WORKER_RATE_MAX = "0";
    process.env.CONTENT_WORKER_RATE_DURATION_MS = "10";
    expect(workerSettings()).toMatchObject({ concurrency: 20, rateMax: 20, rateDuration: 1_000 });
  });
});
