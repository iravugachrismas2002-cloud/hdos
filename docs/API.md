# HDOS Rwanda — API contract v1

Single source of truth shared by `backend/` and `frontend/`. All paths are under `/api`.
The browser always calls the **same origin** (`/api/...`); Next.js rewrites to the backend, so the
httpOnly refresh cookie never needs cross-origin credentials.

## Conventions

- Success: `{ "data": <payload> }`. Paginated lists add `"meta": { "page", "pageSize", "total" }`.
- Error: `{ "error": { "code": "SNAKE_CASE", "message": "Readable text", "details"?: [{ "field": "a.b", "message": "…" }] } }`
  with the right HTTP status (400 validation, 401 unauthenticated, 403 forbidden, 404, 409, 429, 500).
- Auth: `Authorization: Bearer <accessToken>`. The access token (15 min) is kept **in memory only**.
  The refresh token is an opaque, rotating, httpOnly cookie `hdos_rt` (path `/api`), so after a page
  reload the client calls `POST /auth/refresh` to obtain a new access token.
- On `401` with `error.code === "TOKEN_EXPIRED"` the client calls `/auth/refresh` once, then retries.
- IDs are strings (cuid). Dates are ISO-8601 strings. Money is integer RWF.

## Enums

- `Role`: `STUDENT | GRADUATE | JOB_SEEKER | ENTREPRENEUR | PROFESSIONAL | GOVERNMENT_ANALYST | ADMINISTRATOR`
  (self-registration allows only the first five).
- `EducationLevel`: `NONE | PRIMARY | LOWER_SECONDARY | UPPER_SECONDARY | TVET_CERTIFICATE | DIPLOMA | BACHELORS | MASTERS | DOCTORATE`
- `GoalCategory`: `EDUCATION | CAREER | ENTREPRENEURSHIP | SKILLS | INCOME | STUDY_ABROAD`
- `GoalStatus`: `ACTIVE | COMPLETED | PAUSED | CANCELLED`
- `StepStatus`: `TODO | IN_PROGRESS | DONE | SKIPPED`
- `OpportunityType`: `SCHOLARSHIP | INTERNSHIP | JOB | TRAINING | FELLOWSHIP | GRANT`
- `DemandLevel`: `LOW | MEDIUM | HIGH | VERY_HIGH | UNKNOWN`
- `InstitutionType`: `UNIVERSITY | POLYTECHNIC | TVET | ACADEMY | OTHER`

## Shared shapes

```ts
type SourceRef = { id: string; name: string; publisher: string; url: string | null; publishedAt: string | null; isDemo: boolean };
type User = { id: string; email: string; name: string | null; role: Role; emailVerified: boolean; avatarData: string | null; profileComplete: boolean };
```

## Auth

| Method & path | Body | Response |
|---|---|---|
| `POST /auth/register` | `{ email, password, name?, role? }` | `201 { data: { user, requiresVerification } }` |
| `POST /auth/login` | `{ email, password }` | `{ data: { accessToken, user } }` + sets `hdos_rt` |
| `POST /auth/refresh` | – (cookie) | `{ data: { accessToken, user } }`, rotates cookie; `401` if missing/invalid |
| `POST /auth/logout` | – | `204`, clears cookie, revokes token |
| `POST /auth/verify-email` | `{ token }` | `{ data: { message } }` (single use) |
| `POST /auth/resend-verification` | `{ email }` | `202` always (no account enumeration) |
| `POST /auth/forgot-password` | `{ email }` | `202` always |
| `POST /auth/reset-password` | `{ token, password }` | `{ data: { message } }` (single use, revokes all sessions) |
| `GET /auth/me` | – | `{ data: { user } }` |
| `DELETE /account` | `{ password }` | `204` – permanently deletes the account and all personal data (`403 INVALID_CREDENTIALS` on wrong password) |

Password policy: ≥ 8 chars, upper, lower, digit. Login for an unverified e-mail returns `403 EMAIL_NOT_VERIFIED`
when `REQUIRE_EMAIL_VERIFICATION=true`.

## Profile ("Life DNA")

`GET /profile` → `{ data: { profile: Profile | null } }`, `PUT /profile` → `{ data: { profile } }`

```ts
type Profile = {
  educationLevel: EducationLevel;
  districtId: string | null; districtName: string | null;
  birthYear: number | null;
  bio: string | null;
  avatarData: string | null;       // resized JPEG/PNG/WebP data URL, max 400 KB
  targetMonthlyIncomeRwf: number | null;
  skills: { skillId: string; name: string; level: 1 | 2 | 3 | 4 | 5 }[];
  sectorInterests: { sectorId: string; name: string }[];
  completeness: number;            // 0-100, shown to the user so they know what to fill in
  updatedAt: string;
};
```

`PUT` body: `{ educationLevel, districtId?, birthYear?, bio?, targetMonthlyIncomeRwf?, skills: {skillId, level}[], sectorIds: string[] }`
(replaces skills and interests atomically).

## Catalog (public, read-only, cacheable)

All list endpoints accept `page` (default 1) and `pageSize` (default 20, max 50) and return `meta`.


- `GET /catalog/districts` → `{ id, name, province }[]`
- `GET /catalog/sectors` → `{ id, code, name, nst2Priority }[]`
- `GET /catalog/skills?q=&category=` → `{ id, name, category }[]` (max 100)
- `GET /catalog/opportunity-sources` → curated external job, scholarship, skills and business-service links joined to their `DataSource` provenance records. The response describes directories, not synchronized vacancy data.
- `GET /catalog/occupations?q=&sectorId=&demand=` → `Occupation[]`
- `GET /catalog/occupations/:id` → `Occupation & { skills: { skillId, name, importance, requiredLevel }[] }`
- `GET /catalog/programs?q=&level=&districtId=&institutionType=` → `Program[]`
- `GET /catalog/opportunities?q=&type=&includeExpired=false` → `Opportunity[]`

```ts
type Occupation = {
  id: string; title: string; description: string | null;
  sector: { id: string; name: string; nst2Priority: boolean };
  minEducation: EducationLevel; demand: DemandLevel;
  salaryMinRwf: number | null; salaryMaxRwf: number | null;   // null = no verified figure (never invented)
  demandSource: SourceRef | null;
};
type Program = {
  id: string; name: string; level: EducationLevel; durationMonths: number | null; url: string | null;
  institution: { id: string; name: string; type: InstitutionType; district: string | null; website: string | null };
  skills: string[];
  source: SourceRef;
};
type Opportunity = {
  id: string; type: OpportunityType; title: string; provider: string; description: string | null;
  eligibility: string | null; minEducation: EducationLevel | null;
  deadline: string | null; isRolling: boolean; country: string | null; url: string | null;
  lastVerifiedAt: string | null; source: SourceRef;
};
```

## Insights (public, every figure carries provenance)

- `GET /insights/national` → `{ data: { indicators: Indicator[] } }`
- `GET /insights/districts` → `{ data: { year: number, source: SourceRef, districts: DistrictStat[] } }`
- `GET /insights/sources` → `{ data: SourceRef[] }`

```ts
type Indicator = { code: string; name: string; unit: string; value: number; period: string; geography: string; source: SourceRef };
type DistrictStat = { districtId: string; name: string; province: string; population: number; urbanPopulation: number; urbanShare: number };
```

Indicator codes include `LFS_UNEMPLOYMENT_RATE_Q4_2024`, `LFS_LFPR_2024`, `LFS_EMPLOYED_2024`, `LFS_UNEMPLOYED_2024`,
`LFS_SHARE_AGRICULTURE_Q4_2024`, `LFS_SHARE_INDUSTRY_Q4_2024`, `LFS_SHARE_SERVICES_Q4_2024`, `LFS_EPR_YOUTH_Q4_2024`,
`LFS_EPR_ADULT_Q4_2024`, `LFS_EPR_MALE_Q4_2024`, `LFS_EPR_FEMALE_Q4_2024`, `CENSUS_POPULATION_2022`, `CENSUS_MEDIAN_AGE_2022`, `CENSUS_URBAN_SHARE_2022`.

## Goals, recommendations, roadmap (owner-only)

- `GET /goals` → `{ data: Goal[] }` · `POST /goals` · `GET /goals/:id` · `PATCH /goals/:id` · `DELETE /goals/:id` (204)
- `GET /goals/:id/recommendations` → `{ data: Recommendations }`
- `POST /goals/:id/roadmap` → generates (or regenerates, replacing steps) → `{ data: { roadmap } }`
- `GET /goals/:id/roadmap` → `{ data: { roadmap: Roadmap | null } }`
- `PATCH /goals/:id/roadmap/steps/:stepId` `{ status: StepStatus }` → `{ data: { step, progress } }`
- `POST /goals/:id/explain` → `{ data: Explanation }` (AI narrative grounded on the engine's evidence)

`POST /goals` body: `{ title, category, description?, targetDate?, targetOccupationId? }`.

```ts
type Goal = {
  id: string; title: string; description: string | null; category: GoalCategory; status: GoalStatus;
  targetDate: string | null; targetOccupation: { id: string; title: string } | null;
  progress: number | null;            // 0-100 from roadmap steps, null when no roadmap yet
  createdAt: string;
};
type Roadmap = {
  id: string; goalId: string; summary: string; engineVersion: string; generatedAt: string;
  progress: number; steps: RoadmapStep[];
};
type RoadmapStep = {
  id: string; order: number; phase: string; title: string; description: string;
  kind: "EDUCATION" | "SKILL" | "EXPERIENCE" | "APPLY" | "MILESTONE";
  monthOffset: number; status: StepStatus;
  ref: { type: "PROGRAM" | "OPPORTUNITY" | "SKILL" | "OCCUPATION"; id: string; label: string } | null;
};
type Recommendations = {
  engineVersion: string; generatedAt: string; profileCompleteness: number;
  occupations: OccupationMatch[]; programs: ProgramMatch[]; opportunities: OpportunityMatch[];
  notes: string[];                    // e.g. "Add skills to your profile for sharper matches"
  disclaimer: string;
};
type Evidence = { label: string; value: string; source: SourceRef | null };
type OccupationMatch = {
  occupation: Occupation;
  fitScore: number;                   // 0-100 — the HDOS Pathway Fit Index
  band: "STRONG" | "PROMISING" | "STRETCH";
  confidence: "LOW" | "MEDIUM" | "HIGH";   // depends on profile completeness & data provenance
  components: { skillCoverage: number; educationReadiness: number; marketDemand: number; nationalPriority: number; interest: number }; // each 0-1
  missingSkills: { skillId: string; name: string; importance: number; requiredLevel: number; currentLevel: number }[];
  reasons: string[]; evidence: Evidence[];
};
type ProgramMatch = { program: Program; score: number; closesGaps: string[]; reasons: string[] };
type OpportunityMatch = { opportunity: Opportunity; score: number; eligibleNow: boolean; reasons: string[] };
type Explanation = { text: string; generatedBy: "ai" | "template"; model: string | null; disclaimer: string };
```

## Analytics & administration

- `GET /analytics/overview` (`GOVERNMENT_ANALYST | ADMINISTRATOR`) → privacy-safe aggregates. Any cell with fewer than
  `ANALYTICS_MIN_COHORT` (default 10) people is returned as `null` with `suppressed: true`.
  `{ data: { totalUsers, usersByRole: Cell[], goalsByCategory: Cell[], goalsByDistrict: Cell[], topTargetOccupations: Cell[] } }`
  where `Cell = { key: string; count: number | null; suppressed: boolean }`.
- `GET /admin/users?page=` (`ADMINISTRATOR`) → `{ id, email, name, role, emailVerified, createdAt }[]`
- `PATCH /admin/users/:id/role` `{ role }` (`ADMINISTRATOR`) – cannot demote yourself; audited.
- `GET /admin/audit-log?page=` (`ADMINISTRATOR`) → `{ id, action, actorId, targetId, ip, createdAt }[]`
- `GET /health` (not under `/api`) → `{ status: "ok", db: "up" | "down" }`
