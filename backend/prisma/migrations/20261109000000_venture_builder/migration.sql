-- CreateEnum
CREATE TYPE "VentureStatus" AS ENUM ('DRAFT', 'DISCOVERY', 'VALIDATING', 'VALIDATION_REVIEW', 'FEASIBILITY_REVIEW', 'MVP_PLANNING', 'BUILDING', 'PILOTING', 'LAUNCH_READY', 'ACTIVE', 'PAUSED', 'STOPPED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VentureMemberRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'CONTRIBUTOR', 'VIEWER', 'ADVISOR');

-- CreateEnum
CREATE TYPE "VentureMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'DECLINED', 'REMOVED');

-- CreateEnum
CREATE TYPE "VentureAssumptionCategory" AS ENUM ('PROBLEM', 'CUSTOMER', 'MARKET', 'WILLINGNESS_TO_PAY', 'TECHNICAL', 'FINANCIAL', 'OPERATIONAL', 'DIFFERENTIATION', 'TEAM');

-- CreateEnum
CREATE TYPE "VentureRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "VentureAssumptionStatus" AS ENUM ('UNTESTED', 'TESTING', 'SUPPORTED', 'REFUTED', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "VentureOrigin" AS ENUM ('USER', 'AI_DRAFT');

-- CreateEnum
CREATE TYPE "VentureEvidenceType" AS ENUM ('INTERVIEW', 'SURVEY', 'EXPERIMENT_RESULT', 'OFFICIAL_STATISTIC', 'DOCUMENT', 'OBSERVATION', 'COMPETITOR_RESEARCH', 'TEST_ORDER', 'OTHER');

-- CreateEnum
CREATE TYPE "VentureEvidenceDirection" AS ENUM ('SUPPORTS', 'CONTRADICTS', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "VentureVerificationStatus" AS ENUM ('USER_REPORTED', 'SOURCE_LINKED', 'VERIFIED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "VentureExperimentStatus" AS ENUM ('PLANNED', 'RUNNING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VentureExperimentOutcome" AS ENUM ('SUPPORTS', 'CONTRADICTS', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "VentureAssessmentKind" AS ENUM ('VENTURE_READINESS', 'FUNDING_READINESS');

-- CreateEnum
CREATE TYPE "VentureFeaturePriority" AS ENUM ('MUST', 'SHOULD', 'COULD', 'WONT');

-- CreateEnum
CREATE TYPE "VentureWorkStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "VentureSpecStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "VentureScenarioCase" AS ENUM ('CONSERVATIVE', 'BASE', 'UPSIDE');

-- CreateEnum
CREATE TYPE "VentureLineItemKind" AS ENUM ('STARTUP_COST', 'FIXED_COST', 'VARIABLE_COST');

-- CreateEnum
CREATE TYPE "VentureKpiMetric" AS ENUM ('LEADS', 'ACTIVE_CUSTOMERS', 'CUSTOMER_ACQUISITION_COST', 'REVENUE', 'REPEAT_PURCHASES', 'RETENTION_RATE', 'GROSS_MARGIN', 'MONTHLY_OPERATING_COSTS', 'CASH_RUNWAY_MONTHS', 'COMPLAINTS', 'DELIVERY_TIME_DAYS');

-- CreateEnum
CREATE TYPE "VentureAiKind" AS ENUM ('DISCOVERY', 'MVP_SPEC', 'ASSESSMENT_EXPLANATION');

-- CreateEnum
CREATE TYPE "VentureAiStatus" AS ENUM ('AI_GENERATED', 'TEMPLATE_FALLBACK', 'AI_SKIPPED');

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "mode" TEXT,
ADD COLUMN     "ventureId" TEXT;

-- CreateTable
CREATE TABLE "VentureProject" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ideaSummary" TEXT,
    "problemStatement" TEXT,
    "sectorId" TEXT,
    "districtId" TEXT,
    "country" TEXT NOT NULL DEFAULT 'RW',
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "status" "VentureStatus" NOT NULL DEFAULT 'DRAFT',
    "startMode" TEXT,
    "aiProcessingConsent" BOOLEAN NOT NULL DEFAULT false,
    "launchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentureProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "VentureMemberRole" NOT NULL,
    "status" "VentureMemberStatus" NOT NULL DEFAULT 'INVITED',
    "sharedSections" TEXT[],
    "invitedById" TEXT,
    "consentedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentureMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureAssumption" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "category" "VentureAssumptionCategory" NOT NULL,
    "riskLevel" "VentureRiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "testMethod" TEXT,
    "status" "VentureAssumptionStatus" NOT NULL DEFAULT 'UNTESTED',
    "origin" "VentureOrigin" NOT NULL DEFAULT 'USER',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentureAssumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureResearchSource" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "url" TEXT,
    "publishedAt" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureResearchSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureEvidence" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assumptionId" TEXT,
    "experimentId" TEXT,
    "evidenceType" "VentureEvidenceType" NOT NULL,
    "direction" "VentureEvidenceDirection" NOT NULL DEFAULT 'NEUTRAL',
    "description" TEXT NOT NULL,
    "sourceId" TEXT,
    "documentId" TEXT,
    "respondentLabel" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentRecordedAt" TIMESTAMP(3),
    "verificationStatus" "VentureVerificationStatus" NOT NULL DEFAULT 'USER_REPORTED',
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureCustomerSegment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "size" TEXT,
    "needs" TEXT[],
    "currentAlternatives" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentureCustomerSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureCompetitor" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "offering" TEXT,
    "priceNote" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentureCompetitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureExperiment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assumptionId" TEXT,
    "hypothesis" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "targetSample" INTEGER,
    "successCriteria" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "VentureExperimentStatus" NOT NULL DEFAULT 'PLANNED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentureExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureExperimentResult" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "metricName" TEXT,
    "metricValue" DOUBLE PRECISION,
    "sampleSize" INTEGER,
    "outcome" "VentureExperimentOutcome" NOT NULL,
    "recordedById" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureExperimentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureAssessment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "VentureAssessmentKind" NOT NULL DEFAULT 'VENTURE_READINESS',
    "assessmentVersion" INTEGER NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "overallScore" INTEGER,
    "overallCoverage" DOUBLE PRECISION NOT NULL,
    "maturityLabel" TEXT NOT NULL,
    "dimensionScores" JSONB NOT NULL,
    "feasibility" JSONB,
    "evidenceCoverage" JSONB NOT NULL,
    "missingEvidence" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "inputsDigest" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureBusinessModel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "customerSegments" TEXT[],
    "valueProposition" TEXT[],
    "channels" TEXT[],
    "customerRelationships" TEXT[],
    "revenueStreams" JSONB NOT NULL,
    "keyActivities" TEXT[],
    "keyResources" TEXT[],
    "keyPartners" TEXT[],
    "costStructure" TEXT[],
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureBusinessModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureFinancialLineItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "VentureLineItemKind" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "note" TEXT,
    "evidenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentureFinancialLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureFinancialScenario" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "caseType" "VentureScenarioCase" NOT NULL,
    "currency" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureFinancialScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureMvpSpecification" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "VentureSpecStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "changeNote" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureMvpSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureFeature" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "VentureFeaturePriority" NOT NULL DEFAULT 'SHOULD',
    "status" "VentureWorkStatus" NOT NULL DEFAULT 'TODO',
    "userStory" TEXT,
    "acceptanceCriteria" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentureFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "VentureWorkStatus" NOT NULL DEFAULT 'TODO',
    "assigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentureMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureActivity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureStatusChange" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromStatus" "VentureStatus" NOT NULL,
    "toStatus" "VentureStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureAiExecution" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "VentureAiKind" NOT NULL,
    "idempotencyKey" TEXT,
    "status" "VentureAiStatus" NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "schemaValid" BOOLEAN NOT NULL DEFAULT false,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureAiExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureKpiEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "metric" "VentureKpiMetric" NOT NULL,
    "value" DECIMAL(18,2) NOT NULL,
    "note" TEXT,
    "recordedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentureKpiEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentureDocumentLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "linkedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentureDocumentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VentureProject_ownerId_updatedAt_idx" ON "VentureProject"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "VentureProject_status_idx" ON "VentureProject"("status");

-- CreateIndex
CREATE INDEX "VentureMember_userId_status_idx" ON "VentureMember"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VentureMember_projectId_userId_key" ON "VentureMember"("projectId", "userId");

-- CreateIndex
CREATE INDEX "VentureAssumption_projectId_category_idx" ON "VentureAssumption"("projectId", "category");

-- CreateIndex
CREATE INDEX "VentureAssumption_projectId_status_idx" ON "VentureAssumption"("projectId", "status");

-- CreateIndex
CREATE INDEX "VentureResearchSource_projectId_idx" ON "VentureResearchSource"("projectId");

-- CreateIndex
CREATE INDEX "VentureEvidence_projectId_assumptionId_idx" ON "VentureEvidence"("projectId", "assumptionId");

-- CreateIndex
CREATE INDEX "VentureEvidence_projectId_evidenceType_idx" ON "VentureEvidence"("projectId", "evidenceType");

-- CreateIndex
CREATE INDEX "VentureCustomerSegment_projectId_idx" ON "VentureCustomerSegment"("projectId");

-- CreateIndex
CREATE INDEX "VentureCompetitor_projectId_idx" ON "VentureCompetitor"("projectId");

-- CreateIndex
CREATE INDEX "VentureExperiment_projectId_status_idx" ON "VentureExperiment"("projectId", "status");

-- CreateIndex
CREATE INDEX "VentureExperimentResult_experimentId_idx" ON "VentureExperimentResult"("experimentId");

-- CreateIndex
CREATE UNIQUE INDEX "VentureAssessment_projectId_kind_assessmentVersion_key" ON "VentureAssessment"("projectId", "kind", "assessmentVersion");

-- CreateIndex
CREATE UNIQUE INDEX "VentureBusinessModel_projectId_version_key" ON "VentureBusinessModel"("projectId", "version");

-- CreateIndex
CREATE INDEX "VentureFinancialLineItem_projectId_kind_idx" ON "VentureFinancialLineItem"("projectId", "kind");

-- CreateIndex
CREATE INDEX "VentureFinancialScenario_projectId_createdAt_idx" ON "VentureFinancialScenario"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VentureFinancialScenario_groupId_caseType_key" ON "VentureFinancialScenario"("groupId", "caseType");

-- CreateIndex
CREATE UNIQUE INDEX "VentureMvpSpecification_projectId_version_key" ON "VentureMvpSpecification"("projectId", "version");

-- CreateIndex
CREATE INDEX "VentureFeature_projectId_priority_idx" ON "VentureFeature"("projectId", "priority");

-- CreateIndex
CREATE INDEX "VentureMilestone_projectId_status_idx" ON "VentureMilestone"("projectId", "status");

-- CreateIndex
CREATE INDEX "VentureActivity_projectId_createdAt_idx" ON "VentureActivity"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "VentureStatusChange_projectId_createdAt_idx" ON "VentureStatusChange"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "VentureAiExecution_projectId_kind_createdAt_idx" ON "VentureAiExecution"("projectId", "kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VentureAiExecution_projectId_idempotencyKey_key" ON "VentureAiExecution"("projectId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "VentureKpiEntry_projectId_period_metric_key" ON "VentureKpiEntry"("projectId", "period", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "VentureDocumentLink_projectId_documentId_key" ON "VentureDocumentLink"("projectId", "documentId");

-- AddForeignKey
ALTER TABLE "VentureProject" ADD CONSTRAINT "VentureProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureProject" ADD CONSTRAINT "VentureProject_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureProject" ADD CONSTRAINT "VentureProject_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureMember" ADD CONSTRAINT "VentureMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureMember" ADD CONSTRAINT "VentureMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureAssumption" ADD CONSTRAINT "VentureAssumption_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureResearchSource" ADD CONSTRAINT "VentureResearchSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureEvidence" ADD CONSTRAINT "VentureEvidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureEvidence" ADD CONSTRAINT "VentureEvidence_assumptionId_fkey" FOREIGN KEY ("assumptionId") REFERENCES "VentureAssumption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureEvidence" ADD CONSTRAINT "VentureEvidence_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "VentureExperiment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureEvidence" ADD CONSTRAINT "VentureEvidence_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "VentureResearchSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureCustomerSegment" ADD CONSTRAINT "VentureCustomerSegment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureCompetitor" ADD CONSTRAINT "VentureCompetitor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureExperiment" ADD CONSTRAINT "VentureExperiment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureExperiment" ADD CONSTRAINT "VentureExperiment_assumptionId_fkey" FOREIGN KEY ("assumptionId") REFERENCES "VentureAssumption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureExperimentResult" ADD CONSTRAINT "VentureExperimentResult_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "VentureExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureAssessment" ADD CONSTRAINT "VentureAssessment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureBusinessModel" ADD CONSTRAINT "VentureBusinessModel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureFinancialLineItem" ADD CONSTRAINT "VentureFinancialLineItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureFinancialScenario" ADD CONSTRAINT "VentureFinancialScenario_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureMvpSpecification" ADD CONSTRAINT "VentureMvpSpecification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureFeature" ADD CONSTRAINT "VentureFeature_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureMilestone" ADD CONSTRAINT "VentureMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureActivity" ADD CONSTRAINT "VentureActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureStatusChange" ADD CONSTRAINT "VentureStatusChange_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureAiExecution" ADD CONSTRAINT "VentureAiExecution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureKpiEntry" ADD CONSTRAINT "VentureKpiEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureDocumentLink" ADD CONSTRAINT "VentureDocumentLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VentureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentureDocumentLink" ADD CONSTRAINT "VentureDocumentLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ApplicantDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
