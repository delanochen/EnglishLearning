import { describe, expect, it } from "vitest";
import { uniqueScenarioVocabulary } from "@/modules/scenario/vocabulary";

describe("scenario vocabulary seed", () => {
  it("deduplicates shared words already supplied by a scenario", () => {
    const words = uniqueScenarioVocabulary(
      [["support", "支持"], ["follow-up", "后续跟进"]],
      [["follow-up", "后续追问"], ["confirmation", "确认"]],
    );
    expect(words).toEqual([["support", "支持"], ["follow-up", "后续跟进"], ["confirmation", "确认"]]);
  });

  it("deduplicates case and surrounding whitespace", () => {
    expect(uniqueScenarioVocabulary([[" Next Step ", "下一步"]], [["next step", "下一步"]])).toHaveLength(1);
  });
});
