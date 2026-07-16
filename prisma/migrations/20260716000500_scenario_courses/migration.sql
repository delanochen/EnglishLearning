CREATE TYPE "ScenarioSourceType" AS ENUM ('ORIGINAL', 'AI_GENERATED', 'ADAPTED');

CREATE TABLE "ScenarioLesson" (
  "id" UUID NOT NULL, "category" TEXT NOT NULL, "title" TEXT NOT NULL, "intro" TEXT NOT NULL,
  "level" "CefrLevel" NOT NULL, "cultureTips" TEXT[], "misunderstandings" TEXT[], "naturalExpressions" TEXT[],
  "sourceType" "ScenarioSourceType" NOT NULL DEFAULT 'ORIGINAL', "sourceNote" TEXT,
  "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED', "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScenarioLesson_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ScenarioLesson_category_title_version_key" ON "ScenarioLesson"("category", "title", "version");
CREATE INDEX "ScenarioLesson_category_level_status_idx" ON "ScenarioLesson"("category", "level", "status");

CREATE TABLE "ScenarioDialogue" (
  "id" UUID NOT NULL, "lessonId" UUID NOT NULL, "speaker" TEXT NOT NULL, "roleName" TEXT NOT NULL,
  "textEn" TEXT NOT NULL, "textZh" TEXT, "audioUrl" TEXT, "sequence" INTEGER NOT NULL, "cameraCue" TEXT,
  CONSTRAINT "ScenarioDialogue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ScenarioDialogue_lessonId_sequence_key" ON "ScenarioDialogue"("lessonId", "sequence");

CREATE TABLE "ScenarioExercise" (
  "id" UUID NOT NULL, "lessonId" UUID NOT NULL, "type" "QuestionType" NOT NULL, "prompt" TEXT NOT NULL,
  "answerKey" TEXT NOT NULL, "options" JSONB, "explanation" TEXT, "order" INTEGER NOT NULL,
  CONSTRAINT "ScenarioExercise_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ScenarioExercise_lessonId_order_key" ON "ScenarioExercise"("lessonId", "order");

CREATE TABLE "VideoLesson" (
  "id" UUID NOT NULL, "scenarioLessonId" UUID NOT NULL, "title" TEXT NOT NULL, "timeline" JSONB NOT NULL,
  "durationSeconds" INTEGER NOT NULL, "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VideoLesson_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VideoLesson_scenarioLessonId_key" ON "VideoLesson"("scenarioLessonId");

CREATE TABLE "ScenarioProgress" (
  "id" UUID NOT NULL, "learnerProfileId" UUID NOT NULL, "lessonId" UUID NOT NULL,
  "progressPercent" INTEGER NOT NULL DEFAULT 0, "score" DOUBLE PRECISION, "completedAt" TIMESTAMP(3),
  "lastDialogue" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "ScenarioProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ScenarioProgress_learnerProfileId_lessonId_key" ON "ScenarioProgress"("learnerProfileId", "lessonId");

ALTER TABLE "ScenarioDialogue" ADD CONSTRAINT "ScenarioDialogue_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ScenarioLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScenarioExercise" ADD CONSTRAINT "ScenarioExercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ScenarioLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoLesson" ADD CONSTRAINT "VideoLesson_scenarioLessonId_fkey" FOREIGN KEY ("scenarioLessonId") REFERENCES "ScenarioLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScenarioProgress" ADD CONSTRAINT "ScenarioProgress_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScenarioProgress" ADD CONSTRAINT "ScenarioProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ScenarioLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
