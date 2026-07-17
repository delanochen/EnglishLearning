import { describe,expect,it } from "vitest";
import { parseAdminLogFilters } from "@/modules/operations/log-filters";
describe("admin log filters",()=>{it("accepts supported filters and rejects unknown values safely",()=>{expect(parseAdminLogFilters({kind:"ai",status:"FAILED",purpose:"TUTOR"})).toMatchObject({kind:"ai",status:"FAILED",purpose:"TUTOR"});expect(parseAdminLogFilters({kind:"unknown",status:"BROKEN",purpose:"SECRET"})).toEqual({kind:"ai",query:""});});});
