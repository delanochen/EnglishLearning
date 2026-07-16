-- CreateEnum
CREATE TYPE "AIProviderType" AS ENUM ('OPENAI', 'OPENROUTER', 'GEMINI', 'OPENAI_COMPATIBLE', 'OLLAMA');

-- CreateEnum
CREATE TYPE "AIModelStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "AIUsagePurpose" AS ENUM ('TUTOR', 'VOCABULARY', 'READING', 'QUIZ', 'GRAMMAR', 'WRITING', 'LEARNING_PLAN', 'TRANSLATION', 'SPEECH_RECOGNITION', 'TTS', 'IMAGE_GENERATION', 'VIDEO_GENERATION');

-- CreateEnum
CREATE TYPE "AIRequestStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "AIProvider" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AIProviderType" NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "encryptedApiKey" TEXT,
    "apiKeyIv" TEXT,
    "apiKeyAuthTag" TEXT,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "notes" TEXT,
    "lastConnectionAt" TIMESTAMP(3),
    "lastConnectionOk" BOOLEAN,
    "lastConnectionMs" INTEGER,
    "lastConnectionError" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AIProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModel" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "capabilities" TEXT[],
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 2048,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "status" "AIModelStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastCheckedAt" TIMESTAMP(3),
    "lastLatencyMs" INTEGER,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AIModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageRoute" (
    "id" UUID NOT NULL,
    "purpose" "AIUsagePurpose" NOT NULL,
    "strategy" TEXT NOT NULL DEFAULT 'PRIORITY_FAILOVER',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AIUsageRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageRouteModel" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AIUsageRouteModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRequestLog" (
    "id" UUID NOT NULL,
    "requestId" TEXT NOT NULL,
    "providerId" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "purpose" "AIUsagePurpose" NOT NULL,
    "userId" UUID,
    "status" "AIRequestStatus" NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "errorType" TEXT,
    "errorMessage" TEXT,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "fallbackFromId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIProvider_name_key" ON "AIProvider"("name");
CREATE INDEX "AIProvider_enabled_priority_deletedAt_idx" ON "AIProvider"("enabled", "priority", "deletedAt");
CREATE UNIQUE INDEX "AIModel_providerId_name_key" ON "AIModel"("providerId", "name");
CREATE INDEX "AIModel_enabled_priority_status_idx" ON "AIModel"("enabled", "priority", "status");
CREATE UNIQUE INDEX "AIUsageRoute_purpose_key" ON "AIUsageRoute"("purpose");
CREATE UNIQUE INDEX "AIUsageRouteModel_routeId_modelId_key" ON "AIUsageRouteModel"("routeId", "modelId");
CREATE INDEX "AIUsageRouteModel_routeId_enabled_priority_idx" ON "AIUsageRouteModel"("routeId", "enabled", "priority");
CREATE INDEX "AIRequestLog_createdAt_idx" ON "AIRequestLog"("createdAt");
CREATE INDEX "AIRequestLog_purpose_status_createdAt_idx" ON "AIRequestLog"("purpose", "status", "createdAt");
CREATE INDEX "AIRequestLog_providerId_modelId_createdAt_idx" ON "AIRequestLog"("providerId", "modelId", "createdAt");

-- AddForeignKey
ALTER TABLE "AIModel" ADD CONSTRAINT "AIModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AIProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIUsageRouteModel" ADD CONSTRAINT "AIUsageRouteModel_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "AIUsageRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIUsageRouteModel" ADD CONSTRAINT "AIUsageRouteModel_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIRequestLog" ADD CONSTRAINT "AIRequestLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AIProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AIRequestLog" ADD CONSTRAINT "AIRequestLog_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
