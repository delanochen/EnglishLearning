ALTER TABLE "LearningPlan"
  ADD COLUMN "focusAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "recommendedCourses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "reviewContent" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "stageGoals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "monthlyEvaluation" TEXT,
  ADD COLUMN "adjustmentSuggestions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
