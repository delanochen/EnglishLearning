CREATE TYPE "PlacementStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');
CREATE TABLE "PlacementTest" (
  "id" UUID NOT NULL, "learnerProfileId" UUID NOT NULL, "version" INTEGER NOT NULL,
  "status" "PlacementStatus" NOT NULL DEFAULT 'IN_PROGRESS', "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3), "assessedLevel" "CefrLevel", "sectionScores" JSONB, "strengths" TEXT[],
  "weakAreas" TEXT[], "recommendations" TEXT[], "reportSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlacementTest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlacementTest_learnerProfileId_version_key" ON "PlacementTest"("learnerProfileId", "version");
CREATE INDEX "PlacementTest_learnerProfileId_submittedAt_idx" ON "PlacementTest"("learnerProfileId", "submittedAt");
CREATE TABLE "PlacementTestAnswer" (
  "id" UUID NOT NULL, "testId" UUID NOT NULL, "section" TEXT NOT NULL, "questionId" TEXT NOT NULL,
  "questionSnapshot" TEXT NOT NULL, "answer" TEXT NOT NULL, "score" DOUBLE PRECISION NOT NULL,
  "maxScore" DOUBLE PRECISION NOT NULL, "feedback" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlacementTestAnswer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlacementTestAnswer_testId_questionId_key" ON "PlacementTestAnswer"("testId", "questionId");
ALTER TABLE "PlacementTest" ADD CONSTRAINT "PlacementTest_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlacementTestAnswer" ADD CONSTRAINT "PlacementTestAnswer_testId_fkey" FOREIGN KEY ("testId") REFERENCES "PlacementTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
