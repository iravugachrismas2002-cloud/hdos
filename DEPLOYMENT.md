# HDOS Rwanda — Deployment guide

No Docker is used anywhere. Everything runs as plain Node.js 20 services plus PostgreSQL.

```
Browser ──► hdos-web (Next.js)  ──/api/* rewrite──►  hdos-backend (Express)  ──►  PostgreSQL
```

The browser only talks to the web app's origin; Next.js proxies `/api/*` to the backend, so the
httpOnly refresh cookie stays first-party (no cross-site cookie or CORS problems).

## 1. Run locally (Windows / macOS / Linux)

Requirements: Node.js 20+, a PostgreSQL 14+ server (installed natively, or a free Neon / Supabase database).

```bash
# backend
cd backend
cp .env.example .env            # set DATABASE_URL to your Postgres (a repo-root .env also works)
npm ci
npx prisma migrate deploy       # create tables
npm run seed                    # reference data + demo accounts (dev only)
npm run dev                     # http://localhost:5000  (GET /health)

# frontend (new terminal)
cd frontend
cp .env.example .env.local      # BACKEND_URL=http://localhost:5000
npm ci
npm run dev                     # http://localhost:3000
```

Demo accounts created by the dev seed (password `DemoPass123`): `admin@hdos.local`,
`analyst@hdos.local`, `student@hdos.local`. They are **never** created when `NODE_ENV=production`.

Quality gates (also run in CI): `npm run lint`, `npm run type-check`, `npm test`, `npm run build`
in both `backend/` and `frontend/`. Set `TEST_DATABASE_URL` to a migrated + seeded database to also run
the API integration tests.

## 2. Host it (recommended: Render, one click via Blueprint)

The repository contains `render.yaml`, which creates the database, API and web app.

1. Push this project to its own GitHub repository (see section 5).
2. Render dashboard → **New → Blueprint** → select the repository → **Apply**.
3. Render asks for the values marked `sync: false`. For the first pass enter:
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — your production administrator login (min. 12 chars).
   - `BACKEND_URL` (on `hdos-web`) — the URL Render will give `hdos-backend`, e.g. `https://hdos-backend.onrender.com`.
     If you do not know it yet, enter any `https://` placeholder and fix it in step 4.
   - `APP_BASE_URL` and `CORS_ORIGINS` (on `hdos-backend`) — the URL of `hdos-web`, e.g. `https://hdos-web.onrender.com`.
   - SMTP settings (see below) or `REQUIRE_EMAIL_VERIFICATION=false` for a demo without email.
4. After both services exist, open each service's **Environment** tab, set the real URLs, and
   **redeploy `hdos-web`** (`BACKEND_URL` is baked in at build time).
5. Verify: `https://<backend>/health` returns `{"status":"ok","db":"up"}`, then open the web URL and log in
   with the administrator account.

What happens on every backend start (`npm run start:prod`): `prisma migrate deploy` (applies new
migrations), the idempotent seed (reference data; creates the admin only if it does not exist and never
overwrites an existing password), then the server.

### Environment variables

| Service | Variable | Purpose |
| --- | --- | --- |
| backend | `NODE_ENV=production` | Enables secure cookies, strict secret check, email verification |
| backend | `DATABASE_URL` | Provided by Render from `hdos-db` |
| backend | `JWT_ACCESS_SECRET` | Auto-generated; must be 32+ chars or the server refuses to start |
| backend | `APP_BASE_URL` | Public web URL, used in email links |
| backend | `CORS_ORIGINS` | Comma-separated allowed web origins |
| backend | `TRUST_PROXY_HOPS` | Proxies in front of the API (default 2 in `render.yaml`). If every user shows the same IP in rate limiting, adjust by 1 |
| backend | `SMTP_HOST/PORT/USER/PASS/FROM` | Email delivery (Brevo, Mailgun, Resend SMTP, Gmail app password …) |
| backend | `REQUIRE_EMAIL_VERIFICATION` | Defaults to `true` in production. Without working SMTP, nobody can verify, so set `false` until email works |
| backend | `GEMINI_API_KEY` | Optional. Without it the app uses rule-based explanations |
| backend | `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Creates the first administrator |
| frontend | `BACKEND_URL` | Public URL of the backend (build time) |

### Free-tier caveats

- Render free web services sleep after ~15 min of inactivity (first request takes ~30–60 s).
- Render's free Postgres expires after 30 days. For a long-lived demo use a free [Neon](https://neon.tech) database
  instead: delete the `databases:` block and the `fromDatabase` reference in `render.yaml` and set `DATABASE_URL`
  to the Neon connection string (`?sslmode=require`).
- A paid plan (about US$7/month per service) removes sleeping.

## 3. Alternative: Vercel (web) + Render/Railway/Fly (API)

- **Web**: import the repo in Vercel, root directory `frontend`, env `BACKEND_URL=https://<your-api>`.
- **API**: any Node host with build `npm ci --include=dev && npm run build` and start `npm run start:prod`
  from the `backend` directory, plus the backend variables above. `CORS_ORIGINS` and `APP_BASE_URL` must be
  the Vercel URL.

## 4. Alternative: a single Linux VPS (no containers)

```bash
# Ubuntu: Node 20, PostgreSQL, nginx, pm2
sudo apt install -y postgresql nginx && sudo npm i -g pm2
sudo -u postgres psql -c "CREATE USER hdos WITH PASSWORD 'CHANGE_ME'; CREATE DATABASE hdos_db OWNER hdos;"

cd backend  && npm ci --include=dev && npm run build
NODE_ENV=production DATABASE_URL=... JWT_ACCESS_SECRET=$(openssl rand -hex 32) APP_BASE_URL=https://example.rw \
  CORS_ORIGINS=https://example.rw SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... pm2 start npm --name hdos-api -- run start:prod
cd ../frontend && BACKEND_URL=http://localhost:5000 npm ci --include=dev && BACKEND_URL=http://localhost:5000 npm run build \
  && pm2 start npm --name hdos-web -- start
pm2 save && pm2 startup
```

Point nginx at `127.0.0.1:3000` with TLS (`certbot --nginx`). In this setup the API is not exposed publicly
and `TRUST_PROXY_HOPS=2` is correct (nginx + Next.js rewrite).

## 5. Putting the project in its own GitHub repository

The folder currently sits inside a larger Git repository (your home directory) whose remote belongs to a
different project. Create a dedicated repository for HDOS:

```bash
cd hdos_rwanda
git init -b main
git add .          # .gitignore already excludes .env files, node_modules, builds
git commit -m "Initial HDOS Rwanda release"
git remote add origin https://github.com/<you>/hdos-rwanda.git
git push -u origin main
```

Check `git status` first and confirm no `.env` file is staged. If a real secret was ever committed, rotate it.

## 6. Production checklist

- [ ] `JWT_ACCESS_SECRET` is random and 32+ characters (never reuse the dev default).
- [ ] Administrator password set via `SEED_ADMIN_PASSWORD`; demo accounts do not exist in production.
- [ ] HTTPS everywhere (Render provides it automatically).
- [ ] `CORS_ORIGINS` lists only your real web origin(s).
- [ ] SMTP working: register a test user and receive the verification email.
- [ ] `/health` returns `db: up`; set up an uptime monitor on it (e.g. UptimeRobot) — this also keeps free instances warm.
- [ ] Database backups enabled (Render paid Postgres, or Neon point-in-time restore).
- [ ] Editorial catalogue data (occupations, programmes, opportunities) is flagged demo in the database — replace with verified data before a public launch.
