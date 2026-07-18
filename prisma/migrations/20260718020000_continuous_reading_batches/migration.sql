DROP INDEX IF EXISTS "DailyReadingAssignment_learnerProfileId_assignmentDate_key";
CREATE INDEX IF NOT EXISTS "DailyReadingAssignment_learnerProfileId_assignmentDate_createdAt_idx"
ON "DailyReadingAssignment"("learnerProfileId", "assignmentDate", "createdAt");
