// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Shared, deterministic evidence arithmetic for the readiness and feasibility engines.
import type {
  VentureAssumptionCategory,
  VentureAssumptionStatus,
  VentureEvidenceDirection,
  VentureEvidenceType,
  VentureRiskLevel,
  VentureVerificationStatus,
} from "@prisma/client";

export interface AssumptionInput {
  id: string;
  statement: string;
  category: VentureAssumptionCategory;
  riskLevel: VentureRiskLevel;
  status: VentureAssumptionStatus;
}

export interface EvidenceInput {
  id: string;
  assumptionId: string | null;
  evidenceType: VentureEvidenceType;
  direction: VentureEvidenceDirection;
  verificationStatus: VentureVerificationStatus;
  /** Interview evidence only counts once the participant's consent is recorded. */
  consentGiven: boolean;
}

/** How much a piece of evidence counts. AI text is never evidence, so no AI weight exists. */
export const VERIFICATION_WEIGHT: Record<VentureVerificationStatus, number> = {
  VERIFIED: 1,
  SOURCE_LINKED: 0.8,
  USER_REPORTED: 0.5,
  DISPUTED: 0,
};

/** Weighted evidence needed before a dimension is considered fully covered. */
export const FULL_COVERAGE_WEIGHT = 3;

export const evidenceWeight = (e: EvidenceInput): number => {
  if (e.evidenceType === "INTERVIEW" && !e.consentGiven) return 0;
  return VERIFICATION_WEIGHT[e.verificationStatus];
};

export interface EvidenceScore {
  /** 0-100, or null when no usable supporting/contradicting evidence exists ("unknown", never zero). */
  score: number | null;
  /** 0-1: how much evidence stands behind the score. */
  coverage: number;
  supports: number;
  contradicts: number;
  usable: number;
}

/**
 * Score = 50 + (supportShare*100 - 50) * coverage. With thin evidence the score stays near the neutral 50
 * instead of jumping to 0 or 100 on a single interview; with enough evidence it converges on the support share.
 */
export const scoreEvidence = (items: EvidenceInput[]): EvidenceScore => {
  let ws = 0;
  let wc = 0;
  let usable = 0;
  for (const item of items) {
    const w = evidenceWeight(item);
    if (w <= 0) continue;
    if (item.direction === "SUPPORTS") ws += w;
    else if (item.direction === "CONTRADICTS") wc += w;
    else continue;
    usable += 1;
  }
  const total = ws + wc;
  if (total === 0) return { score: null, coverage: 0, supports: 0, contradicts: 0, usable: 0 };
  const coverage = Math.min(1, total / FULL_COVERAGE_WEIGHT);
  const share = (ws / total) * 100;
  return {
    score: Math.round(50 + (share - 50) * coverage),
    coverage: Math.round(coverage * 100) / 100,
    supports: Math.round(ws * 100) / 100,
    contradicts: Math.round(wc * 100) / 100,
    usable,
  };
};

/** Evidence that belongs to a dimension: linked to an assumption of its category, or unlinked of a listed type. */
export const evidenceFor = (
  categories: readonly VentureAssumptionCategory[],
  types: readonly VentureEvidenceType[],
  assumptions: AssumptionInput[],
  evidence: EvidenceInput[],
): EvidenceInput[] => {
  const ids = new Set(assumptions.filter((a) => categories.includes(a.category)).map((a) => a.id));
  return evidence.filter((e) => (e.assumptionId ? ids.has(e.assumptionId) : types.includes(e.evidenceType)));
};

export const OPEN_STATUSES: readonly VentureAssumptionStatus[] = ["UNTESTED", "TESTING", "INCONCLUSIVE"];
