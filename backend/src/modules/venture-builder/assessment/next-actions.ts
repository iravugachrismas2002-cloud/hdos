// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Deterministic "what should I do next" list shown on the venture command centre and used as AI chat context.
import type { VentureStatus } from "@prisma/client";
import { OPEN_STATUSES } from "./evidence-scoring";
import type { AssessmentSnapshot } from "./readiness.engine";
import { checkTransition, MAIN_STAGES, stageIndex, type LifecycleFacts } from "../venture-builder.lifecycle";

export const nextActions = (status: VentureStatus, s: AssessmentSnapshot, facts: LifecycleFacts, reachedIndex: number): string[] => {
  const actions: string[] = [];
  if (!s.hasIdea) actions.push("Describe your idea or the problem you want to explore.");
  if (s.segmentCount === 0) actions.push("Define who your customers are (customer segment).");
  if (s.assumptions.length === 0) actions.push("Write down the assumptions your idea depends on, starting with the riskiest.");
  const risky = s.assumptions.filter((a) => a.riskLevel === "HIGH" && OPEN_STATUSES.includes(a.status));
  if (risky.length) actions.push(`Test your riskiest assumption: "${risky[0].statement}"`);
  if (s.assumptions.length > 0 && facts.humanEvidenceCount === 0) actions.push("Record real evidence: customer interviews (with consent), a survey, a sourced statistic or a test order.");
  if (!s.baseScenario && s.assumptions.length > 0) actions.push("Enter your costs and prices and calculate a financial scenario.");
  if (!s.hasAssessment && s.assumptions.length > 0) actions.push("Run a readiness assessment to see what evidence is still missing.");

  const idx = stageIndex(status);
  if (idx >= 0 && idx < MAIN_STAGES.length - 1) {
    const next = MAIN_STAGES[idx + 1];
    const check = checkTransition(status, next, facts, reachedIndex);
    for (const m of check.missing) actions.push(`To reach ${next}: ${m}`);
  }
  return [...new Set(actions)].slice(0, 6);
};
