// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Venture Readiness Assessment. Deliberately separate from the Pathway Fit Index (career matching) and never a
// probability of startup success. Fully deterministic: same snapshot -> same scores. AI cannot change a score.
import { createHash } from "node:crypto";
import type { VentureAssumptionCategory, VentureEvidenceType } from "@prisma/client";
import {
  evidenceFor,
  OPEN_STATUSES,
  scoreEvidence,
  type AssumptionInput,
  type EvidenceInput,
  type EvidenceScore,
} from "./evidence-scoring";

export const READINESS_ENGINE_VERSION = "vra-1.0.0";

export type DimensionKey =
  | "problemImportance"
  | "customerEvidence"
  | "marketAccessibility"
  | "willingnessToPay"
  | "technicalFeasibility"
  | "financialFeasibility"
  | "differentiation"
  | "founderTeam"
  | "executionReadiness"
  | "operationalRegulatory";

interface DimensionSpec {
  key: DimensionKey;
  label: string;
  weight: number;
  categories: VentureAssumptionCategory[];
  types: VentureEvidenceType[];
  hint: string;
}

/** Proposed weights from the product specification: a framework, not a validated prediction model. */
export const DIMENSIONS: readonly DimensionSpec[] = [
  { key: "problemImportance", label: "Problem importance", weight: 10, categories: ["PROBLEM"], types: [], hint: "Record evidence that customers experience this problem and care about it." },
  { key: "customerEvidence", label: "Customer evidence", weight: 20, categories: ["CUSTOMER"], types: ["INTERVIEW", "SURVEY"], hint: "Complete consented customer interviews or surveys." },
  { key: "marketAccessibility", label: "Market accessibility", weight: 10, categories: ["MARKET"], types: ["OFFICIAL_STATISTIC"], hint: "Show that the target customers can actually be reached, with sourced market data." },
  { key: "willingnessToPay", label: "Willingness-to-pay evidence", weight: 15, categories: ["WILLINGNESS_TO_PAY"], types: ["TEST_ORDER"], hint: "Run a pricing test, pre-order or test order." },
  { key: "technicalFeasibility", label: "Technical feasibility", weight: 10, categories: ["TECHNICAL"], types: [], hint: "Test that the product can be built or delivered with the available people and technology." },
  { key: "financialFeasibility", label: "Financial feasibility", weight: 10, categories: ["FINANCIAL"], types: [], hint: "Enter costs and prices and calculate a financial scenario." },
  { key: "differentiation", label: "Differentiation", weight: 10, categories: ["DIFFERENTIATION"], types: ["COMPETITOR_RESEARCH"], hint: "Compare against competitors and test why customers would switch." },
  { key: "founderTeam", label: "Founder and team capability", weight: 5, categories: ["TEAM"], types: [], hint: "Document the team's skills against the skills the venture needs." },
  { key: "executionReadiness", label: "Execution readiness", weight: 5, categories: [], types: [], hint: "Create milestones and an MVP specification, then make progress on them." },
  { key: "operationalRegulatory", label: "Operational and regulatory readiness", weight: 5, categories: ["OPERATIONAL"], types: [], hint: "Check licences, registration, supply and compliance requirements." },
];

export interface FinancialSummary {
  unitContribution: number;
  operatingBreakEvenMonth: number | null;
  lowestCash: number;
  horizonMonths: number;
}

export interface AssessmentSnapshot {
  status: string;
  hasIdea: boolean;
  assumptions: AssumptionInput[];
  evidence: EvidenceInput[];
  segmentCount: number;
  competitorCount: number;
  completedExperiments: number;
  baseScenario: FinancialSummary | null;
  milestones: { total: number; done: number };
  hasMvpSpec: boolean;
  mvpApproved: boolean;
  activeMembers: number;
  hasBusinessModel: boolean;
  hasAssessment: boolean;
  kpiEntries: number;
}

export interface DimensionResult {
  key: DimensionKey;
  label: string;
  weight: number;
  /** null = unknown (insufficient evidence). Unknown is not scored as a negative fact. */
  score: number | null;
  coverage: number;
  evidence: { supports: number; contradicts: number; usable: number };
  openAssumptions: number;
  missing: string[];
}

export interface ReadinessResult {
  engineVersion: string;
  overallScore: number | null;
  /** Evidence-weighted share of the framework that is covered (0-1). */
  overallCoverage: number;
  provisional: boolean;
  knownWeight: number;
  maturity: { key: string; label: string; index: number };
  dimensions: DimensionResult[];
  missingEvidence: string[];
  risks: string[];
  recommendations: string[];
  disclaimer: string;
}

export const READINESS_DISCLAIMER =
  "This is a proposed assessment framework, not a validated prediction of success. Scores reflect only the evidence recorded in this workspace; unknown dimensions are not counted against you.";

const MATURITY: readonly { key: string; label: string }[] = [
  { key: "IDEA_DEFINED", label: "Idea defined" },
  { key: "PROBLEM_UNDER_INVESTIGATION", label: "Problem under investigation" },
  { key: "PROBLEM_EVIDENCE_COLLECTED", label: "Problem evidence collected" },
  { key: "CUSTOMER_DEMAND_TESTED", label: "Customer demand tested" },
  { key: "FEASIBILITY_REVIEWED", label: "Feasibility reviewed" },
  { key: "MVP_READY", label: "MVP ready" },
  { key: "PILOT_EVIDENCE_COLLECTED", label: "Pilot evidence collected" },
  { key: "MARKET_LAUNCH_READY", label: "Market launch ready" },
  { key: "OPERATING_AND_GROWING", label: "Operating and growing" },
];

/** Highest stage whose objective condition is met; conditions are facts in the workspace, never AI opinions. */
export const computeMaturity = (s: AssessmentSnapshot): { key: string; label: string; index: number } => {
  const has = (cat: VentureAssumptionCategory) => s.assumptions.some((a) => a.category === cat);
  const ids = (cat: VentureAssumptionCategory) => new Set(s.assumptions.filter((a) => a.category === cat).map((a) => a.id));
  const usableEvidenceIn = (cats: VentureAssumptionCategory[]) =>
    cats.some((c) => {
      const set = ids(c);
      return scoreEvidence(s.evidence.filter((e) => e.assumptionId && set.has(e.assumptionId))).usable > 0;
    });

  let index = -1;
  if (s.hasIdea) index = 0;
  if (index >= 0 && (has("PROBLEM") || s.status === "DISCOVERY")) index = 1;
  if (index >= 1 && usableEvidenceIn(["PROBLEM"])) index = 2;
  if (index >= 2 && usableEvidenceIn(["CUSTOMER", "WILLINGNESS_TO_PAY"]) && s.completedExperiments + s.evidence.filter((e) => e.evidenceType === "INTERVIEW" && e.consentGiven).length > 0) index = 3;
  if (index >= 3 && s.hasAssessment) index = 4;
  if (index >= 4 && s.mvpApproved) index = 5;
  if (index >= 5 && ["PILOTING", "LAUNCH_READY", "ACTIVE"].includes(s.status)) index = 6;
  if (index >= 6 && ["LAUNCH_READY", "ACTIVE"].includes(s.status)) index = 7;
  if (index >= 7 && s.status === "ACTIVE" && s.kpiEntries > 0) index = 8;
  if (index < 0) return { key: "NOT_STARTED", label: "Not started", index: -1 };
  return { ...MATURITY[index], index };
};

const noEvidence = (): EvidenceScore => ({ score: null, coverage: 0, supports: 0, contradicts: 0, usable: 0 });

export const assessReadiness = (s: AssessmentSnapshot): ReadinessResult => {
  const dimensions: DimensionResult[] = DIMENSIONS.map((spec) => {
    const relevantAssumptions = s.assumptions.filter((a) => spec.categories.includes(a.category));
    const open = relevantAssumptions.filter((a) => OPEN_STATUSES.includes(a.status)).length;
    const missing: string[] = [];
    let score: number | null = null;
    let coverage = 0;
    let ev = noEvidence();

    if (spec.key === "executionReadiness") {
      const { total, done } = s.milestones;
      if (total > 0 || s.hasMvpSpec) {
        const progress = total > 0 ? done / total : 0;
        score = Math.round(progress * 70 + (s.hasMvpSpec ? 15 : 0) + (s.mvpApproved ? 15 : 0));
        coverage = total > 0 ? Math.min(1, total / 3) : 0.34;
      }
      if (total === 0) missing.push("No milestones defined.");
      if (!s.hasMvpSpec) missing.push("No MVP specification generated.");
    } else {
      ev = scoreEvidence(evidenceFor(spec.categories, spec.types, s.assumptions, s.evidence));
      if (spec.key === "financialFeasibility" && s.baseScenario) {
        const b = s.baseScenario;
        score = (b.unitContribution > 0 ? 40 : 0) + (b.operatingBreakEvenMonth !== null ? 35 : 0) + (b.lowestCash >= 0 ? 25 : 0);
        // The calculation itself is exact, but its inputs are founder assumptions until backed by evidence.
        coverage = Math.round((0.5 + 0.5 * Math.min(1, ev.coverage)) * 100) / 100;
        if (ev.usable === 0) missing.push("Cost and price inputs are founder assumptions; link evidence (quotes, supplier prices, test sales).");
      } else {
        score = ev.score;
        coverage = ev.coverage;
      }
    }

    if (score === null) {
      if (relevantAssumptions.length === 0 && spec.categories.length > 0) missing.push(`No ${spec.label.toLowerCase()} assumptions defined.`);
      missing.push(spec.hint);
    } else if (coverage < 0.67 && spec.key !== "executionReadiness") {
      missing.push("Evidence is thin; add more verified or source-linked items to raise confidence.");
    }
    if (spec.key === "differentiation" && score === null && s.competitorCount === 0) missing.push("No competitors or alternatives recorded.");
    if (spec.key === "customerEvidence" && s.segmentCount === 0) missing.push("No customer segments defined.");
    if (open > 0) missing.push(`${open} ${spec.label.toLowerCase()} assumption${open === 1 ? " is" : "s are"} still untested or inconclusive.`);

    return {
      key: spec.key,
      label: spec.label,
      weight: spec.weight,
      score,
      coverage,
      evidence: { supports: ev.supports, contradicts: ev.contradicts, usable: ev.usable },
      openAssumptions: open,
      missing,
    };
  });

  const known = dimensions.filter((d) => d.score !== null);
  const knownWeight = known.reduce((sum, d) => sum + d.weight, 0);
  const overallScore = knownWeight > 0 ? Math.round(known.reduce((sum, d) => sum + (d.score as number) * d.weight, 0) / knownWeight) : null;
  const overallCoverage = Math.round((dimensions.reduce((sum, d) => sum + d.weight * d.coverage, 0) / 100) * 100) / 100;

  const risks: string[] = [];
  for (const a of s.assumptions) {
    if (a.riskLevel === "HIGH" && OPEN_STATUSES.includes(a.status)) risks.push(`High-risk assumption not yet validated: "${a.statement}"`);
    if (a.status === "REFUTED") risks.push(`Assumption refuted by evidence: "${a.statement}"`);
  }
  for (const d of dimensions) {
    if (d.score !== null && d.score < 40) risks.push(`${d.label} is weak (${d.score}/100).`);
    if (d.evidence.contradicts > d.evidence.supports) risks.push(`${d.label}: recorded evidence contradicts more than it supports.`);
  }
  if (s.baseScenario && s.baseScenario.unitContribution <= 0) risks.push("The base financial scenario has no positive unit contribution.");
  if (s.evidence.some((e) => e.evidenceType === "INTERVIEW" && !e.consentGiven)) risks.push("Some interview evidence has no recorded consent and is excluded from scoring.");

  const ranked = [...dimensions].sort((a, b) => b.weight * (1 - b.coverage) - a.weight * (1 - a.coverage));
  const recommendations = ranked
    .filter((d) => d.coverage < 0.67)
    .slice(0, 4)
    .map((d) => `Strengthen "${d.label}" (weight ${d.weight}%): ${DIMENSIONS.find((x) => x.key === d.key)?.hint ?? ""}`);

  return {
    engineVersion: READINESS_ENGINE_VERSION,
    overallScore,
    overallCoverage,
    provisional: overallCoverage < 0.5,
    knownWeight,
    maturity: computeMaturity(s),
    dimensions,
    missingEvidence: dimensions.flatMap((d) => d.missing.map((m) => `${d.label}: ${m}`)),
    risks,
    recommendations,
    disclaimer: READINESS_DISCLAIMER,
  };
};

const byId = <T extends { id: string }>(items: T[]) => [...items].sort((a, b) => a.id.localeCompare(b.id));

/** Order-independent fingerprint of everything the engine reads; stored to prove a score is reproducible. */
export const digestSnapshot = (s: AssessmentSnapshot): string =>
  createHash("sha256")
    .update(JSON.stringify({ ...s, assumptions: byId(s.assumptions), evidence: byId(s.evidence) }))
    .digest("hex");
