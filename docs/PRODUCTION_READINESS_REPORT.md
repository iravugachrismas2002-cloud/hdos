# HDOS Production Readiness Report

**Assessment date:** 2026-11-02  
**Scope:** verification and readiness review only; no new product features were added.

## Verification evidence

| Check | Result |
| --- | --- |
| Prisma migration deploy | `No pending migrations to apply.` |
| Prisma migration status | `3 migrations found`; `Database schema is up to date!` |
| Backend tests | 3 files passed; 54 tests passed; 2 files / 27 tests skipped by existing test conditions |
| Frontend tests | 2 passed, 0 failed (`node --test`) |
| Backend type check | Passed |
| Backend build | Passed |
| Backend lint | Passed after removing a control-character regex lint violation |
| Frontend type check | Passed |

Backend tests were run with Vitest 2.1.9 on Node 26.1.0. The prior startup failure came from Vitest bundling `vite.config.ts` with esbuild in this environment. The config only expressed default test discovery; removing it lets Vitest use its built-in defaults and run the existing `src/**/*.test.ts` suite.

Frontend tests use Node's built-in test runner (`npm test`) for two smoke checks of the Application Portal route. They are not browser-rendered component or end-to-end tests.

## Database

`prisma migrate deploy` completed without pending migrations, and `prisma migrate status` confirmed the database schema is up to date with all three migrations. The target configured in the local environment is Render PostgreSQL in Oregon. This report does not establish that this region is authorized for Rwanda personal-data processing; confirm the applicable data transfer and residency requirements before handling applicant documents in production.

## Production readiness findings

The application compiles and its available automated checks pass. The portal should **not** be considered production-ready for real document processing or automatic institutional submissions yet:

- PDF text extraction/OCR is not implemented. Current extraction only previews plain-text documents.
- Remote object storage and an independently tested disaster-recovery process are not configured. Current document storage is local encrypted disk and requires durable, appropriately located storage before deployment.
- Retention cleanup is a user-triggered endpoint, not a scheduled and monitored archive/deletion job.
- Institutional connector records are staged disabled. No partner authorization, credential vault, connector-specific security review, or live application submission integration exists.
- The upload route fails closed when ClamAV is unavailable; production upload requires a reachable, maintained scanner.
- The two skipped backend test files cover integration/journey tests that require additional conditions or services; they were not counted as passing.
- Frontend checks are static smoke tests and TypeScript checking, not browser interaction or accessibility automation.

## Release decision

**Code verification: pass. Production launch for applicant document storage and external submission: not ready.** Resolve the storage location/authorization, durable encrypted object storage, malware scanning operations, scheduled retention, PDF extraction requirements, and institution-by-institution authorization before enabling those workflows for live applicants.
