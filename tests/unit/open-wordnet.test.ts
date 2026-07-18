import { describe,expect,it } from "vitest";
import { parseWordNetLine } from "@/modules/vocabulary/open-wordnet";

describe("Open English WordNet importer",()=>{
  it("parses WNDB words, glosses and examples",()=>{
    const row=parseWordNetLine('00001740 03 n 01 entity 0 000 | that which is perceived; "an entity exists"','noun');
    expect(row).toEqual({words:["entity"],gloss:"that which is perceived",example:"an entity exists",partOfSpeech:"noun"});
  });
  it("ignores comments and invalid rows",()=>expect(parseWordNetLine('  WordNet header','noun')).toBeNull());
});
