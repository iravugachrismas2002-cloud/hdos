# HDOS Rwanda: data sources and verification status

Every seeded record points to a `DataSource` row (`backend/src/seed/data/sources.ts`). `isDemo = true` means the
record is **illustrative / not verified** against an official page. "Verified" below means: read on the cited
official page while the seed was authored (**2026-10-30**, except rows with later check dates below). Nothing here
has been signed off by the institutions or ministries themselves.

The API exposes each source's `retrievedAt`, `publishedAt`, `license`, and editorial `notes` fields. The
retrieval date is when HDOS last loaded the record, not the period described by the dataset. Eligibility and
document checks remain review-required unless the applicant confirms their profile and checks the provider's
current announcement.

Ground rules applied to all data:

- No salary figures are stored anywhere (`salaryMinRwf` / `salaryMaxRwf` are forced to NULL by the seed).
- No opportunity deadlines are stored (they change every cycle). Cycle information appears only in free text.
- Occupation `demand` is `UNKNOWN` for **every** occupation: no official source with occupation-level demand
  ratings was found, and guessed demand must not look official.
- `Opportunity.lastVerifiedAt` is set (to the seed run date) only for records marked `verified` in
  `data/opportunities.ts`; the rest stay NULL.

## Source register

| Slug | Publisher | URL | Covers | Status | Still to verify |
| --- | --- | --- | --- | --- | --- |
| `nisr-rphc5-2022` | NISR | https://statistics.gov.rw/statistical-publications/population-size-and-population-characteristics | District populations, urban/rural, sex, density, median/mean age, growth | **Verified official** | Re-read when NISR revises; all 30 district rows re-checked against the page |
| `nisr-lfs-2024-annual` | NISR | https://statistics.gov.rw/data-sources/surveys/Labour-Force-Survey/labour-force-survey-2024 | Annual 2024 labour-force aggregates, quarterly highlights | **Verified official** | Add the 2025 LFS when published; annual figures are rounded by NISR |
| `nisr-lfs-2024-q4` | NISR | https://statistics.gov.rw/data-sources/surveys/Labour-Force-Survey/labour-force-survey-2024/labour-force-survey-q4-2024 | Q4 (Nov 2024) participation, employment, unemployment by sex/age/residence, underutilisation, sector shares | **Verified official** | Add later quarters; NEET rate and median-age-by-region were not read on these pages so are not seeded |
| `hec-hli-register-2025` | Higher Education Council | https://www.hec.gov.rw/accredited-institutions | Existence of 21 institutions in HEC's 2025 "Heads of Higher Learning Institutions" list | **Verified official** (existence); districts/websites are editor-added | Accreditation status per programme; districts for institutions left NULL; HEC list pages beyond the first 19 entries were only partly read |
| `rp-programmes-catalogue` | Rwanda Polytechnic | https://new.rp.ac.rw/programmes/ | 8 RP colleges; 36 Advanced Diploma and 22 Bachelor of Technology programmes with offering colleges (120 programme records) | **Verified official** (names, levels, colleges) | Durations (only Advanced Diploma = 36 months, inferred from RP's LMS Y1-Y3), entry requirements, intakes, short courses. Page lists a "Diploma" tab identical to Advanced Diploma; treated as duplicate. Domain `new.rp.ac.rw` may move to `rp.ac.rw` |
| `hec-scholarships-2026` | HEC | https://www.hec.gov.rw/updates/scholarships | Government Study Loan (Jan 2027 intake), bilateral scholarships (Algeria, Morocco, JICA, China), EAC Phase II | **Verified official** (that each call was announced) | Full eligibility/levels for the bilateral calls (only titles read); next-cycle dates. Loan call closed 21 Oct 2026 |
| `opportunity-in-rwanda`, `unjobs-rwanda`, `job-in-rwanda` | External vacancy directories | See linked pages in `sources.ts` | Job, NGO and UN vacancy discovery | **Directory pages checked 2026-11-02**; not individual opportunity verification | Confirm each listing, deadline and application channel with the original employer |
| `un-rwanda-jobs` | United Nations in Rwanda | https://rwanda.un.org/en/jobs | Official UN entity vacancy page for Rwanda | **Verified official page** | Individual vacancy requirements and dates change |
| `mifotra-recruitment-portal` | MIFOTRA | https://www.recruitment.mifotra.gov.rw/us/ | Rwanda civil-service vacancies and application instructions | **Verified government portal** | Active vacancies and requirements change |
| `ingazi-skills` | Ingazi Rwanda | https://www.ingazi.rw/ | Learning, skills and career resources for young people | **Verified provider page** | Current courses, access and certificate terms are controlled by Ingazi |
| `rdb-registrar-general` | RDB Office of the Registrar General | https://org.rdb.rw/ | Official business registration and registry services | **Verified official service page** | Registration requirements change; this is not a job or grant listing |
| `mifotra-nep` | MIFOTRA (NEP) | https://jobportal.kora.rw/article/nepinterventions | NEP interventions (rapid response, short-term vocational, apprenticeship, reconversion, RPL, internship, business advisory voucher) | **Verified official**, but the page text is labelled **2018** | Which components are active today; current NEP page on mifotra.gov.rw |
| `bdf-services` | Business Development Fund | https://bdf.rw/ | BDF mandate (est. 2011) and service list | **Verified official** (site text via search snippet; direct fetch failed from the authoring tool) | Current guarantee terms (not stored), eligibility per product |
| `risa-dap` | RISA / MINICT | https://www.risa.gov.rw/projects/digital-ambassadors-program | Digital Ambassadors Programme (apprenticeship for young graduates) | **Verified official** | Current recruitment call, stipend/terms (not stored) |
| `rtb-official` | Rwanda TVET Board | https://www.rtb.gov.rw/ | RTB site links to RCA, Rwanda School of Creative Arts and Music, RP, UR | **Verified official** (existence only) | RTB TVET school register (not imported); trade-test/certification routes |
| `mineduc-official` | MINEDUC | https://www.mineduc.gov.rw/higher-learning-institutions | Context for HLI landscape | Context only, no records depend on it | n/a |
| `mifotra-labour-official` | MIFOTRA | https://www.mifotra.gov.rw/ | Ministry site context | Context only | Occupation-level labour-market data (none found) |
| `rdb-official` | RDB | https://www.rdb.rw/ | Investment sector list; business registration; district business development units (via businessprocedures.rdb.rw) | Context + 1 opportunity record verified | Other RDB programmes; Chief Skills Office material |
| `minecofin-nst2-2024-2029` | MINECOFIN | https://www.minecofin.gov.rw/fileadmin/user_upload/Minecofin/Publications/STRATEGIES/NST_2/NST2_2024-2029.pdf | Basis for `Sector.nst2Priority` (NST2 Economic Transformation pillar sections) | **Verified** from the document's contents list and PM statement | Sector-level targets inside the PDF were not extracted. Health/education are NST2 social-pillar areas and are flagged `false` because the flag means "economic-transformation sector" |
| `institution-official-sites-2026` | Individual providers | (per record) | Kepler College (7 programmes), Rwanda Coding Academy (+programme), CMU-Africa programme names, Chevening, Fulbright (U.S. Embassy), Humphrey, DAAD EPOS, Erasmus Mundus, Mastercard Foundation Scholars at UR and CMU-Africa, Kepler scholarships, Tony Elumelu Foundation | **Verified on provider pages** | Cycle dates (never stored); CMU-Africa durations; exact current eligibility each cycle. DAAD/Erasmus/TEF pages were read through search snippets and the DAAD PDF |
| `hdos-editorial-education` | HDOS editorial | n/a | 5 institutions (RICA, VATEL, SJITC, MIPC, HAIP) seen only in a third-party register compiled from HEC data; 27 plausible programmes at real institutions (UR, AUCA, ULK, INES, UTB, UGHE, KP, PIASS, AIMS, VATEL, ISPG) | **Illustrative (`isDemo`)** | Confirm each institution on the HEC/RTB registers and each programme name, duration and campus with the institution |
| `hdos-editorial-occupations` | HDOS editorial | n/a | 52 occupations: descriptions, minimum education, skill importance/level (1-5) | **Illustrative (`isDemo`)** | Everything. Needs MIFOTRA/NISR occupation data, RTQF levels, and a defensible demand method |
| `hdos-editorial-opportunities` | HDOS editorial | n/a | Mastercard Foundation Scholars (generic), Commonwealth Scholarships | **Illustrative (`isDemo`)** | Official provider pages (links present, not re-read) |
| `hdos-editorial-paths` | HDOS editorial | n/a | 15 learning paths and 52 career roadmaps (402 steps) | **Illustrative (`isDemo`)** | Sequencing and month offsets are HDOS suggestions. Resource links (freeCodeCamp, MDN, Khan Academy, Kaggle, Cisco NetAcad, FAO, etc.) were not individually fetched; official Rwandan links (RP, RTB, HEC, BDF, RDB, RISA, MIFOTRA NEP) were |

## What is verified and what is not

**Verified official (isDemo = false):** NISR census and labour-force indicators and districts; existence of the HEC-listed
institutions; Rwanda Polytechnic's 8 colleges and 120 programme records; 29 of 31 opportunities (HEC calls, NEP components,
BDF, RDB advisors, DAP, RCA, Kepler, Mastercard Foundation at UR and CMU-Africa, Chevening, Fulbright, Humphrey,
DAAD EPOS, Erasmus Mundus, TEF).

**Illustrative (isDemo = true):** all occupations and their skill models; 27 programmes at UR/AUCA/ULK/INES/UTB/UGHE/KP/PIASS/AIMS/VATEL/ISPG;
5 institutions not confirmed on a register; 2 opportunities; every learning path and career roadmap.

## Known gaps and honest caveats

- **Districts** are not on HEC's list. They were added by editors from public knowledge. Institutions whose district was
  uncertain (UNILAK, CUR, UTB, MKU, UoK, EAUR, ALU, VATEL) are NULL rather than guessed.
- **Naming drift:** HEC's 2025 list calls UNILAK "Institute of Lay Adventists of Kigali (INILAK)", UTB "Rwanda Tourism
  University College (RTUC)" and lists "Mount Kigali University (MKU)". The seed uses the names the public uses;
  `Mount Kigali University` is how HEC currently lists the institution formerly known as Mount Kenya University Rwanda
  (the rename is not confirmed on an official page the authoring tool fetched).
- **Rwanda Polytechnic colleges** keep their old "IPRC ..." names in the catalogue for continuity; RP now calls them colleges.
- **NEET rate, median age by region, youth share by sector** were not found on the pages read, so they are not seeded.
- **NEP page is dated 2018.** The NEP components are real but their current status is unconfirmed.
- **Cycle-specific calls** (Government Study Loan Jan 2027 intake closed 21 Oct 2026; Mastercard Foundation at UR closed;
  Chevening 2027-28 closed; TEF 2026 closed 1 Mar 2026; Fulbright 2027-28 deadline was mid-2026) are described in text only.
- **Search-snippet reads:** BDF, DAP, Erasmus Mundus, DAAD, TEF, Fulbright and MCF details came from official pages surfaced by
  search results (the authoring tool could not always fetch the page directly). They should be re-read at launch.
- **Legacy rows:** seven earlier illustrative programmes replaced by verified RP/RCA records are deleted by the seed.
  Earlier illustrative records that were kept are unchanged in name.
- **Demand ratings:** all `UNKNOWN`. Earlier seed versions had editorial HIGH/MEDIUM guesses; they were removed.

## How to re-verify

1. `backend/src/seed/data/*.ts` are plain arrays; change a record's `source` to a verified slug only after reading the official page.
2. Set `verified: true` on an opportunity only after reading the provider page; the seed then sets `lastVerifiedAt`.
3. Run `cd backend && npx vitest run src/__tests__/seedData.test.ts`. It enforces: unique keys, valid references, no salary
   fields, https URLs, every occupation has a roadmap, contiguous step order, and that "verified" records use non-demo sources.
