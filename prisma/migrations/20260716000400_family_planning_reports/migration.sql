CREATE TYPE "LearningPlanType" AS ENUM ('WEEKLY', 'MONTHLY', 'STAGE');
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'ARCHIVED');
CREATE TYPE "PlanItemStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

ALTER TABLE "Family" ADD COLUMN "sharedGoal" TEXT;
ALTER TABLE "DailyTask" ADD COLUMN "planItemId" UUID;

CREATE TABLE "LearningPlan" (
  "id" UUID NOT NULL, "learnerProfileId" UUID NOT NULL, "type" "LearningPlanType" NOT NULL,
  "periodStart" DATE NOT NULL, "periodEnd" DATE NOT NULL, "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "goals" TEXT[], "generationSource" TEXT NOT NULL, "adjustmentReason" TEXT, "version" INTEGER NOT NULL DEFAULT 1,
  "supersedesId" UUID, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LearningPlan_learnerProfileId_type_periodStart_version_key" ON "LearningPlan"("learnerProfileId", "type", "periodStart", "version");
CREATE INDEX "LearningPlan_learnerProfileId_status_periodStart_idx" ON "LearningPlan"("learnerProfileId", "status", "periodStart");

CREATE TABLE "LearningPlanItem" (
  "id" UUID NOT NULL, "planId" UUID NOT NULL, "module" TEXT NOT NULL, "title" TEXT NOT NULL,
  "target" TEXT NOT NULL, "scheduledDate" DATE NOT NULL, "durationMinutes" INTEGER NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100, "status" "PlanItemStatus" NOT NULL DEFAULT 'PENDING',
  CONSTRAINT "LearningPlanItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LearningPlanItem_planId_scheduledDate_status_idx" ON "LearningPlanItem"("planId", "scheduledDate", "status");

CREATE TABLE "WeeklyReport" (
  "id" UUID NOT NULL, "learnerProfileId" UUID NOT NULL, "periodStart" DATE NOT NULL, "periodEnd" DATE NOT NULL,
  "metrics" JSONB NOT NULL, "strengths" TEXT[], "weakAreas" TEXT[], "recommendations" TEXT[],
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WeeklyReport_learnerProfileId_periodStart_version_key" ON "WeeklyReport"("learnerProfileId", "periodStart", "version");

CREATE TABLE "MonthlyReport" (
  "id" UUID NOT NULL, "learnerProfileId" UUID NOT NULL, "periodStart" DATE NOT NULL, "periodEnd" DATE NOT NULL,
  "metrics" JSONB NOT NULL, "strengths" TEXT[], "weakAreas" TEXT[], "recommendations" TEXT[],
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MonthlyReport_learnerProfileId_periodStart_version_key" ON "MonthlyReport"("learnerProfileId", "periodStart", "version");

ALTER TABLE "LearningPlan" ADD CONSTRAINT "LearningPlan_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningPlan" ADD CONSTRAINT "LearningPlan_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "LearningPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningPlanItem" ADD CONSTRAINT "LearningPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "LearningPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "LearningPlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
