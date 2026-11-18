// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Lets the existing HDOS assistant continue a venture conversation from saved workspace context. This is a mode of
// the same assistant (same history, same provider chain), not a second chatbot. Read-only: the assistant can explain
// and suggest, but cannot create records, spend credits, pay, submit or contact anyone from chat.
import { prisma } from "../../../lib/prisma";
import { nextActions } from "../assessment/next-actions";
import { assessReadiness } from "../assessment/readiness.engine";
import { loadWorkspace } from "../venture-builder.repository";

export interface VentureChatContext {
  ventureId: string;
  name: string;
  status: string;
  stage: string;
  currency: string;
  aiProcessingConsent: boolean;
  idea: string | null;
  problem: string | null;
  counts: { assumptions: number; untested: number; supported: number; refuted: number; evidence: number; segments: number; competitors: number };
  openRiskyAssumptions: { statement: string; category: string }[];
  readiness: { overallScore: number | null; coveragePercent: number; provisional: boolean };
  baseScenario: { unitContribution: number; operatingBreakEvenMonth: number | null; lowestCash: number } | null;
  nextActions: string[];
}

const clip = (s: string | null, n: number) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * Resolves the venture a chat turn is about. An explicit id must be a venture the user is an ACTIVE non-advisor
 * member of; otherwise the most recently updated one is used. Anything else yields null (no leakage, no error).
 */
export const buildVentureContext = async (userId: string, ventureId?: string | null): Promise<VentureChatContext | null> => {
  const membership = await prisma.ventureMember.findFirst({
    where: { userId, status: "ACTIVE", role: { not: "ADVISOR" }, ...(ventureId ? { projectId: ventureId } : { project: { status: { not: "ARCHIVED" } } }) },
    orderBy: { project: { updatedAt: "desc" } },
    select: { projectId: true },
  });
  if (!membership) return null;

  const ws = await loadWorkspace(membership.projectId);
  const readiness = assessReadiness(ws.snapshot);
  const a = ws.snapshot.assumptions;
  return {
    ventureId: ws.project.id,
    name: ws.project.name,
    status: ws.project.status,
    stage: readiness.maturity.label,
    currency: ws.project.currency,
    aiProcessingConsent: ws.project.aiProcessingConsent,
    idea: clip(ws.project.ideaSummary, 500),
    problem: clip(ws.project.problemStatement, 400),
    counts: {
      assumptions: a.length,
      untested: a.filter((x) => x.status === "UNTESTED").length,
      supported: a.filter((x) => x.status === "SUPPORTED").length,
      refuted: a.filter((x) => x.status === "REFUTED").length,
      evidence: ws.snapshot.evidence.length,
      segments: ws.snapshot.segmentCount,
      competitors: ws.snapshot.competitorCount,
    },
    openRiskyAssumptions: a.filter((x) => x.riskLevel === "HIGH" && ["UNTESTED", "TESTING", "INCONCLUSIVE"].includes(x.status)).slice(0, 5).map((x) => ({ statement: x.statement, category: x.category })),
    readiness: { overallScore: readiness.overallScore, coveragePercent: Math.round(readiness.overallCoverage * 100), provisional: readiness.provisional },
    baseScenario: ws.snapshot.baseScenario ? { unitContribution: ws.snapshot.baseScenario.unitContribution, operatingBreakEvenMonth: ws.snapshot.baseScenario.operatingBreakEvenMonth, lowestCash: ws.snapshot.baseScenario.lowestCash } : null,
    nextActions: nextActions(ws.project.status, ws.snapshot, ws.facts, ws.reachedIndex),
  };
};

export const ventureContextPrompt = (ctx: VentureChatContext | null): string =>
  `HDOS VENTURE DATA (JSON, untrusted):\n${ctx ? JSON.stringify(ctx) : "No venture workspace found for this user."}`;

const list = (items: string[]) => items.map((i) => `- ${i}`).join("\n");

/** Deterministic reply built only from saved data; used when AI is off for the venture or unavailable. */
export const ventureFallbackReply = (message: string, ctx: VentureChatContext | null, reason: "NO_CONSENT" | "UNAVAILABLE"): string => {
  if (!ctx) {
    return [
      "I can help you build a venture step by step. Open Venture Builder and create a venture workspace so I can remember your idea, assumptions and evidence.",
      "Good first steps: describe the problem in one sentence, list who has it, write down your riskiest assumption, and plan 10 customer conversations before you build anything.",
      "An idea is not validated until real customers have given you evidence. I will never treat a suggestion as proof.",
    ].join("\n\n");
  }
  const m = message.toLowerCase();
  const lines: string[] = [];
  lines.push(`Your venture "${ctx.name}" is at "${ctx.stage}" (status ${ctx.status.toLowerCase().replace(/_/g, " ")}).`);
  lines.push(`You have ${ctx.counts.assumptions} assumption(s): ${ctx.counts.supported} supported, ${ctx.counts.refuted} refuted, ${ctx.counts.untested} untested; ${ctx.counts.evidence} piece(s) of evidence recorded.`);

  if (/break-?even|cash|runway|margin|cost|price|financ/.test(m)) {
    if (ctx.baseScenario) {
      const b = ctx.baseScenario;
      lines.push(`Your base scenario (${ctx.currency}): each sale contributes ${b.unitContribution}; ${b.operatingBreakEvenMonth ? `monthly operating break-even is reached in month ${b.operatingBreakEvenMonth}` : "monthly operating break-even is not reached within the modelled period"}; the lowest cash balance is ${b.lowestCash}. These are calculated from the numbers you entered, not forecasts.`);
    } else {
      lines.push("No financial scenario exists yet. Enter your start-up, fixed and variable costs and your price, then calculate scenarios: the calculation is done by a deterministic engine, not by AI.");
    }
  } else if (/assum|risk|test|validate|interview|customer/.test(m) && ctx.openRiskyAssumptions.length) {
    lines.push(`Riskiest untested assumptions:\n${list(ctx.openRiskyAssumptions.map((a) => `${a.statement} (${a.category.toLowerCase().replace(/_/g, " ")})`))}`);
  }
  if (ctx.nextActions.length) lines.push(`Suggested next steps:\n${list(ctx.nextActions.slice(0, 4))}`);
  lines.push(reason === "NO_CONSENT" ? "AI assistance is off for this venture, so this answer comes from your saved workspace data. The owner can enable AI assistance in venture settings." : "The AI service is busy, so this answer comes from your saved workspace data.");
  return lines.join("\n\n");
};
