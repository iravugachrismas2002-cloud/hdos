# HDOS Rwanda — User Manual

## 1. What HDOS is

HDOS Rwanda (Human Development Intelligence Operating System) helps a person turn goals into
practical education, career, skills, and opportunity pathways. It combines the information a user
chooses to provide with Rwanda reference data and explains why a recommendation is shown.

HDOS is decision support. It does not guarantee admission, employment, funding, or acceptance by
an opportunity provider.

## 2. Opening the platform

1. Open the public HDOS web address.
2. Wait for the application to finish loading. Render's free services may sleep after inactivity,
   so the first request can take longer while the services wake up.
3. Use **Register** to create an account, or **Login** for an existing account.
4. Verify the email address when email verification is enabled.
5. If the screen remains loading during a cold start, wait and retry once. Do not repeatedly submit
   a password or registration form.

## 3. Creating an account

Register with:

- Your name.
- A valid email address.
- A strong password that meets the password rules shown by the form.
- The role that best describes your current situation.

Available self-selected roles are Student, Graduate, Job seeker, Entrepreneur, and Professional.
Government Analyst and Administrator roles are controlled by an authorized administrator.

Never share your password, refresh-cookie, verification link, or reset link.

## 4. Building your Life DNA profile

Open **Life DNA** or **Profile** from the left navigation. This is the most important step for
useful recommendations.

Complete the following:

1. **Profile photo** — upload a JPEG, PNG, or WebP image. The browser resizes it before saving.
   The API validates the image and stores only the profile thumbnail. You can remove it later.
2. **Highest education** — select the highest completed level.
3. **District** — select your district if you want location-aware context.
4. **Birth year** — optional.
5. **Target monthly income** — optional, in RWF.
6. **Short bio** — optional; describe your background and direction.
7. **Skills** — add skills and rate each from 1 to 5.
8. **Sector interests** — select the sectors that interest you.

Select **Save profile** after changes. The completeness score shows how much information is
available for matching. Saving the profile invalidates cached recommendation results so later
recommendations use the newest profile information.

The profile photo helps account identity and application readiness. It is not used as a
recommendation signal.

## 5. Understanding the dashboard

The dashboard is the starting point for the user's journey:

- **Command centre** — summary of goals, progress, profile completeness, and next actions.
- **Goals & roadmap** — create goals and follow generated steps.
- **Life DNA** — edit personal matching information.
- **Opportunities** — browse available opportunities and apply filters.
- **Workforce insights** — inspect workforce and Rwanda reference indicators.
- **Ask HDOS AI** — ask for guidance when an AI provider is configured; otherwise HDOS may use
  rule-based fallback guidance.
- **Applications** — track application status and required documents.
- **Settings** — change language, theme, accessibility preferences, profile photo, and account
  privacy actions.

## 6. Finding opportunities

Open **Opportunities** and use the available filters for type, location, deadline, and other
catalogue fields. Review:

- Provider and title.
- Description and eligibility.
- Deadline or rolling status.
- Source and verification information.
- The provider's external application link.

An HDOS match is preliminary guidance. Confirm final eligibility and submit through the provider's
official process.

## 7. Goals and recommendations

Create a goal with a clear title, category, description, and target date where applicable. A goal
can include a target occupation. Recommendations use relevant profile skills, education, interests,
market demand, and available catalogue data.

Recommendation results may include:

- Occupations with fit scores and confidence.
- Education programmes that close identified gaps.
- Opportunities with reasons and eligibility indicators.
- Missing skills and suggested next steps.
- Evidence and source references.

The system should be treated as an explainable starting point, not as an automatic decision-maker.

## 8. Roadmaps and progress

Open a goal and generate or review its roadmap. Roadmap steps can include education, skills,
experience, applying, and milestones. Mark steps as progress changes. Revisit a roadmap after
updating the profile because new skills, interests, or education can change the best next steps.

## 9. Applications and documents

Use **Applications** to track opportunities that you are preparing for or have submitted. On an
opportunity card, **Apply with HDOS AI** creates the application and matches confirmed documents
from your vault to the provider checklist. Review the resulting draft and submit only through the
provider's official channel; HDOS never submits an external application unattended.

The document vault supports controlled document workflows such as CVs, certificates, transcripts,
identity documents, recommendation letters, and other application evidence. Upload only documents
you are authorized to store. Review file name, category, expiry date, extraction status, and
verification state before attaching a document to an application.

Do not upload passwords, API keys, or unrelated private data. Uploaded document bytes are encrypted
and persisted with the application service database so they survive a service restart or redeploy.
A document may be retained when it is part of an application package.

## 10. Ask HDOS AI

Ask focused questions about goals, skills, programmes, opportunities, or next actions. AI answers
may be generated by a configured provider or by a built-in fallback. Always review source evidence,
dates, eligibility, and provider instructions.

Do not enter passwords, payment information, national identification numbers, or unnecessary
sensitive personal information into chat.

## 11. Settings and accessibility

Settings supports:

- English, Kinyarwanda, and French interface choices where translated text is available.
- Light, dark, or system theme.
- Larger text.
- Reduced motion.
- Deadline reminders.
- Profile photo upload and removal.
- Account deletion.

The interface preferences are stored in the current browser. Account and profile data are stored
on the HDOS service.

## 12. Administrator and government analyst access

Administrator and Government Analyst access is not self-granted. Authorized users may see
role-appropriate analytics and user-management surfaces. Analytics are subject to minimum cohort
rules to reduce disclosure of small groups. Administrators must not export, share, or reuse personal
data outside the approved purpose.

## 13. Multi-user performance and reliability

The current implementation supports concurrent users through:

- Stateless Express API request handling.
- PostgreSQL persistence through Prisma.
- Same-origin Next.js `/api/*` rewrites.
- Connection reuse through a process-level Prisma client.
- Bounded JSON request bodies.
- Separate rate limits for general API, authentication, chat, and AI traffic.
- Structured request logging and safe error envelopes.
- Graceful shutdown and a database-backed `/health` endpoint.
- CI lint, type-check, test, migration, and build gates.

Current default limits include:

- General API: 300 requests per minute per client IP.
- Authentication: 20 requests per 15 minutes per client IP.
- Chat: 40 requests per 15 minutes per client IP.
- AI calls: 30 requests per hour per client IP.

These are protection limits, not a capacity guarantee. The Render free plan can sleep and has
limited CPU, memory, and database resources. For a larger audience:

1. Use a paid or appropriately sized web service and PostgreSQL plan.
2. Run a measured load test against a staging environment before launch.
3. Move rate-limit state to a shared store if multiple backend instances are deployed.
4. Monitor latency, error rate, database connections, memory, and rate-limit responses.
5. Add caching or pagination for high-volume catalogue traffic.
6. Keep AI provider quotas and timeout budgets separate from ordinary user requests.
7. Verify backups and a rollback plan before schema changes.

No system can honestly promise zero errors or unlimited speed. The correct production target is a
tested capacity, monitored service, safe degradation, and a documented recovery process.

## 14. Troubleshooting

### The page is loading for a long time

The Render free service may be waking up. Wait 30–60 seconds and retry once. If it persists, check
the web service and API health endpoint.

### Login or registration fails

Check the email and password, confirm email verification if enabled, and retry after a cold start.
Repeated failures may trigger the authentication rate limit.

### Recommendations are empty or too general

Complete education, add at least three relevant skills with honest levels, choose sector interests,
and provide a goal. Check that the source catalogue contains current records.

### A document cannot be uploaded

Check the supported category, file type, size, expiry date, and whether the document is already
linked to an application. Do not retry an unsafe or corrupted file.

### Email is not arriving

The operator should verify SMTP configuration, run the opt-in backend diagnostic, check provider
logs, and inspect spam folders. The SMTP diagnostic is run locally with `npm run smtp:test` from
`backend/`; it must never be exposed as a public endpoint.

### A profile photo is not visible

Refresh the page, confirm the image is JPEG, PNG, or WebP, and upload it again from Settings or
Life DNA. The browser resizes the image and the API rejects invalid or oversized data.

### An error continues

Record the time, page, action, and visible error code without sharing passwords or tokens. The
operator should check `/health`, Render logs, database status, SMTP status, provider quotas, and
recent deployments.

## 15. Operator release checklist

Before release:

- Run backend lint, type-check, tests, and build.
- Run frontend lint, type-check, and build.
- Apply Prisma migrations to staging first.
- Confirm environment variables are set in the hosting provider.
- Confirm `APP_BASE_URL`, `CORS_ORIGINS`, and `BACKEND_URL` match the deployed URLs.
- Confirm SMTP delivery and email verification behavior.
- Confirm `/health` returns database status `up`.
- Review rate limits and expected traffic.
- Review source provenance and demo-data labels.
- Keep secrets out of Git and logs.

After release:

- Check the web page and login flow.
- Check profile saving and recommendation refresh.
- Check one document/application flow.
- Check Render web and API logs.
- Keep the release commit and migration identifiers for rollback investigation.

## 16. Support and project references

- [Project context](PROJECT_CONTEXT.md)
- [Engineering workflow](docs/WORKFLOW.md)
- [API contract](docs/API.md)
- [Deployment guide](DEPLOYMENT.md)
- [Data sources](docs/DATA_SOURCES.md)
