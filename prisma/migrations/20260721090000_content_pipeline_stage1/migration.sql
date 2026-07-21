-- CreateEnum
CREATE TYPE "ContentGenerationJobType" AS ENUM ('VOCABULARY_GENERATION', 'READING_GENERATION', 'GRAMMAR_GENERATION', 'SCENARIO_GENERATION', 'QUESTION_GENERATION', 'TRANSLATION_GENERATION', 'AUDIO_SCRIPT_GENERATION', 'VIDEO_SCRIPT_GENERATION', 'PUBLIC_RESOURCE_IMPORT', 'CONTENT_RECHECK', 'DUPLICATE_SCAN', 'DIFFICULTY_RECALCULATION');

-- CreateEnum
CREATE TYPE "ContentSourceType" AS ENUM ('AI', 'PUBLIC_RESOURCE', 'MANUAL');

-- CreateEnum
CREATE TYPE "ContentLicenseType" AS ENUM ('PUBLIC_DOMAIN', 'CC0', 'CC_BY', 'CC_BY_SA', 'GOVERNMENT_OPEN_DATA', 'CUSTOM_ALLOWED', 'UNKNOWN', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "ContentReviewDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "DuplicateMatchStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED', 'MERGED');

-- CreateEnum
CREATE TYPE "ContentScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CRON');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentStatus" ADD VALUE 'PENDING';
ALTER TYPE "ContentStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "ContentStatus" ADD VALUE 'PAUSED';
ALTER TYPE "ContentStatus" ADD VALUE 'REVIEW_REQUIRED';
ALTER TYPE "ContentStatus" ADD VALUE 'APPROVED';
ALTER TYPE "ContentStatus" ADD VALUE 'REJECTED';
ALTER TYPE "ContentStatus" ADD VALUE 'FAILED';
ALTER TYPE "ContentStatus" ADD VALUE 'CANCELED';

-- AlterTable
ALTER TABLE "Vocabulary" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "attributionText" TEXT,
ADD COLUMN     "generationJobId" UUID,
ADD COLUMN     "licenseId" UUID,
ADD COLUMN     "normalizedHash" TEXT,
ADD COLUMN     "originalHash" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "qualityScore" DOUBLE PRECISION,
ADD COLUMN     "requiresAttribution" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewStatus" "ContentReviewDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "sourceId" UUID,
ADD COLUMN     "sourceType" "ContentSourceType" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "ReadingArticle" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "attributionText" TEXT,
ADD COLUMN     "generationJobId" UUID,
ADD COLUMN     "licenseId" UUID,
ADD COLUMN     "normalizedHash" TEXT,
ADD COLUMN     "originalHash" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "qualityScore" DOUBLE PRECISION,
ADD COLUMN     "requiresAttribution" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewStatus" "ContentReviewDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "sourceId" UUID,
ADD COLUMN     "sourceType" "ContentSourceType" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "ScenarioLesson" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "attributionText" TEXT,
ADD COLUMN     "contentSourceType" "ContentSourceType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "generationJobId" UUID,
ADD COLUMN     "licenseId" UUID,
ADD COLUMN     "normalizedHash" TEXT,
ADD COLUMN     "originalHash" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "qualityScore" DOUBLE PRECISION,
ADD COLUMN     "requiresAttribution" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewStatus" "ContentReviewDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "sourceId" UUID;

-- AlterTable
ALTER TABLE "GrammarTopic" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "attributionText" TEXT,
ADD COLUMN     "generationJobId" UUID,
ADD COLUMN     "licenseId" UUID,
ADD COLUMN     "normalizedHash" TEXT,
ADD COLUMN     "originalHash" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "qualityScore" DOUBLE PRECISION,
ADD COLUMN     "requiresAttribution" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewStatus" "ContentReviewDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "sourceId" UUID,
ADD COLUMN     "sourceType" "ContentSourceType" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "ListeningExercise" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "attributionText" TEXT,
ADD COLUMN     "generationJobId" UUID,
ADD COLUMN     "licenseId" UUID,
ADD COLUMN     "normalizedHash" TEXT,
ADD COLUMN     "originalHash" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "qualityScore" DOUBLE PRECISION,
ADD COLUMN     "requiresAttribution" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewStatus" "ContentReviewDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "sourceId" UUID,
ADD COLUMN     "sourceType" "ContentSourceType" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "WritingAssignment" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "attributionText" TEXT,
ADD COLUMN     "generationJobId" UUID,
ADD COLUMN     "licenseId" UUID,
ADD COLUMN     "normalizedHash" TEXT,
ADD COLUMN     "originalHash" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "qualityScore" DOUBLE PRECISION,
ADD COLUMN     "requiresAttribution" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewStatus" "ContentReviewDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "sourceId" UUID,
ADD COLUMN     "sourceType" "ContentSourceType" NOT NULL DEFAULT 'MANUAL';

-- Existing published lessons predate the review workflow and remain published.
-- Mark them approved so the migration does not incorrectly place live content in the review queue.
UPDATE "Vocabulary" SET "reviewStatus" = 'APPROVED', "publishedAt" = COALESCE("updatedAt", "createdAt") WHERE "status" = 'PUBLISHED';
UPDATE "ReadingArticle" SET "reviewStatus" = 'APPROVED', "publishedAt" = COALESCE("updatedAt", "createdAt") WHERE "status" = 'PUBLISHED';
UPDATE "GrammarTopic" SET "reviewStatus" = 'APPROVED', "publishedAt" = COALESCE("updatedAt", "createdAt") WHERE "status" = 'PUBLISHED';
UPDATE "ListeningExercise" SET "reviewStatus" = 'APPROVED', "publishedAt" = COALESCE("updatedAt", "createdAt") WHERE "status" = 'PUBLISHED';
UPDATE "WritingAssignment" SET "reviewStatus" = 'APPROVED', "publishedAt" = COALESCE("updatedAt", "createdAt") WHERE "status" = 'PUBLISHED';
UPDATE "ScenarioLesson" SET "reviewStatus" = 'APPROVED', "publishedAt" = COALESCE("updatedAt", "createdAt"), "contentSourceType" = CASE WHEN "sourceType" = 'AI_GENERATED' THEN 'AI'::"ContentSourceType" ELSE 'MANUAL'::"ContentSourceType" END, "aiGenerated" = ("sourceType" = 'AI_GENERATED') WHERE "status" = 'PUBLISHED';

-- CreateTable
CREATE TABLE "ContentLicense" (
    "id" UUID NOT NULL,
    "type" "ContentLicenseType" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "allowsModification" BOOLEAN NOT NULL DEFAULT false,
    "allowsCommercialUse" BOOLEAN NOT NULL DEFAULT false,
    "requiresAttribution" BOOLEAN NOT NULL DEFAULT false,
    "requiresShareAlike" BOOLEAN NOT NULL DEFAULT false,
    "publicationAllowed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentSource" (
    "id" UUID NOT NULL,
    "type" "ContentSourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "author" TEXT,
    "licenseId" UUID,
    "originalPublishedAt" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3),
    "allowsModification" BOOLEAN NOT NULL DEFAULT false,
    "requiresAttribution" BOOLEAN NOT NULL DEFAULT false,
    "requiresShareAlike" BOOLEAN NOT NULL DEFAULT false,
    "originalHash" TEXT,
    "metadata" JSONB,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportSource" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "allowedDomains" TEXT[],
    "allowedPathPrefixes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "licenseId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "robotsCheckedAt" TIMESTAMP(3),
    "robotsAllowed" BOOLEAN,
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 10,
    "configuration" JSONB,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" UUID NOT NULL,
    "importSourceId" UUID NOT NULL,
    "generationJobId" UUID,
    "status" "ContentStatus" NOT NULL DEFAULT 'PENDING',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedRawContent" (
    "id" UUID NOT NULL,
    "importBatchId" UUID NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "author" TEXT,
    "licenseId" UUID NOT NULL,
    "originalPublishedAt" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawContent" TEXT NOT NULL,
    "cleanedContent" TEXT,
    "originalHash" TEXT NOT NULL,
    "normalizedHash" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportedRawContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentGenerationJob" (
    "id" UUID NOT NULL,
    "type" "ContentGenerationJobType" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PENDING',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "currentProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "createdByUserId" UUID,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 1,
    "aiProviderId" UUID,
    "aiModelId" UUID,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "maxTokens" INTEGER,
    "maxBudget" DECIMAL(14,6),
    "configuration" JSONB,
    "logs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentGenerationBatch" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PENDING',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "checkpoint" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentGenerationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentGenerationItem" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "batchId" UUID,
    "sequence" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" UUID,
    "status" "ContentStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "originalHash" TEXT,
    "normalizedHash" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentGenerationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentReview" (
    "id" UUID NOT NULL,
    "generationJobId" UUID,
    "contentType" TEXT NOT NULL,
    "contentId" UUID NOT NULL,
    "decision" "ContentReviewDecision" NOT NULL DEFAULT 'PENDING',
    "reviewerUserId" UUID,
    "reason" TEXT,
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentQualityReport" (
    "id" UUID NOT NULL,
    "generationJobId" UUID,
    "contentType" TEXT NOT NULL,
    "contentId" UUID,
    "generationItemId" UUID,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "ruleBasedLevel" "CefrLevel",
    "aiSuggestedLevel" "CefrLevel",
    "finalLevel" "CefrLevel",
    "confidence" DOUBLE PRECISION,
    "reviewReason" TEXT,
    "checks" JSONB NOT NULL,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "repairAttempted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentQualityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDuplicateMatch" (
    "id" UUID NOT NULL,
    "sourceContentType" TEXT NOT NULL,
    "sourceContentId" UUID,
    "candidateContentType" TEXT NOT NULL,
    "candidateContentId" UUID,
    "method" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "details" JSONB,
    "status" "DuplicateMatchStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentDuplicateMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentSchedule" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "jobType" "ContentGenerationJobType" NOT NULL,
    "frequency" "ContentScheduleFrequency" NOT NULL,
    "cronExpression" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "quantity" INTEGER NOT NULL,
    "levels" "CefrLevel"[],
    "topics" TEXT[],
    "aiProviderId" UUID,
    "aiModelId" UUID,
    "maxTokens" INTEGER,
    "maxBudget" DECIMAL(14,6),
    "maxRetries" INTEGER NOT NULL DEFAULT 1,
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentUsageStat" (
    "id" UUID NOT NULL,
    "usageDate" DATE NOT NULL,
    "providerId" UUID,
    "modelId" UUID,
    "jobType" "ContentGenerationJobType",
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "totalLatencyMs" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentUsageStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentTag" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentTagAssignment" (
    "id" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentTopic" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "parentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentTopicAssignment" (
    "id" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentTopicAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentAttribution" (
    "id" UUID NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" UUID NOT NULL,
    "licenseId" UUID NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "author" TEXT,
    "attributionText" TEXT NOT NULL,
    "shareAlikeRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentLicense_type_publicationAllowed_idx" ON "ContentLicense"("type", "publicationAllowed");

-- CreateIndex
CREATE INDEX "ContentSource_type_approved_idx" ON "ContentSource"("type", "approved");

-- CreateIndex
CREATE INDEX "ContentSource_originalHash_idx" ON "ContentSource"("originalHash");

-- CreateIndex
CREATE INDEX "ImportSource_enabled_approved_idx" ON "ImportSource"("enabled", "approved");

-- CreateIndex
CREATE INDEX "ImportBatch_importSourceId_status_createdAt_idx" ON "ImportBatch"("importSourceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ImportBatch_generationJobId_idx" ON "ImportBatch"("generationJobId");

-- CreateIndex
CREATE INDEX "ImportedRawContent_status_createdAt_idx" ON "ImportedRawContent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ImportedRawContent_normalizedHash_idx" ON "ImportedRawContent"("normalizedHash");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedRawContent_importBatchId_originalHash_key" ON "ImportedRawContent"("importBatchId", "originalHash");

-- CreateIndex
CREATE INDEX "ContentGenerationJob_status_priority_createdAt_idx" ON "ContentGenerationJob"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "ContentGenerationJob_type_status_createdAt_idx" ON "ContentGenerationJob"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ContentGenerationJob_createdByUserId_createdAt_idx" ON "ContentGenerationJob"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentGenerationBatch_status_createdAt_idx" ON "ContentGenerationBatch"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentGenerationBatch_jobId_sequence_key" ON "ContentGenerationBatch"("jobId", "sequence");

-- CreateIndex
CREATE INDEX "ContentGenerationItem_batchId_status_idx" ON "ContentGenerationItem"("batchId", "status");

-- CreateIndex
CREATE INDEX "ContentGenerationItem_contentType_contentId_idx" ON "ContentGenerationItem"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "ContentGenerationItem_normalizedHash_idx" ON "ContentGenerationItem"("normalizedHash");

-- CreateIndex
CREATE UNIQUE INDEX "ContentGenerationItem_jobId_sequence_key" ON "ContentGenerationItem"("jobId", "sequence");

-- CreateIndex
CREATE INDEX "ContentReview_decision_createdAt_idx" ON "ContentReview"("decision", "createdAt");

-- CreateIndex
CREATE INDEX "ContentReview_contentType_contentId_idx" ON "ContentReview"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "ContentQualityReport_passed_qualityScore_createdAt_idx" ON "ContentQualityReport"("passed", "qualityScore", "createdAt");

-- CreateIndex
CREATE INDEX "ContentQualityReport_contentType_contentId_idx" ON "ContentQualityReport"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "ContentDuplicateMatch_status_score_createdAt_idx" ON "ContentDuplicateMatch"("status", "score", "createdAt");

-- CreateIndex
CREATE INDEX "ContentDuplicateMatch_sourceContentType_sourceContentId_idx" ON "ContentDuplicateMatch"("sourceContentType", "sourceContentId");

-- CreateIndex
CREATE INDEX "ContentSchedule_enabled_nextRunAt_idx" ON "ContentSchedule"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "ContentUsageStat_usageDate_idx" ON "ContentUsageStat"("usageDate");

-- CreateIndex
CREATE UNIQUE INDEX "ContentUsageStat_usageDate_providerId_modelId_jobType_key" ON "ContentUsageStat"("usageDate", "providerId", "modelId", "jobType");

-- CreateIndex
CREATE UNIQUE INDEX "ContentTag_slug_key" ON "ContentTag"("slug");

-- CreateIndex
CREATE INDEX "ContentTagAssignment_contentType_contentId_idx" ON "ContentTagAssignment"("contentType", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentTagAssignment_tagId_contentType_contentId_key" ON "ContentTagAssignment"("tagId", "contentType", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentTopic_slug_key" ON "ContentTopic"("slug");

-- CreateIndex
CREATE INDEX "ContentTopicAssignment_contentType_contentId_idx" ON "ContentTopicAssignment"("contentType", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentTopicAssignment_topicId_contentType_contentId_key" ON "ContentTopicAssignment"("topicId", "contentType", "contentId");

-- CreateIndex
CREATE INDEX "ContentAttribution_contentType_contentId_idx" ON "ContentAttribution"("contentType", "contentId");

-- AddForeignKey
ALTER TABLE "ContentSource" ADD CONSTRAINT "ContentSource_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "ContentLicense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportSource" ADD CONSTRAINT "ImportSource_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "ContentLicense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_importSourceId_fkey" FOREIGN KEY ("importSourceId") REFERENCES "ImportSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "ContentGenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedRawContent" ADD CONSTRAINT "ImportedRawContent_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedRawContent" ADD CONSTRAINT "ImportedRawContent_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "ContentLicense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGenerationBatch" ADD CONSTRAINT "ContentGenerationBatch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContentGenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGenerationItem" ADD CONSTRAINT "ContentGenerationItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContentGenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGenerationItem" ADD CONSTRAINT "ContentGenerationItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ContentGenerationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReview" ADD CONSTRAINT "ContentReview_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "ContentGenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentQualityReport" ADD CONSTRAINT "ContentQualityReport_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "ContentGenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentTagAssignment" ADD CONSTRAINT "ContentTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ContentTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentTopic" ADD CONSTRAINT "ContentTopic_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ContentTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentTopicAssignment" ADD CONSTRAINT "ContentTopicAssignment_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ContentTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentAttribution" ADD CONSTRAINT "ContentAttribution_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "ContentLicense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
