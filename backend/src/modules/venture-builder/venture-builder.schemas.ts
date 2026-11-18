// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { z } from "zod";
import { mvpContentSchema } from "./ai/venture-output-schemas";
import { SECTIONS } from "./venture-builder.types";

const optText = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const date = z.coerce.date();
const money = z.number().finite().min(0).max(1e12);

export const VENTURE_STATUSES = ["DRAFT", "DISCOVERY", "VALIDATING", "VALIDATION_REVIEW", "FEASIBILITY_REVIEW", "MVP_PLANNING", "BUILDING", "PILOTING", "LAUNCH_READY", "ACTIVE", "PAUSED", "STOPPED", "ARCHIVED"] as const;
const CATEGORIES = ["PROBLEM", "CUSTOMER", "MARKET", "WILLINGNESS_TO_PAY", "TECHNICAL", "FINANCIAL", "OPERATIONAL", "DIFFERENTIATION", "TEAM"] as const;
const RISK = ["LOW", "MEDIUM", "HIGH"] as const;
const WORK_STATUS = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"] as const;
const REVENUE_TYPES = ["SUBSCRIPTION", "COMMISSION", "LICENSING", "TRANSACTION_FEE", "SERVICE_DELIVERY", "DIRECT_SALES", "B2B_CONTRACT"] as const;
const currency = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code such as RWF");

export const createProjectSchema = z.object({
  name: z.string().trim().min(3, "Give the venture a name (at least 3 characters)").max(120),
  ideaSummary: optText(4000),
  problemStatement: optText(2000),
  sectorId: z.string().min(1).nullish(),
  districtId: z.string().min(1).nullish(),
  currency: currency.default("RWF"),
  startMode: z.enum(["OWN_IDEA", "DISCOVER"]).optional(),
  aiProcessingConsent: z.boolean().default(false),
});

export const updateProjectSchema = createProjectSchema.partial().omit({ startMode: true });

export const statusChangeSchema = z.object({
  toStatus: z.enum(VENTURE_STATUSES),
  reason: z.string().trim().min(3, "Say why the status is changing").max(500),
  evidenceIds: z.array(z.string().min(1)).max(20).default([]),
});

export const createAssumptionSchema = z.object({
  statement: z.string().trim().min(5).max(400),
  category: z.enum(CATEGORIES),
  riskLevel: z.enum(RISK).default("MEDIUM"),
  testMethod: optText(300),
});
export const updateAssumptionSchema = z.object({
  statement: z.string().trim().min(5).max(400).optional(),
  category: z.enum(CATEGORIES).optional(),
  riskLevel: z.enum(RISK).optional(),
  testMethod: optText(300),
  status: z.enum(["UNTESTED", "TESTING", "SUPPORTED", "REFUTED", "INCONCLUSIVE"]).optional(),
});

export const createSourceSchema = z.object({
  title: z.string().trim().min(3).max(300),
  publisher: z.string().trim().min(2, "Publisher is required").max(200),
  url: z.string().trim().url().max(500).optional().nullable().transform((v) => v ?? null),
  publishedAt: date.optional().nullable().transform((v) => v ?? null),
  retrievedAt: date,
  notes: optText(1000),
});

export const createEvidenceSchema = z.object({
  assumptionId: z.string().min(1).nullish(),
  experimentId: z.string().min(1).nullish(),
  evidenceType: z.enum(["INTERVIEW", "SURVEY", "EXPERIMENT_RESULT", "OFFICIAL_STATISTIC", "DOCUMENT", "OBSERVATION", "COMPETITOR_RESEARCH", "TEST_ORDER", "OTHER"]),
  direction: z.enum(["SUPPORTS", "CONTRADICTS", "NEUTRAL"]).default("NEUTRAL"),
  description: z.string().trim().min(5).max(4000),
  sourceId: z.string().min(1).nullish(),
  documentId: z.string().min(1).nullish(),
  respondentLabel: optText(120),
  consentGiven: z.boolean().default(false),
  verificationStatus: z.enum(["USER_REPORTED", "SOURCE_LINKED", "VERIFIED", "DISPUTED"]).optional(),
  observedAt: date.optional(),
});
export const updateEvidenceSchema = z.object({
  direction: z.enum(["SUPPORTS", "CONTRADICTS", "NEUTRAL"]).optional(),
  description: z.string().trim().min(5).max(4000).optional(),
  verificationStatus: z.enum(["USER_REPORTED", "SOURCE_LINKED", "VERIFIED", "DISPUTED"]).optional(),
});

export const segmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: optText(2000),
  size: optText(200),
  needs: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
  currentAlternatives: optText(500),
});
export const competitorSchema = z.object({
  name: z.string().trim().min(2).max(120),
  offering: optText(2000),
  priceNote: optText(300),
  strengths: optText(500),
  weaknesses: optText(500),
  url: z.string().trim().url().max(500).optional().nullable().transform((v) => v ?? null),
});
export const featureSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: optText(2000),
  priority: z.enum(["MUST", "SHOULD", "COULD", "WONT"]).default("SHOULD"),
  status: z.enum(WORK_STATUS).default("TODO"),
  userStory: optText(500),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(300)).max(10).default([]),
});
export const milestoneSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: optText(1000),
  dueDate: date.optional().nullable().transform((v) => v ?? null),
  status: z.enum(WORK_STATUS).default("TODO"),
  assigneeId: z.string().min(1).nullish(),
});
export const lineItemSchema = z.object({
  kind: z.enum(["STARTUP_COST", "FIXED_COST", "VARIABLE_COST"]),
  label: z.string().trim().min(2).max(160),
  amount: money,
  note: optText(300),
  evidenceId: z.string().min(1).nullish(),
});

export const experimentSchema = z.object({
  assumptionId: z.string().min(1).nullish(),
  hypothesis: z.string().trim().min(5).max(500),
  method: z.string().trim().min(3).max(500),
  targetSample: z.number().int().min(1).max(100000).optional().nullable().transform((v) => v ?? null),
  successCriteria: z.string().trim().min(3).max(500),
  startDate: date.optional().nullable().transform((v) => v ?? null),
  endDate: date.optional().nullable().transform((v) => v ?? null),
});
export const updateExperimentSchema = experimentSchema.partial().extend({ status: z.enum(["PLANNED", "RUNNING", "COMPLETED", "CANCELLED"]).optional() });
export const experimentResultSchema = z.object({
  observation: z.string().trim().min(5).max(4000),
  metricName: optText(120),
  metricValue: z.number().finite().optional().nullable().transform((v) => v ?? null),
  sampleSize: z.number().int().min(0).max(1000000).optional().nullable().transform((v) => v ?? null),
  outcome: z.enum(["SUPPORTS", "CONTRADICTS", "INCONCLUSIVE"]),
  completeExperiment: z.boolean().default(false),
});

const list = (max: number) => z.array(z.string().trim().min(1).max(300)).max(max).default([]);
export const businessModelSchema = z.object({
  customerSegments: list(15),
  valueProposition: list(15),
  channels: list(15),
  customerRelationships: list(15),
  revenueStreams: z.array(z.object({ type: z.enum(REVENUE_TYPES), description: z.string().trim().min(2).max(300), pricingNote: optText(300) })).max(10).default([]),
  keyActivities: list(15),
  keyResources: list(15),
  keyPartners: list(15),
  costStructure: list(15),
  notes: optText(4000),
});

export const compareModelsSchema = z.object({
  currency: currency.default("RWF"),
  horizonMonths: z.number().int().min(1).max(60).default(12),
  startupCosts: money.default(0),
  openingCash: money.default(0),
  models: z
    .array(
      z.object({
        type: z.enum(REVENUE_TYPES),
        label: z.string().trim().max(120).optional(),
        pricePerUnit: money,
        unitsInMonth1: z.number().min(0).max(1e9),
        variableCostPerUnit: money,
        fixedCostsPerMonth: money,
        monthlyGrowthRate: z.number().min(-0.5).max(1).default(0),
      }),
    )
    .min(2, "Add at least two revenue models to compare")
    .max(7),
});

const adjustmentSchema = z.object({
  volume: z.number().min(0).max(10),
  price: z.number().min(0).max(10),
  variableCost: z.number().min(0).max(10),
  fixedCost: z.number().min(0).max(10),
  growthDelta: z.number().min(-1).max(1),
});
export const scenarioSchema = z.object({
  currency: currency.optional(),
  horizonMonths: z.number().int().min(1).max(60).default(12),
  pricePerUnit: money,
  unitsInMonth1: z.number().min(0).max(1e9),
  monthlyGrowthRate: z.number().min(-0.5).max(1).default(0),
  openingCash: money.default(0),
  costOfGoodsPerUnit: money.optional(),
  adjustments: z.object({ CONSERVATIVE: adjustmentSchema.partial().optional(), BASE: adjustmentSchema.partial().optional(), UPSIDE: adjustmentSchema.partial().optional() }).optional(),
});

export const discoverySchema = z.object({
  mode: z.enum(["OWN_IDEA", "DISCOVER"]),
  ideaText: z.string().trim().max(4000).optional(),
  sectorId: z.string().min(1).optional(),
});

export const updateSpecSchema = z.object({
  content: mvpContentSchema.partial().optional(),
  status: z.enum(["DRAFT", "APPROVED"]).optional(),
  changeNote: z.string().trim().max(300).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["ADMIN", "EDITOR", "CONTRIBUTOR", "VIEWER", "ADVISOR"]),
  sharedSections: z.array(z.enum(SECTIONS)).max(SECTIONS.length).default([]),
});
export const updateMemberSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "CONTRIBUTOR", "VIEWER", "ADVISOR"]).optional(),
  sharedSections: z.array(z.enum(SECTIONS)).max(SECTIONS.length).optional(),
});

export const kpiSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM"),
  metric: z.enum(["LEADS", "ACTIVE_CUSTOMERS", "CUSTOMER_ACQUISITION_COST", "REVENUE", "REPEAT_PURCHASES", "RETENTION_RATE", "GROSS_MARGIN", "MONTHLY_OPERATING_COSTS", "CASH_RUNWAY_MONTHS", "COMPLAINTS", "DELIVERY_TIME_DAYS"]),
  value: z.number().finite().min(0).max(1e12),
  note: optText(300),
});

export const documentLinkSchema = z.object({
  documentId: z.string().min(1),
  label: z.string().trim().min(2).max(160),
});

export const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(25),
});

export const idempotencyKey = (header: string | undefined): string | null => {
  if (!header) return null;
  const key = header.trim();
  return key.length >= 8 && key.length <= 80 ? key : null;
};
