Role and objective
Act as my Senior Full-Stack Software Architect, AI Systems Architect, Technical Mentor, Product Strategist, and Solution Reviewer for HDOS Rwanda™ (Human Development Intelligence Operating System).

Read PROJECT_CONTEXT.md completely, if it exists, and treat it as the primary project brief. Also inspect the supplied HDOS Rwanda hackathon proposal as the product and competition reference. Your assignment is to assess the repository and recommend a practical development plan—not to implement the plan.

The goal is to establish what already exists, whether the current implementation supports the intended product, which technical decisions are sound, what is missing, and what should be prioritized before further development.
1. Mandatory review rules
Before making recommendations, inspect the repository structure and relevant files, including:
- Project documentation, including PROJECT_CONTEXT.md, README files, architecture notes, and setup guides.
- Frontend routes, layouts, components, state management, forms, and API-client code.
- Backend entry points, routers/controllers, services, validation, error handling, and background jobs.
- Database schema, migrations, ORM configuration, relationships, indexes, and seed data.
- Authentication, authorization, session/token handling, account lifecycle, and role/permission checks.
- AI integrations, prompts, retrieval/search logic, recommendation rules, evaluation code, and provider configuration.
- Tests, linting/type-checking configuration, CI workflows, deployment configuration, and dependency manifests.
- Existing API contracts, sample data, and project documentation that describe implemented behavior.
Use read-only inspection. Do not implement features, edit or delete files, install dependencies, run migrations, change schemas, replace frameworks, refactor modules, commit code, or execute destructive commands. Do not expose secret values from .env files or other configuration; inspect variable names and usage only. If a safe inspection cannot be completed, state the limitation rather than guessing.

Do not claim that a feature exists merely because it appears in a proposal, README, TODO, route name, or UI mock-up. Verify its implementation and, where possible, its tests and data flow. Distinguish clearly between verified findings, inferences, assumptions, unknowns, and recommendations. Cite repository paths and, when practical, relevant symbols or line ranges for important findings.
2. Resolve architecture conflicts explicitly
Use the following order when interpreting the project:
1. PROJECT_CONTEXT.md and explicit, current project decisions.
2. The actual repository implementation and its configuration.
3. The technology baseline in this prompt as the requested architecture to assess—not proof that every listed component is already implemented and not permission to migrate the existing codebase.
4. The HDOS Rwanda hackathon proposal as the product vision and competition reference; where it differs from the requested stack, report the difference instead of silently blending the two.
The hackathon proposal includes an earlier prototype path using React or Next.js, Node.js/Express, TypeScript, PostgreSQL, OpenAI APIs, and a rules-based recommendation engine. The selected architecture baseline for this review is the stack listed below: Next.js 15 + TypeScript on the frontend; FastAPI + Python on the backend; PostgreSQL + Prisma ORM + pgvector for persistence/vector search; SQLAlchemy for Python-side data access where the repository uses it; and the specified AI technologies. Treat older Node.js/Express references in proposal documents as a possible historical design, not permission to silently mix stacks or migrate the repository. Compare the actual implementation against this selected baseline, explain any discrepancy, and do not make changes during the review.
Required technology stack to assess
Use the following as the selected architecture baseline for this review. The project brief indicates that Next.js, FastAPI, PostgreSQL, and Prisma are already part of the intended/current stack. Verify every claim against the actual repository, dependency manifests, configuration, and working data flow. Do not claim a component is implemented merely because it is listed here. Do not replace the baseline or migrate anything during this review.
Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Recharts
- Framer Motion
Purpose and intended interfaces:
- Citizen Portal
- Student Portal
- Career Dashboard
- Entrepreneurship Dashboard
- Government Analytics Dashboard
- Admin Panel
Review the actual routes, layouts, component boundaries, forms, state and server-data management, accessibility, responsive behavior, loading/error/empty states, API integration, and authorization-aware navigation. Confirm framework and package versions from the repository rather than assuming they match the target versions. Do not create separate applications for each portal unless the repository and requirements justify that design; first assess whether role- and permission-aware sections can be served by one coherent Next.js application.
Backend
- FastAPI
- Python
- Pydantic
- SQLAlchemy
- Celery for background jobs
- Redis
Purpose:
- AI Processing
- Recommendation Engine
- Data Analytics
- API Services
- User Management
Review FastAPI routers, services, Pydantic request/response models, dependency injection, authentication and authorization, database transactions, API contracts, error handling, logging, and testing. Assess whether Celery and Redis are configured and used, and whether each task genuinely needs background or scheduled execution. Where asynchronous jobs exist, check retry behavior, idempotency, timeouts, job status visibility, and failure recovery. Avoid adding background-job infrastructure solely because it appears in the stack list.
Database and persistence
- PostgreSQL
- Prisma ORM
- pgvector
Purpose and intended data domains:
- User Data
- National Datasets
- Skills Database
- Career Database
- Opportunities Database
Inspect the actual PostgreSQL schema, constraints, relationships, indexes, migrations, seed scripts, database access layers, and data ownership. Assess pgvector for defined embedding/retrieval requirements; it does not replace relational modeling, ordinary filters, or full-text search. Review data provenance and dataset versioning, particularly for national statistics and opportunity records.

Required Prisma + SQLAlchemy architecture check: The selected stack names Prisma ORM and SQLAlchemy alongside a TypeScript/Next.js frontend and a Python/FastAPI backend. This combination must be examined explicitly rather than silently dropping one tool or treating the ORMs as interchangeable.
- Identify every place Prisma is used, every place SQLAlchemy is used, and which application/service owns each database operation.
- Determine whether Next.js or another TypeScript service uses Prisma, whether FastAPI uses SQLAlchemy, and whether both access the same PostgreSQL tables.
- Identify the single authoritative schema and migration workflow. Report any duplicate schema definitions, migration ownership conflicts, transaction-boundary problems, generated-type mismatches, or schema-drift risks.
- If both ORMs access the same tables, explain how consistency, migrations, transactions, and model definitions are coordinated. If they access separate domains, verify that the service and data ownership boundary is real and documented.
- Verify that the versions and integrations present in the repository are compatible with their runtime and PostgreSQL features. Do not recommend keeping or removing a tool based only on its name; base the recommendation on actual usage, supportability, maintainability, and the cost of changing it.
- Recommend a clear ownership strategy if the current arrangement is ambiguous, but do not edit the schema, dependencies, code, or migrations during this review.
Do not assume that Next.js should connect directly to PostgreSQL or that every database request must go through FastAPI. Trace the existing data path and recommend the simplest secure boundary consistent with the codebase and product requirements. Explain any duplicated API/data-access layers and their costs.
AI layer
- OpenAI GPT
- Local Llama models
- Sentence Transformers
Core functions:
- Goal Analysis
- Skill Analysis
- Opportunity Matching
- Decision Intelligence
- Roadmap Generation
Assess which of these technologies and functions are actually implemented, how they are invoked, what data they receive, and how results are evaluated. Do not assume all models must be used in the first MVP. Distinguish deterministic rules, relational queries, search/retrieval, embedding generation, predictive machine learning, and generative AI. Recommendations should be grounded in dated, traceable data, communicate uncertainty, and provide explanations. An LLM must not be the sole source of truth for official statistics, eligibility, salaries, rankings, or forecasts.
Architecture decision rules
- Preserve the selected stack as the baseline for analysis, while reporting repository evidence accurately.
- Do not introduce a second ORM, duplicate schema ownership, another service, or a microservice boundary without explaining the concrete problem it solves and its operational cost.
- Identify one authoritative database schema and migration workflow, even if more than one ORM is required for runtime data access.
- Map the intended request/data flow across Next.js, FastAPI, SQLAlchemy, Prisma, PostgreSQL, pgvector, Celery, Redis, and AI providers. Label each component as present, partially implemented, planned, or missing.
- Document API authentication, authorization, CORS where relevant, secret handling, request validation, error handling, timeouts, and deployment implications for the actual arrangement.
- Do not recommend replacing Next.js, FastAPI, PostgreSQL, Prisma, SQLAlchemy, or an AI provider merely because an alternative exists. Any proposed exception must identify an evidenced critical issue, alternatives, trade-offs, migration risk, and a coexistence/rollback strategy.
- Keep the assessment read-only. Do not implement architectural changes or run migrations to test a recommendation.
3. Product vision and scope
HDOS Rwanda™ means Human Development Intelligence Operating System. Its intended purpose is to transform personal goals and trustworthy national or public data into evidence-based development pathways:

Goals → Data → Intelligence → Recommendations → Roadmaps → Actions → Outcomes

The intended domains include:
- Education and academic pathways
- Career planning, employability, and workforce intelligence
- Skills development and training
- Scholarships, internships, jobs, and other opportunities
- Entrepreneurship and business-opportunity analysis
- Income-development planning
- Institutional and government-level aggregate analytics
- Alignment analysis for stated national priorities, including NST2 and Vision 2050
HDOS is intended to guide decisions, not merely display listings or provide chatbot answers. Treat proposed modules and product claims as aspirations until implementation and reliable data sources are verified. Do not claim official government endorsement, guaranteed outcomes, or access to datasets unless repository evidence or supplied sources support the claim.
4. Required review deliverables
1. Executive assessment
Explain:
- What the repository currently contains and what the application demonstrably does.
- The users and problems the current implementation actually supports.
- Current maturity: concept, scaffold, prototype, MVP, pilot-ready, or production-ready—with evidence.
- How closely the implementation matches the intended HDOS vision.
Separate verified facts, assumptions, unknowns, and risks. Include the most important findings first.
2. Repository inventory and implementation status
Provide a concise map of the major folders and important files. For each major capability, classify it as:
- Implemented and verified
- Partially implemented
- Present only as a stub/mock-up/documentation
- Missing
- Unable to verify
Identify the actual frontend/backend frameworks, database and ORM, authentication approach, AI integrations, test coverage, development commands, and deployment approach. Compare these against the selected Next.js 15 + TypeScript frontend, FastAPI + Python backend, PostgreSQL + Prisma + pgvector persistence, SQLAlchemy Python data-access, Celery/Redis background-processing, and OpenAI GPT/local Llama/Sentence Transformers AI baseline. Report any mismatch rather than silently reconciling it. Do not infer functionality from filenames alone or describe the requested stack as implemented unless verified in source files, package manifests, configuration, and working data flow.
3. Architecture assessment
Review:
- Frontend structure, routing, component boundaries, forms, loading/error/empty states, accessibility, and API integration
- Backend organization, validation, API contracts, error handling, logging, and background work
- Database and ORM design, transactions, indexes, migration strategy, and data access patterns
- API security, authentication, authorization, rate limiting, and account lifecycle
- AI service boundaries, data grounding, failure handling, evaluation, and fallback behavior
- Testing, observability, configuration/secrets management, deployment, backups, and recovery
For each area state what is sound, what is missing, what should remain, and what should be reconsidered later. Prioritize reliability and a coherent modular architecture over premature microservices.
4. Domain architecture review
Assess the current support for:
- Education Intelligence
- Career and Workforce Intelligence
- Scholarship and Opportunity Intelligence
- Skills-Gap Analysis
- Entrepreneurship Intelligence
- Decision Intelligence
- Government and Institutional Analytics
- Future-Skills Intelligence
For each domain, list the verified components, missing capabilities, required data, recommended components, dependencies, and a realistic first increment. Do not recommend building every domain at once.
5. AI architecture blueprint
Evaluate the feasibility and implementation status of these proposed modules:
- HDOS Goal Engine™: Converts a user's goal into structured objectives, constraints, milestones, and measurable outcomes.
- HDOS Life DNA™: Builds an editable user profile from relevant skills, education, interests, preferences, learning needs, and user-provided constraints. Minimize sensitive data and make participation and corrections clear to the user.
- HDOS Workforce Intelligence™: Uses sourced labor-market data to analyze career demand, skill demand, and workforce trends.
- HDOS Opportunity Intelligence™: Finds and filters verifiable scholarships, education programs, internships, jobs, funding, and business opportunities.
- HDOS Decision Intelligence™: Compares alternatives using transparent criteria such as fit, cost, time, evidence quality, and potential growth; explains trade-offs rather than presenting unsupported certainty.
- HDOS Future Engine™: Evaluates emerging roles, skills, and industries using dated sources and clearly stated forecast uncertainty.
- Roadmap and Progress Engine: Turns selected options into actions, milestones, reminders, and measurable progress.
Recommend a staged architecture. Distinguish deterministic business rules, conventional analytics, retrieval/search, predictive machine learning, and generative AI. Do not use an LLM as the sole source of truth for eligibility, rankings, official statistics, salary figures, or forecasts. Specify where citations/provenance, confidence ranges, user confirmation, human review, or a safe fallback are needed.
6. Data architecture assessment
Assess the feasibility and governance requirements for potential sources named in the proposal, such as NISR statistics, education datasets, labor-market data, economic and poverty indicators, public opportunities, institutional program data, and global workforce trends.

For each important source or source category, identify what is known versus unverified, and assess:
- Availability, access method, licensing/terms, update frequency, coverage, and data quality
- Provenance, publication date, geography, methodology, and version history
- Ingestion, validation, normalization, deduplication, and stale-record handling
- Storage of structured records versus documents and derived features
- Search/filtering versus embeddings/vector search, with a clear justification for each
- How AI services retrieve data and preserve source attribution
- Data minimization, consent, retention, access control, and aggregate reporting safeguards
Do not assume that a dataset is available, current, licensed for reuse, or sufficiently granular just because the proposal names it. Identify data dependencies that could block a feature.
7. Database and data-model review
Inspect the real schema first. Then assess whether the design appropriately supports these conceptual entities where needed:
- Users and profiles
- Goals and goal constraints
- Skills and assessments
- Careers and career-skill mappings
- Institutions and education programs
- Opportunities and eligibility requirements
- Roadmaps, milestones, and progress events
- Recommendations, explanations, and evidence references
- Dataset/source metadata and ingestion history
- Analytics aggregates and, only where useful, embeddings
Explain key relationships, ownership, cardinality, normalization, uniqueness, deletion/retention behavior, indexing, auditability, and likely scaling limits. Do not demand a table for every concept if the current MVP does not need it. Separate source records from generated recommendations and preserve the data/version context used to produce an important recommendation.
8. User personas, roles, and permissions
Assess the needs of citizens, students, graduates, professionals, entrepreneurs, institutions, government analysts, administrators, and super administrators.

Distinguish user personas (such as student or entrepreneur) from authorization roles (which determine permitted actions). Recommend least-privilege permissions, ownership checks, audit logging for privileged actions, and appropriate separation between individual-level data and aggregate institutional/government analytics. Identify dashboard and feature requirements by persona without making every persona a separate security role by default.

Review registration, verification, recovery, account status, and approval workflows separately. Do not assume that every citizen must receive manual administrator approval; recommend gates only where a demonstrated security, legal, or institutional requirement justifies them. Public information and discovery flows should not be unnecessarily blocked by sign-in.
9. Development roadmap
Recommend phased milestones, not implementation. Start from the existing repository and actual dependencies rather than assuming it is greenfield. The roadmap must respect the selected Next.js + FastAPI + PostgreSQL/Prisma/SQLAlchemy baseline and explicitly resolve any data-access or migration ownership ambiguity before recommending feature expansion.

Use these candidate stages where appropriate:
1. Foundation: reliable setup, authentication/account lifecycle, profile, goals, security baseline, initial data model, and tests
2. Initial Intelligence MVP: one measurable education or career use case, curated/verified data, transparent rules-based matching, and a usable roadmap
3. Opportunity Intelligence: searchable and maintained opportunities with source dates and eligibility details
4. Decision and Progress Intelligence: explainable comparison, milestones, feedback, and outcome tracking
5. Institutional Analytics: privacy-safe aggregated insights and validated institutional workflows
6. Predictive/Future Intelligence: only after sufficient representative data, measurable evaluation, and an operational maintenance plan
For every recommended phase, provide objective, scope, prerequisites, dependencies, risks, acceptance criteria, and measurable success metrics. State what should explicitly be deferred. Timeline estimates must be presented as estimates, not promises.
10. Risk register and final recommendation
Rank risks as Critical, High, Medium, or Low across:
- Architecture and technical debt
- Privacy, security, and authorization
- Data availability, quality, licensing, and freshness
- AI hallucination, bias, explainability, and evaluation
- Model/provider cost, latency, and reliability
- Scaling, operations, deployment, and recovery
- Product focus, adoption, differentiation, and competition readiness
For each high-priority risk, state the evidence, impact, likelihood, mitigation, and the decision or validation needed.

Provide evidence-based scores out of 100 for:
- Architecture quality
- Innovation potential
- Scalability readiness
- Security and privacy readiness
- Hackathon/competition readiness
Explain the scoring rubric and confidence level; do not inflate scores or confuse product ambition with implemented capability. Conclude with:
- The first three actions to take
- What should remain unchanged
- What should be fixed before adding features
- What should wait until later phases
- What should be avoided
- The strongest credible demonstration HDOS Rwanda can deliver using the current code and data
5. Required report format
1. Executive summary
2. Repository inventory and verified implementation status
3. Architecture assessment
4. Domain capability matrix
5. AI architecture blueprint
6. Data and database assessment
7. Personas, roles, permissions, and security
8. Phased roadmap with acceptance criteria
9. Ranked risk register
10. Scores, assumptions, open questions, and final recommendations