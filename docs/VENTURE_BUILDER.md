# HDOS Venture Builder™ — implementation reference

Venture Builder is a modular domain inside the existing HDOS backend (`backend/src/modules/venture-builder/`) and a
workspace in the existing frontend (`/venture-builder`). It reuses authentication, the AI provider chain
(`modules/ai/ai.service.ts`), the opportunity catalogue, the Application Portal, the document vault, `Sector`,
`District` and the shared `AuditLog`. It is **not** a separate service.

Source: [`Road  map guidance upgraded.pdf`](../Road%20%20map%20guidance%20upgraded.pdf) ("HDOS Venture Builder™ — Enhanced Product and Technical Integration Design").

## What is implemented

| Roadmap phase | Status | Where |
|---|---|---|
| 1 Foundation: workspace, ownership, stages | Done | `venture-builder.service.ts`, `venture-builder.lifecycle.ts` |
| 2 Discovery, assumptions, evidence | Done | `discovery/`, `validation/evidence.service.ts` |
| 3 Experiments and market validation | Done | `validation/experiment.service.ts`, `validation.engine.ts` |
| 4 Feasibility + readiness, Product Studio | Done | `assessment/`, `product-studio/` |
| 5 Business model + financial engine | Done | `financial/` |
| 6 Funding, team, ecosystem | Done (link-only ecosystem, consent-based collaborators) | `funding/`, `team/` |
| 7 Usage-based billing / paid services | **Not implemented** — see below | — |
| 8 Growth analytics | Done | `growth/` |
| HDOS AI `VENTURE_BUILDER` mode | Done | `modules/ai/modes.ts`, `chat.routes.ts`, `ai/venture-chat.ts` |

### Deliberately not built

- **Billing / wallet / paid services (phase 7, "commercialization").** The roadmap says to reuse the shared HDOS wallet
  and usage ledger, but this repository has no wallet, payment, credit or service-catalogue subsystem
  (`PROJECT_CONTEXT.md` lists payments as future work). The product owner has chosen to keep services free until a
  shared billing provider and pricing are selected. Creating a Venture Builder-specific wallet would contradict the
  roadmap, so nothing was added. Generation endpoints already accept an `Idempotency-Key` header and record a
  `VentureAiExecution`, which is the hook a future idempotent reserve/settle flow should attach to. No purchases,
  charges or simulated credits occur.
- **Expert/mentor network and consultation booking.** The roadmap marks this "later". Only the role catalogue
  (`GET /team/roles`) and consent-based collaborators exist. No expert, endorsement or introduction is ever generated.
- **Scraping or live sync of Innovate Rwanda, Hanga Central, RP ICT Innovation Center, Rwanda LMIS, or other
  ecosystem providers.** These sources are link-only (`GET /ecosystem`) and their canonical `DataSource` records
  supply the displayed publisher, URL and seed-record timestamp. That timestamp is not a live check of the external
  page. The product owner chose to keep these integrations link-only until authorized source access and consented,
  verified mentor records are supplied. No call from the ecosystem list is shown as open. Funding matches come from the existing `Opportunity`
  catalogue and are shown as `OPEN` only when not expired and verified within 180 days.
- **Ownership transfer** between users.

## Safety rules the code enforces

- A non-member always receives `404 VENTURE_NOT_FOUND` for a venture id (never 403), so guessed ids reveal nothing.
- Roles: `OWNER` all; `ADMIN` manage members + settings + edit; `EDITOR` edit; `CONTRIBUTOR` add evidence/results,
  update milestones; `VIEWER` read; `ADVISOR` read only the sections the owner shared (never `team` / `activity`).
- AI-drafted assumptions are always `UNTESTED`. `SUPPORTED`/`REFUTED` need recorded evidence (`409 ASSUMPTION_NEEDS_EVIDENCE`).
  Interview evidence without recorded consent has zero weight; a participant label cannot be stored without consent.
  A statistic requires a source (publisher + retrieval time).
- Readiness scores come only from `readiness.engine.ts`. Unknown dimensions are `null`, not zero. AI can only *explain* a
  stored assessment. Identical workspace state returns the identical stored assessment (`reused: true`).
- Illustrative/demo-source funding records are always `UNVERIFIED`, even if their seed metadata has a recent timestamp;
  they are never presented as active calls.
- External AI is used only when the venture's `aiProcessingConsent` is `true`; otherwise a built-in template answers
  (`aiStatus.status = "AI_SKIPPED"`). Every AI answer must parse against a Zod schema or it is discarded.
- Financial figures come only from `financial-engine.ts` (integer minor units, deterministic).
- Documents are linked by metadata only; bytes stay in the owner's encrypted vault and no URL is exposed.
- Member invites require the invitee's acceptance (consent). Role changes/invites/removals go to `VentureActivity` and `AuditLog`.

## Workspace tabs

The project workspace at `/venture-builder/:id` provides the section tabs backed by the API below:

- **Product Studio:** versioned specifications, feature backlog, and milestones. Generated specifications remain drafts until reviewed and approved.
- **Business model:** versioned customer/value/channel/cost notes and revenue streams, plus a side-by-side comparison of two to seven founder-entered revenue model options. Results are ordered for readability; HDOS does not select a model.
- **Financial:** founder-entered start-up, fixed, and variable cost items, deterministic scenarios, one-at-a-time sensitivity results, and saved scenario runs. Cost values are assumptions, not verified prices or forecasts.
- **Funding:** catalogue matches, a saved readiness checklist, and link-only ecosystem entries. A relevance match is not confirmed eligibility or an award.
- **Team & documents:** a curated role catalogue (not candidate matching), consent-based member invitations, advisor section sharing, and metadata-only links to the owner's document vault.
- **Growth:** manually recorded monthly KPIs with comparisons to available projections.
- **Activity:** paginated workspace event history. Advisors do not receive access to this section.

The interface hides or disables write controls according to the role matrix, but the backend remains authoritative for every operation. Advisor section requests are still enforced by the API.

## API

Prefix `/api/venture-builder`. Envelope `{ data }`; errors `{ error: { code, message, details? } }` (see `docs/API.md`).
All routes need `Authorization: Bearer`. `:id` is the venture id. Generation endpoints accept `Idempotency-Key` (8–80 chars).

### Not project-scoped
| Method & path | Notes |
|---|---|
| `GET /dashboard` | `{ ventures: ProjectListItem[], pendingInvitations, byStatus, total }` |
| `GET /team/roles` | role catalogue `{ key, title, competencies[], responsibilities[], estimatedInvolvement }[]` |
| `GET /ecosystem` | link-only ecosystem `{ id, name, role, officialUrl, integration:"LINK_ONLY", focus[], note, source:{name,publisher,url,retrievedAt,isDemo} }[]`; entries resolve their source from the seeded `DataSource` registry |
| `GET /invitations` | my pending invitations `{ id, projectId, projectName, invitedBy, role, sharedSections[] }[]` |
| `POST /invitations/:memberId/accept` / `…/decline` | invitee consent |

### Projects
| Method & path | Role | Body / result |
|---|---|---|
| `POST /projects` | any user | `{ name, ideaSummary?, problemStatement?, sectorId?, districtId?, currency?="RWF", startMode?: "OWN_IDEA"\|"DISCOVER", aiProcessingConsent?=false }` → `ProjectDto` (201) |
| `GET /projects` | any | `ProjectListItem[]` (`ProjectDto` + `counts`) |
| `GET /projects/:id` | member | `ProjectDetail` (see below) |
| `PATCH /projects/:id` | edit | partial create body (no `startMode`). Changing `aiProcessingConsent` needs owner/admin |
| `POST /projects/:id/status` | edit (pause/stop/archive: manage) | `{ toStatus, reason (3–500), evidenceIds?[] }` → `{ from, to, reason }`; `409 VENTURE_GATE_NOT_MET` with `details[].message` listing requirements |
| `GET /projects/:id/status-history` | member | `{ id, from, to, changedById, reason, evidenceIds[], createdAt }[]` |
| `GET /projects/:id/activity?page=&pageSize=` | not advisor | paginated `{ id, actorId, action, summary, entityType, entityId, createdAt }[]` + `meta` |
| `GET /projects/:id/export` | owner | complete JSON export |

`ProjectDto`: `{ id, name, ideaSummary, problemStatement, sector:{id,name}|null, district:{id,name}|null, country, currency, status, startMode, aiProcessingConsent, launchedAt, createdAt, updatedAt, myRole, sharedSections[] }`.

`ProjectDetail` = `ProjectDto` + `{ stage:{key,label,index}, lifecycle:{ reachedStage, nextStage|null, nextStageRequirements[] }, counts:{ assumptions:{total,untested,supported,refuted}, evidence, experiments, segments, competitors, features, milestones, members }, nextActions[], risks[], latestAssessment:{version,overallScore,overallCoverage,createdAt}|null }`. Advisors get `ProjectDto + { detailRestricted:true }`.

Lifecycle: `DRAFT → DISCOVERY → VALIDATING → VALIDATION_REVIEW → FEASIBILITY_REVIEW → MVP_PLANNING → BUILDING → PILOTING → LAUNCH_READY → ACTIVE`,
plus `PAUSED | STOPPED | ARCHIVED`. Stepping back is always allowed; moving forward is one stage at a time and gated.

### Discovery (section `discovery`)
- `POST /projects/:id/discovery` `{ mode:"OWN_IDEA"|"DISCOVER", ideaText?, sectorId? }` → report (201): `{ mode, generatedAt, aiStatus:{status:"AI_GENERATED"|"TEMPLATE_FALLBACK"|"AI_SKIPPED",provider,model,schemaValid,note}, summary, opportunityBrief:{problem,affectedCustomerGroups[],currentAlternatives[],potentialSolutions[],unansweredQuestions[]}, interviewQuestions[], recommendations[], draftAssumptions[] (saved, UNTESTED, origin AI_DRAFT), founderCapability, sectorLeads:[{sectorId,code,name,score,reasons[]}], facts:[{kind,statement,source:{name,publisher,url,retrievedAt,isDemo},caveat}], fundingLeads[], unknowns[], labels, replayed }`
- `GET /projects/:id/discovery` → latest report or `null`. `GET /projects/:id/ai-executions` → run history.

### Validation (section `validation`)
- Assumptions: `GET|POST /assumptions`, `PATCH|DELETE /assumptions/:aid`. Body `{ statement, category, riskLevel?, testMethod? }`; `status` on PATCH (`UNTESTED|TESTING|SUPPORTED|REFUTED|INCONCLUSIVE`). Categories: `PROBLEM CUSTOMER MARKET WILLINGNESS_TO_PAY TECHNICAL FINANCIAL OPERATIONAL DIFFERENTIATION TEAM`.
- Sources: `GET|POST /sources` `{ title, publisher, url?, publishedAt?, retrievedAt, notes? }` (publisher and retrievedAt required).
- Evidence: `GET /evidence?assumptionId=`, `POST /evidence`, `PATCH /evidence/:eid`. `POST` body `{ assumptionId?, experimentId?, evidenceType, direction?, description, sourceId?, documentId?, respondentLabel?, consentGiven?, verificationStatus?, observedAt? }`. `evidenceType`: `INTERVIEW SURVEY EXPERIMENT_RESULT OFFICIAL_STATISTIC DOCUMENT OBSERVATION COMPETITOR_RESEARCH TEST_ORDER OTHER`. `direction`: `SUPPORTS|CONTRADICTS|NEUTRAL`. `verificationStatus`: `USER_REPORTED|SOURCE_LINKED|VERIFIED|DISPUTED` (VERIFIED/DISPUTED need editor+; SOURCE_LINKED needs a `sourceId`).
- Segments `GET|POST /segments`, `PATCH|DELETE /segments/:itemId` `{ name, description?, size?, needs[], currentAlternatives? }`. Competitors `/competitors` `{ name, offering?, priceNote?, strengths?, weaknesses?, url? }`.
- Experiments: `GET|POST /experiments`, `PATCH /experiments/:experimentId`, `POST /experiments/:experimentId/results`. Create `{ assumptionId?, hypothesis, method, targetSample?, successCriteria, startDate?, endDate? }`; result `{ observation, metricName?, metricValue?, sampleSize?, outcome:"SUPPORTS"|"CONTRADICTS"|"INCONCLUSIVE", completeExperiment? }` (also creates evidence).
- `GET /validation-report` → `{ summary:{total,supported,refuted,inconclusive,testing,untested}, supported[], refuted[], uncertain[], untested[], interviews:{total,withConsent,withoutConsent}, gaps[], disclaimer }`; items carry `suggestion` (advisory only).

### Assessment (section `assessment`)
- `POST /assessment` → saved `Assessment` (201): `{ id, version, createdAt, engineVersion, inputsDigest, overallScore|null, overallCoverage(0-1), provisional, maturity:{key,label,index}, dimensions:[{key,label,weight,score|null,coverage,evidence:{supports,contradicts,usable},openAssumptions,missing[]}], feasibility:[{key,label,question,status:"UNKNOWN"|"WEAK"|"MODERATE"|"STRONG",score|null,confidence,evidence,missingInformation[],risks[],outstandingTasks[]}], missingEvidence[], risks[], recommendations[], disclaimer, reused }`
- `GET /assessment` → `{ latest, history[] }`. `GET /assessment/preview` → unsaved live readiness result. `POST /assessment/explain` → `{ assessmentVersion, explanation, nextSteps[], generatedBy:"ai"|"template", note }`.

### Product Studio (section `product`)
- `POST /mvp` generates a specification (201) → `{ id, version, status, generatedBy, changeNote, createdAt, content, replayed, aiNote }`. `GET /mvp` lists versions; `GET /mvp/:sid`; `PATCH /mvp/:sid` `{ content?: Partial<content>, status?: "DRAFT"|"APPROVED", changeNote? }` creates a **new version**; `GET /mvp/:sid/export` returns Markdown.
- `content` keys: `productVision, problemStatement, personas, userJourneys, productRequirements, mvpScope{included,excluded}, featurePriorities, userStories, acceptanceCriteria, functionalRequirements, nonFunctionalRequirements, technicalArchitecture, databaseDesign, apiCatalogue, developmentRoadmap, testingStrategy, prototypeRequirements, meta{generatedBy,evidenceWarnings[],basedOn}`.
- Features `/features` `{ title, description?, priority:MUST|SHOULD|COULD|WONT, status:TODO|IN_PROGRESS|DONE|BLOCKED, userStory?, acceptanceCriteria[] }`. Milestones `/milestones` `{ title, description?, dueDate?, status, assigneeId? }` (contributors may update milestones).

### Business model and financial (sections `business-model`, `financial`)
- `GET|POST /business-model` (each POST = new version) body `{ customerSegments[], valueProposition[], channels[], customerRelationships[], revenueStreams:[{type,description,pricingNote?}], keyActivities[], keyResources[], keyPartners[], costStructure[], notes? }`. Revenue types: `SUBSCRIPTION COMMISSION LICENSING TRANSACTION_FEE SERVICE_DELIVERY DIRECT_SALES B2B_CONTRACT`.
- `POST /business-model/compare` `{ currency?, horizonMonths?, startupCosts?, openingCash?, models:[{type,label?,pricePerUnit,unitsInMonth1,variableCostPerUnit,fixedCostsPerMonth,monthlyGrowthRate?}] (2–7) }` → `{ comparison[], note }` (nothing is auto-selected).
- Cost line items `GET|POST /financial/line-items`, `PATCH|DELETE …/:itemId` `{ kind:STARTUP_COST|FIXED_COST|VARIABLE_COST, label, amount, note?, evidenceId? }` (amounts in major units; fixed = per month, variable = per unit).
- `POST /financial-scenarios` `{ pricePerUnit, unitsInMonth1, monthlyGrowthRate?=0, openingCash?=0, horizonMonths?=12, currency?, costOfGoodsPerUnit?, adjustments? }` → `{ groupId, engineVersion, currency, scenarios:[{caseType:CONSERVATIVE|BASE|UPSIDE,adjustment,inputs,results}], sensitivity[], notes[] }`. `results`: `unitContribution, grossMarginPct, contributionMarginPct, breakEvenUnitsPerMonth, breakEvenRevenuePerMonth, operatingBreakEvenMonth, paybackMonth, totalRevenue, totalOperatingProfit, endingCash, lowestCash, lowestCashMonth, capitalRequired, runway:{status,months,note}, monthly[], warnings[]`. `GET /financial-scenarios` lists saved sets.

### Funding (section `funding`)
- `GET /funding-matches` → `{ matches:[{opportunityId,title,provider,fundingType,callStatus:"OPEN"|"EXPIRED"|"UNVERIFIED"|"STALE"|"DEADLINE_UNKNOWN",isActive,deadline,isRolling,lastVerifiedAt,country,officialUrl,eligibility,matchScore,matchReasons[],source,disclaimer}], summary, ecosystem[], notes[] }`. To apply, call the existing `POST /api/applications { opportunityId }`.
- `POST /funding-readiness` → `{ id, version, checks:[{key,label,met,detail}], metCount, totalChecks, missing[], disclaimer }` (a checklist, not a prediction).

### Team and documents
- `GET /members`, `POST /members { email, role: ADMIN|EDITOR|CONTRIBUTOR|VIEWER|ADVISOR, sharedSections?[] }` (invitee must accept), `PATCH /members/:mid { role?, sharedSections? }`, `DELETE /members/:mid` (owner/admin remove others; anyone may leave).
- `GET|POST /documents { documentId, label }`, `DELETE /documents/:lid` — links a vault document (metadata only).
- Section ids for sharing: `overview discovery validation assessment product business-model financial funding growth team documents activity`.

### Growth (section `growth`)
- `POST /growth/kpis { period:"YYYY-MM", metric, value, note? }` (upsert). Metrics: `LEADS ACTIVE_CUSTOMERS CUSTOMER_ACQUISITION_COST REVENUE REPEAT_PURCHASES RETENTION_RATE GROSS_MARGIN MONTHLY_OPERATING_COSTS CASH_RUNWAY_MONTHS COMPLAINTS DELIVERY_TIME_DAYS`.
- `GET /growth` → `{ currency, launchedAt, hasProjection, periods:[{period,actuals[],projectedMonth,comparisons[],insights[]}], notes[] }`. Actuals are never mixed into projections.

## HDOS AI integration

`POST /api/chat` accepts an optional `ventureId`. Intent detection (`modules/ai/modes.ts`) chooses one of the eight modes
(`GENERAL_ASSISTANT … APPLICATION_ASSISTANT`); `VENTURE_BUILDER` and `FINANCIAL_INTELLIGENCE` load saved venture context.
The reply includes `mode` and `ventureId`; chat rows store both (`ChatMessage.mode/ventureId`, nullable columns). The same
conversation history is shared across modes. Chat is read-only: it cannot create records, spend, pay or submit anything.

## Database

New tables are prefixed `Venture*` (migration `20261109000000_venture_builder`, additive only; two nullable columns were
added to `ChatMessage`). Existing entities are reused: `User`, `Sector`, `District`, `Opportunity`, `ApplicantDocument`.
Deleting an account cascades to ventures that user owns (like every other user-owned record).

## Tests

`backend/src/__tests__/ventureEngines.test.ts` covers deterministic readiness and financial calculations, evidence and
consent rules, lifecycle gates, funding-call freshness, role visibility and MVP uncertainty labels. The repository does
not currently include Venture Builder HTTP integration tests. Cross-user API isolation and persisted lifecycle flows
still need verification against a migrated test database; set `TEST_DATABASE_URL` before adding/running those tests.
