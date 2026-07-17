import { describe, expect, it } from "vitest";
import { contentEditSchema, csv, grammarPublishReadiness, listeningContentSchema, listeningPublishReadiness, listeningQuestionSchema, parseContrastLines, readingContentSchema, readingPublishReadiness, scenarioExerciseSchema, scenarioPublishReadiness, vocabularyPublishReadiness } from "@/modules/admin/content-schemas";

describe("admin content schemas", () => {
  it("normalizes target lists for manually authored reading lessons", () => {
    expect(csv(" travel, check in, , luggage ")).toEqual(["travel", "check in", "luggage"]);
    expect(readingContentSchema.parse({ title: "Airport", body: "This is a sufficiently long graded reading passage.", level: "A2", audience: "adult", topic: "travel" }).level).toBe("A2");
  });

  it("accepts listening drafts with an optional audio URL", () => {
    expect(listeningContentSchema.parse({ title: "At school", transcript: "Good morning. How can I help you today?", translation: "早上好。", level: "B1", topic: "school", audioUrl: "" }).audioUrl).toBe("");
  });
  it("requires a usable listening script and automatically scored questions", () => {
    expect(listeningPublishReadiness({ questions: 1, transcript: "A short line." })).toHaveLength(2);
    expect(listeningPublishReadiness({ questions: 3, transcript: "One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty." })).toEqual([]);
    expect(listeningQuestionSchema.parse({ exerciseId: "11111111-1111-4111-8111-111111111111", prompt: "Where is she going?", options: "School\nWork", answerKey: "School" }).answerKey).toBe("School");
  });
  it("blocks incomplete vocabulary entries from publication", () => {
    expect(vocabularyPublishReadiness({ meanings: 0, examples: 0 })).toHaveLength(2);
    expect(vocabularyPublishReadiness({ meanings: 1, examples: 1 })).toEqual([]);
  });

  it("rejects invalid content edits", () => {
    expect(() => contentEditSchema.parse({ id: "bad", type: "reading", title: "", primary: "x", level: "A9" })).toThrow();
  });

  it("blocks publishing an incomplete scenario lesson", () => {
    expect(scenarioPublishReadiness({ dialogues: 2, vocabulary: 1, exercises: 0, cultureTips: 0, naturalExpressions: 0 })).toHaveLength(5);
    expect(scenarioPublishReadiness({ dialogues: 8, vocabulary: 3, exercises: 3, cultureTips: 1, naturalExpressions: 2 })).toEqual([]);
  });

  it("validates scenario multiple-choice authoring input", () => {
    expect(scenarioExerciseSchema.parse({ lessonId: "11111111-1111-4111-8111-111111111111", prompt: "What happens next?", answerKey: "Call the office", options: "Wait\nCall the office" }).answerKey).toBe("Call the office");
  });
  it("parses grammar contrasts and blocks incomplete grammar publishing", () => {
    expect(parseContrastLines("She works. | She work. | Add -s after she.")).toEqual([{ correct: "She works.", incorrect: "She work.", note: "Add -s after she." }]);
    expect(grammarPublishReadiness({ examples: 1, exercises: 2, useCases: 0, commonErrors: 0 })).toHaveLength(4);
    expect(grammarPublishReadiness({ examples: 2, exercises: 3, useCases: 1, commonErrors: 1 })).toEqual([]);
  });
  it("requires a complete graded-reading lesson before publishing", () => {
    expect(readingPublishReadiness({ questions: 2, targetVocabulary: 1, summary: "", oralRetellingPrompt: "", writingExtensionPrompt: "" })).toHaveLength(5);
    expect(readingPublishReadiness({ questions: 5, targetVocabulary: 2, summary: "Summary", oralRetellingPrompt: "Retell", writingExtensionPrompt: "Write" })).toEqual([]);
  });
});
