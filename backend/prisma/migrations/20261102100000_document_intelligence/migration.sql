CREATE TYPE "ApplicantDocumentStatus" AS ENUM ('UPLOADED','PROCESSING','AWAITING_CONFIRMATION','VERIFIED','REJECTED');
ALTER TABLE "ApplicantDocument" ADD COLUMN "groupId" TEXT NOT NULL DEFAULT '', ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "status" "ApplicantDocumentStatus" NOT NULL DEFAULT 'UPLOADED', ADD COLUMN "expiresAt" TIMESTAMP(3);
UPDATE "ApplicantDocument" SET "groupId" = "id" WHERE "groupId" = '';
UPDATE "ApplicantDocument" SET "status" = CASE WHEN "extractionConfirmedAt" IS NOT NULL THEN 'UPLOADED'::"ApplicantDocumentStatus" WHEN "extractedText" IS NOT NULL THEN 'AWAITING_CONFIRMATION'::"ApplicantDocumentStatus" ELSE 'UPLOADED'::"ApplicantDocumentStatus" END;
CREATE INDEX "ApplicantDocument_userId_groupId_version_idx" ON "ApplicantDocument"("userId","groupId","version");

CREATE TABLE "ApplicantDocumentVersion" ("id" TEXT NOT NULL,"documentId" TEXT NOT NULL,"version" INTEGER NOT NULL,"storageKey" TEXT NOT NULL,"sha256" TEXT NOT NULL,"fileName" TEXT NOT NULL,"sizeBytes" INTEGER NOT NULL,"mimeType" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "ApplicantDocumentVersion_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ApplicantDocumentVersion_storageKey_key" ON "ApplicantDocumentVersion"("storageKey");
CREATE UNIQUE INDEX "ApplicantDocumentVersion_documentId_version_key" ON "ApplicantDocumentVersion"("documentId","version");
ALTER TABLE "ApplicantDocumentVersion" ADD CONSTRAINT "ApplicantDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ApplicantDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DocumentExtraction" ("id" TEXT NOT NULL,"documentId" TEXT NOT NULL,"source" TEXT NOT NULL,"extractedData" JSONB NOT NULL,"extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"confirmedAt" TIMESTAMP(3),CONSTRAINT "DocumentExtraction_pkey" PRIMARY KEY ("id"));
CREATE INDEX "DocumentExtraction_documentId_extractedAt_idx" ON "DocumentExtraction"("documentId","extractedAt");
ALTER TABLE "DocumentExtraction" ADD CONSTRAINT "DocumentExtraction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ApplicantDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DocumentVerification" ("id" TEXT NOT NULL,"documentId" TEXT NOT NULL,"reviewerId" TEXT NOT NULL,"status" "ApplicantDocumentStatus" NOT NULL,"reason" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "DocumentVerification_pkey" PRIMARY KEY ("id"));
CREATE INDEX "DocumentVerification_documentId_createdAt_idx" ON "DocumentVerification"("documentId","createdAt");
ALTER TABLE "DocumentVerification" ADD CONSTRAINT "DocumentVerification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ApplicantDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DocumentAccessLog" ("id" TEXT NOT NULL,"documentId" TEXT NOT NULL,"userId" TEXT NOT NULL,"action" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "DocumentAccessLog_pkey" PRIMARY KEY ("id"));
CREATE INDEX "DocumentAccessLog_documentId_createdAt_idx" ON "DocumentAccessLog"("documentId","createdAt");
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ApplicantDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DocumentRetentionPolicy" ("id" TEXT NOT NULL,"country" TEXT NOT NULL,"category" TEXT NOT NULL,"retentionDays" INTEGER NOT NULL,"active" BOOLEAN NOT NULL DEFAULT TRUE,CONSTRAINT "DocumentRetentionPolicy_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "DocumentRetentionPolicy_country_category_key" ON "DocumentRetentionPolicy"("country","category");

ALTER TABLE "ApplicationDocument" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "opportunityRequirementsVersion" INTEGER;
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ApplicantDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
