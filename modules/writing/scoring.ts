export type WritingScores = {
  grammarScore: number;
  spellingScore: number;
  vocabularyScore: number;
  structureScore: number;
  naturalnessScore: number;
};

export function calculateWritingOverall(scores: WritingScores) {
  return (scores.grammarScore + scores.spellingScore + scores.vocabularyScore + scores.structureScore + scores.naturalnessScore) / 5;
}
