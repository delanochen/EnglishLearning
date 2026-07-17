type AttemptScores = { accuracyScore: number | null; fluencyScore: number | null; grammarScore: number | null; completenessScore: number | null; naturalnessScore: number | null };

function overall(attempt: AttemptScores) {
  const values = [attempt.accuracyScore, attempt.fluencyScore, attempt.grammarScore, attempt.completenessScore, attempt.naturalnessScore].filter((value): value is number => value != null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function calculateSpeakingTrend(attempts: AttemptScores[]) {
  const values = attempts.map(overall).filter((value): value is number => value != null);
  const recent = values.slice(0, 5);
  const previous = values.slice(5, 10);
  const average = (items: number[]) => items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : null;
  const recentAverage = average(recent);
  const previousAverage = average(previous);
  return { recentAverage, previousAverage, delta: recentAverage != null && previousAverage != null ? recentAverage - previousAverage : null, sampleSize: recent.length };
}
