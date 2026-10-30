// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Opportunities relevant to Rwandans. `verified: true` means the provider's official page was read during seed
// authoring (2026-10-30) and the description/eligibility below only restate what that page said; the seed then
// sets lastVerifiedAt. `verified: false` records stay on the illustrative source with lastVerifiedAt NULL.
// Deadlines are NEVER stored (they change every cycle); mention of a closed cycle appears in the text only.
import type { OpportunitySeed } from "./types";

const OFFICIAL = "institution-official-sites-2026";
const HEC = "hec-scholarships-2026";
const NEP = "mifotra-nep";
const NEP_URL = "https://jobportal.kora.rw/article/nepinterventions";
const NEP_PROVIDER = "Ministry of Public Service and Labour (MIFOTRA)";
const HEC_URL = "https://www.hec.gov.rw/updates/scholarships";
const EDITORIAL = "hdos-editorial-opportunities";
const CMU_MCF_URL =
  "https://mastercardfdn.org/en/what-we-do/our-programs/mastercard-foundation-scholars-program/where-to-apply/carnegie-mellon-university-africa-cmu-africa/";

const bilateral = (country: string, title: string): OpportunitySeed => ({
  type: "SCHOLARSHIP",
  title,
  provider: "Higher Education Council (HEC), Rwanda",
  description: `Government-to-government scholarship call for study in ${country}, announced on HEC's scholarships page.`,
  eligibility: "Levels, fields and criteria differ for each call. Read the HEC announcement before applying.",
  minEducation: null,
  country,
  url: HEC_URL,
  isRolling: false,
  verified: true,
  source: HEC,
});

export const OPPORTUNITIES: OpportunitySeed[] = [
  // ───────── HEC / Government of Rwanda ─────────
  {
    type: "SCHOLARSHIP", title: "Higher Education Council scholarship information", provider: "Higher Education Council (HEC), Rwanda",
    description: "HEC's scholarships page lists current national and bilateral scholarship and study-loan calls for Rwandans.",
    eligibility: "Varies by scheme. Each announcement states its own criteria.", minEducation: "UPPER_SECONDARY", country: "Rwanda",
    url: HEC_URL, isRolling: true, verified: true, source: HEC,
  },
  {
    type: "SCHOLARSHIP", title: "Government Study Loan (study abroad in national priority areas)", provider: "Higher Education Council (HEC), Rwanda",
    description:
      "Competitive Government study loan for Rwandans admitted to a recognised foreign higher learning institution, at bachelor's, master's and doctorate levels. Awards depend on national priority areas, whether local institutions offer the programme, and budget.",
    eligibility:
      "Rwandan citizen with an admission letter from a recognised foreign institution. For the January 2027 intake call (applications 1-21 October 2026, now closed) the priority areas were aviation, health sciences, information technology, nuclear, sports and infrastructure; bachelor's applicants had to have completed Senior Six in 2026. Admission alone does not guarantee a loan. Watch HEC for the next call.",
    minEducation: "UPPER_SECONDARY", country: null, url: HEC_URL, isRolling: false, verified: true, source: HEC,
  },
  bilateral("Algeria", "People's Democratic Republic of Algeria - Rwanda Government Scholarships"),
  bilateral("Morocco", "Kingdom of Morocco - Government of Rwanda Scholarships"),
  bilateral("Japan", "JICA - Rwanda Government Scholarships"),
  bilateral("China", "China-Rwanda Government Scholarships"),
  {
    type: "SCHOLARSHIP", title: "EAC Scholarship Programme (Phase II)", provider: "Higher Education Council (HEC), Rwanda",
    description: "HEC announced a call for student applications to Phase II of the East African Community scholarship programme.",
    eligibility: "See the HEC announcement for levels, fields and criteria.", minEducation: null, country: "East African Community",
    url: HEC_URL, isRolling: false, verified: true, source: HEC,
  },
  {
    type: "SCHOLARSHIP", title: "Commonwealth Scholarships", provider: "Commonwealth Scholarship Commission (UK)",
    description: "Master's and PhD scholarships for students from eligible Commonwealth countries. HEC announced the 2026 call on its scholarships page.",
    eligibility: "Bachelor's degree minimum; see official criteria.", minEducation: "BACHELORS", country: "United Kingdom",
    url: "https://cscuk.fcdo.gov.uk/", isRolling: false, verified: false, source: EDITORIAL,
  },

  // ───────── International scholarships and fellowships ─────────
  {
    type: "SCHOLARSHIP", title: "Chevening Scholarships", provider: "UK Foreign, Commonwealth & Development Office",
    description: "Fully funded one-year master's study in the UK, funded by the UK Government and partners. The 2027-2028 round was closed at the time of checking.",
    eligibility:
      "Citizen of a Chevening-eligible country; at least two years (2,800 hours) of work experience after your undergraduate degree; an undergraduate degree that qualifies for a UK master's; commitment to return home for at least two years; apply to three eligible UK courses.",
    minEducation: "BACHELORS", country: "United Kingdom", url: "https://www.chevening.org/scholarship/rwanda/", isRolling: false, verified: true, source: OFFICIAL,
  },
  {
    type: "SCHOLARSHIP", title: "DAAD Scholarships for Developing Countries", provider: "DAAD (German Academic Exchange Service)",
    description: "DAAD Development-Related Postgraduate Courses (EPOS): scholarships for postgraduate and master's study at German universities on listed courses, for graduates from eligible developing countries.",
    eligibility:
      "At least two years of professional experience, a bachelor's degree (usually four years) with above-average results, and a development-related motivation. Apply directly to the listed course; deadlines differ by course.",
    minEducation: "BACHELORS", country: "Germany",
    url: "https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database.pdf?detail=50076777", isRolling: false, verified: true, source: OFFICIAL,
  },
  {
    type: "SCHOLARSHIP", title: "Fulbright Foreign Student Program", provider: "U.S. Department of State",
    description: "Annual competition run through the U.S. Embassy in Rwanda for a fully funded master's degree in the United States.",
    eligibility:
      "Per the embassy's 2027-2028 call: Rwandan citizen/national or permanent resident with a Rwandan passport; affiliation with an institution in Rwanda and a commitment to return; a four-year bachelor's equivalent; at least two years of relevant professional experience; strong English and standardized-test results. Confirm criteria in the current call.",
    minEducation: "BACHELORS", country: "United States", url: "https://rw.usembassy.gov/academic-and-professional-exchanges/", isRolling: false, verified: true, source: OFFICIAL,
  },
  {
    type: "FELLOWSHIP", title: "Hubert H. Humphrey Fellowship Program", provider: "U.S. Department of State",
    description: "Ten months of non-degree academic study and professional experience in the United States for emerging leaders in public service.",
    eligibility: "Selected for leadership potential and commitment to public service, public or private sector (per the U.S. Embassy Rwanda page). Contact the embassy for current criteria.",
    minEducation: null, country: "United States", url: "https://rw.usembassy.gov/academic-and-professional-exchanges/", isRolling: false, verified: true, source: OFFICIAL,
  },
  {
    type: "SCHOLARSHIP", title: "Erasmus Mundus Joint Masters", provider: "European Commission (Erasmus+)",
    description: "Joint master's programmes run by consortia of at least three institutions in three countries; full scholarships are available for the best-ranked students worldwide.",
    eligibility: "A bachelor's degree (or final-year bachelor's student who graduates before the programme starts). Apply directly to the institution running the chosen master's; most calls run October-January.",
    minEducation: "BACHELORS", country: "Europe",
    url: "https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters", isRolling: false, verified: true, source: OFFICIAL,
  },
  {
    type: "SCHOLARSHIP", title: "Mastercard Foundation Scholars Program", provider: "Mastercard Foundation",
    description: "Scholarships for academically talented young Africans with financial need, delivered through partner universities.",
    eligibility: "Set by each partner institution. Check the programme page.", minEducation: "UPPER_SECONDARY", country: null,
    url: "https://mastercardfdn.org/all/scholars/", isRolling: false, verified: false, source: EDITORIAL,
  },
  {
    type: "SCHOLARSHIP", title: "Mastercard Foundation Scholars Program at the University of Rwanda", provider: "University of Rwanda",
    description:
      "Ten-year (2021-2031) partnership between UR and the Mastercard Foundation to admit 1,200 scholars (undergraduate and master's), with 80% in STEM; full scholarships for talented young people from economically disadvantaged backgrounds.",
    eligibility: "Programme targets include 70% women, 25% refugees and displaced youth and 10% persons with disabilities. Undergraduate (cohort 5, 2026/27) and postgraduate calls had closed when checked; watch the programme site.",
    minEducation: "UPPER_SECONDARY", country: "Rwanda", url: "https://mcfsp.ur.ac.rw/", isRolling: false, verified: true, source: OFFICIAL,
  },
  {
    type: "SCHOLARSHIP", title: "Mastercard Foundation Scholars Program at Carnegie Mellon University Africa", provider: "Carnegie Mellon University Africa",
    description: "Postgraduate scholarships in Kigali for highly talented, service-oriented young people who face high social and economic barriers; MS in Information Technology, Electrical and Computer Engineering, or Engineering Artificial Intelligence.",
    eligibility: "Postgraduate level. The Mastercard Foundation page listed admissions as open when checked; see the page for personal-circumstance categories.",
    minEducation: "BACHELORS", country: "Rwanda", url: CMU_MCF_URL, isRolling: false, verified: true, source: OFFICIAL,
  },
  {
    type: "SCHOLARSHIP", title: "Kepler College scholarships (eligible refugees and people with disabilities)", provider: "Kepler",
    description: "Kepler states that scholarships are available for eligible refugees in Rwanda and people with disabilities; accepted students under full scholarship can borrow a laptop. Others pay tuition upfront or commit to an income-share style arrangement described on its site.",
    eligibility: "Two principal passes (or equivalent) in national exams and success in Kepler's admission test; scholarship eligibility is set by Kepler.",
    minEducation: "UPPER_SECONDARY", country: "Rwanda", url: "https://kepler.org/apply/", isRolling: false, verified: true, source: OFFICIAL,
  },

  // ───────── Training, apprenticeship and employment programmes ─────────
  {
    type: "TRAINING", title: "Rwanda Coding Academy admission (three-year programme)", provider: "Rwanda Coding Academy",
    description: "Public specialised school in Nyabihu-Mukamira training software engineers: a three-year programme covering software engineering, cybersecurity, artificial intelligence and embedded systems.",
    eligibility: "Merit-based and highly competitive: strong STEM results (especially Mathematics and Physics) plus national-level examinations and assessments. Parents contribute a per-term fee (see RCA).",
    minEducation: null, country: "Rwanda", url: "https://rca.ac.rw/admissions", isRolling: false, verified: true, source: OFFICIAL,
  },
  {
    type: "INTERNSHIP", title: "Digital Ambassadors Programme (DAP) apprenticeship", provider: "RISA / MINICT",
    description: "National apprenticeship in which ICT-skilled young people are trained and deployed to teach digital literacy and e-services in their communities; RISA reports over 2,000 active ambassadors.",
    eligibility: "Open to young graduates from secondary schools or tertiary institutions (per RISA). Recruitment is periodic; check RISA/MINICT for the current call.",
    minEducation: "UPPER_SECONDARY", country: "Rwanda", url: "https://www.risa.gov.rw/projects/digital-ambassadors-program", isRolling: false, verified: true, source: "risa-dap",
  },
  {
    type: "TRAINING", title: "National Employment Programme (NEP)", provider: NEP_PROVIDER,
    description: "Government employment programme covering employability skills, entrepreneurship and business development; the interventions are listed individually below.",
    eligibility: "Depends on the intervention (see each NEP record). The NEP page describing them is dated 2018, so confirm current components with MIFOTRA.", minEducation: null, country: "Rwanda",
    url: NEP_URL, isRolling: true, verified: true, source: NEP,
  },
  {
    type: "TRAINING", title: "NEP Rapid Response Training", provider: NEP_PROVIDER,
    description: "Training in skills that are scarce on the labour market. The employer must be ready to employ at least 70 percent of trainees and contribute 30 percent of training costs.",
    eligibility: "Job seekers (unskilled or skilled) matched to a participating company. Description from the NEP page (2018).", minEducation: null, country: "Rwanda",
    url: NEP_URL, isRolling: false, verified: true, source: NEP,
  },
  {
    type: "TRAINING", title: "NEP Massive Short-Term Vocational Training", provider: NEP_PROVIDER,
    description: "Short vocational courses delivered in public and private training centres (vocational training centres, technical secondary schools, IPRCs). Trades named: masonry, tailoring, carpentry, hairdressing, mechanics, culinary arts, welding.",
    eligibility: "Targets out-of-school youth. Description from the NEP page (2018).", minEducation: null, country: "Rwanda",
    url: NEP_URL, isRolling: false, verified: true, source: NEP,
  },
  {
    type: "TRAINING", title: "NEP Industry-Based Training and Apprenticeship", provider: NEP_PROVIDER,
    description: "Dual-system, competence-based training where theory and practice take place on the job.",
    eligibility: "Targets out-of-school youth. Description from the NEP page (2018).", minEducation: null, country: "Rwanda",
    url: NEP_URL, isRolling: false, verified: true, source: NEP,
  },
  {
    type: "TRAINING", title: "NEP Reconversion Programme for university graduates", provider: NEP_PROVIDER,
    description: "Training in market-relevant trades for university graduates who have been unemployed for a long period.",
    eligibility: "University graduates unemployed for more than two years (per the 2018 NEP page).", minEducation: "BACHELORS", country: "Rwanda",
    url: NEP_URL, isRolling: false, verified: true, source: NEP,
  },
  {
    type: "TRAINING", title: "NEP Recognition of Prior Learning (skills passport)", provider: NEP_PROVIDER,
    description: "Artisans whose skills were learned outside the formal education system receive a skills passport. The page lists construction, with hairdressing and garages ongoing at the time.",
    eligibility: "Artisans with uncertified skills. Description from the NEP page (2018).", minEducation: null, country: "Rwanda",
    url: NEP_URL, isRolling: false, verified: true, source: NEP,
  },
  {
    type: "INTERNSHIP", title: "NEP graduate internship", provider: NEP_PROVIDER,
    description: "Internships that help university graduates gain professional experience in their field of study; the NEP page describes them as lasting six months.",
    eligibility: "University graduates. Description from the NEP page (2018); confirm current rules with MIFOTRA.", minEducation: "BACHELORS", country: "Rwanda",
    url: NEP_URL, isRolling: false, verified: true, source: NEP,
  },
  {
    type: "GRANT", title: "NEP Proximity Business Advisory Services (voucher)", provider: NEP_PROVIDER,
    description: "Vouchers used to pay business development advisors; the beneficiary contributes 30 percent and NEP 70 percent according to the 2018 NEP page.",
    eligibility: "Entrepreneurs with a project. See the NEP page and the district employment and business development unit.", minEducation: null, country: "Rwanda",
    url: NEP_URL, isRolling: false, verified: true, source: NEP,
  },
  {
    type: "TRAINING", title: "Rwanda Polytechnic admissions and short courses", provider: "Rwanda Polytechnic",
    description: "Bachelor of Technology, advanced diploma and short-course training across eight RP colleges (Kigali, Tumba, Huye, Gishari, Kitabi, Karongi, Musanze, Ngoma).",
    eligibility: "Entry requirements vary by programme. See the RP admissions pages.", minEducation: "LOWER_SECONDARY", country: "Rwanda",
    url: "https://www.rp.ac.rw/", isRolling: false, verified: true, source: "rp-programmes-catalogue",
  },
  {
    type: "TRAINING", title: "District employment and business development units (Business Development Advisors)", provider: "Rwanda Development Board (RDB) business procedures portal",
    description: "District units offer consultancy, market access, training and technical assistance, access to finance and basic accounting. Youth and women with promising ideas receive practical entrepreneurship mentoring and coaching from Business Development Advisors present in every sector.",
    eligibility: "Job seekers, aspiring entrepreneurs, informal-sector entrepreneurs with growth potential, and cooperatives.", minEducation: null, country: "Rwanda",
    url: "https://businessprocedures.rdb.rw/menu/240?l=en", isRolling: true, verified: true, source: "rdb-official",
  },
  {
    type: "GRANT", title: "Business Development Fund (BDF) financing support", provider: "Business Development Fund (BDF), Rwanda",
    description: "BDF (set up in 2011 by the Government with BRD) supports small and medium enterprises with loan guarantees, leasing, SACCO capacity building, agricultural investment, advisory services and grants.",
    eligibility: "Small and medium enterprises, individual entrepreneurs, companies and cooperatives; product-specific rules apply. See BDF.", minEducation: null, country: "Rwanda",
    url: "https://bdf.rw/", isRolling: true, verified: true, source: "bdf-services",
  },
  {
    type: "GRANT", title: "Tony Elumelu Foundation Entrepreneurship Programme", provider: "Tony Elumelu Foundation",
    description: "Pan-African programme giving selected early-stage entrepreneurs US$5,000 non-refundable seed capital, business training and mentorship. Applications run once a year on TEFConnect (the 2026 cycle ran 1 January to 1 March 2026).",
    eligibility: "Open to entrepreneurs from all 54 African countries aged 18 or over with a business idea or early-stage business; check the current cycle's FAQ for business-age and other rules. Applying is free.",
    minEducation: null, country: "Africa", url: "https://www.tonyelumelufoundation.org/tef-entrepreneurship-programme", isRolling: false, verified: true, source: OFFICIAL,
  },
];
