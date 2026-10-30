# HDOS Rwanda™ — Human Development Intelligence Operating System

Turns human goals into trusted data, explainable recommendations, actionable roadmaps and measurable progress,
using official Rwanda statistics (Census 2022, Labour Force Survey 2024).

- `backend/` — Express + TypeScript + Prisma (PostgreSQL), JWT access tokens + rotating httpOnly refresh cookie
- `frontend/` — Next.js 15 (App Router), Tailwind, React Query
- `docs/API.md` — API contract shared by both
- `DEPLOYMENT.md` — run locally and host (Render Blueprint in `render.yaml`; no Docker required)
- `PROJECT_CONTEXT.md` — product brief

## Quick start

```bash
cd backend  && cp .env.example .env && npm ci && npx prisma migrate deploy && npm run seed && npm run dev
cd frontend && cp .env.example .env.local && npm ci && npm run dev
```

Open http://localhost:3000 and sign in with `student@hdos.local` / `DemoPass123` (development seed only).

See [DEPLOYMENT.md](DEPLOYMENT.md) for hosting instructions.
