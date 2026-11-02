CREATE TYPE "ApplicationStatus" AS ENUM ('DISCOVERED','ELIGIBLE','INELIGIBLE','DOCUMENTS_REQUIRED','PREPARING','READY_FOR_REVIEW','APPROVED','SUBMITTED','UNDER_REVIEW','INTERVIEW','ACCEPTED','REJECTED','WITHDRAWN','EXPIRED','ARCHIVED');
CREATE TABLE "ApplicantApplication" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'DISCOVERED',
  "notes" TEXT, "receiptReference" TEXT, "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicantApplication_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApplicantApplication_userId_opportunityId_key" ON "ApplicantApplication"("userId", "opportunityId");
CREATE INDEX "ApplicantApplication_userId_status_idx" ON "ApplicantApplication"("userId", "status");
ALTER TABLE "ApplicantApplication" ADD CONSTRAINT "ApplicantApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicantApplication" ADD CONSTRAINT "ApplicantApplication_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ApplicantProfile" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "phone" TEXT, "country" TEXT NOT NULL DEFAULT 'RW', "location" TEXT,
  "education" JSONB NOT NULL DEFAULT '[]', "experience" JSONB NOT NULL DEFAULT '[]', "skills" JSONB NOT NULL DEFAULT '[]',
  "languages" JSONB NOT NULL DEFAULT '[]', "preferences" JSONB NOT NULL DEFAULT '{}', "confirmedAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicantProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApplicantProfile_userId_key" ON "ApplicantProfile"("userId");
ALTER TABLE "ApplicantProfile" ADD CONSTRAINT "ApplicantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ApplicantDocument" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "kind" TEXT NOT NULL, "fileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL, "sha256" TEXT NOT NULL, "storageKey" TEXT NOT NULL, "extractedText" JSONB,
  "extractionConfirmedAt" TIMESTAMP(3), "retentionUntil" TIMESTAMP(3), "archivedAt" TIMESTAMP(3), "deletedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicantDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApplicantDocument_storageKey_key" ON "ApplicantDocument"("storageKey");
CREATE INDEX "ApplicantDocument_userId_kind_idx" ON "ApplicantDocument"("userId", "kind");
ALTER TABLE "ApplicantDocument" ADD CONSTRAINT "ApplicantDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OpportunityRequirement" (
  "id" TEXT NOT NULL, "opportunityId" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1, "key" TEXT NOT NULL, "description" TEXT NOT NULL,
  "kind" TEXT NOT NULL, "mandatory" BOOLEAN NOT NULL DEFAULT TRUE, "acceptedEvidence" JSONB NOT NULL DEFAULT '[]', "sourceUrl" TEXT, "country" TEXT,
  "effectiveFrom" TIMESTAMP(3), "effectiveUntil" TIMESTAMP(3), CONSTRAINT "OpportunityRequirement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OpportunityRequirement_opportunityId_version_key_key" ON "OpportunityRequirement"("opportunityId", "version", "key");
CREATE INDEX "OpportunityRequirement_opportunityId_mandatory_idx" ON "OpportunityRequirement"("opportunityId", "mandatory");
ALTER TABLE "OpportunityRequirement" ADD CONSTRAINT "OpportunityRequirement_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ApplicationAnswer" ("id" TEXT NOT NULL, "applicationId" TEXT NOT NULL, "questionKey" TEXT NOT NULL, "answer" TEXT NOT NULL, "confirmedAt" TIMESTAMP(3), CONSTRAINT "ApplicationAnswer_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ApplicationAnswer_applicationId_questionKey_key" ON "ApplicationAnswer"("applicationId", "questionKey");
ALTER TABLE "ApplicationAnswer" ADD CONSTRAINT "ApplicationAnswer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ApplicantApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ApplicationEvent" ("id" TEXT NOT NULL, "applicationId" TEXT NOT NULL, "status" "ApplicationStatus" NOT NULL, "detail" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id"));
CREATE INDEX "ApplicationEvent_applicationId_createdAt_idx" ON "ApplicationEvent"("applicationId", "createdAt");
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ApplicantApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ApplicationDocument" ("id" TEXT NOT NULL, "applicationId" TEXT NOT NULL, "documentId" TEXT NOT NULL, "snapshotStorageKey" TEXT NOT NULL, "sha256" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ApplicationDocument_applicationId_documentId_key" ON "ApplicationDocument"("applicationId", "documentId");
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ApplicantApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CountryConfiguration" ("code" TEXT NOT NULL, "name" TEXT NOT NULL, "languages" JSONB NOT NULL DEFAULT '[]', "privacyNoticeUrl" TEXT, "storageRegion" TEXT, "requirements" JSONB NOT NULL DEFAULT '{}', "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CountryConfiguration_pkey" PRIMARY KEY ("code"));
CREATE TABLE "InstitutionConnector" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "country" TEXT NOT NULL, "kind" TEXT NOT NULL, "endpoint" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT FALSE, "authorizationReference" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "InstitutionConnector_pkey" PRIMARY KEY ("id"));
CREATE INDEX "InstitutionConnector_country_enabled_idx" ON "InstitutionConnector"("country", "enabled");
