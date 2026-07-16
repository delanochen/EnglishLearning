export function updateGrammarMastery(mastery: number, correct: boolean) {
  const next = Math.max(0, Math.min(1, mastery + (correct ? 0.12 : -0.1)));
  const days = correct ? Math.max(2, Math.round(2 + next * 12)) : 1;
  return { mastery: next, weaknessScore: 1 - next, reviewAfterDays: days };
}
