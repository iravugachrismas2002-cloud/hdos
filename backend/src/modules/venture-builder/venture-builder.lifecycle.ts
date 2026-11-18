// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Gated-but-iterative venture lifecycle. Founders may always step back to earlier research, but may only move
// forward one stage at a time and only when the objective gate for the next stage is met.
import type { VentureStatus } from "@prisma/client";

export const MAIN_STAGES: readonly VentureStatus[] = [
  "DRAFT",
  "DISCOVERY",
  "VALIDATING",
  "VALIDATION_REVIEW",
  "FEASIBILITY_REVIEW",
  "MVP_PLANNING",
  "BUILDING",
  "PILOTING",
  "LAUNCH_READY",
  "ACTIVE",
];

const SIDE_STATUSES: readonly VentureStatus[] = ["PAUSED", "STOPPED", "ARCHIVED"];

export const stageIndex = (status: VentureStatus): number => MAIN_STAGES.indexOf(status);

export interface LifecycleFacts {
  hasIdea: boolean;
  assumptionCount: number;
  humanEvidenceCount: number;
  testedAssumptionCount: number;
  hasAssessment: boolean;
  hasApprovedMvp: boolean;
  doneMilestones: number;
  hasBaseScenario: boolean;
  hasSupportedWillingnessToPay: boolean;
}

const GATES: Partial<Record<VentureStatus, (f: LifecycleFacts) => string[]>> = {
  DISCOVERY: (f) => (f.hasIdea ? [] : ["Describe the idea or the problem you want to explore."]),
  VALIDATING: (f) => (f.assumptionCount > 0 ? [] : ["Record at least one assumption to test."]),
  VALIDATION_REVIEW: (f) => (f.humanEvidenceCount > 0 ? [] : ["Record at least one piece of evidence (interview, survey, test result or sourced statistic)."]),
  FEASIBILITY_REVIEW: (f) => (f.testedAssumptionCount > 0 ? [] : ["Review at least one assumption and mark it supported, refuted or inconclusive based on evidence."]),
  MVP_PLANNING: (f) => (f.hasAssessment ? [] : ["Run the venture readiness assessment first."]),
  BUILDING: (f) => (f.hasApprovedMvp ? [] : ["Generate an MVP specification and approve a version."]),
  PILOTING: (f) => (f.doneMilestones > 0 ? [] : ["Complete at least one build milestone."]),
  LAUNCH_READY: (f) => [
    ...(f.hasBaseScenario ? [] : ["Calculate a financial scenario."]),
    ...(f.hasSupportedWillingnessToPay ? [] : ["Record evidence that supports customers' willingness to pay (for example a test order)."]),
  ],
};

export interface TransitionCheck {
  ok: boolean;
  code?: "SAME_STATUS" | "SKIPS_STAGE" | "GATE_NOT_MET" | "NOT_ALLOWED";
  message?: string;
  missing: string[];
}

/**
 * @param reachedIndex highest main-stage index the venture has ever reached; lets a paused/stopped/archived
 * venture resume where it left off instead of replaying earlier stages.
 */
export const checkTransition = (from: VentureStatus, to: VentureStatus, facts: LifecycleFacts, reachedIndex: number): TransitionCheck => {
  if (from === to) return { ok: false, code: "SAME_STATUS", message: "The venture already has this status.", missing: [] };
  if (SIDE_STATUSES.includes(to)) return { ok: true, missing: [] };

  const toIndex = stageIndex(to);
  const fromIndex = stageIndex(from);

  if (fromIndex === -1) {
    // Resuming from PAUSED / STOPPED / ARCHIVED: only to a stage already reached before, with its gate re-checked.
    if (toIndex > Math.max(reachedIndex, 0)) {
      return { ok: false, code: "SKIPS_STAGE", message: "Resume at a stage the venture has already reached.", missing: [] };
    }
  } else if (toIndex < fromIndex) {
    return { ok: true, missing: [] }; // stepping back to earlier research is always allowed
  } else if (toIndex > fromIndex + 1 && toIndex > reachedIndex) {
    return { ok: false, code: "SKIPS_STAGE", message: `Move to ${MAIN_STAGES[fromIndex + 1]} before ${to}.`, missing: [] };
  }

  const missing = GATES[to]?.(facts) ?? [];
  if (missing.length > 0) return { ok: false, code: "GATE_NOT_MET", message: `Requirements for ${to} are not met yet.`, missing };
  return { ok: true, missing: [] };
};
