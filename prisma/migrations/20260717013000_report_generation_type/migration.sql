ALTER TABLE "WeeklyReport"
ADD COLUMN "generationType" TEXT NOT NULL DEFAULT 'MANUAL';

ALTER TABLE "MonthlyReport"
ADD COLUMN "generationType" TEXT NOT NULL DEFAULT 'MANUAL';

CREATE INDEX "WeeklyReport_learnerProfileId_generationType_periodStart_idx"
ON "WeeklyReport"("learnerProfileId", "generationType", "periodStart");

CREATE INDEX "MonthlyReport_learnerProfileId_generationType_periodStart_idx"
ON "MonthlyReport"("learnerProfileId", "generationType", "periodStart");
