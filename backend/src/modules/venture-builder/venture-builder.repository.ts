// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Data access shared by every Venture Builder domain: membership-based authorisation, the workspace snapshot the
// deterministic engines read, and the activity log. All queries are scoped by projectId.
import type { Prisma, VentureMemberRole } from "@prisma/client";
import type { RequestHandler, Response } from "express";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { prisma } from "../../lib/prisma";
import { currentUserId } from "../../middleware/auth";
import { evidenceFor, scoreEvidence, type AssumptionInput, type EvidenceInput } from "./assessment/evidence-scoring";
import type { AssessmentSnapshot, FinancialSummary } from "./assessment/readiness.engine";
import { stageIndex, type LifecycleFacts } from "./venture-builder.lifecycle";
import { canReadSection, roleCan, type Action, type ProjectAccess, type Section } from "./venture-builder.types";

export const json = (value: unknown) => value as Prisma.InputJsonValue;

// ───────────────────────────── Authorisation ─────────────────────────────

/**
 * Resolves the caller's ACTIVE membership of the project. A non-member always gets 404 (never 403), so a guessed
 * venture id reveals nothing about whether that venture exists.
 */
export const resolveAccess = async (projectId: string, userId: string): Promise<ProjectAccess> => {
  const member = await prisma.ventureMember.findFirst({ where: { projectId, userId, status: "ACTIVE" }, select: { role: true, sharedSections: true } });
  if (!member) throw AppError.notFound("Venture not found", "VENTURE_NOT_FOUND");
  return { projectId, userId, role: member.role, sharedSections: member.sharedSections };
};

/** Express middleware: enforces membership, the action permission and (for advisors) section sharing. */
export const projectAccess =
  (action: Action, section: Section): RequestHandler =>
  async (req, res, next) => {
    try {
      const access = await resolveAccess(req.params.id, currentUserId(req));
      if (!roleCan(access.role, action)) throw AppError.forbidden("Your role on this venture does not allow this action", "VENTURE_ROLE_FORBIDDEN");
      if (!canReadSection(access.role, access.sharedSections, section)) throw AppError.forbidden("This section has not been shared with you", "VENTURE_SECTION_NOT_SHARED");
      res.locals.venture = access;
      next();
    } catch (error) {
      next(error);
    }
  };

export const accessOf = (res: Response): ProjectAccess => res.locals.venture as ProjectAccess;

// ───────────────────────────── Activity log ─────────────────────────────

export interface ActivityInput {
  projectId: string;
  actorId: string | null;
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  metadata?: unknown;
}

/** Never throws: a logging failure must not fail the user's change. */
export const logActivity = async (a: ActivityInput, tx: Prisma.TransactionClient | typeof prisma = prisma): Promise<void> => {
  try {
    await tx.ventureActivity.create({
      data: {
        projectId: a.projectId,
        actorId: a.actorId,
        action: a.action,
        summary: a.summary,
        entityType: a.entityType,
        entityId: a.entityId,
        metadata: a.metadata === undefined ? undefined : json(a.metadata),
      },
    });
  } catch (error) {
    logger.error("venture_activity_write_failed", { action: a.action, error: String(error) });
  }
};

// ───────────────────────────── Workspace snapshot ─────────────────────────────

export interface WorkspaceState {
  project: { id: string; name: string; status: Parameters<typeof stageIndex>[0]; ideaSummary: string | null; problemStatement: string | null; currency: string; country: string; aiProcessingConsent: boolean; sectorName: string | null; launchedAt: Date | null };
  snapshot: AssessmentSnapshot;
  facts: LifecycleFacts;
  reachedIndex: number;
}

export const loadWorkspace = async (projectId: string): Promise<WorkspaceState> => {
  const [project, assumptions, evidence, segmentCount, competitorCount, completedExperiments, baseRow, milestones, specs, activeMembers, businessModels, assessments, kpiEntries, changes] = await Promise.all([
    prisma.ventureProject.findUnique({ where: { id: projectId }, include: { sector: { select: { name: true } } } }),
    prisma.ventureAssumption.findMany({ where: { projectId }, select: { id: true, statement: true, category: true, riskLevel: true, status: true } }),
    prisma.ventureEvidence.findMany({ where: { projectId }, select: { id: true, assumptionId: true, evidenceType: true, direction: true, verificationStatus: true, consentGiven: true } }),
    prisma.ventureCustomerSegment.count({ where: { projectId } }),
    prisma.ventureCompetitor.count({ where: { projectId } }),
    prisma.ventureExperiment.count({ where: { projectId, status: "COMPLETED" } }),
    prisma.ventureFinancialScenario.findFirst({ where: { projectId, caseType: "BASE" }, orderBy: { createdAt: "desc" }, select: { results: true } }),
    prisma.ventureMilestone.groupBy({ by: ["status"], where: { projectId }, _count: { _all: true } }),
    prisma.ventureMvpSpecification.findMany({ where: { projectId }, select: { status: true } }),
    prisma.ventureMember.count({ where: { projectId, status: "ACTIVE" } }),
    prisma.ventureBusinessModel.count({ where: { projectId } }),
    prisma.ventureAssessment.count({ where: { projectId, kind: "VENTURE_READINESS" } }),
    prisma.ventureKpiEntry.count({ where: { projectId } }),
    prisma.ventureStatusChange.findMany({ where: { projectId }, select: { toStatus: true } }),
  ]);
  if (!project) throw AppError.notFound("Venture not found", "VENTURE_NOT_FOUND");

  let baseScenario: FinancialSummary | null = null;
  if (baseRow) {
    const r = baseRow.results as { unitContribution?: number; operatingBreakEvenMonth?: number | null; lowestCash?: number; monthly?: unknown[] };
    baseScenario = { unitContribution: Number(r.unitContribution ?? 0), operatingBreakEvenMonth: r.operatingBreakEvenMonth ?? null, lowestCash: Number(r.lowestCash ?? 0), horizonMonths: Array.isArray(r.monthly) ? r.monthly.length : 0 };
  }

  const a: AssumptionInput[] = assumptions;
  const e: EvidenceInput[] = evidence;
  const milestoneTotal = milestones.reduce((s, m) => s + m._count._all, 0);
  const milestoneDone = milestones.find((m) => m.status === "DONE")?._count._all ?? 0;
  const approved = specs.some((s) => s.status === "APPROVED");

  const snapshot: AssessmentSnapshot = {
    status: project.status,
    hasIdea: Boolean(project.ideaSummary?.trim() || project.problemStatement?.trim()),
    assumptions: a,
    evidence: e,
    segmentCount,
    competitorCount,
    completedExperiments,
    baseScenario,
    milestones: { total: milestoneTotal, done: milestoneDone },
    hasMvpSpec: specs.length > 0,
    mvpApproved: approved,
    activeMembers,
    hasBusinessModel: businessModels > 0,
    hasAssessment: assessments > 0,
    kpiEntries,
  };

  const facts: LifecycleFacts = {
    hasIdea: snapshot.hasIdea,
    assumptionCount: a.length,
    humanEvidenceCount: e.length,
    testedAssumptionCount: a.filter((x) => ["SUPPORTED", "REFUTED", "INCONCLUSIVE"].includes(x.status)).length,
    hasAssessment: assessments > 0,
    hasApprovedMvp: approved,
    doneMilestones: milestoneDone,
    hasBaseScenario: baseScenario !== null,
    hasSupportedWillingnessToPay: scoreEvidence(evidenceFor(["WILLINGNESS_TO_PAY"], ["TEST_ORDER"], a, e)).supports > 0,
  };

  const reachedIndex = Math.max(stageIndex(project.status), ...changes.map((c) => stageIndex(c.toStatus)), 0);

  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      ideaSummary: project.ideaSummary,
      problemStatement: project.problemStatement,
      currency: project.currency,
      country: project.country,
      aiProcessingConsent: project.aiProcessingConsent,
      sectorName: project.sector?.name ?? null,
      launchedAt: project.launchedAt,
    },
    snapshot,
    facts,
    reachedIndex,
  };
};

export const roleRank: Record<VentureMemberRole, number> = { OWNER: 5, ADMIN: 4, EDITOR: 3, CONTRIBUTOR: 2, VIEWER: 1, ADVISOR: 0 };
