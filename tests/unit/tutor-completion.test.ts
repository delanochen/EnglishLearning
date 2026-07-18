import { describe, expect, it } from "vitest";
import { tutorPracticeProgress } from "@/modules/tutor/completion";

describe("AI tutor practice completion", () => {
  it("does not complete a task merely by opening a conversation or sending one message", () => {
    expect(tutorPracticeProgress([]).complete).toBe(false);
    expect(tutorPracticeProgress([{ role: "user", content: "Hello, can we practice ordering food?" }]).complete).toBe(false);
  });

  it("requires four learner turns and at least twelve English words", () => {
    const messages = [
      { role: "user", content: "Hello, I would like a table." },
      { role: "assistant", content: "Certainly. How many people?" },
      { role: "user", content: "A table for two people, please." },
      { role: "assistant", content: "Inside or outside?" },
      { role: "user", content: "We would like to sit outside." },
      { role: "assistant", content: "Of course." },
      { role: "user", content: "Could we see the menu now?" },
    ];
    expect(tutorPracticeProgress(messages)).toMatchObject({ turns: 4, complete: true });
  });
});
