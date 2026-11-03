# HDOS Rwanda — Project Context

## Product purpose

HDOS Rwanda (Human Development Intelligence Operating System) helps people turn goals into
evidence-informed education, career, skills, and opportunity pathways. The platform combines a
user's profile with Rwanda reference data to produce explainable recommendations and practical
next steps.

## Current product scope

- Authentication with verified email, rotating refresh sessions, roles, and account deletion.
- A Life DNA profile containing education, district, birth year, bio, income target, profile photo,
  skills with levels, and sector interests.
- Opportunity, occupation, programme, institution, source, and workforce catalogue views.
- Explainable occupation and programme matching, opportunity discovery, goals, roadmaps, and progress.
- Document vault and application preparation workflows.
- Rule-based guidance with optional AI providers and an admin monitoring surface.

The profile fields that affect matching are education, skills, sector interests, district, income
target, and goals. Saving a profile invalidates stale recommendation queries so the next result uses
the latest information. Profile photos improve account identity and application readiness; they are
not used as a matching signal.

## Architecture

The repository is a two-service TypeScript system:

- `frontend/`: Next.js 15 App Router. The browser calls same-origin `/api/*` routes, which Next.js
  rewrites to the backend.
- `backend/`: Express API with Prisma and PostgreSQL. Prisma schema and migrations are authoritative.
- `docs/`: contracts and operational documentation.
- `render.yaml`: production service definitions.

The backend is intentionally not FastAPI/Python; all runtime services currently use TypeScript.

## Data and trust boundaries

- User authentication data and personal profile data are private to the authenticated user.
- Uploaded profile images are resized in the browser, validated by the API, and stored as profile data.
- Documents use the protected document-storage workflow and must not be copied into source control.
- Catalogue records and external sources must retain provenance and demo/verification status.
- Secrets belong only in ignored environment files or the hosting provider's secret store.

## Delivery principles

Inspect before editing, make small reversible changes, preserve existing behavior, validate with
tests/type checks/lint/build, and document claims against the implementation. Do not describe demo
data, planned capabilities, or optional AI integrations as production guarantees.
