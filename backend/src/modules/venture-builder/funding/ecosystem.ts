// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Curated links to Rwanda's innovation ecosystem. HDOS complements these organisations rather than copying their
// directories: no scraping, no claim of live synchronisation, and no call is shown as open from this list.
export interface EcosystemSourceRecord {
  slug: string;
  name: string;
  publisher: string;
  url: string | null;
  retrievedAt: Date | string;
  isDemo: boolean;
}

export interface EcosystemEntry {
  id: string;
  name: string;
  role: string;
  officialUrl: string;
  integration: "LINK_ONLY";
  focus: string[];
  note: string;
  source: {
    name: string;
    publisher: string;
    url: string;
    retrievedAt: string;
    isDemo: boolean;
  };
}

interface EcosystemLink {
  id: string;
  name: string;
  role: string;
  sourceSlug: string;
  integration: "LINK_ONLY";
  focus: string[];
  note: string;
}

export const ECOSYSTEM: EcosystemLink[] = [
  {
    id: "rwanda-lmis",
    name: "Rwanda Labour Market Information System",
    role: "Labour-market information and employment resources",
    sourceSlug: "rwanda-lmis",
    integration: "LINK_ONLY",
    focus: ["Labour market", "Employment", "Skills"],
    note: "Link only. HDOS does not ingest datasets or treat the landing page as evidence of current demand.",
  },
  {
    id: "innovate-rwanda",
    name: "Innovate Rwanda",
    role: "National front door for startups, ecosystem support organisations and investors",
    sourceSlug: "innovate-rwanda",
    integration: "LINK_ONLY",
    focus: ["Ecosystem directory", "Programmes", "Investors"],
    note: "Use it to find programmes and support organisations; HDOS does not clone its directory.",
  },
  {
    id: "hanga-central",
    name: "Hanga Central",
    role: "Startup opportunities and innovation-ecosystem information across sectors",
    sourceSlug: "hanga-central",
    integration: "LINK_ONLY",
    focus: ["AgTech", "FinTech", "EdTech", "HealthTech", "CleanTech"],
    note: "Opportunities change often; confirm each call, eligibility and deadline on the publisher's page.",
  },
  {
    id: "rp-ict-innovation-center",
    name: "RP ICT Innovation Center",
    role: "Incubation and acceleration programme",
    sourceSlug: "rp-ict-innovation-center",
    integration: "LINK_ONLY",
    focus: ["Idea validation", "MVP", "Investment readiness"],
    note: "The linked page described a 2026 cohort whose deadline has passed; check the official page for a future intake.",
  },
  {
    id: "rdb",
    name: "Rwanda Development Board (RDB)",
    role: "Business registration and investment-sector information",
    sourceSlug: "rdb-official",
    integration: "LINK_ONLY",
    focus: ["Registration", "Investment sectors"],
    note: "HDOS never registers a company for you; registration is completed with RDB.",
  },
  {
    id: "nisr",
    name: "National Institute of Statistics of Rwanda (NISR)",
    role: "Official labour-force statistics",
    sourceSlug: "nisr-lfs-2024-annual",
    integration: "LINK_ONLY",
    focus: ["Labour force survey", "Employment statistics"],
    note: "Statistics describe historical trends; they are not proof that customers want your product or that a role is currently in demand.",
  },
  {
    id: "mineduc",
    name: "Ministry of Education (MINEDUC)",
    role: "Education-sector information",
    sourceSlug: "mineduc-official",
    integration: "LINK_ONLY",
    focus: ["Education", "Higher learning"],
    note: "Context link only; verify current policy, programmes and requirements with the responsible institution.",
  },
  {
    id: "hec-institutions",
    name: "Higher Education Council (HEC)",
    role: "Higher-learning institution information",
    sourceSlug: "hec-hli-register-2025",
    integration: "LINK_ONLY",
    focus: ["Higher education", "Institutions"],
    note: "The linked register is dated 2025; confirm current institutional and programme status with HEC.",
  },
  {
    id: "hec-scholarships",
    name: "Higher Education Council (HEC) scholarships",
    role: "Scholarship and study-loan announcements",
    sourceSlug: "hec-scholarships-2026",
    integration: "LINK_ONLY",
    focus: ["Scholarships", "Study loans"],
    note: "Calls are cycle-specific. Check HEC for current application status, eligibility and deadlines.",
  },
  {
    id: "rwanda-polytechnic",
    name: "Rwanda Polytechnic (RP)",
    role: "Programmes and technical education",
    sourceSlug: "rp-programmes-catalogue",
    integration: "LINK_ONLY",
    focus: ["Technical education", "Programmes"],
    note: "The catalogue records programme names and award levels; confirm current intakes and entry requirements with RP.",
  },
  {
    id: "rtb",
    name: "Rwanda TVET Board (RTB)",
    role: "Technical and vocational education information",
    sourceSlug: "rtb-official",
    integration: "LINK_ONLY",
    focus: ["TVET", "Skills"],
    note: "Link only; check RTB for current training, assessment and certification information.",
  },
  {
    id: "mifotra",
    name: "Ministry of Public Service and Labour (MIFOTRA)",
    role: "Employment and labour policy information",
    sourceSlug: "mifotra-labour-official",
    integration: "LINK_ONLY",
    focus: ["Employment", "Labour policy"],
    note: "The ministry page is contextual; HDOS has not derived current occupation-level demand or salary estimates from it.",
  },
  {
    id: "bdf",
    name: "Business Development Fund (BDF)",
    role: "Business finance and development services",
    sourceSlug: "bdf-services",
    integration: "LINK_ONLY",
    focus: ["Business finance", "Advisory", "Guarantees"],
    note: "Confirm current products, eligibility, terms and application routes directly with BDF.",
  },
];

export const hydrateEcosystem = (sources: readonly EcosystemSourceRecord[]): EcosystemEntry[] => {
  const sourceBySlug = new Map(sources.map((source) => [source.slug, source]));
  return ECOSYSTEM.map(({ sourceSlug, ...entry }) => {
    const source = sourceBySlug.get(sourceSlug);
    if (!source) throw new Error(`Missing seeded ecosystem source: ${sourceSlug}`);
    if (!source.url || !source.url.startsWith("https://")) {
      throw new Error(`Ecosystem source must have an HTTPS URL: ${sourceSlug}`);
    }
    return {
      ...entry,
      officialUrl: source.url,
      source: {
        name: source.name,
        publisher: source.publisher,
        url: source.url,
        retrievedAt: source.retrievedAt instanceof Date ? source.retrievedAt.toISOString() : source.retrievedAt,
        isDemo: source.isDemo,
      },
    };
  });
};

export interface TeamRoleTemplate {
  key: string;
  title: string;
  competencies: string[];
  responsibilities: string[];
  estimatedInvolvement: string;
}

/** Role catalogue only. Identifying a needed role is not hiring anyone and never implies a specific person. */
export const TEAM_ROLES: TeamRoleTemplate[] = [
  { key: "founder-ceo", title: "Founder / CEO", competencies: ["Vision and decision making", "Customer discovery", "Fundraising basics"], responsibilities: ["Own the problem and the strategy", "Lead customer research", "Represent the venture"], estimatedInvolvement: "Full time once validated" },
  { key: "technical-cofounder", title: "Technical co-founder", competencies: ["Software architecture", "Product delivery", "Security basics"], responsibilities: ["Own the technical design", "Build and ship the MVP", "Manage technical risk"], estimatedInvolvement: "Part to full time" },
  { key: "software-engineer", title: "Software engineer", competencies: ["Programming", "Testing", "Version control"], responsibilities: ["Implement features", "Write tests", "Fix defects"], estimatedInvolvement: "Per sprint" },
  { key: "product-designer", title: "Product designer", competencies: ["User research", "Interface design", "Prototyping"], responsibilities: ["Design user journeys", "Prototype and test with users"], estimatedInvolvement: "Part time during MVP" },
  { key: "business-development", title: "Business development lead", competencies: ["Sales", "Partnerships", "Negotiation"], responsibilities: ["Find early customers", "Build partnerships"], estimatedInvolvement: "Part to full time" },
  { key: "accountant", title: "Accountant", competencies: ["Bookkeeping", "Tax compliance", "Financial reporting"], responsibilities: ["Keep records", "Prepare statutory filings"], estimatedInvolvement: "A few hours a month" },
  { key: "marketing", title: "Marketing professional", competencies: ["Content", "Digital channels", "Analytics"], responsibilities: ["Reach target customers", "Measure acquisition cost"], estimatedInvolvement: "Part time" },
  { key: "industry-specialist", title: "Industry specialist", competencies: ["Sector knowledge", "Regulation", "Supply chains"], responsibilities: ["Advise on feasibility and compliance"], estimatedInvolvement: "Advisory" },
  { key: "operations-manager", title: "Operations manager", competencies: ["Process design", "Logistics", "Quality control"], responsibilities: ["Deliver the product or service reliably"], estimatedInvolvement: "Full time at launch" },
];
