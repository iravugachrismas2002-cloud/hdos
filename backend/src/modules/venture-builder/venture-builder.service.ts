// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Core Venture Builder domain: workspaces, lifecycle, activity, team and document links.
import type { VentureMemberRole, VentureStatus } from "@prisma/client";
import type { z } from "zod";
import { AppError } from "../../lib/errors";

import { prisma } from "../../lib/prisma";
import { assessReadiness } from "./assessment/readiness.engine";
import { nextActions } from "./assessment/next-actions";
import { checkTransition, MAIN_STAGES, stageIndex } from "./venture-builder.lifecycle";
import { loadWorkspace, logActivity } from "./venture-builder.repository";
import type { createProjectSchema, statusChangeSchema, updateProjectSchema } from "./venture-builder.schemas";
import { roleCan, type ProjectAccess } from "./venture-builder.types";

type ProjectRow = {
  id: string; name: string; ideaSummary: string | null; problemStatement: string | null; country: string; currency: string; status: VentureStatus;
  startMode: string | null; aiProcessingConsent: boolean; launchedAt: Date | null; createdAt: Date; updatedAt: Date;
  sector: { id: string; name: string } | null; district: { id: string; name: string } | null;
};

const projectInclude = { sector: { select: { id: true, name: true } }, district: { select: { id: true, name: true } } } as const;

export const toProjectDto = (p: ProjectRow, role: VentureMemberRole, sharedSections: string[]) => ({
  id: p.id,
  name: p.name,
  ideaSummary: p.ideaSummary,
  problemStatement: p.problemStatement,
  sector: p.sector,
  district: p.district,
  country: p.country,
  currency: p.currency,
  status: p.status,
  startMode: p.startMode,
  aiProcessingConsent: p.aiProcessingConsent,
  launchedAt: p.launchedAt?.toISOString() ?? null,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
  myRole: role,
  sharedSections: role === "ADVISOR" ? sharedSections : [],
});

const assertReferences = async (sectorId?: string | null, districtId?: string | null) => {
  if (sectorId && !(await prisma.sector.findUnique({ where: { id: sectorId }, select: { id: true } }))) throw AppError.badRequest("Unknown sector", "UNKNOWN_SECTOR");
  if (districtId && !(await prisma.district.findUnique({ where: { id: districtId }, select: { id: true } }))) throw AppError.badRequest("Unknown district", "UNKNOWN_DISTRICT");
};

// ───────────────────────────── Projects ─────────────────────────────

export const createProject = async (userId: string, input: z.infer<typeof createProjectSchema>) => {
  await assertReferences(input.sectorId, input.districtId);
  const project = await prisma.ventureProject.create({
    data: {
      ownerId: userId,
      name: input.name,
      ideaSummary: input.ideaSummary,
      problemStatement: input.problemStatement,
      sectorId: input.sectorId ?? null,
      districtId: input.districtId ?? null,
      currency: input.currency,
      startMode: input.startMode,
      aiProcessingConsent: input.aiProcessingConsent,
      members: { create: { userId, role: "OWNER", status: "ACTIVE", consentedAt: new Date() } },
    },
    include: projectInclude,
  });
  await logActivity({ projectId: project.id, actorId: userId, action: "project.created", summary: `Created venture "${project.name}"`, entityType: "project", entityId: project.id });
  return toProjectDto(project, "OWNER", []);
};

export const listProjects = async (userId: string) => {
  const memberships = await prisma.ventureMember.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      project: {
        include: {
          ...projectInclude,
          _count: { select: { assumptions: true, evidence: true, experiments: true, features: true, milestones: true } },
        },
      },
    },
    orderBy: { project: { updatedAt: "desc" } },
    take: 100,
  });
  return memberships.map((m) => ({
    ...toProjectDto(m.project, m.role, m.sharedSections),
    counts: m.role === "ADVISOR" ? null : m.project._count,
  }));
};

export const getProjectDetail = async (access: ProjectAccess) => {
  const project = await prisma.ventureProject.findUnique({ where: { id: access.projectId }, include: projectInclude });
  if (!project) throw AppError.notFound("Venture not found", "VENTURE_NOT_FOUND");
  const base = toProjectDto(project, access.role, access.sharedSections);
  if (access.role === "ADVISOR") return { ...base, detailRestricted: true };

  const [ws, experiments, features, milestones, latestAssessment] = await Promise.all([
    loadWorkspace(access.projectId),
    prisma.ventureExperiment.count({ where: { projectId: access.projectId } }),
    prisma.ventureFeature.count({ where: { projectId: access.projectId } }),
    prisma.ventureMilestone.count({ where: { projectId: access.projectId } }),
    prisma.ventureAssessment.findFirst({ where: { projectId: access.projectId, kind: "VENTURE_READINESS" }, orderBy: { assessmentVersion: "desc" }, select: { assessmentVersion: true, overallScore: true, overallCoverage: true, createdAt: true } }),
  ]);
  const readiness = assessReadiness(ws.snapshot);
  const idx = stageIndex(project.status);
  const nextStage = idx >= 0 && idx < MAIN_STAGES.length - 1 ? MAIN_STAGES[idx + 1] : null;
  const gate = nextStage ? checkTransition(project.status, nextStage, ws.facts, ws.reachedIndex) : null;
  const a = ws.snapshot.assumptions;

  return {
    ...base,
    stage: readiness.maturity,
    lifecycle: { reachedStage: MAIN_STAGES[ws.reachedIndex] ?? "DRAFT", nextStage, nextStageRequirements: gate?.missing ?? [] },
    counts: {
      assumptions: { total: a.length, untested: a.filter((x) => x.status === "UNTESTED").length, supported: a.filter((x) => x.status === "SUPPORTED").length, refuted: a.filter((x) => x.status === "REFUTED").length },
      evidence: ws.snapshot.evidence.length,
      experiments,
      segments: ws.snapshot.segmentCount,
      competitors: ws.snapshot.competitorCount,
      features,
      milestones,
      members: ws.snapshot.activeMembers,
    },
    nextActions: nextActions(project.status, ws.snapshot, ws.facts, ws.reachedIndex),
    risks: readiness.risks.slice(0, 6),
    latestAssessment: latestAssessment ? { version: latestAssessment.assessmentVersion, overallScore: latestAssessment.overallScore, overallCoverage: latestAssessment.overallCoverage, createdAt: latestAssessment.createdAt.toISOString() } : null,
  };
};

export const updateProject = async (access: ProjectAccess, input: z.infer<typeof updateProjectSchema>) => {
  await assertReferences(input.sectorId, input.districtId);
  const current = await prisma.ventureProject.findUnique({ where: { id: access.projectId }, select: { aiProcessingConsent: true } });
  if (!current) throw AppError.notFound("Venture not found", "VENTURE_NOT_FOUND");
  const consentChanging = input.aiProcessingConsent !== undefined && input.aiProcessingConsent !== current.aiProcessingConsent;
  if (consentChanging && !roleCan(access.role, "manage")) throw AppError.forbidden("Only the owner or an admin can change AI processing consent", "VENTURE_ROLE_FORBIDDEN");

  const project = await prisma.ventureProject.update({
    where: { id: access.projectId },
    data: {
      name: input.name,
      ideaSummary: input.ideaSummary,
      problemStatement: input.problemStatement,
      sectorId: input.sectorId === undefined ? undefined : input.sectorId,
      districtId: input.districtId === undefined ? undefined : input.districtId,
      currency: input.currency,
      aiProcessingConsent: input.aiProcessingConsent,
    },
    include: projectInclude,
  });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: consentChanging ? "project.ai_consent_changed" : "project.updated", summary: consentChanging ? `AI processing ${project.aiProcessingConsent ? "enabled" : "disabled"}` : "Updated venture details", entityType: "project", entityId: access.projectId });
  return toProjectDto(project, access.role, access.sharedSections);
};

// ───────────────────────────── Lifecycle ─────────────────────────────

export const changeStatus = async (access: ProjectAccess, input: z.infer<typeof statusChangeSchema>) => {
  const ws = await loadWorkspace(access.projectId);
  const to = input.toStatus as VentureStatus;
  const sideStatus = ["PAUSED", "STOPPED", "ARCHIVED"].includes(to);
  if (sideStatus && !roleCan(access.role, "manage")) throw AppError.forbidden("Only the owner or an admin can pause, stop or archive a venture", "VENTURE_ROLE_FORBIDDEN");

  const check = checkTransition(ws.project.status, to, ws.facts, ws.reachedIndex);
  if (!check.ok) {
    const err = AppError.conflict(check.message ?? "This status change is not allowed", check.code === "GATE_NOT_MET" ? "VENTURE_GATE_NOT_MET" : "VENTURE_TRANSITION_NOT_ALLOWED");
    throw Object.assign(err, { details: check.missing.map((m) => ({ field: "requirements", message: m })) });
  }
  if (input.evidenceIds.length) {
    const found = await prisma.ventureEvidence.count({ where: { projectId: access.projectId, id: { in: input.evidenceIds } } });
    if (found !== new Set(input.evidenceIds).size) throw AppError.badRequest("Some supporting evidence does not belong to this venture", "UNKNOWN_EVIDENCE");
  }

  const from = ws.project.status;
  await prisma.$transaction(async (tx) => {
    await tx.ventureProject.update({ where: { id: access.projectId }, data: { status: to, launchedAt: to === "ACTIVE" && !ws.project.launchedAt ? new Date() : undefined } });
    await tx.ventureStatusChange.create({ data: { projectId: access.projectId, fromStatus: from, toStatus: to, changedById: access.userId, reason: input.reason, evidenceIds: [...new Set(input.evidenceIds)] } });
    await logActivity({ projectId: access.projectId, actorId: access.userId, action: "project.status_changed", summary: `Status ${from} → ${to}: ${input.reason}`, entityType: "project", entityId: access.projectId, metadata: { from, to, evidenceIds: input.evidenceIds } }, tx);
  });
  return { from, to, reason: input.reason };
};

export const listStatusHistory = async (projectId: string) => {
  const rows = await prisma.ventureStatusChange.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 100 });
  return rows.map((r) => ({ id: r.id, from: r.fromStatus, to: r.toStatus, changedById: r.changedById, reason: r.reason, evidenceIds: r.evidenceIds, createdAt: r.createdAt.toISOString() }));
};

export const listActivity = async (projectId: string, page: number, pageSize: number) => {
  const [rows, total] = await Promise.all([
    prisma.ventureActivity.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.ventureActivity.count({ where: { projectId } }),
  ]);
  return { rows: rows.map((r) => ({ id: r.id, actorId: r.actorId, action: r.action, summary: r.summary, entityType: r.entityType, entityId: r.entityId, createdAt: r.createdAt.toISOString() })), total };
};

// ───────────────────────────── Dashboard & export ─────────────────────────────

export const getDashboard = async (userId: string) => {
  const [ventures, invitations] = await Promise.all([listProjects(userId), prisma.ventureMember.count({ where: { userId, status: "INVITED" } })]);
  const byStatus: Record<string, number> = {};
  for (const v of ventures) byStatus[v.status] = (byStatus[v.status] ?? 0) + 1;
  return { ventures, pendingInvitations: invitations, byStatus, total: ventures.length };
};

/** Owner-only full export of the workspace so founders keep their work. */
export const exportProject = async (access: ProjectAccess) => {
  const id = access.projectId;
  const [project, assumptions, sources, evidence, segments, competitors, experiments, assessments, businessModels, lineItems, scenarios, specs, features, milestones, kpis, statusChanges, activity, links] = await Promise.all([
    prisma.ventureProject.findUnique({ where: { id }, include: projectInclude }),
    prisma.ventureAssumption.findMany({ where: { projectId: id } }),
    prisma.ventureResearchSource.findMany({ where: { projectId: id } }),
    prisma.ventureEvidence.findMany({ where: { projectId: id } }),
    prisma.ventureCustomerSegment.findMany({ where: { projectId: id } }),
    prisma.ventureCompetitor.findMany({ where: { projectId: id } }),
    prisma.ventureExperiment.findMany({ where: { projectId: id }, include: { results: true } }),
    prisma.ventureAssessment.findMany({ where: { projectId: id } }),
    prisma.ventureBusinessModel.findMany({ where: { projectId: id } }),
    prisma.ventureFinancialLineItem.findMany({ where: { projectId: id } }),
    prisma.ventureFinancialScenario.findMany({ where: { projectId: id } }),
    prisma.ventureMvpSpecification.findMany({ where: { projectId: id } }),
    prisma.ventureFeature.findMany({ where: { projectId: id } }),
    prisma.ventureMilestone.findMany({ where: { projectId: id } }),
    prisma.ventureKpiEntry.findMany({ where: { projectId: id } }),
    prisma.ventureStatusChange.findMany({ where: { projectId: id } }),
    prisma.ventureActivity.findMany({ where: { projectId: id }, orderBy: { createdAt: "asc" } }),
    prisma.ventureDocumentLink.findMany({ where: { projectId: id }, include: { document: { select: { id: true, fileName: true, kind: true, version: true } } } }),
  ]);
  await logActivity({ projectId: id, actorId: access.userId, action: "project.exported", summary: "Exported the venture workspace" });
  return { exportedAt: new Date().toISOString(), format: "hdos-venture-export-1", project, assumptions, sources, evidence, segments, competitors, experiments, assessments, businessModels, lineItems, scenarios, mvpSpecifications: specs, features, milestones, kpiEntries: kpis, statusChanges, activity, documentLinks: links };
};
