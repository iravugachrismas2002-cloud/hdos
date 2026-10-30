-- CreateEnum
CREATE TYPE "PathType" AS ENUM ('LEARNING_PATH', 'CAREER_ROADMAP');

-- CreateEnum
CREATE TYPE "UsageKind" AS ENUM ('AI_REQUEST', 'RECOMMENDATION', 'ROADMAP', 'CHAT');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "CareerPath" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "PathType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "occupationId" TEXT,
    "sectorId" TEXT,
    "startLevel" "EducationLevel",
    "durationMonths" INTEGER,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "CareerPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerPathStep" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" "StepKind" NOT NULL,
    "monthOffset" INTEGER NOT NULL DEFAULT 0,
    "resourceLabel" TEXT,
    "resourceUrl" TEXT,

    CONSTRAINT "CareerPathStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "kind" "UsageKind" NOT NULL,
    "feature" TEXT,
    "provider" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "latencyMs" INTEGER,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "provider" TEXT,
    "goalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CareerPath_slug_key" ON "CareerPath"("slug");

-- CreateIndex
CREATE INDEX "CareerPath_type_idx" ON "CareerPath"("type");

-- CreateIndex
CREATE INDEX "CareerPath_occupationId_idx" ON "CareerPath"("occupationId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerPathStep_pathId_order_key" ON "CareerPathStep"("pathId", "order");

-- CreateIndex
CREATE INDEX "UsageEvent_kind_createdAt_idx" ON "UsageEvent"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_provider_createdAt_idx" ON "UsageEvent"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CareerPath" ADD CONSTRAINT "CareerPath_occupationId_fkey" FOREIGN KEY ("occupationId") REFERENCES "Occupation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPath" ADD CONSTRAINT "CareerPath_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPath" ADD CONSTRAINT "CareerPath_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPathStep" ADD CONSTRAINT "CareerPathStep_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "CareerPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
