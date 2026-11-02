// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Every seeded record points at one of these DataSource rows. `isDemo: true` means "illustrative / not verified
// against an official page". Each source note and docs/DATA_SOURCES.md define what was checked and when.

export interface SourceSeed {
  slug: string;
  name: string;
  publisher: string;
  url: string | null;
  license: string | null;
  publishedAt: Date | null;
  notes: string | null;
  isDemo: boolean;
}

const NISR_LICENSE = "CC BY 4.0 (per NISR site notice)";

export const SOURCES: SourceSeed[] = [
  {
    slug: "opportunity-in-rwanda",
    name: "Opportunity in Rwanda — job search",
    publisher: "Opportunity in Rwanda",
    url: "https://opportunity.ini.rw/",
    license: null,
    publishedAt: null,
    notes: "External job-search platform for Rwanda and beyond, with job search and applicant tools. HDOS links users to the provider; listing freshness and application requirements must be checked on the provider's site.",
    isDemo: false,
  },
  {
    slug: "unjobs-rwanda",
    name: "UNjobs — Rwanda duty station vacancies",
    publisher: "UNjobs",
    url: "https://unjobs.org/duty_stations/rwanda/",
    license: null,
    publishedAt: null,
    notes: "Third-party aggregator page for vacancies tagged to Rwanda, including UN and development organizations. Confirm each vacancy and application route with the named employer before applying.",
    isDemo: false,
  },
  {
    slug: "job-in-rwanda",
    name: "Job in Rwanda — job and tender listings",
    publisher: "Job in Rwanda",
    url: "https://www.jobinrwanda.com/jobs/search-result",
    license: null,
    publishedAt: null,
    notes: "Rwanda job board with vacancies and other postings. HDOS does not republish or verify individual listings here; review the source posting and employer before applying.",
    isDemo: false,
  },
  {
    slug: "reliefweb-jobs",
    name: "ReliefWeb — humanitarian jobs",
    publisher: "ReliefWeb / United Nations OCHA",
    url: "https://reliefweb.int/jobs",
    license: null,
    publishedAt: null,
    notes: "Humanitarian job listing service with country, career category, experience and closing-date fields. Filter for Rwanda and confirm the application details on the original posting.",
    isDemo: false,
  },
  {
    slug: "ingazi-skills",
    name: "Ingazi — courses and career skills",
    publisher: "Ingazi Rwanda",
    url: "https://www.ingazi.rw/",
    license: null,
    publishedAt: null,
    notes: "Rwanda youth learning and career platform describing free courses, certificates, job-readiness and links to career opportunities. Course availability and terms are set by Ingazi.",
    isDemo: false,
  },
  {
    slug: "rdb-registrar-general",
    name: "RDB Office of the Registrar General — business registration",
    publisher: "Rwanda Development Board (RDB), Office of the Registrar General",
    url: "https://org.rdb.rw/",
    license: null,
    publishedAt: null,
    notes: "Official Registrar General service for business registration and related registry services. This is a business formalization resource, not a grants or jobs listing.",
    isDemo: false,
  },
  {
    slug: "un-rwanda-jobs",
    name: "United Nations in Rwanda — jobs",
    publisher: "United Nations in Rwanda",
    url: "https://rwanda.un.org/en/jobs",
    license: null,
    publishedAt: null,
    notes: "Official UN in Rwanda jobs page with vacancies from UN entities. Each role has its own eligibility, deadlines and application route; check the vacancy notice.",
    isDemo: false,
  },
  {
    slug: "mifotra-recruitment-portal",
    name: "Rwanda Civil Service Recruitment Portal",
    publisher: "Ministry of Public Service and Labour (MIFOTRA)",
    url: "https://www.recruitment.mifotra.gov.rw/us/",
    license: null,
    publishedAt: null,
    notes: "Government recruitment portal for public-service vacancies and application guidance. Follow the requirements shown on each live vacancy.",
    isDemo: false,
  },
  // ───────────── NISR (statistics) ─────────────
  {
    slug: "nisr-rphc5-2022",
    name: "Fifth Population and Housing Census (RPHC5), 2022",
    publisher: "National Institute of Statistics of Rwanda (NISR)",
    url: "https://statistics.gov.rw/statistical-publications/population-size-and-population-characteristics",
    license: NISR_LICENSE,
    publishedAt: null,
    notes:
      "Resident population by residence, province and district (2022), sex shares, density, age structure. Transcribed from the published page; district totals are checked against the national total at seed time.",
    isDemo: false,
  },
  {
    slug: "nisr-lfs-2024-annual",
    name: "Labour Force Survey, Annual Report 2024",
    publisher: "National Institute of Statistics of Rwanda (NISR)",
    url: "https://statistics.gov.rw/data-sources/surveys/Labour-Force-Survey/labour-force-survey-2024",
    license: NISR_LICENSE,
    publishedAt: new Date("2025-03-29"),
    notes: "Annual 2024 aggregates and quarterly highlights. Counts are published by NISR as rounded 'around X million/thousand'.",
    isDemo: false,
  },
  {
    slug: "nisr-lfs-2024-q4",
    name: "Labour Force Survey, Q4 2024 (November 2024)",
    publisher: "National Institute of Statistics of Rwanda (NISR)",
    url: "https://statistics.gov.rw/data-sources/surveys/Labour-Force-Survey/labour-force-survey-2024/labour-force-survey-q4-2024",
    license: NISR_LICENSE,
    publishedAt: new Date("2025-01-25"),
    notes: "Quarterly indicators for November 2024 (participation, employment, unemployment by sex/age/residence, underutilisation, sector shares).",
    isDemo: false,
  },

  // ───────────── Regulators / ministries (verified official pages) ─────────────
  {
    slug: "hec-hli-register-2025",
    name: "HEC list of higher learning institutions operating in Rwanda (2025)",
    publisher: "Higher Education Council (HEC)",
    url: "https://www.hec.gov.rw/accredited-institutions",
    license: null,
    publishedAt: new Date("2025-05-11"),
    notes:
      "Institution existence/accreditation read from HEC's 'Heads of Higher Learning Institutions Operating in Rwanda 2025' document linked from the Accredited Institutions page. Districts and websites were added by HDOS editors from the institutions' public information; the HEC list itself gives contact details, not districts. Confirm on HEC before relying on accreditation status.",
    isDemo: false,
  },
  {
    slug: "rp-programmes-catalogue",
    name: "Rwanda Polytechnic programmes and colleges",
    publisher: "Rwanda Polytechnic (RP)",
    url: "https://new.rp.ac.rw/programmes/",
    license: null,
    publishedAt: null,
    notes:
      "Programme names, award levels (Bachelor of Technology / Advanced Diploma) and which RP colleges offer them are transcribed from RP's programmes page. The page does not state durations or entry requirements, so those are not stored (Bachelor of Technology duration is NULL; Advanced Diploma = 36 months because RP's LMS lists Years 1-3). College districts: Kigali=Kicukiro (stated by RP); others from public knowledge.",
    isDemo: false,
  },
  {
    slug: "hec-scholarships-2026",
    name: "HEC scholarship and study-loan announcements",
    publisher: "Higher Education Council (HEC)",
    url: "https://www.hec.gov.rw/updates/scholarships",
    license: null,
    publishedAt: null,
    notes:
      "Scholarship calls announced by HEC (Government Study Loan Jan 2027 intake, bilateral government scholarships, Commonwealth, EAC). Calls are cycle-specific and may have closed: deadlines are deliberately not stored. Always read the current announcement.",
    isDemo: false,
  },
  {
    slug: "mifotra-nep",
    name: "National Employment Programme (NEP) interventions",
    publisher: "Ministry of Public Service and Labour (MIFOTRA)",
    url: "https://jobportal.kora.rw/article/nepinterventions",
    license: null,
    publishedAt: null,
    notes:
      "NEP intervention list (rapid response training, short-term vocational training, apprenticeship, internships, recognition of prior learning, business advisory) as described on the NEP job portal; the page content is labelled 2018 and components may have changed. MIFOTRA's own site (mifotra.gov.rw) confirms the ministry and its Employment Ecosystem department.",
    isDemo: false,
  },
  {
    slug: "bdf-services",
    name: "Business Development Fund (BDF) services",
    publisher: "Business Development Fund (BDF Ltd)",
    url: "https://bdf.rw/",
    license: null,
    publishedAt: null,
    notes:
      "BDF (established 2011 by Government of Rwanda with BRD) services: loan guarantees, leasing, SACCO capacity building, agri investment, advisory, grants. Guarantee coverage figures are published on lmis.rw (50-75%) and in 2023 press; they change, so none are stored.",
    isDemo: false,
  },
  {
    slug: "risa-dap",
    name: "Digital Ambassadors Programme (DAP)",
    publisher: "Rwanda Information Society Authority (RISA) / MINICT",
    url: "https://www.risa.gov.rw/projects/digital-ambassadors-program",
    license: null,
    publishedAt: null,
    notes:
      "RISA describes DAP as an apprenticeship programme open to young graduates from secondary schools or tertiary institutions. Recruitment calls are periodic; check RISA/MINICT for current calls.",
    isDemo: false,
  },
  {
    slug: "rtb-official",
    name: "Rwanda TVET Board (RTB) website",
    publisher: "Rwanda TVET Board (RTB)",
    url: "https://www.rtb.gov.rw/",
    license: null,
    publishedAt: null,
    notes: "RTB's site links to Rwanda Coding Academy, Rwanda School of Creative Arts and Music, Rwanda Polytechnic and UR, which confirms those institutions exist in the TVET/HLI landscape.",
    isDemo: false,
  },
  {
    slug: "mineduc-official",
    name: "Ministry of Education (MINEDUC) website",
    publisher: "Ministry of Education (MINEDUC)",
    url: "https://www.mineduc.gov.rw/higher-learning-institutions",
    license: null,
    publishedAt: null,
    notes: "Context source for the higher-education landscape (HEC regulates universities; polytechnics fall under RP/RTB). Not used as the source of individual records.",
    isDemo: false,
  },
  {
    slug: "mifotra-labour-official",
    name: "MIFOTRA website",
    publisher: "Ministry of Public Service and Labour (MIFOTRA)",
    url: "https://www.mifotra.gov.rw/",
    license: null,
    publishedAt: null,
    notes: "Ministry site (employment ecosystem policy, Chief Skills Office, National Employment Policy validation news). No occupation-level demand ratings or salaries were found there during authoring.",
    isDemo: false,
  },
  {
    slug: "rdb-official",
    name: "Rwanda Development Board (RDB) website",
    publisher: "Rwanda Development Board (RDB)",
    url: "https://www.rdb.rw/",
    license: null,
    publishedAt: null,
    notes: "RDB lists investment sectors (agriculture, education, energy, financial services, GBS, health, ICT, infrastructure, manufacturing, mining, real estate & construction, tourism) and hosts business registration. Context only: not used as the source of individual records.",
    isDemo: false,
  },
  {
    slug: "minecofin-nst2-2024-2029",
    name: "National Strategy for Transformation (NST2) 2024-2029",
    publisher: "Ministry of Finance and Economic Planning (MINECOFIN)",
    url: "https://www.minecofin.gov.rw/fileadmin/user_upload/Minecofin/Publications/STRATEGIES/NST_2/NST2_2024-2029.pdf",
    license: null,
    publishedAt: new Date("2024-09-09"),
    notes:
      "Basis for Sector.nst2Priority: true only for sectors with an NST2 Economic Transformation pillar section (agri-food, industrial development, tourism, clean energy, transport, urbanisation/settlements, digital transformation, financial sector). Health and education are NST2 social-pillar areas and are left false because the flag here means 'economic-transformation sector'.",
    isDemo: false,
  },
  {
    slug: "institution-official-sites-2026",
    name: "Institution and provider official websites (checked 2026-10-30)",
    publisher: "Individual institutions / programme providers",
    url: null,
    license: null,
    publishedAt: null,
    notes:
      "Records read from the institution's or provider's own page during authoring: Kepler College (keplercollege.ac.rw: programmes, 3-year bachelor's, Kinyinya/Gasabo), Rwanda Coding Academy (rca.ac.rw: 3-year programme, Nyabihu-Mukamira), Carnegie Mellon University Africa via Mastercard Foundation page, Mastercard Foundation Scholars Program at UR (mcfsp.ur.ac.rw), Chevening, U.S. Embassy Fulbright call, DAAD EPOS, Erasmus+ EMJM, Tony Elumelu Foundation. Cycle-specific deadlines are not stored.",
    isDemo: false,
  },

  // ───────────── Illustrative (HDOS editorial; NOT verified) ─────────────
  {
    slug: "hdos-editorial-education",
    name: "HDOS editorial education catalogue (illustrative)",
    publisher: "HDOS Rwanda editorial team",
    url: null,
    license: null,
    publishedAt: null,
    notes:
      "Institutions in this group exist publicly but were not confirmed on an official HEC/RTB page during authoring (e.g. seen only in a third-party register compiled from HEC data). Programme names, durations and skill mappings are compiled from public information and may be out of date: confirm with the institution and HEC before relying on them. Not an official register.",
    isDemo: true,
  },
  {
    slug: "hdos-editorial-occupations",
    name: "HDOS editorial occupation & skills model (illustrative)",
    publisher: "HDOS Rwanda editorial team",
    url: null,
    license: null,
    publishedAt: null,
    notes:
      "Occupation requirements and skill levels are editorial estimates, not official statistics. Demand is UNKNOWN for every occupation because no official source with occupation-level demand ratings was found. No salary figures are stored. Replace with MIFOTRA/NISR labour-market data when available.",
    isDemo: true,
  },
  {
    slug: "hdos-editorial-opportunities",
    name: "HDOS editorial opportunities list (verify before applying)",
    publisher: "HDOS Rwanda editorial team",
    url: null,
    license: null,
    publishedAt: null,
    notes:
      "Well-known recurring programmes with links to the official provider that were NOT re-verified during this seed authoring (lastVerifiedAt stays NULL). Deadlines change every cycle and are intentionally not stored; always confirm on the provider's website.",
    isDemo: true,
  },
  {
    slug: "hdos-editorial-paths",
    name: "HDOS editorial learning paths & career roadmaps (illustrative)",
    publisher: "HDOS Rwanda editorial team",
    url: null,
    license: null,
    publishedAt: null,
    notes:
      "Step sequences are editorial guidance written by HDOS, not an official career framework. Month offsets are indicative only. Institution and programme names mentioned come from the catalogue (see each record's source); resource links point to public pages and may change.",
    isDemo: true,
  },
];

export const SOURCE_SLUGS = new Set(SOURCES.map((s) => s.slug));
