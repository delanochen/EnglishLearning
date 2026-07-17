import { describe, expect, it } from "vitest";
import { selectPreferredVoiceName } from "@/modules/speech/voice-selection";

describe("browser voice selection", () => {
  const voices = [{ name: "English David" }, { name: "English Samantha" }, { name: "System Default", default: true }];
  it("honors a recognizable gender preference", () => {
    expect(selectPreferredVoiceName(voices, "female")).toBe("English Samantha");
    expect(selectPreferredVoiceName(voices, "male")).toBe("English David");
  });
  it("uses the device default for neutral preference", () => {
    expect(selectPreferredVoiceName(voices, "neutral")).toBe("System Default");
  });
});
