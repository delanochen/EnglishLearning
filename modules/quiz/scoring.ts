export function normalizeQuizAnswer(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[.,!?，。！？\s]+/g, "");
}

export function scoreQuiz(questions: Array<{ id: string; answerKey: string }>, answers: Record<string, string>) {
  if (!questions.length) return { correct: 0, total: 0, score: 0 };
  const correct = questions.filter((question) => normalizeQuizAnswer(answers[question.id] ?? "") === normalizeQuizAnswer(question.answerKey)).length;
  return { correct, total: questions.length, score: correct / questions.length };
}
