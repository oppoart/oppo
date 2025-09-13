-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "preferences" JSONB,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mediums" TEXT[] DEFAULT ARRAY['other']::TEXT[],
    "bio" TEXT,
    "artistStatement" TEXT,
    "skills" TEXT[],
    "interests" TEXT[],
    "experience" TEXT,
    "location" TEXT,
    "website" TEXT,
    "portfolioUrl" TEXT,
    "preferences" JSONB,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artist_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "amount" TEXT,
    "location" TEXT,
    "tags" TEXT[],
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceMetadata" JSONB,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "relevanceScore" DOUBLE PRECISION,
    "semanticScore" DOUBLE PRECISION,
    "keywordScore" DOUBLE PRECISION,
    "categoryScore" DOUBLE PRECISION,
    "aiServiceUsed" TEXT,
    "processingTimeMs" INTEGER,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'new',
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "starred" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_matches" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastScanned" TIMESTAMP(3),
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunity_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_source_links" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_source_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_jobs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "opportunitiesFound" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "metadata" JSONB,
    "processingTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_duplicates" (
    "id" TEXT NOT NULL,
    "masterOpportunityId" TEXT NOT NULL,
    "duplicateOpportunityId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "mergeStrategy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_duplicates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_service_metrics" (
    "id" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "costUsd" DOUBLE PRECISION,
    "qualityScore" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_service_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_buckets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "query" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "query_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analysis_cache" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "artistProfileId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "matchedCriteria" TEXT[],
    "missingRequirements" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL,
    "aiProvider" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "responseHash" TEXT NOT NULL,
    "processingTimeMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_analysis_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_generation_history" (
    "id" TEXT NOT NULL,
    "artistProfileId" TEXT NOT NULL,
    "opportunityType" TEXT NOT NULL,
    "generatedQueries" TEXT[],
    "queryGenerationStyle" TEXT NOT NULL,
    "aiProvider" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "maxTokens" INTEGER NOT NULL,
    "processingTimeMs" INTEGER NOT NULL,
    "queryCount" INTEGER NOT NULL,
    "responseHash" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_generation_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON "accounts"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_source_links_opportunityId_sourceId_key" ON "opportunity_source_links"("opportunityId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_duplicates_masterOpportunityId_duplicateOpportu_key" ON "opportunity_duplicates"("masterOpportunityId", "duplicateOpportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "query_buckets_userId_query_key" ON "query_buckets"("userId", "query");

-- CreateIndex
CREATE INDEX "ai_analysis_cache_expiresAt_idx" ON "ai_analysis_cache"("expiresAt");

-- CreateIndex
CREATE INDEX "ai_analysis_cache_opportunityId_idx" ON "ai_analysis_cache"("opportunityId");

-- CreateIndex
CREATE INDEX "ai_analysis_cache_artistProfileId_idx" ON "ai_analysis_cache"("artistProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analysis_cache_opportunityId_artistProfileId_key" ON "ai_analysis_cache"("opportunityId", "artistProfileId");

-- CreateIndex
CREATE INDEX "query_generation_history_artistProfileId_idx" ON "query_generation_history"("artistProfileId");

-- CreateIndex
CREATE INDEX "query_generation_history_opportunityType_idx" ON "query_generation_history"("opportunityType");

-- CreateIndex
CREATE INDEX "query_generation_history_createdAt_idx" ON "query_generation_history"("createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_profiles" ADD CONSTRAINT "artist_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_matches" ADD CONSTRAINT "opportunity_matches_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_source_links" ADD CONSTRAINT "opportunity_source_links_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_source_links" ADD CONSTRAINT "opportunity_source_links_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "opportunity_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_jobs" ADD CONSTRAINT "discovery_jobs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "opportunity_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_duplicates" ADD CONSTRAINT "opportunity_duplicates_masterOpportunityId_fkey" FOREIGN KEY ("masterOpportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_duplicates" ADD CONSTRAINT "opportunity_duplicates_duplicateOpportunityId_fkey" FOREIGN KEY ("duplicateOpportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_buckets" ADD CONSTRAINT "query_buckets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

