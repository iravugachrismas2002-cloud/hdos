# HDOS Rwanda™

HDOS is a human-development intelligence platform that turns user goals and trusted Rwanda
reference data into explainable recommendations, roadmaps, opportunity discovery, and progress
tracking. Demo catalogue records are clearly identified in the database and must be replaced or
verified before a public launch.

## Repository structure

| Path | Responsibility |
| --- | --- |
| `frontend/` | Next.js 15 App Router, TypeScript, Tailwind, React Query, authenticated user experience |
| `backend/` | Express API, TypeScript, Prisma, PostgreSQL, authentication, domain services, AI and seed data |
| `backend/prisma/` | Authoritative PostgreSQL schema and ordered migrations |
| `docs/` | API contract, data-source notes, product roadmaps, and production-readiness records |
| `render.yaml` | Render Blueprint for the web app, API, and PostgreSQL |
| `.github/workflows/` | Continuous integration quality gates |

## Local workflow

1. Configure `backend/.env` from `backend/.env.example`.
2. Install backend dependencies, apply migrations, seed development data, and start the API.
3. Configure `frontend/.env.local` from `frontend/.env.example`.
4. Install frontend dependencies and start the Next.js app.
5. Open `http://localhost:3000`.

```powershell
Set-Location backend
npm ci
npx prisma migrate deploy
npm run seed
npm run dev

# In a second terminal
Set-Location frontend
npm ci
npm run dev
```

Development seed accounts use `DemoPass123`; they are never created in production.

## Quality gates

Run these commands from both `backend/` and `frontend/` before merging:

```text
npm run lint
npm run type-check
npm test
npm run build
```

The API integration tests additionally require a migrated and seeded `TEST_DATABASE_URL`.

## Deployment

Render deploys `backend/` and `frontend/` as separate Node.js services and applies Prisma migrations
on backend startup. See [DEPLOYMENT.md](DEPLOYMENT.md) for environment variables, verification,
rollback considerations, and alternative hosting.

## Canonical documentation

- [Project context](PROJECT_CONTEXT.md)
- [Engineering workflow](docs/WORKFLOW.md)
- [API contract](docs/API.md)
- [Data sources](docs/DATA_SOURCES.md)
- [Deployment guide](DEPLOYMENT.md)
