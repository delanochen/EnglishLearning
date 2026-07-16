CREATE TABLE "GrammarTopic" (
  "id" UUID NOT NULL, "slug" TEXT NOT NULL, "title" TEXT NOT NULL, "ruleEn" TEXT NOT NULL,
  "ruleZh" TEXT NOT NULL, "level" "CefrLevel" NOT NULL, "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GrammarTopic_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GrammarTopic_slug_key" ON "GrammarTopic"("slug");
CREATE INDEX "GrammarTopic_level_status_idx" ON "GrammarTopic"("level", "status");

CREATE TABLE "GrammarExample" (
  "id" UUID NOT NULL, "topicId" UUID NOT NULL, "sentence" TEXT NOT NULL, "translation" TEXT,
  "isError" BOOLEAN NOT NULL DEFAULT false, "explanation" TEXT,
  CONSTRAINT "GrammarExample_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "GrammarExercise" (
  "id" UUID NOT NULL, "topicId" UUID NOT NULL, "type" "QuestionType" NOT NULL, "prompt" TEXT NOT NULL,
  "options" JSONB, "answerKey" TEXT NOT NULL, "explanation" TEXT, "order" INTEGER NOT NULL,
  CONSTRAINT "GrammarExercise_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GrammarExercise_topicId_order_key" ON "GrammarExercise"("topicId", "order");
CREATE TABLE "GrammarProgress" (
  "id" UUID NOT NULL, "learnerProfileId" UUID NOT NULL, "topicId" UUID NOT NULL, "mastery" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0, "incorrectCount" INTEGER NOT NULL DEFAULT 0, "lastPracticedAt" TIMESTAMP(3),
  "nextReviewAt" TIMESTAMP(3), "weaknessScore" DOUBLE PRECISION NOT NULL DEFAULT 1,
  CONSTRAINT "GrammarProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GrammarProgress_learnerProfileId_topicId_key" ON "GrammarProgress"("learnerProfileId", "topicId");
CREATE INDEX "GrammarProgress_learnerProfileId_nextReviewAt_idx" ON "GrammarProgress"("learnerProfileId", "nextReviewAt");
CREATE TABLE "GrammarAttempt" (
  "id" UUID NOT NULL, "progressId" UUID NOT NULL, "exerciseId" UUID NOT NULL, "answer" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrammarAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ListeningExercise" (
  "id" UUID NOT NULL, "title" TEXT NOT NULL, "level" "CefrLevel" NOT NULL, "transcript" TEXT NOT NULL,
  "translation" TEXT, "audioUrl" TEXT, "topic" TEXT NOT NULL, "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ListeningExercise_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ListeningExercise_level_status_idx" ON "ListeningExercise"("level", "status");
CREATE TABLE "ListeningQuestion" (
  "id" UUID NOT NULL, "exerciseId" UUID NOT NULL, "prompt" TEXT NOT NULL, "options" JSONB,
  "answerKey" TEXT NOT NULL, "explanation" TEXT, "order" INTEGER NOT NULL,
  CONSTRAINT "ListeningQuestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ListeningQuestion_exerciseId_order_key" ON "ListeningQuestion"("exerciseId", "order");
CREATE TABLE "ListeningProgress" (
  "id" UUID NOT NULL, "learnerProfileId" UUID NOT NULL, "exerciseId" UUID NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0,
  "score" DOUBLE PRECISION, "completedAt" TIMESTAMP(3), CONSTRAINT "ListeningProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ListeningProgress_learnerProfileId_exerciseId_key" ON "ListeningProgress"("learnerProfileId", "exerciseId");

CREATE TABLE "SpeakingSession" (
  "id" UUID NOT NULL, "learnerProfileId" UUID NOT NULL, "mode" TEXT NOT NULL, "prompt" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "endedAt" TIMESTAMP(3), "summary" TEXT,
  CONSTRAINT "SpeakingSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SpeakingSession_learnerProfileId_startedAt_idx" ON "SpeakingSession"("learnerProfileId", "startedAt");
CREATE TABLE "SpeakingAttempt" (
  "id" UUID NOT NULL, "sessionId" UUID NOT NULL, "transcript" TEXT NOT NULL, "recognitionProvider" TEXT NOT NULL,
  "durationSeconds" INTEGER NOT NULL DEFAULT 0, "retryNo" INTEGER NOT NULL DEFAULT 1, "fluencyScore" DOUBLE PRECISION,
  "accuracyScore" DOUBLE PRECISION, "feedback" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SpeakingAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WritingAssignment" (
  "id" UUID NOT NULL, "title" TEXT NOT NULL, "type" TEXT NOT NULL, "prompt" TEXT NOT NULL,
  "level" "CefrLevel" NOT NULL, "targetWords" INTEGER NOT NULL, "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WritingAssignment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WritingAssignment_level_status_idx" ON "WritingAssignment"("level", "status");
CREATE TABLE "WritingSubmission" (
  "id" UUID NOT NULL, "assignmentId" UUID NOT NULL, "learnerProfileId" UUID NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "parentSubmissionId" UUID, "content" TEXT NOT NULL, "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED', CONSTRAINT "WritingSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WritingSubmission_assignmentId_learnerProfileId_version_key" ON "WritingSubmission"("assignmentId", "learnerProfileId", "version");
CREATE TABLE "WritingFeedback" (
  "id" UUID NOT NULL, "submissionId" UUID NOT NULL, "grammarScore" DOUBLE PRECISION NOT NULL,
  "vocabularyScore" DOUBLE PRECISION NOT NULL, "structureScore" DOUBLE PRECISION NOT NULL, "suggestions" TEXT NOT NULL,
  "rewrittenVersion" TEXT, "overallScore" DOUBLE PRECISION NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WritingFeedback_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WritingFeedback_submissionId_key" ON "WritingFeedback"("submissionId");

ALTER TABLE "GrammarExample" ADD CONSTRAINT "GrammarExample_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "GrammarTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrammarExercise" ADD CONSTRAINT "GrammarExercise_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "GrammarTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrammarProgress" ADD CONSTRAINT "GrammarProgress_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrammarProgress" ADD CONSTRAINT "GrammarProgress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "GrammarTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrammarAttempt" ADD CONSTRAINT "GrammarAttempt_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "GrammarProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrammarAttempt" ADD CONSTRAINT "GrammarAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "GrammarExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListeningQuestion" ADD CONSTRAINT "ListeningQuestion_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "ListeningExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListeningProgress" ADD CONSTRAINT "ListeningProgress_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListeningProgress" ADD CONSTRAINT "ListeningProgress_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "ListeningExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpeakingSession" ADD CONSTRAINT "SpeakingSession_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpeakingAttempt" ADD CONSTRAINT "SpeakingAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpeakingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingSubmission" ADD CONSTRAINT "WritingSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "WritingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingSubmission" ADD CONSTRAINT "WritingSubmission_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingSubmission" ADD CONSTRAINT "WritingSubmission_parentSubmissionId_fkey" FOREIGN KEY ("parentSubmissionId") REFERENCES "WritingSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WritingFeedback" ADD CONSTRAINT "WritingFeedback_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "WritingSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
