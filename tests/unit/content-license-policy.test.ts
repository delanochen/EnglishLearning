import { describe, expect, it } from "vitest";
import { evaluatePublicationLicense } from "@/modules/content-pipeline/license-policy";

describe("content license publication policy",()=>{
  it("blocks unknown and restricted licenses",()=>{
    expect(evaluatePublicationLicense({type:"UNKNOWN",publicationAllowed:true,requiresAttribution:false}).allowed).toBe(false);
    expect(evaluatePublicationLicense({type:"RESTRICTED",publicationAllowed:true,requiresAttribution:false}).allowed).toBe(false);
  });
  it("requires attribution text when the license requires attribution",()=>{
    expect(evaluatePublicationLicense({type:"CC_BY",publicationAllowed:true,requiresAttribution:true}).reason).toBe("ATTRIBUTION_REQUIRED");
    expect(evaluatePublicationLicense({type:"CC_BY",publicationAllowed:true,requiresAttribution:true,attributionText:"Author · source URL · CC BY"}).allowed).toBe(true);
  });
});
