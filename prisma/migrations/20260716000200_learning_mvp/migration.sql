-- CreateEnum
CREATE TYPE "TeacherStyle" AS ENUM ('GENTLE', 'STRICT', 'CHILD', 'ACADEMIC', 'US_LIFE', 'WORKPLACE');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VocabularyState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'MASTERED');

-- CreateEnum
CREATE TYPE "DailyTaskType" AS ENUM ('VOCABULARY', 'READING', 'LISTENING', 'SPEAKING', 'AI_TUTOR', 'GRAMMAR', 'WRITING', 'QUIZ');

-- CreateEnum
CREATE TYPE "DailyTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'VOCABULARY');

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" UUID NOT NULL,
    "learnerProfileId" UUID NOT NULL,
    "teacherStyle" "TeacherStyle" NOT NULL DEFAULT 'GENTLE',
    "topic" TEXT NOT NULL,
    "levelSnapshot" "CefrLevel",
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "summary" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentZh" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "savedForReview" BOOLEAN NOT NULL DEFAULT false,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vocabulary" (
    "id" UUID NOT NULL,
    "word" TEXT NOT NULL,
    "phonetic" TEXT,
    "partOfSpeech" TEXT,
    "definitionEn" TEXT NOT NULL,
    "level" "CefrLevel" NOT NULL,
    "topic" TEXT NOT NULL,
    "audioUrl" TEXT,
    "imageUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyMeaning" (
    "id" UUID NOT NULL,
    "vocabularyId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "senseOrder" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VocabularyMeaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyExample" (
    "id" UUID NOT NULL,
    "vocabularyId" UUID NOT NULL,
    "sentence" TEXT NOT NULL,
    "translation" TEXT,
    "collocations" TEXT[],
    "difficulty" "CefrLevel" NOT NULL,

    CONSTRAINT "VocabularyExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserVocabularyProgress" (
    "id" UUID NOT NULL,
    "learnerProfileId" UUID NOT NULL,
    "vocabularyId" UUID NOT NULL,
    "state" "VocabularyState" NOT NULL DEFAULT 'NEW',
    "firstLearnedAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "mastery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "consecutiveCorrect" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserVocabularyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSchedule" (
    "id" UUID NOT NULL,
    "progressId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "result" BOOLEAN,
    "quality" INTEGER,
    "oldInterval" INTEGER NOT NULL,
    "newInterval" INTEGER,
    "oldEase" DOUBLE PRECISION NOT NULL,
    "newEase" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingArticle" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "translation" TEXT,
    "level" "CefrLevel" NOT NULL,
    "audience" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "targetVocabulary" TEXT[],
    "targetGrammar" TEXT[],
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingQuestion" (
    "id" UUID NOT NULL,
    "articleId" UUID NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "answerKey" TEXT NOT NULL,
    "explanation" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ReadingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingProgress" (
    "id" UUID NOT NULL,
    "learnerProfileId" UUID NOT NULL,
    "articleId" UUID NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "currentPosition" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "readingSeconds" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,

    CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingAnswer" (
    "id" UUID NOT NULL,
    "progressId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTask" (
    "id" UUID NOT NULL,
    "learnerProfileId" UUID NOT NULL,
    "taskDate" DATE NOT NULL,
    "taskType" "DailyTaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contentRefType" TEXT,
    "contentRefId" TEXT,
    "estimatedMinutes" INTEGER NOT NULL,
    "status" "DailyTaskStatus" NOT NULL DEFAULT 'PENDING',
    "xpReward" INTEGER NOT NULL DEFAULT 10,
    "generationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCompletion" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSeconds" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "earnedXp" INTEGER NOT NULL,
    "unfinishedReason" TEXT,
    "needsMakeup" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TaskCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningActivity" (
    "id" UUID NOT NULL,
    "learnerProfileId" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "activityType" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIConversation_learnerProfileId_lastMessageAt_idx" ON "AIConversation"("learnerProfileId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIMessage_conversationId_sequence_key" ON "AIMessage"("conversationId", "sequence");

-- CreateIndex
CREATE INDEX "Vocabulary_level_topic_status_idx" ON "Vocabulary"("level", "topic", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Vocabulary_word_partOfSpeech_key" ON "Vocabulary"("word", "partOfSpeech");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyMeaning_vocabularyId_locale_senseOrder_key" ON "VocabularyMeaning"("vocabularyId", "locale", "senseOrder");

-- CreateIndex
CREATE INDEX "UserVocabularyProgress_learnerProfileId_nextReviewAt_state_idx" ON "UserVocabularyProgress"("learnerProfileId", "nextReviewAt", "state");

-- CreateIndex
CREATE UNIQUE INDEX "UserVocabularyProgress_learnerProfileId_vocabularyId_key" ON "UserVocabularyProgress"("learnerProfileId", "vocabularyId");

-- CreateIndex
CREATE INDEX "ReviewSchedule_scheduledAt_completedAt_idx" ON "ReviewSchedule"("scheduledAt", "completedAt");

-- CreateIndex
CREATE INDEX "ReadingArticle_level_topic_status_idx" ON "ReadingArticle"("level", "topic", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingQuestion_articleId_order_key" ON "ReadingQuestion"("articleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingProgress_learnerProfileId_articleId_key" ON "ReadingProgress"("learnerProfileId", "articleId");

-- CreateIndex
CREATE INDEX "DailyTask_learnerProfileId_taskDate_status_idx" ON "DailyTask"("learnerProfileId", "taskDate", "status");

-- CreateIndex
CREATE INDEX "LearningActivity_learnerProfileId_occurredAt_idx" ON "LearningActivity"("learnerProfileId", "occurredAt");

-- CreateIndex
CREATE INDEX "LearningActivity_familyId_occurredAt_idx" ON "LearningActivity"("familyId", "occurredAt");

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyMeaning" ADD CONSTRAINT "VocabularyMeaning_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyExample" ADD CONSTRAINT "VocabularyExample_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVocabularyProgress" ADD CONSTRAINT "UserVocabularyProgress_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVocabularyProgress" ADD CONSTRAINT "UserVocabularyProgress_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "UserVocabularyProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingQuestion" ADD CONSTRAINT "ReadingQuestion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "ReadingArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "ReadingArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingAnswer" ADD CONSTRAINT "ReadingAnswer_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "ReadingProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingAnswer" ADD CONSTRAINT "ReadingAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ReadingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DailyTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningActivity" ADD CONSTRAINT "LearningActivity_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
