// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Rules that keep "validated" meaningful: an assumption is only supported or refuted by recorded human evidence,
// never by AI output, and the validation report separates what is supported from what is still uncertain.
import type { VentureAssumptionStatus } from "@prisma/client";
import { evidenceWeight, scoreEvidence, type AssumptionInput, type EvidenceInput } from "../assessment/evidence-scoring";

export interface StatusDecision {
  allowed: boolean;
  reason?: string;
}

/** SUPPORTED needs usable supporting evidence; REFUTED needs usable contradicting evidence. */
export const canSetAssumptionStatus = (next: VentureAssumptionStatus, linkedEvidence: EvidenceInput[]): StatusDecision => {
  if (next === "SUPPORTED") {
    const ok = linkedEvidence.some((e) => e.direction === "SUPPORTS" && evidenceWeight(e) > 0);
    return ok ? { allowed: true } : { allowed: false, reason: "An assumption can only be marked supported after you record supporting evidence (interviews need recorded consent)." };
  }
  if (next === "REFUTED") {
    const ok = linkedEvidence.some((e) => e.direction === "CONTRADICTS" && evidenceWeight(e) > 0);
    return ok ? { allowed: true } : { allowed: false, reason: "An assumption can only be marked refuted after you record contradicting evidence." };
  }
  return { allowed: true };
};

export interface AssumptionVerdict {
  id: string;
  statement: string;
  category: string;
  riskLevel: string;
  status: VentureAssumptionStatus;
  evidence: { supports: number; contradicts: number; usable: number; coverage: number };
  /** Advisory only: the founder decides the status. */
  suggestion: VentureAssumptionStatus | null;
}

export interface ValidationReport {
  summary: { total: number; supported: number; refuted: number; inconclusive: number; testing: number; untested: number };
  supported: AssumptionVerdict[];
  refuted: AssumptionVerdict[];
  uncertain: AssumptionVerdict[];
  untested: AssumptionVerdict[];
  interviews: { total: number; withConsent: number; withoutConsent: number };
  gaps: string[];
  disclaimer: string;
}

export const buildValidationReport = (assumptions: AssumptionInput[], evidence: EvidenceInput[]): ValidationReport => {
  const verdicts: AssumptionVerdict[] = assumptions.map((a) => {
    const s = scoreEvidence(evidence.filter((e) => e.assumptionId === a.id));
    let suggestion: VentureAssumptionStatus | null = null;
    if (s.usable >= 2 && s.score !== null) {
      if (s.score >= 70) suggestion = "SUPPORTED";
      else if (s.score <= 30) suggestion = "REFUTED";
      else suggestion = "INCONCLUSIVE";
    }
    return { id: a.id, statement: a.statement, category: a.category, riskLevel: a.riskLevel, status: a.status, evidence: { supports: s.supports, contradicts: s.contradicts, usable: s.usable, coverage: s.coverage }, suggestion };
  });

  const count = (status: VentureAssumptionStatus) => verdicts.filter((v) => v.status === status).length;
  const interviews = evidence.filter((e) => e.evidenceType === "INTERVIEW");
  const gaps: string[] = [];
  const noEvidenceHighRisk = verdicts.filter((v) => v.riskLevel === "HIGH" && v.evidence.usable === 0);
  if (noEvidenceHighRisk.length) gaps.push(`${noEvidenceHighRisk.length} high-risk assumption(s) have no usable evidence.`);
  if (interviews.some((e) => !e.consentGiven)) gaps.push("Some interviews have no recorded consent and are not counted.");
  if (assumptions.length === 0) gaps.push("No assumptions recorded yet.");

  return {
    summary: { total: verdicts.length, supported: count("SUPPORTED"), refuted: count("REFUTED"), inconclusive: count("INCONCLUSIVE"), testing: count("TESTING"), untested: count("UNTESTED") },
    supported: verdicts.filter((v) => v.status === "SUPPORTED"),
    refuted: verdicts.filter((v) => v.status === "REFUTED"),
    uncertain: verdicts.filter((v) => v.status === "INCONCLUSIVE" || v.status === "TESTING"),
    untested: verdicts.filter((v) => v.status === "UNTESTED"),
    interviews: { total: interviews.length, withConsent: interviews.filter((e) => e.consentGiven).length, withoutConsent: interviews.filter((e) => !e.consentGiven).length },
    gaps,
    disclaimer: "AI-generated ideas and drafts are hypotheses. Only recorded customer and market evidence can support an assumption.",
  };
};
