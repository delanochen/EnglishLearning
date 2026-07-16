ALTER TABLE "SpeakingAttempt" ADD COLUMN "audioFileId" UUID,
ADD COLUMN "grammarScore" DOUBLE PRECISION, ADD COLUMN "completenessScore" DOUBLE PRECISION,
ADD COLUMN "naturalnessScore" DOUBLE PRECISION, ADD COLUMN "speechRateWpm" DOUBLE PRECISION,
ADD COLUMN "pauseCount" INTEGER;
CREATE TABLE "PronunciationFeedback" (
  "id" UUID NOT NULL, "attemptId" UUID NOT NULL, "word" TEXT NOT NULL, "expected" TEXT NOT NULL,
  "observed" TEXT, "score" DOUBLE PRECISION NOT NULL, "issueType" TEXT, "suggestion" TEXT,
  "timestamps" JSONB, CONSTRAINT "PronunciationFeedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PronunciationFeedback_attemptId_score_idx" ON "PronunciationFeedback"("attemptId", "score");
CREATE TABLE "UploadedFile" (
  "id" UUID NOT NULL, "familyId" UUID NOT NULL, "ownerUserId" UUID NOT NULL, "learnerProfileId" UUID,
  "storageKey" TEXT NOT NULL, "originalName" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "size" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL, "purpose" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'READY', "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UploadedFile_storageKey_key" ON "UploadedFile"("storageKey");
CREATE INDEX "UploadedFile_familyId_purpose_deletedAt_idx" ON "UploadedFile"("familyId", "purpose", "deletedAt");
CREATE INDEX "UploadedFile_ownerUserId_createdAt_idx" ON "UploadedFile"("ownerUserId", "createdAt");
CREATE TABLE "Notification" (
  "id" UUID NOT NULL, "userId" UUID, "learnerProfileId" UUID, "type" TEXT NOT NULL, "title" TEXT NOT NULL,
  "body" TEXT NOT NULL, "data" JSONB, "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "Notification_learnerProfileId_readAt_createdAt_idx" ON "Notification"("learnerProfileId", "readAt", "createdAt");
ALTER TABLE "PronunciationFeedback" ADD CONSTRAINT "PronunciationFeedback_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "SpeakingAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SpeakingAttempt" ADD CONSTRAINT "SpeakingAttempt_audioFileId_fkey" FOREIGN KEY ("audioFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
