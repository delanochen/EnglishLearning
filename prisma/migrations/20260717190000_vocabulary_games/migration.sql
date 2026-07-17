CREATE TABLE "VocabularyGameSession" (
  "id" UUID NOT NULL,
  "learnerProfileId" UUID NOT NULL,
  "mode" TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "totalQuestions" INTEGER NOT NULL,
  "correctAnswers" INTEGER NOT NULL,
  "maxStreak" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "earnedXp" INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VocabularyGameSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VocabularyGameAnswer" (
  "id" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "vocabularyId" UUID NOT NULL,
  "questionType" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "responseMs" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "VocabularyGameAnswer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VocabularyGameSession_learnerProfileId_mode_periodStart_idx" ON "VocabularyGameSession"("learnerProfileId", "mode", "periodStart");
CREATE INDEX "VocabularyGameAnswer_sessionId_idx" ON "VocabularyGameAnswer"("sessionId");
CREATE INDEX "VocabularyGameAnswer_vocabularyId_isCorrect_idx" ON "VocabularyGameAnswer"("vocabularyId", "isCorrect");
ALTER TABLE "VocabularyGameSession" ADD CONSTRAINT "VocabularyGameSession_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyGameAnswer" ADD CONSTRAINT "VocabularyGameAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VocabularyGameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyGameAnswer" ADD CONSTRAINT "VocabularyGameAnswer_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
