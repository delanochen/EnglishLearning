import { describe, expect, it } from "vitest";
import { createContentJobSchema } from "@/modules/content-pipeline/schemas";

describe("content generation job schema", () => {
  it("accepts a bounded batch job and preserves structured configuration", () => {
    const value=createContentJobSchema.parse({type:"READING_GENERATION",totalItems:20,configuration:{level:"A2",topic:"school"}});
    expect(value.totalItems).toBe(20); expect(value.configuration).toEqual({level:"A2",topic:"school"});
  });

  it("rejects unbounded jobs and unknown job types", () => {
    expect(()=>createContentJobSchema.parse({type:"READING_GENERATION",totalItems:10001})).toThrow();
    expect(()=>createContentJobSchema.parse({type:"SCRAPE_ANY_SITE",totalItems:1})).toThrow();
  });
});
