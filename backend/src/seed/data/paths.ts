// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Learning paths (skills-focused) and career roadmaps (one per occupation). EDITORIAL guidance
// (source: hdos-editorial-paths, isDemo = true): the sequencing and month offsets are HDOS suggestions, not an
// official framework. Resource links point at public pages: official Rwandan bodies where possible, otherwise
// well-known free learning sites. No salaries, deadlines or admission requirements are stated.
import { OCCUPATIONS } from "./occupations";
import { PROGRAMS } from "./programs";
import type { Edu, OccupationSeed, PathSeed, PathStepTuple, ProgramSeed } from "./types";

const SOURCE = "hdos-editorial-paths";

// ───────── resource links (label, url) ─────────
type Res = [label: string, url: string];
const R = {
  mdn: ["MDN: Learn web development", "https://developer.mozilla.org/en-US/docs/Learn"] as Res,
  fcc: ["freeCodeCamp (free curriculum)", "https://www.freecodecamp.org/"] as Res,
  odin: ["The Odin Project", "https://www.theodinproject.com/"] as Res,
  git: ["GitHub Docs: Get started", "https://docs.github.com/en/get-started"] as Res,
  py: ["The Python Tutorial (python.org)", "https://docs.python.org/3/tutorial/"] as Res,
  kaggle: ["Kaggle Learn (free micro-courses)", "https://www.kaggle.com/learn"] as Res,
  sqlbolt: ["SQLBolt: interactive SQL lessons", "https://sqlbolt.com/"] as Res,
  khanStats: ["Khan Academy: Statistics and probability", "https://www.khanacademy.org/math/statistics-probability"] as Res,
  khan: ["Khan Academy (free)", "https://www.khanacademy.org/"] as Res,
  skillshop: ["Google Skillshop", "https://skillshop.withgoogle.com/"] as Res,
  hubspot: ["HubSpot Academy (free courses)", "https://academy.hubspot.com/"] as Res,
  netacad: ["Cisco Networking Academy", "https://www.netacad.com/"] as Res,
  tryhackme: ["TryHackMe (beginner security labs)", "https://tryhackme.com/"] as Res,
  fao: ["FAO eLearning Academy", "https://elearning.fao.org/"] as Res,
  rab: ["Rwanda Agriculture and Animal Resources Development Board (RAB)", "https://www.rab.gov.rw/"] as Res,
  rra: ["Rwanda Revenue Authority (RRA)", "https://www.rra.gov.rw/"] as Res,
  bbc: ["BBC Learning English", "https://www.bbc.co.uk/learningenglish"] as Res,
  tv5: ["TV5MONDE: Apprendre le français", "https://apprendre.tv5monde.com/en"] as Res,
  tef: ["Tony Elumelu Foundation Entrepreneurship Programme", "https://www.tonyelumelufoundation.org/tef-entrepreneurship-programme"] as Res,
  bdf: ["Business Development Fund (BDF)", "https://bdf.rw/"] as Res,
  bda: ["RDB business procedures: district business development units", "https://businessprocedures.rdb.rw/menu/240?l=en"] as Res,
  rdb: ["Rwanda Development Board (RDB)", "https://www.rdb.rw/"] as Res,
  rp: ["Rwanda Polytechnic programmes", "https://new.rp.ac.rw/programmes/"] as Res,
  rtb: ["Rwanda TVET Board (RTB)", "https://www.rtb.gov.rw/"] as Res,
  hec: ["HEC: accredited institutions", "https://www.hec.gov.rw/accredited-institutions"] as Res,
  nep: ["MIFOTRA NEP interventions (training, apprenticeship, internships)", "https://jobportal.kora.rw/article/nepinterventions"] as Res,
  kora: ["Kora job portal (NEP)", "https://jobportal.kora.rw/"] as Res,
  dap: ["Digital Ambassadors Programme (RISA)", "https://www.risa.gov.rw/projects/digital-ambassadors-program"] as Res,
  dapSite: ["Digital Ambassadors Programme learner site", "https://dap.minict.gov.rw/"] as Res,
  ilo: ["International Labour Organization", "https://www.ilo.org/"] as Res,
  aws: ["American Welding Society", "https://www.aws.org/"] as Res,
  openlearn: ["OpenLearn (Open University, free)", "https://www.open.edu/openlearn/"] as Res,
  coursera: ["Coursera (free-to-audit courses)", "https://www.coursera.org/"] as Res,
};

const s = (
  phase: string, title: string, description: string, kind: PathStepTuple[3], monthOffset: number, res?: Res,
): PathStepTuple => (res ? [phase, title, description, kind, monthOffset, res[0], res[1]] : [phase, title, description, kind, monthOffset]);

// ───────── LEARNING PATHS ─────────
const learning = (
  slug: string, title: string, summary: string, sector: string | null, startLevel: Edu | null, durationMonths: number, steps: PathStepTuple[],
): PathSeed => ({ slug, type: "LEARNING_PATH", title, summary, occupation: null, sector, startLevel, durationMonths, source: SOURCE, steps });

export const LEARNING_PATHS: PathSeed[] = [
  learning("learn-web-development-fundamentals", "Web development fundamentals",
    "From zero to a deployed portfolio site: HTML, CSS, JavaScript, Git and a first small backend.", "ICT", "UPPER_SECONDARY", 6, [
      s("Foundations", "Understand how the web works", "Learn what browsers, servers, HTTP and URLs do before writing code.", "SKILL", 0, R.mdn),
      s("Foundations", "Build pages with HTML and CSS", "Create 3-4 responsive static pages (a profile, a menu, a landing page).", "SKILL", 1, R.fcc),
      s("Core skills", "Learn JavaScript basics", "Variables, functions, arrays, DOM manipulation and fetching data from an API.", "SKILL", 2, R.mdn),
      s("Core skills", "Use Git and GitHub", "Commit, branch and publish your projects so employers can read your code.", "SKILL", 3, R.git),
      s("Practice", "Build and deploy a portfolio", "Publish a portfolio site plus two small apps (e.g. a budget tracker and a to-do list).", "EXPERIENCE", 4),
      s("Next level", "Add a simple backend and database", "Follow a full-stack track to learn Node.js and SQL basics.", "SKILL", 5, R.odin),
      s("Apply", "Look for internships and junior work", "Apply for internships, community tech projects or junior roles; share your GitHub link.", "APPLY", 6, R.kora),
    ]),
  learning("learn-python-programming-basics", "Python programming basics",
    "Learn Python well enough to automate tasks and move into data or backend work.", "ICT", "UPPER_SECONDARY", 4, [
      s("Setup", "Install Python and write your first scripts", "Run small programs: calculators, text processing and simple games.", "SKILL", 0, R.py),
      s("Core skills", "Master data types, loops and functions", "Practise with 20-30 short exercises until the basics feel natural.", "SKILL", 1, R.py),
      s("Core skills", "Work with files, errors and modules", "Read CSV files, handle errors and organise code in modules.", "SKILL", 2, R.kaggle),
      s("Core skills", "Learn version control", "Keep every exercise in a Git repository.", "SKILL", 2, R.git),
      s("Practice", "Build two real mini-projects", "For example an expense tracker and a script that cleans a spreadsheet for a local business.", "EXPERIENCE", 3),
      s("Milestone", "Publish your projects", "A public repository with README files showing what each project does.", "MILESTONE", 4),
    ]),
  learning("learn-data-analysis-essentials", "Data analysis essentials",
    "Spreadsheets, statistics, SQL and visualisation, applied to a real public dataset.", "ICT", "UPPER_SECONDARY", 6, [
      s("Foundations", "Get fluent in spreadsheets", "Learn sorting, filtering, formulas, pivot tables and charts.", "SKILL", 0, R.openlearn),
      s("Foundations", "Learn core statistics", "Averages, spread, correlation, sampling and simple hypothesis testing.", "SKILL", 1, R.khanStats),
      s("Core skills", "Learn SQL", "Query, join and aggregate data in a practice database.", "SKILL", 2, R.sqlbolt),
      s("Core skills", "Clean and explore data with Python", "Use Python notebooks for data cleaning and exploration.", "SKILL", 3, R.kaggle),
      s("Practice", "Analyse a public dataset", "Pick a published dataset (for example NISR labour force survey tables) and write a 2-page findings report with charts.", "EXPERIENCE", 4),
      s("Milestone", "Share a portfolio project", "Publish the analysis with clear charts and a plain-language summary.", "MILESTONE", 5),
      s("Apply", "Apply for analyst internships", "Target NGOs, banks, telecoms, research bodies and M&E teams.", "APPLY", 6, R.kora),
    ]),
  learning("learn-digital-marketing-essentials", "Digital marketing essentials",
    "Plan, run and measure online campaigns for a small business.", "ICT", "UPPER_SECONDARY", 4, [
      s("Foundations", "Learn marketing basics", "Audience, offer, channels and measurement: how marketing fits a small business.", "SKILL", 0, R.hubspot),
      s("Core skills", "Learn search and social advertising", "Complete free courses on search ads, analytics and social media marketing.", "SKILL", 1, R.skillshop),
      s("Core skills", "Create content that sells", "Write posts, short videos and product photos with a consistent style.", "SKILL", 2),
      s("Practice", "Run a real mini-campaign", "Offer to promote a small business for 4 weeks, with a budget agreed beforehand, and record results.", "EXPERIENCE", 3),
      s("Milestone", "Write a results case study", "Show reach, clicks, enquiries and sales with screenshots and what you learned.", "MILESTONE", 4),
    ]),
  learning("learn-bookkeeping-small-business", "Bookkeeping for small businesses",
    "Record sales and costs correctly, prepare simple statements and understand tax basics.", "FIN", "UPPER_SECONDARY", 4, [
      s("Foundations", "Learn the accounting basics", "Assets, liabilities, income, expenses and double-entry in plain language.", "SKILL", 0, R.khan),
      s("Core skills", "Practise cash books and ledgers", "Keep a cash book for a real or imagined shop for one month.", "SKILL", 1),
      s("Core skills", "Learn spreadsheets for bookkeeping", "Build a simple income-and-expense workbook with totals and charts.", "SKILL", 2, R.openlearn),
      s("Core skills", "Understand tax obligations", "Read the tax guidance for small taxpayers and learn what records you must keep.", "SKILL", 3, R.rra),
      s("Practice", "Keep books for a real small business", "Volunteer to keep the books of a SACCO group, shop or cooperative.", "EXPERIENCE", 4),
      s("Next level", "Plan formal accounting study", "Check HEC-accredited institutions for accounting or finance diplomas and degrees.", "EDUCATION", 4, R.hec),
    ]),
  learning("learn-welding-metal-fabrication", "Welding and metal fabrication",
    "Safety first, then practical welding and fabrication skills, with a route to certification.", "MANUF", "LOWER_SECONDARY", 12, [
      s("Safety", "Learn workshop safety", "PPE, ventilation, fire safety and safe handling of gas and electricity.", "SKILL", 0, R.ilo),
      s("Foundations", "Read drawings and measure accurately", "Learn technical drawing symbols, measuring and cutting to size.", "SKILL", 1),
      s("Training", "Join a TVET or short-course programme", "Find a TVET school or short vocational course; NEP has listed welding among its short-term vocational trades.", "EDUCATION", 2, R.nep),
      s("Core skills", "Practise arc and gas welding", "Weld test pieces in several positions and have an instructor inspect them.", "SKILL", 4, R.aws),
      s("Experience", "Apprentice in a workshop", "Work under a skilled welder on gates, frames and structures.", "EXPERIENCE", 7),
      s("Apply", "Seek certification and paid work", "Ask your trainer about certification routes (RTB), then approach fabrication workshops or start small.", "APPLY", 10, R.rtb),
      s("Milestone", "Complete a full fabrication job", "Build and deliver one complete product (for example a gate) to a customer's specification.", "MILESTONE", 12),
    ]),
  learning("learn-electrical-installation-basics", "Electrical installation basics",
    "Safe domestic wiring and installation skills, built on theory, supervised practice and certification.", "CONSTR", "LOWER_SECONDARY", 12, [
      s("Safety", "Learn electrical safety", "Isolation, earthing, PPE and the dangers of mains electricity; never work live.", "SKILL", 0, R.ilo),
      s("Foundations", "Learn basic electrical theory", "Voltage, current, resistance, circuits and reading simple wiring diagrams.", "SKILL", 1),
      s("Training", "Enrol in a TVET or polytechnic electrical course", "Rwanda Polytechnic lists Electrical Technology at Kigali, Huye, Musanze and Gishari colleges.", "EDUCATION", 2, R.rp),
      s("Core skills", "Practise wiring on a training board", "Install lighting and socket circuits and test them under supervision.", "SKILL", 4),
      s("Experience", "Apprentice with a qualified electrician", "Join real installations; NEP lists apprenticeships and recognition of prior learning.", "EXPERIENCE", 7, R.nep),
      s("Apply", "Look for contractor or utility work", "Approach contractors, building-services firms and solar installers.", "APPLY", 10, R.kora),
      s("Milestone", "Complete a supervised installation", "Finish a full house installation with a signed-off test record.", "MILESTONE", 12),
    ]),
  learning("learn-farm-business-good-practices", "Farm business and good practices",
    "Plan crops or livestock as a business: inputs, records, post-harvest handling and markets.", "AGRI", "UPPER_SECONDARY", 8, [
      s("Foundations", "Choose an enterprise and learn its basics", "Pick one crop or animal enterprise and study its production calendar and inputs.", "SKILL", 0, R.rab),
      s("Core skills", "Learn good agricultural practices", "Soil and water management, seed selection, pest control and safe input use.", "SKILL", 1, R.fao),
      s("Core skills", "Keep farm records", "Record costs, yields and sales every week in a notebook or spreadsheet.", "SKILL", 2),
      s("Core skills", "Handle the harvest well", "Learn post-harvest handling, storage and quality grading to reduce losses.", "SKILL", 4, R.fao),
      s("Practice", "Run one full season", "Farm a plot (or join a cooperative) and keep records for the whole season.", "EXPERIENCE", 6),
      s("Next level", "Explore financing and advice", "Ask about BDF services (guarantees, agricultural investment, advisory) and your district business advisors.", "APPLY", 7, R.bdf),
      s("Milestone", "Calculate profit per crop", "Use your records to work out cost, income and profit, then plan next season.", "MILESTONE", 8),
    ]),
  learning("learn-customer-service-excellence", "Customer service excellence",
    "Communication, problem solving and professionalism for shops, hotels, banks and call centres.", "COMM", "UPPER_SECONDARY", 3, [
      s("Foundations", "Learn the basics of good service", "Greeting, listening, tone of voice and handling complaints calmly.", "SKILL", 0, R.hubspot),
      s("Core skills", "Practise communication in your working languages", "Role-play common customer situations in Kinyarwanda, English and French.", "SKILL", 1),
      s("Core skills", "Learn to solve problems and follow up", "Use a simple log to track issues until they are resolved.", "SKILL", 1),
      s("Practice", "Work or volunteer in a customer-facing role", "Shop counter, hotel reception, market stall or event desk.", "EXPERIENCE", 2),
      s("Apply", "Apply to service employers", "Hotels, banks, shops, telecom agents and airlines recruit for customer-facing jobs.", "APPLY", 3, R.kora),
    ]),
  learning("learn-english-for-work", "English for work",
    "Build workplace English for reading, writing, listening and speaking.", null, "LOWER_SECONDARY", 9, [
      s("Foundations", "Take a level check and set a weekly goal", "Use a free level test and plan 30-45 minutes a day.", "SKILL", 0, R.bbc),
      s("Core skills", "Build listening and speaking daily", "Listen to short lessons, repeat aloud and record yourself.", "SKILL", 1, R.bbc),
      s("Core skills", "Practise workplace writing", "Write short emails, a CV and a one-page report; ask a teacher or friend to correct them.", "SKILL", 3),
      s("Practice", "Join a speaking group", "Find or form a weekly English club at school, church, mosque or community centre.", "EXPERIENCE", 4),
      s("Milestone", "Do a mock interview in English", "Record a 5-minute introduction and answer five common interview questions.", "MILESTONE", 8),
    ]),
  learning("learn-french-for-work", "French for work",
    "Workplace French for hospitality, administration and regional trade.", null, "LOWER_SECONDARY", 9, [
      s("Foundations", "Learn greetings and everyday phrases", "Start with pronunciation and the 500 most common words.", "SKILL", 0, R.tv5),
      s("Core skills", "Practise listening", "Short daily audio or video lessons at your level.", "SKILL", 1, R.tv5),
      s("Core skills", "Learn work vocabulary", "Greetings, directions, prices, bookings and polite phone phrases for your job area.", "SKILL", 3),
      s("Practice", "Practise with speakers", "Find a speaking partner at a school or cultural centre and meet weekly.", "EXPERIENCE", 5),
      s("Milestone", "Hold a 5-minute conversation", "Introduce yourself and describe your work or studies in French.", "MILESTONE", 9),
    ]),
  learning("learn-entrepreneurship-basics", "Entrepreneurship basics",
    "Test an idea, plan the money, register the business and find support.", "COMM", "UPPER_SECONDARY", 6, [
      s("Idea", "Test your idea with real customers", "Talk to at least 20 potential customers about the problem and what they pay today.", "SKILL", 0),
      s("Planning", "Write a one-page business plan", "Customers, offer, price, costs, break-even and how you will reach people.", "SKILL", 1, R.khan),
      s("Money", "Learn financial literacy and records", "Separate business and personal money and record every sale and cost.", "SKILL", 2, R.openlearn),
      s("Pilot", "Run a small pilot for 4-8 weeks", "Sell to first customers and track what works.", "EXPERIENCE", 3),
      s("Support", "Meet your district business advisor", "District employment and business development units offer advice, training and access-to-finance support.", "APPLY", 4, R.bda),
      s("Funding", "Explore funding and programmes", "Compare BDF services and the Tony Elumelu Foundation programme (annual cycle) and check eligibility.", "APPLY", 5, R.tef),
      s("Milestone", "Register the business", "Register through RDB once your pilot shows paying customers.", "MILESTONE", 6, R.rdb),
    ]),
  learning("learn-digital-literacy-online-safety", "Digital literacy and online safety",
    "Use smartphones, e-government services and the internet confidently and safely.", "ICT", "PRIMARY", 2, [
      s("Foundations", "Learn to use a smartphone or computer", "Settings, apps, files, email and basic typing.", "SKILL", 0, R.dapSite),
      s("Core skills", "Use online services", "Practise using e-government and mobile-money services with help from a Digital Ambassador.", "SKILL", 1, R.dap),
      s("Core skills", "Stay safe online", "Strong passwords, avoiding scams, privacy settings and verifying messages.", "SKILL", 1),
      s("Practice", "Teach someone else", "Help a family member or neighbour complete an online task.", "EXPERIENCE", 2),
      s("Next level", "Consider joining the Digital Ambassadors Programme", "RISA describes DAP as an apprenticeship for ICT-skilled young graduates; watch for calls.", "APPLY", 2, R.dap),
    ]),
  learning("learn-it-support-networking-basics", "IT support and networking basics",
    "Hardware, operating systems, networks and troubleshooting for entry-level IT support.", "ICT", "UPPER_SECONDARY", 6, [
      s("Foundations", "Learn how computers work", "Components, operating systems, installing software and backups.", "SKILL", 0, R.netacad),
      s("Core skills", "Learn networking fundamentals", "IP addressing, routers, switches, Wi-Fi and basic troubleshooting.", "SKILL", 2, R.netacad),
      s("Core skills", "Practise troubleshooting", "Fix real faults: slow machines, printers, network drops, and write short fix notes.", "SKILL", 3),
      s("Formal study", "Consider a diploma", "Rwanda Polytechnic lists Information Technology advanced diplomas at six colleges.", "EDUCATION", 4, R.rp),
      s("Practice", "Support a school or small office", "Volunteer to maintain computers and the network at a school, SACCO or office.", "EXPERIENCE", 5),
      s("Apply", "Apply for IT support roles", "Schools, hospitals, ISPs, banks and IT shops hire support technicians.", "APPLY", 6, R.kora),
    ]),
  learning("learn-cybersecurity-foundations", "Cybersecurity foundations",
    "Core security concepts and hands-on practice in legal training labs.", "ICT", "UPPER_SECONDARY", 6, [
      s("Foundations", "Learn networking and operating-system basics", "Security builds on networks, Linux and Windows fundamentals.", "SKILL", 0, R.netacad),
      s("Core skills", "Learn security concepts", "Confidentiality, integrity, availability, common attacks and defences.", "SKILL", 2, R.tryhackme),
      s("Core skills", "Practise in legal labs", "Use beginner rooms and capture-the-flag exercises only on systems you have permission to test.", "SKILL", 3, R.tryhackme),
      s("Practice", "Write up what you learn", "Publish short write-ups of labs you completed to show your thinking.", "EXPERIENCE", 4),
      s("Milestone", "Pass a recognised entry-level exam", "Choose a vendor-neutral entry-level certification and prepare for it.", "MILESTONE", 6),
    ]),
];

// ───────── CAREER ROADMAPS ─────────
interface RoadmapCfg {
  exp: string;
  apply: string;
  milestone: string;
  /** Self-employment route: point the APPLY step at BDF / district business advisors instead of the job portal. */
  selfEmployed?: boolean;
}

const CFG: Record<string, RoadmapCfg> = {
  "Software Developer": { exp: "Build 2-3 real projects with Git, contribute to a community project, and do an internship or junior role.", apply: "Apply to software companies, startups and digital teams in banks, telecoms and government agencies; keep your GitHub and CV current.", milestone: "First paid junior developer role." },
  "Data Analyst": { exp: "Analyse a real public dataset end to end and publish a short report; seek an internship in a research, finance or NGO team.", apply: "Apply for analyst roles in NGOs, banks, telecoms, research bodies and monitoring-and-evaluation teams.", milestone: "First role where you own a recurring report or dashboard." },
  "IT Support Technician": { exp: "Volunteer to maintain computers at a school, SACCO or small office, and complete an industrial attachment.", apply: "Apply to schools, hospitals, banks, internet providers and IT shops.", milestone: "Hired as an IT support technician." },
  "Digital Marketing Specialist": { exp: "Run a real campaign for a small business or community organisation and track the results.", apply: "Apply to agencies, hotels, retailers and NGOs, or freelance for local businesses.", milestone: "Portfolio with measurable campaign results and a first paid client or role." },
  "Network Administrator": { exp: "Set up and document a small office network (switching, Wi-Fi, firewall) in a lab or for a volunteer client.", apply: "Apply to internet providers, banks, telecoms, hospitals and institutions with in-house networks.", milestone: "First network administrator or junior systems role." },
  "Cybersecurity Analyst": { exp: "Practise in legal training labs and security competitions; support an organisation's security checks as an intern or junior.", apply: "Apply to banks, telecoms, government ICT agencies and security consultancies.", milestone: "First security analyst role." },
  "UI/UX Designer": { exp: "Redesign an existing local website or app flow, test it with real users and document it as a case study.", apply: "Apply to software teams, agencies and startups with a portfolio of three case studies.", milestone: "Portfolio of three case studies and a first design role or freelance contract." },
  "Registered Nurse": { exp: "Complete the supervised clinical placements in your programme and any required internship or practice period.", apply: "Apply to public, faith-based and private hospitals and clinics, and complete registration with the relevant professional council.", milestone: "Registered and employed as a nurse." },
  "Midwife": { exp: "Complete supervised antenatal, labour and postnatal clinical placements.", apply: "Apply to health centres, district hospitals and private facilities, and complete professional-council registration.", milestone: "Registered and employed as a midwife." },
  "Medical Doctor": { exp: "Complete clinical rotations and the internship period required before independent practice.", apply: "Apply to hospitals and clinics after registration with the national medical council.", milestone: "Fully registered and working as a doctor." },
  "Pharmacist": { exp: "Complete supervised pharmacy practice in hospital and community settings as required.", apply: "Apply to hospitals, pharmacies, distributors and regulators after professional registration.", milestone: "Registered pharmacist in a first post." },
  "Laboratory Technician": { exp: "Complete clinical-laboratory placements during training and a supervised attachment.", apply: "Apply to hospitals, health centres, research laboratories and private labs.", milestone: "First laboratory technician post." },
  "Biomedical Equipment Technician": { exp: "Do a supervised attachment servicing equipment in a hospital or with a medical-equipment supplier.", apply: "Apply to hospitals, equipment suppliers and health-sector projects.", milestone: "First post maintaining medical equipment." },
  "Primary School Teacher": { exp: "Complete supervised teaching practice in a primary school and learn from an experienced mentor teacher.", apply: "Follow current teacher recruitment announcements (district education offices and public service channels) and apply to private schools.", milestone: "Deployed as a primary school teacher." },
  "Secondary School Teacher": { exp: "Complete teaching practice in your subjects and tutor learners.", apply: "Follow public recruitment announcements and apply to private schools.", milestone: "Deployed as a secondary school teacher." },
  "TVET Trainer": { exp: "Gain industry experience in your trade and complete a trainer pedagogy course (RP lists a TVET Trainer Certification short course).", apply: "Watch RTB and Rwanda Polytechnic announcements and apply to TVET schools and polytechnic colleges.", milestone: "Certified and teaching in a TVET school." },
  "Civil Engineer": { exp: "Complete a site attachment, then work towards professional registration where required.", apply: "Apply to construction firms, consultancies, districts and infrastructure agencies.", milestone: "Graduate engineer on a live project." },
  "Electrician": { exp: "Apprentice under a qualified electrician; if you already work informally, ask about recognition of prior learning.", apply: "Apply to contractors, utilities and building-services firms, or start as a self-employed installer.", milestone: "Qualified electrician completing first independent jobs." },
  "Quantity Surveyor": { exp: "Do a site or consultancy attachment preparing bills of quantities.", apply: "Apply to quantity-surveying consultancies, contractors and developers.", milestone: "First post as a quantity surveyor." },
  "Land Surveyor": { exp: "Practise total-station and GNSS fieldwork on supervised projects.", apply: "Apply to survey firms, land-administration projects, mining and construction firms.", milestone: "First post as a land surveyor." },
  "Plumber": { exp: "Train on real installations with a skilled plumber. RTB announced Rwanda's first plumbing trade test in October 2026, so ask about certification routes.", apply: "Apply to contractors and building-services firms, or start as a self-employed plumber.", milestone: "Skills recognised by a trade test or certificate and first paid jobs." },
  "Mason": { exp: "Work as an apprentice on a construction site. NEP lists recognition of prior learning in construction for artisans.", apply: "Apply to contractors or form a small team, and seek certification.", milestone: "Certified mason leading a small crew." },
  "Road Construction Technician": { exp: "Site attachment on road and drainage works with a contractor or district.", apply: "Apply to road contractors, districts and infrastructure agencies.", milestone: "First technician role on a road project." },
  "Welder & Fabricator": { exp: "Work under a skilled welder and weld test pieces to workshop standards.", apply: "Apply to fabrication workshops, construction and manufacturing firms, or set up a small workshop.", milestone: "Passes a workshop or trade test and holds a first paid welding job." },
  "Agro-processing Technician": { exp: "Attachment at a food or crop processing plant, learning hygiene and quality checks.", apply: "Apply to food processors, cooperatives and agro-industrial firms.", milestone: "First technician role on a processing line." },
  "Mechatronics Technician": { exp: "Attachment on an automated production line or maintenance workshop.", apply: "Apply to manufacturers, utilities and maintenance firms.", milestone: "First technician role maintaining automated equipment." },
  "Automotive Mechanic": { exp: "Apprentice in a garage. NEP lists recognition of prior learning for garages if you already work informally.", apply: "Apply to garages, dealerships and fleet workshops, or open your own garage.", milestone: "Qualified mechanic diagnosing faults independently." },
  "HVAC & Refrigeration Technician": { exp: "Attachment with a cooling or cold-chain installer.", apply: "Apply to HVAC installers, cold-chain firms, hotels and hospitals.", milestone: "First technician role servicing HVAC or refrigeration." },
  "Accountant": { exp: "Take an internship in an accounting or audit team and prepare real reconciliations.", apply: "Apply to firms, banks, NGOs and public accounting units; plan professional accountancy qualifications with ICPAR.", milestone: "First accountant role and a plan for professional qualifications." },
  "Bank Officer": { exp: "Do a bank, microfinance or SACCO internship in customer service.", apply: "Apply to commercial banks, microfinance institutions and SACCOs.", milestone: "First role as a bank officer." },
  "Auditor": { exp: "Intern in an audit firm or an internal audit team.", apply: "Apply to audit firms, banks and public institutions.", milestone: "First role as an assistant auditor." },
  "Microfinance Officer": { exp: "Intern in a microfinance institution or SACCO and shadow loan officers in the field.", apply: "Apply to microfinance institutions and SACCOs.", milestone: "First role as a microfinance or SACCO officer." },
  "Agricultural Extension Officer": { exp: "Attachment with a cooperative, farmer field school or agricultural project.", apply: "Apply to agricultural projects, cooperatives, NGOs and districts.", milestone: "First extension-officer role supporting farmer groups." },
  "Commercial Farmer": { exp: "Start on a small plot or with a cooperative and keep farm records for a full season.", apply: "Link to buyers or cooperatives and explore BDF services (guarantees, agricultural investment, advisory).", milestone: "A full season of records showing profit or loss per crop.", selfEmployed: true },
  "Animal Health Technician": { exp: "Attachment at a veterinary clinic or district veterinary office.", apply: "Apply to veterinary practices, projects, cooperatives and districts.", milestone: "First post as an animal health technician." },
  "Irrigation Technician": { exp: "Attachment on an irrigation scheme or installation project.", apply: "Apply to irrigation contractors, schemes, agricultural projects and districts.", milestone: "First role installing or maintaining irrigation systems." },
  "Tour Guide": { exp: "Guide school or community groups, practise your languages and shadow experienced guides.", apply: "Apply to tour operators, lodges and parks and build a profile with references.", milestone: "First paid guiding season." },
  "Front Office Supervisor": { exp: "Work reception shifts in a hotel as an intern or receptionist.", apply: "Apply to hotels and lodges.", milestone: "Promoted to front office supervisor." },
  "Chef": { exp: "Kitchen attachment (commis chef) in a hotel or restaurant.", apply: "Apply to hotels, restaurants and catering firms.", milestone: "Working as a cook or chef de partie." },
  "Tour Operations Officer": { exp: "Internship with a tour operator handling bookings and itineraries.", apply: "Apply to tour operators and travel agencies.", milestone: "First role as a tour operations officer." },
  "Wildlife Conservation Technician": { exp: "Volunteer or intern with a conservation project or protected area.", apply: "Apply to conservation organisations, parks and tourism companies.", milestone: "First conservation technician role." },
  "Small Business Owner": { exp: "Test your idea with a small pilot, record every sale and cost, and talk to your district business advisor.", apply: "Register through RDB, explore BDF services and your district employment and business development unit.", milestone: "A registered business with at least three months of sales records.", selfEmployed: true },
  "Sales Representative": { exp: "Start with sales or promotion work and learn your product thoroughly.", apply: "Apply to distributors, telecoms, consumer-goods and service companies.", milestone: "Meeting monthly sales targets in a first role." },
  "E-commerce Specialist": { exp: "Set up and run an online store or social-commerce page for a real business.", apply: "Apply to retailers and online shops, or freelance.", milestone: "A store with repeat customers and a track record." },
  "Solar PV Technician": { exp: "Attachment with a solar installer on live systems.", apply: "Apply to solar companies and mini-grid projects.", milestone: "Qualified installer completing systems independently." },
  "Renewable Energy Technician": { exp: "Attachment with an energy firm, utility project or a polytechnic energy lab project.", apply: "Apply to energy firms, mini-grid developers and utilities.", milestone: "First post maintaining renewable energy systems." },
  "Logistics Coordinator": { exp: "Attachment at a freight, warehouse or distribution company.", apply: "Apply to freight forwarders, distribution and manufacturing firms.", milestone: "First logistics coordinator role." },
  "Airport Operations Officer": { exp: "Internship in airport or airline operations and customer handling.", apply: "Apply to airlines and airport service providers.", milestone: "First role in airport operations." },
  "Mining Technician": { exp: "Site attachment at a mine or quarry under strict safety supervision.", apply: "Apply to mining and quarry operators.", milestone: "First role as a mining technician." },
  "Graphic Designer": { exp: "Complete design briefs for real clients or community groups and build a portfolio.", apply: "Apply to agencies, media houses and brands, or freelance.", milestone: "Portfolio and first paying client or role." },
  "Film & Video Producer": { exp: "Produce short videos for NGOs or local businesses and crew on productions.", apply: "Apply to production houses, media and communication teams.", milestone: "First produced piece on a client brief." },
  "Fashion Designer": { exp: "Make collections or orders and sell at local markets or online.", apply: "Apply to garment makers and boutiques, or start your own label with BDF and district business support.", milestone: "First collection or regular orders." },
};

const START_AND_MONTHS: Partial<Record<Edu, [Edu, number]>> = {
  BACHELORS: ["UPPER_SECONDARY", 54],
  DIPLOMA: ["UPPER_SECONDARY", 42],
  TVET_CERTIFICATE: ["LOWER_SECONDARY", 24],
  UPPER_SECONDARY: ["UPPER_SECONDARY", 18],
};

const SECTOR_SKILL_RESOURCE: Record<string, Res> = {
  ICT: R.fcc, AGRI: R.fao, FIN: R.khan, COMM: R.khan, TOUR: R.bbc,
  CONSTR: R.rtb, MANUF: R.rtb, ENERGY: R.rtb, MINING: R.rtb, TRANS: R.rtb,
  HEALTH: R.hec, EDU: R.hec, CREATIVE: R.rp,
};

const LEVEL_RANK: Record<string, number> = {
  NONE: 0, PRIMARY: 1, LOWER_SECONDARY: 2, UPPER_SECONDARY: 3, TVET_CERTIFICATE: 4, DIPLOMA: 5, BACHELORS: 6, MASTERS: 7, DOCTORATE: 8,
};

const slugify = (t: string) => t.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function educationStep(occ: OccupationSeed): PathStepTuple {
  const linked = PROGRAMS.filter((p) => p.occupations.includes(occ.title));
  const minRank = LEVEL_RANK[occ.minEducation];
  const pick = (cands: ProgramSeed[]) =>
    cands.find((p) => p.source === "rp-programmes-catalogue") ?? cands.find((p) => p.source === "institution-official-sites-2026") ?? cands[0];
  const exact = linked.filter((p) => LEVEL_RANK[p.level] === minRank);
  const higher = linked.filter((p) => LEVEL_RANK[p.level] > minRank);
  const main = pick(exact.length ? exact : higher.length ? higher : linked);

  if (occ.minEducation === "TVET_CERTIFICATE") {
    const route = main ? ` For a higher-level route, ${main.institution} offers ${main.name} (see the Rwanda Polytechnic programmes page).` : "";
    return ["Education", "Complete a trade certificate", `Complete a TVET trade certificate at an RTB-recognised TVET school or training centre (RTB's site has a TVET schools map).${route}`,
      "EDUCATION", 0, ...(main?.source === "rp-programmes-catalogue" ? R.rp : R.rtb)];
  }
  if (!main) {
    return ["Education", `Meet the entry education for ${occ.title}`, `Reach ${occ.minEducation.toLowerCase().replace(/_/g, " ")} level at an institution accredited by HEC or recognised by RTB.`, "EDUCATION", 0, ...R.hec];
  }
  const others = [...new Set(linked.filter((p) => p.name === main.name && p.institution !== main.institution).map((p) => p.institution))].slice(0, 2);
  const alt = others.length ? ` The same programme is also listed at ${others.join(" and ")}.` : "";
  const optional = occ.minEducation === "UPPER_SECONDARY" ? "Optional but helpful: " : "";
  return ["Education", `${optional}Study ${main.name}`, `${optional}Enrol in ${main.name} at ${main.institution}.${alt} Confirm entry requirements with the institution.`, "EDUCATION", 0,
    ...(main.source === "rp-programmes-catalogue" ? R.rp : R.hec)];
}

function roadmapFor(occ: OccupationSeed): PathSeed {
  const cfg = CFG[occ.title];
  if (!cfg) throw new Error(`Missing roadmap config for occupation "${occ.title}"`);
  const [startLevel, months] = START_AND_MONTHS[occ.minEducation] ?? ["UPPER_SECONDARY", 36];
  const top = [...occ.skills].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  const at = (f: number) => Math.round(months * f);
  const skillRes = SECTOR_SKILL_RESOURCE[occ.sector] ?? R.hec;

  const steps: PathStepTuple[] = [
    educationStep(occ),
    ["Skills", "Build the core skills", `Focus on ${top.slice(0, 3).join(", ")}${top[3] ? ` and ${top[3]}` : ""}: the skills this occupation relies on most in the HDOS model.`, "SKILL", at(0.1), ...skillRes],
    ["Practice", "Practise on real tasks", `Turn ${top[0]} into evidence: complete practical work, a project or a supervised task and keep proof of it (photos, files, a short write-up).`, "SKILL", at(0.4)],
    ["Experience", "Gain supervised experience", cfg.exp, "EXPERIENCE", at(0.6), ...R.nep],
    ["Apply", cfg.selfEmployed ? "Set up and find support" : "Apply for your first role", cfg.apply, "APPLY", at(0.85), ...(cfg.selfEmployed ? R.bdf : R.kora)],
    ["Milestone", "Reach the first milestone", cfg.milestone, "MILESTONE", months],
  ];

  return {
    slug: `roadmap-${slugify(occ.title)}`,
    type: "CAREER_ROADMAP",
    title: `${occ.title}: career roadmap`,
    summary: `A step-by-step route into ${occ.title}: education, core skills, practice, supervised experience, applying and a first milestone. ${occ.description}`,
    occupation: occ.title,
    sector: occ.sector,
    startLevel,
    durationMonths: months,
    source: SOURCE,
    steps,
  };
}

export const CAREER_ROADMAPS: PathSeed[] = OCCUPATIONS.map(roadmapFor);

export const PATHS: PathSeed[] = [...LEARNING_PATHS, ...CAREER_ROADMAPS];

/** Converts a path's step tuples into rows with a 1-based contiguous `order` (shared by the seed and its tests). */
export function stepRows(path: PathSeed) {
  return path.steps.map(([phase, title, description, kind, monthOffset, resourceLabel, resourceUrl], idx) => ({
    order: idx + 1,
    phase,
    title,
    description,
    kind,
    monthOffset,
    resourceLabel: resourceLabel ?? null,
    resourceUrl: resourceUrl ?? null,
  }));
}
