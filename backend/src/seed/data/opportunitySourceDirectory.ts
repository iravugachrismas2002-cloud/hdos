export type OpportunitySourceCategory = "JOBS" | "SCHOLARSHIPS" | "LEARNING" | "BUSINESS";

export interface OpportunitySourceDirectoryEntry {
  sourceSlug: string;
  category: OpportunitySourceCategory;
  description: string;
  focus: string[];
}

/** Links to external listing or official service pages; HDOS does not imply live synchronization. */
export const OPPORTUNITY_SOURCE_DIRECTORY: OpportunitySourceDirectoryEntry[] = [
  { sourceSlug: "opportunity-in-rwanda", category: "JOBS", description: "Search Rwanda and regional job openings and use the provider's applicant tools.", focus: ["Jobs", "Internships", "CV tools"] },
  { sourceSlug: "unjobs-rwanda", category: "JOBS", description: "Browse Rwanda duty-station vacancies from UN and international development organizations.", focus: ["United Nations", "Development", "NGOs"] },
  { sourceSlug: "job-in-rwanda", category: "JOBS", description: "Browse Rwanda job-board listings, including private-sector and civil-society roles.", focus: ["Jobs", "NGOs", "Public services"] },
  { sourceSlug: "un-rwanda-jobs", category: "JOBS", description: "Check the official United Nations in Rwanda vacancy page and follow each role's own application link.", focus: ["UN agencies", "Education", "Health", "Policy"] },
  { sourceSlug: "mifotra-recruitment-portal", category: "JOBS", description: "Find public-service vacancies and application instructions on Rwanda's civil-service recruitment portal.", focus: ["Government", "Public service"] },
  { sourceSlug: "hec-scholarships-2026", category: "SCHOLARSHIPS", description: "Check HEC's official scholarship and study-loan announcements for current calls and their exact requirements.", focus: ["Scholarships", "Study loans", "Higher education"] },
  { sourceSlug: "ingazi-skills", category: "LEARNING", description: "Explore Ingazi courses and career-skills resources; course access and certificates are managed by Ingazi.", focus: ["Digital skills", "Job readiness", "Certificates"] },
  { sourceSlug: "rdb-registrar-general", category: "BUSINESS", description: "Use RDB's Registrar General services for business registration and related formalization steps.", focus: ["Business registration", "Enterprise formalization"] },
];
