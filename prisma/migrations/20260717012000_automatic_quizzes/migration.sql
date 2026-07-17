CREATE TABLE "QuizSession" (
  "id" UUID NOT NULL,
  "learnerProfileId" UUID NOT NULL,
  "taskId" UUID NOT NULL,
  "level" "CefrLevel",
  "score" DOUBLE PRECISION,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "QuizQuestion" (
  "id" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" TEXT[],
  "answerKey" TEXT NOT NULL,
  "explanation" TEXT,
  "order" INTEGER NOT NULL,
  CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuizSession_taskId_key" ON "QuizSession"("taskId");
CREATE UNIQUE INDEX "QuizQuestion_sessionId_order_key" ON "QuizQuestion"("sessionId", "order");
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DailyTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuizSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
