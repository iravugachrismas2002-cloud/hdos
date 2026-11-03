# HDOS Rwanda — Engineering Workflow

## 1. Understand the change

Read [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md), the relevant API contract, and the affected
frontend/backend modules. Confirm whether the request changes user data, authentication, database
schema, or deployment behavior.

## 2. Implement in the existing architecture

- Keep browser behavior in `frontend/`.
- Keep API, validation, business logic, and persistence in `backend/`.
- Add Prisma schema changes with a new ordered migration.
- Reuse existing API helpers, UI components, error envelopes, and authorization middleware.
- Keep personal data private and never commit secrets or uploaded files.

## 3. Verify locally

From `backend/`:

```text
npm run lint
npm run type-check
npm test
npm run build
```

From `frontend/`:

```text
npm run lint
npm run type-check
npm run build
```

Run the integration tests when `TEST_DATABASE_URL` points to a migrated and seeded test database.
Inspect `git diff --check` and confirm only intended files changed.

## 4. Review documentation

Update [docs/API.md](API.md) for contract changes, [DEPLOYMENT.md](../DEPLOYMENT.md) for hosting
changes, and [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) when product scope or architecture changes.
Keep demo, partial, planned, and verified behavior explicitly distinguished.

## 5. Release to Render

1. Commit the validated change with a concise message and the required co-author trailer.
2. Push the release branch to GitHub.
3. Push the same commit to `master`, the branch currently tracked by the Render Blueprint.
4. Watch the Render deployment and verify `/health` plus the affected web flow.
5. For database changes, confirm the migration is applied before testing the new endpoint.

Never force-push, reset shared history, expose secrets, or delete production data as part of routine
delivery.
