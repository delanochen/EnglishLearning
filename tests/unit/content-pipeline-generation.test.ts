import { describe, expect, it } from "vitest";
import { planContentBatches } from "@/modules/content-pipeline/batching";
import { pipelineVocabularySchema } from "@/modules/content-pipeline/generation-schemas";

const vocabulary = {
  word: "prepare",
  phonetic: "/prɪˈper/",
  partOfSpeech: "verb",
  definitionEn: "to make something ready",
  definitionZh: "准备",
  level: "A2",
  topic: "daily life",
  collocations: ["prepare dinner"],
  synonyms: ["ready"],
  antonyms: [],
  examples: [
    { sentence: "I prepare dinner at six.", translation: "我六点准备晚餐。" },
    { sentence: "Please prepare for the test.", translation: "请为考试做准备。" },
  ],
  pronunciationText: "prepare",
  exercises: Array.from({ length: 3 }, (_, index) => ({
    prompt: `Choose the answer ${index}.`,
    options: ["prepare", "forget", "leave"],
    answerKey: "prepare",
    explanation: "Prepare means to make ready.",
  })),
};

describe("content generation batches", () => {
  it("splits a resumable job into ordered 20–50 item batches", () => {
    expect(planContentBatches(51, 20)).toEqual([
      { sequence: 1, start: 0, count: 20 },
      { sequence: 2, start: 20, count: 20 },
      { sequence: 3, start: 40, count: 11 },
    ]);
  });

  it("rejects batch sizes outside the controlled range", () => {
    expect(() => planContentBatches(20, 10)).toThrow("INVALID_BATCH_SIZE");
    expect(() => planContentBatches(20, 51)).toThrow("INVALID_BATCH_SIZE");
  });
});

describe("pipeline vocabulary contract", () => {
  it("accepts complete bilingual content", () => {
    expect(pipelineVocabularySchema.parse(vocabulary).definitionZh).toBe("准备");
  });

  it("rejects a question whose answer is not one of its options", () => {
    const invalid = structuredClone(vocabulary);
    invalid.exercises[0].answerKey = "missing";
    expect(() => pipelineVocabularySchema.parse(invalid)).toThrow("answerKey must exactly match one option");
  });

  it("requires at least two examples and three exercises", () => {
    expect(() => pipelineVocabularySchema.parse({ ...vocabulary, examples: vocabulary.examples.slice(0, 1) })).toThrow();
    expect(() => pipelineVocabularySchema.parse({ ...vocabulary, exercises: vocabulary.exercises.slice(0, 2) })).toThrow();
  });
});
