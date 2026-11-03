// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Mirrors docs/API.md. Keep in sync with the backend contract.

export type Role =
  | "STUDENT" | "GRADUATE" | "JOB_SEEKER" | "ENTREPRENEUR" | "PROFESSIONAL" | "GOVERNMENT_ANALYST" | "ADMINISTRATOR";
export type EducationLevel =
  | "NONE" | "PRIMARY" | "LOWER_SECONDARY" | "UPPER_SECONDARY" | "TVET_CERTIFICATE" | "DIPLOMA" | "BACHELORS" | "MASTERS" | "DOCTORATE";
export type GoalCategory = "EDUCATION" | "CAREER" | "ENTREPRENEURSHIP" | "SKILLS" | "INCOME" | "STUDY_ABROAD";
export type GoalStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
export type StepStatus = "TODO" | "IN_PROGRESS" | "DONE" | "SKIPPED";
export type OpportunityType = "SCHOLARSHIP" | "INTERNSHIP" | "JOB" | "TRAINING" | "FELLOWSHIP" | "GRANT";
export type DemandLevel = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" | "UNKNOWN";
export type InstitutionType = "UNIVERSITY" | "POLYTECHNIC" | "TVET" | "ACADEMY" | "OTHER";

export interface ApiErrorBody {
  error: { code: string; message: string; details?: { field: string; message: string }[] };
}
export interface Meta { page: number; pageSize: number; total: number }

export interface SourceRef {
  id: string; name: string; publisher: string; url: string | null; publishedAt: string | null; isDemo: boolean;
}
export interface OpportunitySource {
  id: string; slug: string; name: string; publisher: string; url: string | null; isDemo: boolean;
  category: "JOBS" | "SCHOLARSHIPS" | "LEARNING" | "BUSINESS"; description: string; focus: string[];
}
export interface User {
  id: string; email: string; name: string | null; role: Role; emailVerified: boolean; avatarData: string | null; profileComplete: boolean;
}

export interface Profile {
  educationLevel: EducationLevel;
  districtId: string | null; districtName: string | null;
  birthYear: number | null; bio: string | null; avatarData: string | null; targetMonthlyIncomeRwf: number | null;
  skills: { skillId: string; name: string; level: number }[];
  sectorInterests: { sectorId: string; name: string }[];
  completeness: number; updatedAt: string;
}
export interface ProfileInput {
  educationLevel: EducationLevel; avatarData: string | null;
  districtId: string | null; birthYear: number | null; bio: string | null; targetMonthlyIncomeRwf: number | null;
  skills: { skillId: string; level: number }[]; sectorIds: string[];
}

export interface District { id: string; name: string; province: string }
export interface Sector { id: string; code: string; name: string; nst2Priority: boolean }
export interface Skill { id: string; name: string; category: string | null }

export interface Occupation {
  id: string; title: string; description: string | null;
  sector: { id: string; name: string; nst2Priority: boolean };
  minEducation: EducationLevel; demand: DemandLevel;
  salaryMinRwf: number | null; salaryMaxRwf: number | null; demandSource: SourceRef | null;
}
export interface Program {
  id: string; name: string; level: EducationLevel; durationMonths: number | null; url: string | null;
  institution: { id: string; name: string; type: InstitutionType; district: string | null; website: string | null };
  skills: string[]; source: SourceRef;
}
export interface Opportunity {
  id: string; type: OpportunityType; title: string; provider: string; description: string | null;
  eligibility: string | null; minEducation: EducationLevel | null; deadline: string | null; isRolling: boolean;
  country: string | null; url: string | null; lastVerifiedAt: string | null; source: SourceRef;
}

export interface Indicator {
  code: string; name: string; unit: string; value: number; period: string; geography: string; source: SourceRef;
}
export interface DistrictStat {
  districtId: string; name: string; province: string; population: number; urbanPopulation: number; urbanShare: number;
}
export interface DistrictInsights { year: number | null; source: SourceRef | null; districts: DistrictStat[] }

export interface Goal {
  id: string; title: string; description: string | null; category: GoalCategory; status: GoalStatus;
  targetDate: string | null; targetOccupation: { id: string; title: string } | null;
  progress: number | null; createdAt: string;
}
export interface GoalInput {
  title: string; category: GoalCategory; description?: string | null; targetDate?: string | null; targetOccupationId?: string | null;
}

export interface RoadmapStep {
  id: string; order: number; phase: string; title: string; description: string;
  kind: "EDUCATION" | "SKILL" | "EXPERIENCE" | "APPLY" | "MILESTONE"; monthOffset: number; status: StepStatus;
  ref: { type: "PROGRAM" | "OPPORTUNITY" | "SKILL" | "OCCUPATION"; id: string; label: string } | null;
}
export interface Roadmap {
  id: string; goalId: string; summary: string; engineVersion: string; generatedAt: string; progress: number; steps: RoadmapStep[];
}

export interface Evidence { label: string; value: string; source: SourceRef | null }
export interface FitComponents {
  skillCoverage: number; educationReadiness: number; marketDemand: number; nationalPriority: number; interest: number;
}
export interface OccupationMatch {
  occupation: Occupation; fitScore: number; band: "STRONG" | "PROMISING" | "STRETCH";
  confidence: "LOW" | "MEDIUM" | "HIGH"; components: FitComponents;
  missingSkills: { skillId: string; name: string; importance: number; requiredLevel: number; currentLevel: number }[];
  reasons: string[]; evidence: Evidence[];
}
export interface ProgramMatch { program: Program; score: number; closesGaps: string[]; reasons: string[] }
export interface OpportunityMatch { opportunity: Opportunity; score: number; eligibleNow: boolean; reasons: string[] }
export interface Recommendations {
  engineVersion: string; generatedAt: string; profileCompleteness: number;
  occupations: OccupationMatch[]; programs: ProgramMatch[]; opportunities: OpportunityMatch[];
  notes: string[]; disclaimer: string;
}
export type AiProviderId = "gemini" | "groq" | "openrouter";
/** `fallback` means the built-in template answered because no AI provider was available. */
export type AnswerProvider = AiProviderId | "fallback";
export type ServiceState = "online" | "degraded" | "offline";

export interface Explanation {
  text: string; generatedBy: "ai" | "template"; provider: string; model: string | null; disclaimer: string;
}

export interface ChatMsg {
  id: string; role: "user" | "assistant"; content: string; provider: string | null; createdAt: string;
}
export interface ChatReply {
  userMessage: ChatMsg; reply: ChatMsg; generatedBy: "ai" | "template"; provider: AnswerProvider; disclaimer: string;
}

export interface SkillRecommendation { skill: string; currentLevel: number; requiredLevel: number; gap: number }
export interface GoalGuidance {
  goalId: string; guidance: string; skillRecommendations: SkillRecommendation[];
  generatedBy: "ai" | "template"; provider: string; model: string | null; disclaimer: string;
}

export type PathType = "LEARNING_PATH" | "CAREER_ROADMAP";
export type PathStepKind = "EDUCATION" | "SKILL" | "EXPERIENCE" | "APPLY" | "MILESTONE";
export interface PathSummary {
  id: string; slug: string; type: PathType; title: string; summary: string;
  startLevel: EducationLevel | null; durationMonths: number | null;
  occupation: { id: string; title: string } | null; sector: { id: string; name: string } | null;
  stepCount: number; source: SourceRef;
}
export interface PathStep {
  order: number; phase: string; title: string; description: string; kind: PathStepKind; monthOffset: number;
  resource: { label: string; url: string | null } | null;
}
export interface PathDetail extends PathSummary { steps: PathStep[] }

export interface ProviderStatus {
  id: AiProviderId; label: string; model: string; configured: boolean; state: ServiceState;
  consecutiveFailures: number; lastSuccessAt: string | null; lastFailureAt: string | null;
  lastError: string | null; lastLatencyMs: number | null;
}
export interface MonitoringReport {
  generatedAt: string;
  system: { status: ServiceState; environment: string; uptimeSeconds: number; nodeVersion: string; memoryMb: number };
  services: { name: string; status: ServiceState; detail: string }[];
  database: { status: ServiceState; latencyMs: number | null };
  totals: {
    users: number; usersLast7d: number; goals: number; roadmaps: number; chatMessages: number;
    recommendations: number; recommendations24h: number;
  };
  ai: {
    status: ServiceState; providers: ProviderStatus[]; fallbackOrder: string[];
    requestsTotal: number; requests24h: number; failures24h: number; fallbackResponses24h: number;
    byProvider: { provider: string; requests24h: number; failures24h: number; avgLatencyMs: number | null }[];
  };
}

export interface Cell { key: string; count: number | null; suppressed: boolean }
export interface AnalyticsOverview {
  totalUsers: number; minimumCohort: number; usersByRole: Cell[]; goalsByCategory: Cell[];
  goalsByDistrict: Cell[]; topTargetOccupations: Cell[];
}
export interface AdminUser {
  id: string; email: string; name: string | null; role: Role; emailVerified: boolean; createdAt: string;
}
export interface AuditEntry {
  id: string; action: string; actorId: string | null; targetId: string | null; ip: string | null; createdAt: string;
}
