import { describe, expect, it } from "vitest"; import { scoreScenarioAnswers } from "@/modules/scenario/scoring";
describe("scenario scoring", () => { it("scores normalized answers", () => expect(scoreScenarioAnswers(["Hello", "Four dollars"], [" hello ", "four dollars"])).toBe(1)); it("handles lessons without questions", () => expect(scoreScenarioAnswers([], [])).toBe(1)); });
