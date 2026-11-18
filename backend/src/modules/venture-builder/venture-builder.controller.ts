// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// HTTP handlers. Authorisation has already happened in `projectAccess` middleware; handlers read the resolved access
// from `res.locals` and never trust a project id for anything but looking up that same membership.
import type { Request, Response } from "express";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { currentUserId } from "../../middleware/auth";
import { assessReadiness } from "./assessment/readiness.engine";
import { explainLatestAssessment, getAssessments, runAssessment } from "./assessment/assessment.service";
import { latestDiscovery, listAiExecutions, runDiscovery } from "./discovery/discovery.service";
import { compareModels, createBusinessModel, createScenarioSet, lineItemDto, listBusinessModels, listScenarioSets } from "./financial/financial.service";
import { TEAM_ROLES } from "./funding/ecosystem";
import { getEcosystem, getFundingMatches, runFundingReadiness } from "./funding/funding.service";
import { getGrowth, recordKpi } from "./growth/growth.service";
import { exportSpecMarkdown, generateSpec, getSpec, listSpecs, reviseSpec } from "./product-studio/mvp.service";
import { inviteMember, linkDocument, listDocumentLinks, listMembers, listMyInvitations, removeMember, respondToInvitation, unlinkDocument, updateMember } from "./team/team.service";
import { createAssumption, createEvidence, createSource, deleteAssumption, getValidationReport, listAssumptions, listEvidence, listSources, updateAssumption, updateEvidence } from "./validation/evidence.service";
import { createExperiment, listExperiments, recordResult, updateExperiment } from "./validation/experiment.service";
import { accessOf, loadWorkspace, logActivity } from "./venture-builder.repository";
import { activityQuerySchema, idempotencyKey } from "./venture-builder.schemas";
import { changeStatus, createProject, exportProject, getDashboard, getProjectDetail, listActivity, listProjects, listStatusHistory, updateProject } from "./venture-builder.service";

type Handler = (req: Request, res: Response) => Promise<unknown>;
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ data });
const key = (req: Request) => idempotencyKey(req.header("Idempotency-Key"));

// ───────────────────────────── Overview ─────────────────────────────

export const dashboard: Handler = async (req, res) => ok(res, await getDashboard(currentUserId(req)));
export const teamRoles: Handler = async (_req, res) => ok(res, TEAM_ROLES);
export const ecosystem: Handler = async (_req, res) => ok(res, await getEcosystem());

export const myInvitations: Handler = async (req, res) => ok(res, await listMyInvitations(currentUserId(req)));
export const respondInvitation = (accept: boolean): Handler => async (req, res) => ok(res, await respondToInvitation(currentUserId(req), req.params.memberId, accept));

// ───────────────────────────── Projects ─────────────────────────────

export const projectCreate: Handler = async (req, res) => ok(res, await createProject(currentUserId(req), req.body), 201);
export const projectList: Handler = async (req, res) => ok(res, await listProjects(currentUserId(req)));
export const projectGet: Handler = async (_req, res) => ok(res, await getProjectDetail(accessOf(res)));
export const projectUpdate: Handler = async (req, res) => ok(res, await updateProject(accessOf(res), req.body));
export const projectStatus: Handler = async (req, res) => ok(res, await changeStatus(accessOf(res), req.body));
export const projectStatusHistory: Handler = async (_req, res) => ok(res, await listStatusHistory(accessOf(res).projectId));
export const projectExport: Handler = async (_req, res) => {
  const data = await exportProject(accessOf(res));
  res.setHeader("Content-Disposition", `attachment; filename="venture-${accessOf(res).projectId}.json"`);
  res.setHeader("Cache-Control", "private, no-store");
  return ok(res, data);
};
export const projectActivity: Handler = async (req, res) => {
  const q = activityQuerySchema.parse(req.query);
  const { rows, total } = await listActivity(accessOf(res).projectId, q.page, q.pageSize);
  res.json({ data: rows, meta: { page: q.page, pageSize: q.pageSize, total } });
};

// ───────────────────────────── Discovery ─────────────────────────────

export const discoveryRun: Handler = async (req, res) => ok(res, await runDiscovery(accessOf(res), req.body, key(req)), 201);
export const discoveryLatest: Handler = async (_req, res) => ok(res, await latestDiscovery(accessOf(res).projectId));
export const aiExecutions: Handler = async (_req, res) => ok(res, await listAiExecutions(accessOf(res).projectId));

// ───────────────────────────── Assumptions, sources, evidence ─────────────────────────────

export const assumptionList: Handler = async (_req, res) => ok(res, await listAssumptions(accessOf(res).projectId));
export const assumptionCreate: Handler = async (req, res) => ok(res, await createAssumption(accessOf(res), req.body), 201);
export const assumptionUpdate: Handler = async (req, res) => ok(res, await updateAssumption(accessOf(res), req.params.aid, req.body));
export const assumptionDelete: Handler = async (req, res) => {
  await deleteAssumption(accessOf(res), req.params.aid);
  res.status(204).end();
};
export const sourceList: Handler = async (_req, res) => ok(res, await listSources(accessOf(res).projectId));
export const sourceCreate: Handler = async (req, res) => ok(res, await createSource(accessOf(res), req.body), 201);
export const evidenceList: Handler = async (req, res) => ok(res, await listEvidence(accessOf(res).projectId, typeof req.query.assumptionId === "string" ? req.query.assumptionId : undefined));
export const evidenceCreate: Handler = async (req, res) => ok(res, await createEvidence(accessOf(res), req.body), 201);
export const evidenceUpdate: Handler = async (req, res) => ok(res, await updateEvidence(accessOf(res), req.params.eid, req.body));
export const validationReport: Handler = async (_req, res) => ok(res, await getValidationReport(accessOf(res).projectId));

// ───────────────────────────── Experiments ─────────────────────────────

export const experimentList: Handler = async (_req, res) => ok(res, await listExperiments(accessOf(res).projectId));
export const experimentCreate: Handler = async (req, res) => ok(res, await createExperiment(accessOf(res), req.body), 201);
export const experimentUpdate: Handler = async (req, res) => ok(res, await updateExperiment(accessOf(res), req.params.experimentId, req.body));
export const experimentResult: Handler = async (req, res) => ok(res, await recordResult(accessOf(res), req.params.experimentId, req.body), 201);

// ───────────────────────────── Assessment ─────────────────────────────

export const assessmentRun: Handler = async (_req, res) => ok(res, await runAssessment(accessOf(res)), 201);
export const assessmentGet: Handler = async (_req, res) => ok(res, await getAssessments(accessOf(res).projectId));
export const assessmentExplain: Handler = async (req, res) => ok(res, await explainLatestAssessment(accessOf(res), key(req)));
/** Live (unsaved) preview so founders can see how new evidence would move the score before saving a version. */
export const assessmentPreview: Handler = async (_req, res) => ok(res, assessReadiness((await loadWorkspace(accessOf(res).projectId)).snapshot));

// ───────────────────────────── Product Studio ─────────────────────────────

export const mvpGenerate: Handler = async (req, res) => ok(res, await generateSpec(accessOf(res), key(req)), 201);
export const mvpList: Handler = async (_req, res) => ok(res, await listSpecs(accessOf(res).projectId));
export const mvpGet: Handler = async (req, res) => ok(res, await getSpec(accessOf(res).projectId, req.params.sid));
export const mvpRevise: Handler = async (req, res) => ok(res, await reviseSpec(accessOf(res), req.params.sid, req.body));
export const mvpExport: Handler = async (req, res) => {
  const { filename, markdown } = await exportSpecMarkdown(accessOf(res).projectId, req.params.sid);
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.send(markdown);
};

// ───────────────────────────── Business model & financial ─────────────────────────────

export const businessModelList: Handler = async (_req, res) => ok(res, await listBusinessModels(accessOf(res).projectId));
export const businessModelCreate: Handler = async (req, res) => ok(res, await createBusinessModel(accessOf(res), req.body), 201);
export const businessModelCompare: Handler = async (req, res) => ok(res, compareModels(req.body));
export const scenarioCreate: Handler = async (req, res) => ok(res, await createScenarioSet(accessOf(res), req.body), 201);
export const scenarioList: Handler = async (_req, res) => ok(res, await listScenarioSets(accessOf(res).projectId));

// ───────────────────────────── Funding ─────────────────────────────

export const fundingMatches: Handler = async (_req, res) => ok(res, await getFundingMatches(accessOf(res).projectId));
export const fundingReadiness: Handler = async (_req, res) => ok(res, await runFundingReadiness(accessOf(res)), 201);

// ───────────────────────────── Team & documents ─────────────────────────────

export const memberList: Handler = async (_req, res) => ok(res, await listMembers(accessOf(res).projectId));
export const memberInvite: Handler = async (req, res) => ok(res, await inviteMember(accessOf(res), req.body), 201);
export const memberUpdate: Handler = async (req, res) => ok(res, await updateMember(accessOf(res), req.params.mid, req.body));
export const memberRemove: Handler = async (req, res) => {
  await removeMember(accessOf(res), req.params.mid);
  res.status(204).end();
};
export const documentList: Handler = async (_req, res) => ok(res, await listDocumentLinks(accessOf(res).projectId));
export const documentLink: Handler = async (req, res) => ok(res, await linkDocument(accessOf(res), req.body), 201);
export const documentUnlink: Handler = async (req, res) => {
  await unlinkDocument(accessOf(res), req.params.lid);
  res.status(204).end();
};

// ───────────────────────────── Growth ─────────────────────────────

export const growthGet: Handler = async (_req, res) => ok(res, await getGrowth(accessOf(res).projectId));
export const growthRecord: Handler = async (req, res) => ok(res, await recordKpi(accessOf(res), req.body), 201);

// ───────────────────────────── Generic project-scoped CRUD ─────────────────────────────

/**
 * The simple list-type entities (segments, competitors, features, milestones, cost line items) share identical
 * behaviour, so they share one implementation. Every query carries projectId, so rows can never cross ventures.
 */
export interface CrudDelegate {
  findMany(args: { where: { projectId: string }; orderBy: { createdAt: "asc" | "desc" } }): Promise<unknown[]>;
  create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  findFirst(args: { where: { id: string; projectId: string } }): Promise<{ id: string } | null>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  delete(args: { where: { id: string } }): Promise<unknown>;
}

export interface CrudConfig {
  delegate: CrudDelegate;
  entityType: string;
  label: string;
  /** Optional cross-record check run before create/update. */
  validate?: (projectId: string, body: Record<string, unknown>) => Promise<void>;
  map?: (row: never) => unknown;
}

export const crudHandlers = (c: CrudConfig) => {
  const present = (row: unknown) => (c.map ? c.map(row as never) : row);
  const list: Handler = async (_req, res) => ok(res, (await c.delegate.findMany({ where: { projectId: accessOf(res).projectId }, orderBy: { createdAt: "asc" } })).map(present));
  const create: Handler = async (req, res) => {
    const access = accessOf(res);
    await c.validate?.(access.projectId, req.body);
    const row = await c.delegate.create({ data: { ...req.body, projectId: access.projectId } });
    await logActivity({ projectId: access.projectId, actorId: access.userId, action: `${c.entityType}.created`, summary: `Added ${c.label}`, entityType: c.entityType, entityId: row.id });
    return ok(res, present(row), 201);
  };
  const update: Handler = async (req, res) => {
    const access = accessOf(res);
    if (!(await c.delegate.findFirst({ where: { id: req.params.itemId, projectId: access.projectId } }))) throw AppError.notFound(`${c.label} not found`);
    await c.validate?.(access.projectId, req.body);
    const row = await c.delegate.update({ where: { id: req.params.itemId }, data: req.body });
    await logActivity({ projectId: access.projectId, actorId: access.userId, action: `${c.entityType}.updated`, summary: `Updated ${c.label}`, entityType: c.entityType, entityId: req.params.itemId });
    return ok(res, present(row));
  };
  const remove: Handler = async (req, res) => {
    const access = accessOf(res);
    if (!(await c.delegate.findFirst({ where: { id: req.params.itemId, projectId: access.projectId } }))) throw AppError.notFound(`${c.label} not found`);
    await c.delegate.delete({ where: { id: req.params.itemId } });
    await logActivity({ projectId: access.projectId, actorId: access.userId, action: `${c.entityType}.deleted`, summary: `Removed ${c.label}`, entityType: c.entityType, entityId: req.params.itemId });
    res.status(204).end();
  };
  return { list, create, update, remove };
};

/** Milestone assignees must be active members of the same venture. */
export const assertAssignee = async (projectId: string, body: Record<string, unknown>) => {
  const id = body.assigneeId;
  if (typeof id !== "string" || !id) return;
  if (!(await prisma.ventureMember.findFirst({ where: { projectId, userId: id, status: "ACTIVE" }, select: { id: true } }))) {
    throw AppError.badRequest("Assignee is not a member of this venture", "UNKNOWN_ASSIGNEE");
  }
};

export { lineItemDto };
