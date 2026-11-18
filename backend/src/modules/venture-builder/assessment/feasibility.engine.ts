// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Five separate feasibility assessments, each with its evidence, missing information, risks and outstanding
// tasks. Derived from the readiness dimensions so the two reports can never disagree.
import type { VentureAssumptionCategory } from "@prisma/client";
import { OPEN_STATUSES } from "./evidence-scoring";
import type { AssessmentSnapshot, DimensionKey, DimensionResult, ReadinessResult } from "./readiness.engine";

export type FeasibilityKey = "problem" | "market" | "technical" | "financial" | "operational";
export type FeasibilityStatus = "UNKNOWN" | "WEAK" | "MODERATE" | "STRONG";

export interface FeasibilityAssessment {
  key: FeasibilityKey;
  label: string;
  question: string;
  status: FeasibilityStatus;
  score: number | null;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidence: { supports: number; contradicts: number; usable: number };
  missingInformation: string[];
  risks: string[];
  outstandingTasks: string[];
}

const SPEC: { key: FeasibilityKey; label: string; question: string; dimensions: DimensionKey[]; categories: VentureAssumptionCategory[] }[] = [
  { key: "problem", label: "Problem feasibility", question: "Is the problem important enough to solve?", dimensions: ["problemImportance"], categories: ["PROBLEM"] },
  { key: "market", label: "Market feasibility", question: "Is there a reachable group of potential customers?", dimensions: ["customerEvidence", "marketAccessibility", "willingnessToPay"], categories: ["CUSTOMER", "MARKET", "WILLINGNESS_TO_PAY", "DIFFERENTIATION"] },
  { key: "technical", label: "Technical feasibility", question: "Can the product be developed with the available technology, people and resources?", dimensions: ["technicalFeasibility"], categories: ["TECHNICAL"] },
  { key: "financial", label: "Financial feasibility", question: "Can the revenue model cover the cost of delivering the solution?", dimensions: ["financialFeasibility"], categories: ["FINANCIAL"] },
  { key: "operational", label: "Operational and regulatory feasibility", question: "Can the business operate under the applicable requirements?", dimensions: ["operationalRegulatory"], categories: ["OPERATIONAL"] },
];

const statusOf = (score: number | null): FeasibilityStatus => (score === null ? "UNKNOWN" : score < 40 ? "WEAK" : score < 70 ? "MODERATE" : "STRONG");
const confidenceOf = (coverage: number): "LOW" | "MEDIUM" | "HIGH" => (coverage < 0.34 ? "LOW" : coverage < 0.67 ? "MEDIUM" : "HIGH");

export const assessFeasibility = (snapshot: AssessmentSnapshot, readiness: ReadinessResult): FeasibilityAssessment[] =>
  SPEC.map((spec) => {
    const dims = readiness.dimensions.filter((d): d is DimensionResult => spec.dimensions.includes(d.key));
    const known = dims.filter((d) => d.score !== null);
    const weight = known.reduce((s, d) => s + d.weight, 0);
    const score = weight > 0 ? Math.round(known.reduce((s, d) => s + (d.score as number) * d.weight, 0) / weight) : null;
    const totalWeight = dims.reduce((s, d) => s + d.weight, 0);
    const coverage = totalWeight > 0 ? dims.reduce((s, d) => s + d.weight * d.coverage, 0) / totalWeight : 0;

    const assumptions = snapshot.assumptions.filter((a) => spec.categories.includes(a.category));
    const risks: string[] = [];
    for (const a of assumptions) {
      if (a.status === "REFUTED") risks.push(`Refuted: "${a.statement}"`);
      else if (a.riskLevel === "HIGH" && OPEN_STATUSES.includes(a.status)) risks.push(`Untested high-risk assumption: "${a.statement}"`);
    }
    for (const d of dims) {
      if (d.evidence.contradicts > d.evidence.supports) risks.push(`${d.label}: evidence contradicts more than it supports.`);
    }
    if (spec.key === "financial" && snapshot.baseScenario && snapshot.baseScenario.unitContribution <= 0) {
      risks.push("Each sale loses money in the base scenario.");
    }

    const open = assumptions.filter((a) => OPEN_STATUSES.includes(a.status));
    const tasks = open.slice(0, 3).map((a) => `Test: "${a.statement}"`);
    if (assumptions.length === 0) tasks.push(`Define at least one ${spec.label.toLowerCase().replace(" feasibility", "")} assumption to test.`);
    if (spec.key === "financial" && !snapshot.baseScenario) tasks.push("Enter cost and price line items and calculate a financial scenario.");

    return {
      key: spec.key,
      label: spec.label,
      question: spec.question,
      status: statusOf(score),
      score,
      confidence: confidenceOf(coverage),
      evidence: dims.reduce(
        (acc, d) => ({ supports: acc.supports + d.evidence.supports, contradicts: acc.contradicts + d.evidence.contradicts, usable: acc.usable + d.evidence.usable }),
        { supports: 0, contradicts: 0, usable: 0 },
      ),
      missingInformation: dims.flatMap((d) => d.missing),
      risks,
      outstandingTasks: tasks,
    };
  });
