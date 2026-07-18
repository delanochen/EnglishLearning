import {describe,expect,it} from "vitest";
import {vocabularyLevelFallbacks} from "@/modules/vocabulary/levels";

describe("vocabulary level fallbacks",()=>{
  it("prefers the assessed level and then adjacent levels",()=>{
    expect(vocabularyLevelFallbacks("A2").slice(0,4)).toEqual(["A2","A1","B1","PRE_A1"]);
    expect(vocabularyLevelFallbacks("C2").slice(0,3)).toEqual(["C2","C1","B2"]);
  });
});
