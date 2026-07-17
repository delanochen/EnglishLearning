import { describe, expect, it } from "vitest";
import { scoreQuiz } from "@/modules/quiz/scoring";

describe("quiz scoring", () => {
  const questions = [{ id: "one", answerKey: "New York" }, { id: "two", answerKey: "学习" }];

  it("calculates accuracy from stored answer keys", () => {
    expect(scoreQuiz(questions, { one: "new york!", two: "错误" })).toEqual({ correct: 1, total: 2, score: 0.5 });
  });

  it("does not accept a learner-provided percentage", () => {
    expect(scoreQuiz(questions, { one: "wrong", two: "wrong", accuracy: "100" }).score).toBe(0);
  });
});
