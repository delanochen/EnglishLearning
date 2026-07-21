import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/modules/content-pipeline/bullmq", () => ({ contentJobQueue: vi.fn() }));
vi.mock("@/modules/content-pipeline/jobs", () => ({ transitionContentJob: vi.fn() }));
vi.mock("@/modules/content-pipeline/processor", () => ({ prepareContentJob: vi.fn() }));

import { initializationDefinitions } from "@/modules/content-pipeline/initialization";

describe("content library initialization plan", () => {
  it("matches every required initial inventory target", () => {
    const byKey = Object.fromEntries(initializationDefinitions.map((definition) => [definition.key, definition.target]));
    expect(byKey).toMatchObject({
      "vocabulary-PRE_A1": 300, "vocabulary-A1": 800, "vocabulary-A2": 1200,
      "vocabulary-B1": 1500, "vocabulary-B2": 1500, "vocabulary-high-school-academic": 1000,
      "reading-PRE_A1": 30, "reading-A1": 50, "reading-A2": 50, "reading-B1": 50,
      "reading-B2": 40, "reading-high-school": 50, "reading-us-life": 50,
      "grammar-core": 18, "scenario-us-life": 23,
    });
    expect(initializationDefinitions.reduce((sum, definition) => sum + definition.target, 0)).toBe(6661);
  });

  it("keeps exact grammar and American-life topic specifications", () => {
    const grammar = initializationDefinitions.find((definition) => definition.key === "grammar-core");
    const scenarios = initializationDefinitions.find((definition) => definition.key === "scenario-us-life");
    expect(grammar?.configuration.itemSpecs).toHaveLength(18);
    expect(scenarios?.configuration.itemSpecs).toHaveLength(23);
  });
});
