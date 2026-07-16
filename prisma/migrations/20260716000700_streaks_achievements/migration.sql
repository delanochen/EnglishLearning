CREATE TABLE "StudyStreak" (
  "id" UUID NOT NULL, "learnerProfileId" UUID NOT NULL, "currentDays" INTEGER NOT NULL DEFAULT 0,
  "longestDays" INTEGER NOT NULL DEFAULT 0, "lastStudyDate" DATE, "freezeCredits" INTEGER NOT NULL DEFAULT 1,
  "timezone" TEXT NOT NULL DEFAULT 'America/Chicago', "planPaused" BOOLEAN NOT NULL DEFAULT false,
  "vacationUntil" DATE, "weekendMode" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyStreak_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudyStreak_learnerProfileId_key" ON "StudyStreak"("learnerProfileId");
CREATE TABLE "StudyStreakEvent" (
  "id" UUID NOT NULL, "streakId" UUID NOT NULL, "studyDate" DATE NOT NULL, "eventType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StudyStreakEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudyStreakEvent_streakId_studyDate_eventType_key" ON "StudyStreakEvent"("streakId", "studyDate", "eventType");
CREATE TABLE "Achievement" (
  "id" UUID NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL,
  "icon" TEXT NOT NULL, "metric" TEXT NOT NULL, "threshold" INTEGER NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");
CREATE TABLE "UserAchievement" (
  "id" UUID NOT NULL, "learnerProfileId" UUID NOT NULL, "achievementId" UUID NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0, "earnedAt" TIMESTAMP(3), CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserAchievement_learnerProfileId_achievementId_key" ON "UserAchievement"("learnerProfileId", "achievementId");
ALTER TABLE "StudyStreak" ADD CONSTRAINT "StudyStreak_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyStreakEvent" ADD CONSTRAINT "StudyStreakEvent_streakId_fkey" FOREIGN KEY ("streakId") REFERENCES "StudyStreak"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
