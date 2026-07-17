import { describe, expect, it } from "vitest";
import { parseOptionalSpeakingAudioId } from "@/modules/placement/submission";

describe("placement speaking submission",()=>{
  it("accepts an optional uploaded recording id",()=>{
    expect(parseOptionalSpeakingAudioId(null)).toBeUndefined();
    expect(parseOptionalSpeakingAudioId("11111111-1111-4111-8111-111111111111")).toBe("11111111-1111-4111-8111-111111111111");
    expect(()=>parseOptionalSpeakingAudioId("not-an-id")).toThrow();
  });
});
