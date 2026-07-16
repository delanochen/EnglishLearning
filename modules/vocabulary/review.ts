export type ReviewInput = {
  quality: number;
  easeFactor: number;
  intervalDays: number;
  consecutiveCorrect: number;
  mastery: number;
};

export function calculateReview(input: ReviewInput) {
  const quality = Math.max(0, Math.min(5, Math.round(input.quality)));
  const correct = quality >= 3;
  const consecutiveCorrect = correct ? input.consecutiveCorrect + 1 : 0;
  const easeFactor = Math.max(1.3, input.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  let intervalDays = 1;
  if (correct) {
    if (consecutiveCorrect === 1) intervalDays = 1;
    else if (consecutiveCorrect === 2) intervalDays = 3;
    else intervalDays = Math.max(4, Math.round(Math.max(1, input.intervalDays) * easeFactor));
  }
  const mastery = Math.max(0, Math.min(1, input.mastery + (correct ? (quality - 2) * 0.06 : -0.12)));
  const state = mastery >= 0.85 && consecutiveCorrect >= 4 ? "MASTERED" : consecutiveCorrect >= 2 ? "REVIEW" : "LEARNING";
  return { correct, quality, consecutiveCorrect, easeFactor, intervalDays, mastery, state } as const;
}
