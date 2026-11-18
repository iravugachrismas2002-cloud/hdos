import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../lib/prisma";
import {
  assessReadiness,
  digestSnapshot,
  DIMENSIONS,
  type AssessmentSnapshot,
} from "../modules/venture-builder/assessment/readiness.engine";
import {
  buildValidationReport,
  canSetAssumptionStatus,
} from "../modules/venture-builder/validation/validation.engine";
import {
  calculateFinancials,
  calculateSensitivity,
  FinancialInputError,
  type FinancialInput,
} from "../modules/venture-builder/financial/financial-engine";
import { calculateScenarios } from "../modules/venture-builder/financial/scenario-calculator";
import {
  classifyCallStatus,
  matchFunding,
  type OpportunityRecord,
} from "../modules/venture-builder/funding/funding-matcher";
import {
  checkTransition,
  type LifecycleFacts,
} from "../modules/venture-builder/venture-builder.lifecycle";
import { planMvp } from "../modules/venture-builder/product-studio/mvp-planner";
import { canReadSection, roleCan } from "../modules/venture-builder/venture-builder.types";
import { resolveAccess } from "../modules/venture-builder/venture-builder.repository";
import type { AssumptionInput, EvidenceInput } from "../modules/venture-builder/assessment/evidence-scoring";

const emptySnapshot = (overrides: Partial<AssessmentSnapshot> = {}): AssessmentSnapshot => ({
  status: "DRAFT",
  hasIdea: false,
  assumptions: [],
  evidence: [],
  segmentCount: 0,
  competitorCount: 0,
  completedExperiments: 0,
  baseScenario: null,
  milestones: { total: 0, done: 0 },
  hasMvpSpec: false,
  mvpApproved: false,
  activeMembers: 1,
  hasBusinessModel: false,
  hasAssessment: false,
  kpiEntries: 0,
  ...overrides,
});

const customerAssumption: AssumptionInput = {
  id: "assumption-1",
  statement: "Customers need this service",
  category: "CUSTOMER",
  riskLevel: "HIGH",
  status: "UNTESTED",
};

const evidence = (overrides: Partial<EvidenceInput> = {}): EvidenceInput => ({
  id: "evidence-1",
  assumptionId: customerAssumption.id,
  evidenceType: "INTERVIEW",
  direction: "SUPPORTS",
  verificationStatus: "VERIFIED",
  consentGiven: true,
  ...overrides,
});

const financialInput: FinancialInput = {
  currency: "USD",
  horizonMonths: 3,
  pricePerUnit: 10,
  variableCostPerUnit: 4,
  costOfGoodsPerUnit: 3,
  fixedCostsPerMonth: 12,
  startupCosts: 10,
  openingCash: 50,
  unitsInMonth1: 3,
  monthlyGrowthRate: 0,
};

const lifecycleFacts: LifecycleFacts = {
  hasIdea: false,
  assumptionCount: 0,
  humanEvidenceCount: 0,
  testedAssumptionCount: 0,
  hasAssessment: false,
  hasApprovedMvp: false,
  doneMilestones: 0,
  hasBaseScenario: false,
  hasSupportedWillingnessToPay: false,
};

const opportunity = (overrides: Partial<OpportunityRecord> = {}): OpportunityRecord => ({
  id: "opportunity-1",
  type: "GRANT",
  title: "Startup innovation grant",
  provider: "Example provider",
  description: "Support for early-stage business ventures",
  eligibility: "Rwanda-based founders",
  deadline: new Date("2026-03-15T00:00:00.000Z"),
  isRolling: false,
  country: "Rwanda",
  url: "https://example.org/call",
  lastVerifiedAt: new Date("2026-02-01T00:00:00.000Z"),
  source: {
    name: "Example source",
    publisher: "Example publisher",
    url: "https://example.org",
    isDemo: false,
  },
  ...overrides,
});

afterEach(() => vi.restoreAllMocks());

describe("Venture Builder readiness and evidence", () => {
  it("keeps the readiness score unknown when evidence is missing", () => {
    const result = assessReadiness(emptySnapshot());

    expect(DIMENSIONS.reduce((sum, dimension) => sum + dimension.weight, 0)).toBe(100);
    expect(result.overallScore).toBeNull();
    expect(result.dimensions.every((dimension) => dimension.score === null)).toBe(true);
    expect(result.disclaimer).toMatch(/not a validated prediction of success/i);
  });

  it("produces reproducible scores and an order-independent evidence digest", () => {
    const first = emptySnapshot({ hasIdea: true, assumptions: [customerAssumption], evidence: [evidence()] });
    const reordered = { ...first, evidence: [{ ...evidence(), id: "evidence-2" }, evidence()] };
    const reversed = { ...reordered, evidence: [...reordered.evidence].reverse() };

    expect(assessReadiness(first)).toEqual(assessReadiness(first));
    expect(digestSnapshot(reordered)).toBe(digestSnapshot(reversed));
    expect(assessReadiness(first).overallScore).not.toBeNull();
  });

  it("does not count an interview without consent as supporting evidence", () => {
    const unconsented = evidence({ consentGiven: false });

    expect(canSetAssumptionStatus("SUPPORTED", [unconsented]).allowed).toBe(false);
    expect(buildValidationReport([customerAssumption], [unconsented]).summary.supported).toBe(0);
    expect(assessReadiness(emptySnapshot({ assumptions: [customerAssumption], evidence: [unconsented] })).overallScore).toBeNull();
  });

  it("keeps human review in control of validation status suggestions", () => {
    const support = evidence({ evidenceType: "OBSERVATION" });
    const secondSupport = evidence({ id: "evidence-2", evidenceType: "OBSERVATION" });
    const report = buildValidationReport([customerAssumption], [support, secondSupport]);

    expect(canSetAssumptionStatus("SUPPORTED", [support]).allowed).toBe(true);
    expect(report.supported).toHaveLength(0);
    expect(report.untested[0].suggestion).toBe("SUPPORTED");
    expect(customerAssumption.status).toBe("UNTESTED");
  });
});

describe("Venture Builder financial engine", () => {
  it("calculates deterministic unit economics, break-even and cash flow", () => {
    const result = calculateFinancials(financialInput);

    expect(result.unitContribution).toBe(6);
    expect(result.grossMarginPct).toBe(70);
    expect(result.contributionMarginPct).toBe(60);
    expect(result.breakEvenUnitsPerMonth).toBe(2);
    expect(result.operatingBreakEvenMonth).toBe(1);
    expect(result.paybackMonth).toBe(2);
    expect(result.totalRevenue).toBe(90);
    expect(result.totalOperatingProfit).toBe(18);
    expect(result.endingCash).toBe(58);
    expect(result.monthly[0]).toMatchObject({ revenue: 30, variableCosts: 12, fixedCosts: 12, closingCash: 46 });
  });

  it("rounds decimal currencies at the declared minor-unit boundary", () => {
    const result = calculateFinancials({
      ...financialInput,
      horizonMonths: 1,
      pricePerUnit: 1.005,
      variableCostPerUnit: 0,
      costOfGoodsPerUnit: 0,
      fixedCostsPerMonth: 0,
      startupCosts: 0,
      openingCash: 0,
      unitsInMonth1: 1,
    });

    expect(result.totalRevenue).toBe(1.01);
    expect(result.unitContribution).toBe(1.01);
  });

  it("supports zero-decimal Rwandan francs without adding fractional units", () => {
    const result = calculateFinancials({
      ...financialInput,
      currency: "RWF",
      pricePerUnit: 1250,
      variableCostPerUnit: 250,
      costOfGoodsPerUnit: 250,
    });

    expect(result.unitContribution).toBe(1000);
    expect(result.monthly[0].revenue).toBe(3750);
  });

  it("rejects projections that exceed supported unit and integer-precision limits", () => {
    expect(() =>
      calculateFinancials({
        ...financialInput,
        horizonMonths: 60,
        unitsInMonth1: 1e9,
        monthlyGrowthRate: 1,
      }),
    ).toThrow(FinancialInputError);
    expect(() =>
      calculateFinancials({
        ...financialInput,
        horizonMonths: 1,
        pricePerUnit: 1e12,
        unitsInMonth1: 1e9,
      }),
    ).toThrow(/safe financial precision/);
  });

  it("rejects invalid costs and growth values explicitly", () => {
    expect(() => calculateFinancials({ ...financialInput, costOfGoodsPerUnit: 5 })).toThrow(/cannot exceed/);
    expect(() => calculateFinancials({ ...financialInput, monthlyGrowthRate: 1.1 })).toThrow(/monthlyGrowthRate/);
  });

  it("reproduces all scenarios from the same founder inputs", () => {
    const first = calculateScenarios(financialInput);
    const second = calculateScenarios(financialInput);

    expect(first).toEqual(second);
    expect(first.map((scenario) => scenario.caseType)).toEqual(["CONSERVATIVE", "BASE", "UPSIDE"]);
    expect(first[1].inputs).toEqual(financialInput);
  });

  it("calculates negative sensitivity outcomes without losing currency precision", () => {
    const sensitivity = calculateSensitivity({
      ...financialInput,
      pricePerUnit: 4,
      variableCostPerUnit: 4,
      costOfGoodsPerUnit: 4,
      fixedCostsPerMonth: 12,
      startupCosts: 20,
    });

    expect(sensitivity).toHaveLength(16);
    expect(sensitivity.every((row) => Number.isFinite(row.profitDeltaVsBase))).toBe(true);
    expect(sensitivity.some((row) => row.totalOperatingProfit < 0)).toBe(true);
  });
});

describe("Venture Builder funding and lifecycle gates", () => {
  it("never presents illustrative catalogue calls as active funding", () => {
    const demoCall = opportunity({ source: { ...opportunity().source, isDemo: true } });
    const [match] = matchFunding([demoCall], { sectorName: null, country: "Rwanda" }, new Date("2026-02-15T00:00:00.000Z"));

    expect(match.callStatus).toBe("UNVERIFIED");
    expect(match.isActive).toBe(false);
  });

  it("flags expired, stale, unverified and deadline-unknown opportunities", () => {
    const now = new Date("2026-02-15T00:00:00.000Z");

    expect(classifyCallStatus({ deadline: new Date("2026-02-01"), isRolling: false, lastVerifiedAt: now }, now)).toBe("EXPIRED");
    expect(classifyCallStatus({ deadline: null, isRolling: true, lastVerifiedAt: null }, now)).toBe("UNVERIFIED");
    expect(classifyCallStatus({ deadline: null, isRolling: true, lastVerifiedAt: new Date("2025-01-01") }, now)).toBe("STALE");
    expect(classifyCallStatus({ deadline: null, isRolling: false, lastVerifiedAt: now }, now)).toBe("DEADLINE_UNKNOWN");
  });

  it("requires gates in order while allowing founders to return to earlier research", () => {
    expect(checkTransition("DRAFT", "DISCOVERY", lifecycleFacts, 0).missing).toHaveLength(1);
    expect(checkTransition("DRAFT", "VALIDATING", { ...lifecycleFacts, hasIdea: true }, 0).code).toBe("SKIPS_STAGE");
    expect(checkTransition("DRAFT", "DISCOVERY", { ...lifecycleFacts, hasIdea: true }, 0).ok).toBe(true);
    expect(checkTransition("VALIDATING", "DRAFT", lifecycleFacts, 1).ok).toBe(true);
  });
});

describe("Venture Builder workspace safety", () => {
  it("scopes access lookup to the requested active project membership", async () => {
    const lookup = vi.spyOn(prisma.ventureMember, "findFirst").mockResolvedValue({
      role: "VIEWER",
      sharedSections: ["overview"],
    } as never);

    await expect(resolveAccess("venture-1", "user-1")).resolves.toEqual({
      projectId: "venture-1",
      userId: "user-1",
      role: "VIEWER",
      sharedSections: ["overview"],
    });
    expect(lookup).toHaveBeenCalledWith({
      where: { projectId: "venture-1", userId: "user-1", status: "ACTIVE" },
      select: { role: true, sharedSections: true },
    });
  });

  it("does not reveal a venture when the caller has no active membership", async () => {
    vi.spyOn(prisma.ventureMember, "findFirst").mockResolvedValue(null);

    await expect(resolveAccess("venture-1", "other-user")).rejects.toMatchObject({
      code: "VENTURE_NOT_FOUND",
    });
  });

  it("restricts viewer and advisor permissions independently of frontend visibility", () => {
    expect(roleCan("VIEWER", "read")).toBe(true);
    expect(roleCan("VIEWER", "edit")).toBe(false);
    expect(roleCan("ADVISOR", "read")).toBe(true);
    expect(canReadSection("ADVISOR", ["discovery"], "discovery")).toBe(true);
    expect(canReadSection("ADVISOR", ["team", "activity"], "team")).toBe(false);
    expect(canReadSection("ADVISOR", ["team", "activity"], "activity")).toBe(false);
  });

  it("labels generated MVP placeholders and untested assumptions instead of claiming validation", () => {
    const spec = planMvp({
      name: "FoodLink",
      idea: "Connect local food suppliers to restaurants",
      problem: null,
      segments: [],
      features: [],
      supportedAssumptions: [],
      untestedHighRiskAssumptions: ["Restaurants will pay a monthly subscription"],
    });

    expect(spec.meta.generatedBy).toBe("template");
    expect(spec.meta.evidenceWarnings.join(" ")).toMatch(/not a validated product/i);
    expect(spec.meta.evidenceWarnings.join(" ")).toMatch(/placeholders/i);
    expect(spec.meta.evidenceWarnings.join(" ")).toMatch(/untested/i);
  });
});
