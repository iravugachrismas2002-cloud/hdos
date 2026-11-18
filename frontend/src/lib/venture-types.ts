// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Venture Builder API shapes. Mirrors docs/VENTURE_BUILDER.md and backend/src/modules/venture-builder/.

export type VentureStatus =
  | "DRAFT" | "DISCOVERY" | "VALIDATING" | "VALIDATION_REVIEW" | "FEASIBILITY_REVIEW" | "MVP_PLANNING" | "BUILDING"
  | "PILOTING" | "LAUNCH_READY" | "ACTIVE" | "PAUSED" | "STOPPED" | "ARCHIVED";
export type VentureRole = "OWNER" | "ADMIN" | "EDITOR" | "CONTRIBUTOR" | "VIEWER" | "ADVISOR";
export type InvitableRole = Exclude<VentureRole, "OWNER">;
export type VentureSection =
  | "overview" | "discovery" | "validation" | "assessment" | "product" | "business-model" | "financial" | "funding"
  | "growth" | "team" | "documents" | "activity";
export type StartMode = "OWN_IDEA" | "DISCOVER";
export type AssumptionCategory =
  | "PROBLEM" | "CUSTOMER" | "MARKET" | "WILLINGNESS_TO_PAY" | "TECHNICAL" | "FINANCIAL" | "OPERATIONAL" | "DIFFERENTIATION" | "TEAM";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AssumptionStatus = "UNTESTED" | "TESTING" | "SUPPORTED" | "REFUTED" | "INCONCLUSIVE";
export type AssumptionOrigin = "USER" | "AI_DRAFT";
export type EvidenceType =
  | "INTERVIEW" | "SURVEY" | "EXPERIMENT_RESULT" | "OFFICIAL_STATISTIC" | "DOCUMENT" | "OBSERVATION" | "COMPETITOR_RESEARCH" | "TEST_ORDER" | "OTHER";
export type EvidenceDirection = "SUPPORTS" | "CONTRADICTS" | "NEUTRAL";
export type VerificationStatus = "USER_REPORTED" | "SOURCE_LINKED" | "VERIFIED" | "DISPUTED";
export type ExperimentStatus = "PLANNED" | "RUNNING" | "COMPLETED" | "CANCELLED";
export type ExperimentOutcome = "SUPPORTS" | "CONTRADICTS" | "INCONCLUSIVE";
export type FeaturePriority = "MUST" | "SHOULD" | "COULD" | "WONT";
export type WorkStatus = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
export type SpecStatus = "DRAFT" | "APPROVED";
export type ScenarioCase = "CONSERVATIVE" | "BASE" | "UPSIDE";
export type LineItemKind = "STARTUP_COST" | "FIXED_COST" | "VARIABLE_COST";
export type KpiMetric =
  | "LEADS" | "ACTIVE_CUSTOMERS" | "CUSTOMER_ACQUISITION_COST" | "REVENUE" | "REPEAT_PURCHASES" | "RETENTION_RATE" | "GROSS_MARGIN"
  | "MONTHLY_OPERATING_COSTS" | "CASH_RUNWAY_MONTHS" | "COMPLAINTS" | "DELIVERY_TIME_DAYS";
export type RevenueType =
  | "SUBSCRIPTION" | "COMMISSION" | "LICENSING" | "TRANSACTION_FEE" | "SERVICE_DELIVERY" | "DIRECT_SALES" | "B2B_CONTRACT";
export type CallStatus = "OPEN" | "EXPIRED" | "UNVERIFIED" | "STALE" | "DEADLINE_UNKNOWN";
export type AiRunStatus = "AI_GENERATED" | "TEMPLATE_FALLBACK" | "AI_SKIPPED";

// ───────────── Projects ─────────────

export interface VentureProject {
  id: string; name: string; ideaSummary: string | null; problemStatement: string | null;
  sector: { id: string; name: string } | null; district: { id: string; name: string } | null;
  country: string; currency: string; status: VentureStatus; startMode: StartMode | null; aiProcessingConsent: boolean;
  launchedAt: string | null; createdAt: string; updatedAt: string; myRole: VentureRole; sharedSections: VentureSection[];
}
export interface VentureListItem extends VentureProject {
  /** null for advisors, who never see counts. */
  counts: { assumptions: number; evidence: number; experiments: number; features: number; milestones: number } | null;
}
export interface VentureDashboard {
  ventures: VentureListItem[]; pendingInvitations: number; byStatus: Record<string, number>; total: number;
}
export interface VentureProjectInput {
  name: string; ideaSummary?: string | null; problemStatement?: string | null; sectorId?: string | null; districtId?: string | null;
  currency?: string; startMode?: StartMode; aiProcessingConsent?: boolean;
}
export type VentureProjectUpdate = Partial<Omit<VentureProjectInput, "startMode">>;

export interface VentureDetailFull extends VentureProject {
  stage: { key: string; label: string; index: number };
  lifecycle: { reachedStage: VentureStatus; nextStage: VentureStatus | null; nextStageRequirements: string[] };
  counts: {
    assumptions: { total: number; untested: number; supported: number; refuted: number };
    evidence: number; experiments: number; segments: number; competitors: number; features: number; milestones: number; members: number;
  };
  nextActions: string[]; risks: string[];
  latestAssessment: { version: number; overallScore: number | null; overallCoverage: number; createdAt: string } | null;
}
export interface VentureDetailRestricted extends VentureProject { detailRestricted: true }
export type VentureDetail = VentureDetailFull | VentureDetailRestricted;
export const isRestricted = (d: VentureDetail): d is VentureDetailRestricted => "detailRestricted" in d && d.detailRestricted === true;

export interface StatusChangeInput { toStatus: VentureStatus; reason: string; evidenceIds?: string[] }
export interface StatusChangeResult { from: VentureStatus; to: VentureStatus; reason: string }
export interface StatusHistoryEntry {
  id: string; from: VentureStatus; to: VentureStatus; changedById: string; reason: string; evidenceIds: string[]; createdAt: string;
}
export interface ActivityEntry {
  id: string; actorId: string | null; action: string; summary: string; entityType: string | null; entityId: string | null; createdAt: string;
}

export interface Invitation {
  id: string; projectId: string; projectName: string; invitedBy: string | null; role: VentureRole; sharedSections: VentureSection[]; createdAt: string;
}
export interface EcosystemEntry {
  id: string; name: string; role: string; officialUrl: string; integration: "LINK_ONLY"; focus: string[]; note: string;
  source: { name: string; publisher: string; url: string; retrievedAt: string; isDemo: boolean };
}
export interface TeamRoleTemplate {
  key: string; title: string; competencies: string[]; responsibilities: string[]; estimatedInvolvement: string;
}

// ───────────── Discovery ─────────────

export interface AiStatus { status: AiRunStatus; provider: string | null; model: string | null; schemaValid: boolean; note: string }
export interface DiscoveryInput { mode: StartMode; ideaText?: string; sectorId?: string }
export interface DiscoveryFactSource { name: string; publisher: string; url: string | null; retrievedAt: string; isDemo: boolean }
export interface DiscoveryFact {
  kind: "NATIONAL_STATISTIC" | "SECTOR_REFERENCE"; statement: string; source: DiscoveryFactSource; caveat: string;
}
export interface SectorLead { sectorId: string; code: string; name: string; score: number; reasons: string[] }
export interface DraftAssumption {
  id: string; statement: string; category: AssumptionCategory; riskLevel: RiskLevel; testMethod: string | null; status: AssumptionStatus; origin: AssumptionOrigin;
}
export interface FundingMatch {
  opportunityId: string; title: string; provider: string; fundingType: string; callStatus: CallStatus; isActive: boolean;
  deadline: string | null; isRolling: boolean; lastVerifiedAt: string | null; country: string | null; officialUrl: string | null;
  eligibility: string | null; matchScore: number; matchReasons: string[];
  source: { name: string; publisher: string; url: string | null; isDemo: boolean }; disclaimer: string;
}
export interface DiscoveryReport {
  mode: StartMode; generatedAt: string; aiStatus: AiStatus; summary: string;
  opportunityBrief: {
    problem: string; affectedCustomerGroups: string[]; currentAlternatives: string[]; potentialSolutions: string[]; unansweredQuestions: string[];
  };
  interviewQuestions: string[]; recommendations: string[]; draftAssumptions: DraftAssumption[];
  founderCapability: { educationLevel: string | null; skills: { name: string; level: number }[]; interests: string[] };
  sectorLeads: SectorLead[]; facts: DiscoveryFact[]; fundingLeads: FundingMatch[]; unknowns: string[];
  labels: { facts: string; aiContent: string };
  /** Present on the response to POST; absent on the stored copy returned by GET. */
  replayed?: boolean;
}

// ───────────── Validation ─────────────

export interface Assumption {
  id: string; projectId: string; statement: string; category: AssumptionCategory; riskLevel: RiskLevel; testMethod: string | null;
  status: AssumptionStatus; origin: AssumptionOrigin; createdById: string | null; createdAt: string; updatedAt: string;
  _count?: { evidence: number; experiments: number };
}
export interface AssumptionInput { statement: string; category: AssumptionCategory; riskLevel?: RiskLevel; testMethod?: string | null }
export interface AssumptionUpdate extends Partial<AssumptionInput> { status?: AssumptionStatus }

export interface ResearchSource {
  id: string; projectId: string; title: string; publisher: string; url: string | null; publishedAt: string | null; retrievedAt: string;
  notes: string | null; createdById: string | null; createdAt: string;
}
export interface ResearchSourceInput {
  title: string; publisher: string; url?: string | null; publishedAt?: string | null; retrievedAt: string; notes?: string | null;
}
export interface Evidence {
  id: string; projectId: string; assumptionId: string | null; experimentId: string | null; evidenceType: EvidenceType;
  direction: EvidenceDirection; description: string; sourceId: string | null; documentId: string | null; respondentLabel: string | null;
  consentGiven: boolean; consentRecordedAt: string | null; verificationStatus: VerificationStatus; observedAt: string;
  createdById: string | null; createdAt: string;
  source?: { id: string; title: string; publisher: string; url: string | null; retrievedAt: string } | null;
}
export interface EvidenceInput {
  assumptionId?: string | null; experimentId?: string | null; evidenceType: EvidenceType; direction?: EvidenceDirection; description: string;
  sourceId?: string | null; respondentLabel?: string | null; consentGiven?: boolean; verificationStatus?: VerificationStatus; observedAt?: string;
}
export interface EvidenceUpdate { direction?: EvidenceDirection; description?: string; verificationStatus?: VerificationStatus }

export interface CustomerSegment {
  id: string; name: string; description: string | null; size: string | null; needs: string[]; currentAlternatives: string | null;
}
export interface CustomerSegmentInput {
  name: string; description?: string | null; size?: string | null; needs?: string[]; currentAlternatives?: string | null;
}
export interface Competitor {
  id: string; name: string; offering: string | null; priceNote: string | null; strengths: string | null; weaknesses: string | null; url: string | null;
}
export interface CompetitorInput {
  name: string; offering?: string | null; priceNote?: string | null; strengths?: string | null; weaknesses?: string | null; url?: string | null;
}

export interface ExperimentResult {
  id: string; experimentId: string; observation: string; metricName: string | null; metricValue: number | null; sampleSize: number | null;
  outcome: ExperimentOutcome; recordedAt: string;
}
export interface Experiment {
  id: string; assumptionId: string | null; hypothesis: string; method: string; targetSample: number | null; successCriteria: string;
  startDate: string | null; endDate: string | null; status: ExperimentStatus; createdAt: string;
  results: ExperimentResult[]; assumption: { id: string; statement: string } | null;
}
export interface ExperimentInput {
  assumptionId?: string | null; hypothesis: string; method: string; targetSample?: number | null; successCriteria: string;
  startDate?: string | null; endDate?: string | null;
}
export interface ExperimentResultInput {
  observation: string; metricName?: string | null; metricValue?: number | null; sampleSize?: number | null; outcome: ExperimentOutcome; completeExperiment?: boolean;
}

export interface AssumptionVerdict {
  id: string; statement: string; category: AssumptionCategory; riskLevel: RiskLevel; status: AssumptionStatus;
  evidence: { supports: number; contradicts: number; usable: number; coverage: number };
  /** Advisory only: the founder decides the status. */
  suggestion: AssumptionStatus | null;
}
export interface ValidationReport {
  summary: { total: number; supported: number; refuted: number; inconclusive: number; testing: number; untested: number };
  supported: AssumptionVerdict[]; refuted: AssumptionVerdict[]; uncertain: AssumptionVerdict[]; untested: AssumptionVerdict[];
  interviews: { total: number; withConsent: number; withoutConsent: number }; gaps: string[]; disclaimer: string;
}

// ───────────── Assessment ─────────────

export interface AssessmentDimension {
  key: string; label: string; weight: number; score: number | null; coverage: number;
  evidence: { supports: number; contradicts: number; usable: number }; openAssumptions: number; missing: string[];
}
export interface FeasibilityCard {
  key: string; label: string; question: string; status: "UNKNOWN" | "WEAK" | "MODERATE" | "STRONG"; score: number | null;
  confidence: "LOW" | "MEDIUM" | "HIGH"; evidence: { supports: number; contradicts: number; usable: number };
  missingInformation: string[]; risks: string[]; outstandingTasks: string[];
}
export interface Assessment {
  id: string; version: number; createdAt: string; engineVersion: string; inputsDigest: string; overallScore: number | null;
  overallCoverage: number; provisional: boolean; maturity: { key: string; label: string; index: number };
  dimensions: AssessmentDimension[]; feasibility: FeasibilityCard[]; missingEvidence: string[]; risks: string[]; recommendations: string[];
  disclaimer: string; reused: boolean;
}
export interface AssessmentHistoryItem {
  id: string; version: number; overallScore: number | null; overallCoverage: number; maturityLabel: string; createdAt: string;
}
export interface AssessmentBundle { latest: Assessment | null; history: AssessmentHistoryItem[] }
/** Unsaved live readiness result from GET /assessment/preview. */
export interface ReadinessPreview {
  engineVersion: string; overallScore: number | null; overallCoverage: number; provisional: boolean; knownWeight: number;
  maturity: { key: string; label: string; index: number }; dimensions: AssessmentDimension[]; missingEvidence: string[];
  risks: string[]; recommendations: string[]; disclaimer: string;
}
export interface AssessmentExplanation {
  assessmentVersion: number; explanation: string; nextSteps: string[]; generatedBy: "ai" | "template"; note: string;
}

// ───────────── Product Studio ─────────────

export interface MvpContent {
  productVision: string; problemStatement: string;
  personas: { name: string; description: string; needs: string[] }[];
  userJourneys: { persona: string; steps: string[] }[];
  productRequirements: string[];
  mvpScope: { included: string[]; excluded: string[] };
  featurePriorities: { feature: string; priority: FeaturePriority; rationale?: string }[];
  userStories: string[];
  acceptanceCriteria: { story: string; criteria: string[] }[];
  functionalRequirements: string[]; nonFunctionalRequirements: string[];
  technicalArchitecture: { overview: string; components: string[]; risks: string[] };
  databaseDesign: { entity: string; purpose: string; keyFields: string[] }[];
  apiCatalogue: { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; path: string; purpose: string }[];
  developmentRoadmap: { phase: string; weeks: number; deliverables: string[] }[];
  testingStrategy: string[]; prototypeRequirements: string[];
  meta: { generatedBy: "template" | "ai-assisted"; evidenceWarnings: string[]; basedOn: { segments: number; features: number; supportedAssumptions: number } };
}
export interface MvpSpec {
  id: string; version: number; status: SpecStatus; generatedBy: string; changeNote: string | null; createdAt: string;
  content: MvpContent; replayed: boolean; aiNote?: string;
}
export interface MvpSpecUpdate { content?: Partial<Omit<MvpContent, "meta">>; status?: SpecStatus; changeNote?: string }

export interface Feature {
  id: string; title: string; description: string | null; priority: FeaturePriority; status: WorkStatus; userStory: string | null; acceptanceCriteria: string[];
}
export interface FeatureInput {
  title: string; description?: string | null; priority?: FeaturePriority; status?: WorkStatus; userStory?: string | null; acceptanceCriteria?: string[];
}
export interface Milestone {
  id: string; title: string; description: string | null; dueDate: string | null; status: WorkStatus; assigneeId: string | null;
}
export interface MilestoneInput {
  title: string; description?: string | null; dueDate?: string | null; status?: WorkStatus; assigneeId?: string | null;
}

// ───────────── Business model & financial ─────────────

export interface RevenueStream { type: RevenueType; description: string; pricingNote?: string | null }
export interface BusinessModel {
  id: string; version: number; customerSegments: string[]; valueProposition: string[]; channels: string[]; customerRelationships: string[];
  revenueStreams: RevenueStream[]; keyActivities: string[]; keyResources: string[]; keyPartners: string[]; costStructure: string[];
  notes: string | null; createdAt: string;
}
export interface BusinessModelInput {
  customerSegments: string[]; valueProposition: string[]; channels: string[]; customerRelationships: string[]; revenueStreams: RevenueStream[];
  keyActivities: string[]; keyResources: string[]; keyPartners: string[]; costStructure: string[]; notes?: string | null;
}
export interface RevenueModelOptionInput {
  type: RevenueType; label?: string; pricePerUnit: number; unitsInMonth1: number; variableCostPerUnit: number; fixedCostsPerMonth: number; monthlyGrowthRate: number;
}
export interface CompareModelsInput {
  currency?: string; horizonMonths?: number; startupCosts?: number; openingCash?: number; models: RevenueModelOptionInput[];
}
export interface RevenueModelComparison {
  type: RevenueType; label: string | null; unitContribution: number; breakEvenUnitsPerMonth: number | null; operatingBreakEvenMonth: number | null;
  totalOperatingProfit: number; lowestCash: number; capitalRequired: number;
}
export interface CompareModelsResult { currency?: string; comparison: RevenueModelComparison[]; note: string }

export interface LineItem { id: string; kind: LineItemKind; label: string; amount: number; note: string | null; evidenceId: string | null; createdAt: string }
export interface LineItemInput { kind: LineItemKind; label: string; amount: number; note?: string | null }

export interface ScenarioInput {
  currency?: string; horizonMonths?: number; pricePerUnit: number; unitsInMonth1: number;
  /** A fraction (0.05 = 5%), not a percentage. */
  monthlyGrowthRate?: number; openingCash?: number; costOfGoodsPerUnit?: number;
}
export interface MonthRow {
  month: number; units: number; revenue: number; variableCosts: number; fixedCosts: number; operatingProfit: number; closingCash: number;
}
export interface ScenarioResults {
  engineVersion: string; currency: string; unitContribution: number; grossMarginPct: number | null; contributionMarginPct: number | null;
  breakEvenUnitsPerMonth: number | null; breakEvenRevenuePerMonth: number | null; operatingBreakEvenMonth: number | null; paybackMonth: number | null;
  totalRevenue: number; totalOperatingProfit: number; endingCash: number; lowestCash: number; lowestCashMonth: number; capitalRequired: number;
  runway: { status: "SELF_SUSTAINING" | "FUNDED_THROUGH_HORIZON" | "RUNS_OUT"; months: number | null; note: string };
  monthly: MonthRow[]; warnings: string[];
}
export interface ScenarioAdjustment { volume: number; price: number; variableCost: number; fixedCost: number; growthDelta: number }
export interface ScenarioOutcome {
  caseType: ScenarioCase; adjustment?: ScenarioAdjustment; inputs: Record<string, unknown>; results: ScenarioResults;
}
export interface SensitivityRow {
  driver: "pricePerUnit" | "variableCostPerUnit" | "fixedCostsPerMonth" | "unitsInMonth1"; change: number;
  breakEvenUnitsPerMonth: number | null; totalOperatingProfit: number; lowestCash: number; profitDeltaVsBase: number;
}
export interface ScenarioSet {
  groupId: string; engineVersion: string; currency: string; scenarios: ScenarioOutcome[]; sensitivity: SensitivityRow[]; notes: string[];
}
export interface SavedScenarioSet {
  groupId: string; createdAt: string; currency: string; engineVersion: string; scenarios: ScenarioOutcome[];
}

// ───────────── Funding ─────────────

export interface FundingMatches {
  matches: FundingMatch[]; summary: { open: number; needsVerification: number; expired: number }; ecosystem: EcosystemEntry[]; notes: string[];
}
export interface FundingReadiness {
  id: string; version: number; createdAt: string; checks: { key: string; label: string; met: boolean; detail: string }[];
  metCount: number; totalChecks: number; missing: { key: string; label: string; detail: string }[]; disclaimer: string;
}

// ───────────── Team & documents ─────────────

export interface Member {
  id: string; userId: string; name: string | null; email: string; role: VentureRole; status: "ACTIVE" | "INVITED"; sharedSections: VentureSection[];
  consentedAt: string | null; createdAt: string;
}
export interface InviteInput { email: string; role: InvitableRole; sharedSections?: VentureSection[] }
export interface MemberUpdate { role?: InvitableRole; sharedSections?: VentureSection[] }
export interface DocumentLink {
  id: string; label: string; linkedById: string; createdAt: string;
  document: { id: string; kind: string; fileName: string; status: string; version: number; mimeType: string; sizeBytes: number; removed: boolean };
}

// ───────────── Growth ─────────────

export interface KpiInput { period: string; metric: KpiMetric; value: number; note?: string | null }
export interface GrowthComparison { metric: KpiMetric; actual: number; projected: number; variancePct: number | null }
export interface GrowthPeriod {
  period: string; actuals: { metric: KpiMetric; value: number; note: string | null }[]; projectedMonth: number | null;
  comparisons: GrowthComparison[]; insights: string[];
}
export interface Growth { currency: string; launchedAt: string | null; hasProjection: boolean; periods: GrowthPeriod[]; notes: string[] }
