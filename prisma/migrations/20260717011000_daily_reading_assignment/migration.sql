CREATE TABLE "DailyReadingAssignment" (
  "id" UUID NOT NULL,
  "learnerProfileId" UUID NOT NULL,
  "articleId" UUID NOT NULL,
  "assignmentDate" DATE NOT NULL,
  "generationSource" TEXT NOT NULL DEFAULT 'AI',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyReadingAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyReadingAssignment_learnerProfileId_assignmentDate_key"
ON "DailyReadingAssignment"("learnerProfileId", "assignmentDate");
CREATE INDEX "DailyReadingAssignment_articleId_idx" ON "DailyReadingAssignment"("articleId");

ALTER TABLE "DailyReadingAssignment" ADD CONSTRAINT "DailyReadingAssignment_learnerProfileId_fkey"
FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyReadingAssignment" ADD CONSTRAINT "DailyReadingAssignment_articleId_fkey"
FOREIGN KEY ("articleId") REFERENCES "ReadingArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
