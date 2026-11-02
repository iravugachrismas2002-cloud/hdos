# HDOS Application Portal

The portal extends the current opportunities catalogue and applicant profile. Existing HDOS catalogue and recommendations remain available.

## Delivery phases

1. **Applicant profile and reusable documents:** build on the authenticated HDOS profile; add verified education, experience, skills, preferences, document metadata, and per-field provenance. Store document binaries only in an approved encrypted object store. Uploads need malware scanning, size/type validation, owner scoped access, expiring download URLs, and audit records before launch.
2. **Opportunity discovery and requirements:** retain the existing opportunity catalogue. Add versioned opportunity requirement records with mandatory/optional flags, evidence type, validation method, source URL, jurisdiction and effective dates. Seed examples are expressly illustrative.
3. **Eligibility:** deterministic rules compare structured, confirmed applicant data to structured requirements. Outcomes: eligible, eligible with missing documents, review required, or not eligible. LLM extraction is a suggestion pending applicant confirmation; qualification equivalency requires an authorised recognition decision.
4. **Application preparation and submission:** generate a draft package and validate required fields. This implementation tracks preparation and approval; it does not automate external submission. Any future integration must use an authorised provider API, preserve receipts, obtain explicit approval and escalate declarations, payments, signatures and CAPTCHA.
5. **Dashboard:** application tracking is available at `/applications`; controlled transitions and duplicate prevention are enforced by the API. Future work includes timeline events, calendar, receipt archive, and exports.
6. **Document lifecycle:** metadata should identify retention basis, expiry, archive tier and deletion state. Implement encrypted regional object storage, backups, retention review, archive restore, secure deletion and audit evidence only after deployment region and applicable authorisations are confirmed. Current code does not accept or store files.
7. **Institution connectors:** onboard authorised employers and institutions, with per-connector consent scopes, credentials vault, rate limits and reconciliation.
8. **International expansion:** add jurisdiction configurations, localization, privacy transfer controls, accessibility review, and local institution partnerships.

## Data and API outline

Current implementation adds `ApplicantApplication` and authenticated `GET/POST /api/applications`, plus `PATCH /api/applications/:id/status`. Ownership derives from the bearer token. The unique `(userId, opportunityId)` key prevents duplicate tracking. `APPROVED -> SUBMITTED` records applicant confirmation only.

Future tables: ApplicantEducation, ApplicantExperience, ApplicantSkill, ApplicantDocument (metadata), OpportunityRequirement (versioned), EligibilityAssessment, ApplicationAnswer, ApplicationDocument (immutable snapshot reference), ApplicationEvent, SubmissionReceipt, AutomationPermission, InstitutionConnector, DocumentArchive, RetentionPolicy and AuditLog. Keep personal document metadata separate from immutable application snapshots. Use encrypted object storage for file bytes, not PostgreSQL.

## Evaluation and commercialization

Measure profile completion, eligible-to-prepared conversion, user-confirmed submission rate, time saved, deadline misses, duplicate prevention, status freshness, accessibility completion, and user-reported outcomes. Evaluate against consented pilot cohorts and disclose illustrative data. Commercial paths include institution-sponsored placement services, employer/recruiter subscriptions, and optional applicant services; protect applicant access from pay-to-win ranking and do not sell personal documents or eligibility data. Validate pricing and procurement with Rwanda pilot partners before rollout.

## Launch gate

Before collecting CVs or identity documents, verify hosting, database, backups and AI processing locations and any required Rwanda authorisations. This initial phase stores only application tracking records and uses the existing opportunity catalogue; it does not implement file uploads, extraction, autonomous eligibility decisions, external submissions, or retention jobs.
