CREATE TABLE "MistakeRecord" (
  "id" UUID NOT NULL,
  "learnerProfileId" UUID NOT NULL,
  "familyId" UUID NOT NULL,
  "module" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" UUID NOT NULL,
  "questionId" UUID NOT NULL,
  "prompt" TEXT NOT NULL,
  "answer" TEXT,
  "correctAnswer" TEXT NOT NULL,
  "explanation" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "correctedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MistakeRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MistakeRecord_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MistakeRecord_learnerProfileId_module_questionId_key" ON "MistakeRecord"("learnerProfileId", "module", "questionId");
CREATE INDEX "MistakeRecord_learnerProfileId_status_updatedAt_idx" ON "MistakeRecord"("learnerProfileId", "status", "updatedAt");
CREATE INDEX "MistakeRecord_familyId_status_updatedAt_idx" ON "MistakeRecord"("familyId", "status", "updatedAt");
