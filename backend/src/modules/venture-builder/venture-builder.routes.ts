// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Venture Builder REST API, mounted at /api/venture-builder. Every /projects/:id route runs `projectAccess`, which
// enforces ACTIVE membership, the role's permission for the action and (for advisors) the shared section.
import { Router } from "express";
import { asyncHandler } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middleware/auth";
import { aiLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import * as c from "./venture-builder.controller";
import { projectAccess } from "./venture-builder.repository";
import * as s from "./venture-builder.schemas";

export const ventureBuilderRouter = Router();
ventureBuilderRouter.use(authenticate);

const h = asyncHandler;
const P = "/projects/:id";

// ── Overview, catalogues, invitations (not project-scoped) ──
ventureBuilderRouter.get("/dashboard", h(c.dashboard));
ventureBuilderRouter.get("/team/roles", h(c.teamRoles));
ventureBuilderRouter.get("/ecosystem", h(c.ecosystem));
ventureBuilderRouter.get("/invitations", h(c.myInvitations));
ventureBuilderRouter.post("/invitations/:memberId/accept", h(c.respondInvitation(true)));
ventureBuilderRouter.post("/invitations/:memberId/decline", h(c.respondInvitation(false)));

// ── Projects & lifecycle ──
ventureBuilderRouter.post("/projects", validate(s.createProjectSchema), h(c.projectCreate));
ventureBuilderRouter.get("/projects", h(c.projectList));
ventureBuilderRouter.get(P, projectAccess("read", "overview"), h(c.projectGet));
ventureBuilderRouter.patch(P, projectAccess("edit", "overview"), validate(s.updateProjectSchema), h(c.projectUpdate));
ventureBuilderRouter.post(`${P}/status`, projectAccess("edit", "overview"), validate(s.statusChangeSchema), h(c.projectStatus));
ventureBuilderRouter.get(`${P}/status-history`, projectAccess("read", "activity"), h(c.projectStatusHistory));
ventureBuilderRouter.get(`${P}/activity`, projectAccess("read", "activity"), h(c.projectActivity));
ventureBuilderRouter.get(`${P}/export`, projectAccess("own", "overview"), h(c.projectExport));

// ── Discovery ──
ventureBuilderRouter.post(`${P}/discovery`, aiLimiter, projectAccess("edit", "discovery"), validate(s.discoverySchema), h(c.discoveryRun));
ventureBuilderRouter.get(`${P}/discovery`, projectAccess("read", "discovery"), h(c.discoveryLatest));
ventureBuilderRouter.get(`${P}/ai-executions`, projectAccess("read", "discovery"), h(c.aiExecutions));

// ── Validation: assumptions, sources, evidence, experiments ──
ventureBuilderRouter.get(`${P}/assumptions`, projectAccess("read", "validation"), h(c.assumptionList));
ventureBuilderRouter.post(`${P}/assumptions`, projectAccess("edit", "validation"), validate(s.createAssumptionSchema), h(c.assumptionCreate));
ventureBuilderRouter.patch(`${P}/assumptions/:aid`, projectAccess("edit", "validation"), validate(s.updateAssumptionSchema), h(c.assumptionUpdate));
ventureBuilderRouter.delete(`${P}/assumptions/:aid`, projectAccess("edit", "validation"), h(c.assumptionDelete));
ventureBuilderRouter.get(`${P}/sources`, projectAccess("read", "validation"), h(c.sourceList));
ventureBuilderRouter.post(`${P}/sources`, projectAccess("contribute", "validation"), validate(s.createSourceSchema), h(c.sourceCreate));
ventureBuilderRouter.get(`${P}/evidence`, projectAccess("read", "validation"), h(c.evidenceList));
ventureBuilderRouter.post(`${P}/evidence`, projectAccess("contribute", "validation"), validate(s.createEvidenceSchema), h(c.evidenceCreate));
ventureBuilderRouter.patch(`${P}/evidence/:eid`, projectAccess("contribute", "validation"), validate(s.updateEvidenceSchema), h(c.evidenceUpdate));
ventureBuilderRouter.get(`${P}/validation-report`, projectAccess("read", "validation"), h(c.validationReport));
ventureBuilderRouter.get(`${P}/experiments`, projectAccess("read", "validation"), h(c.experimentList));
ventureBuilderRouter.post(`${P}/experiments`, projectAccess("edit", "validation"), validate(s.experimentSchema), h(c.experimentCreate));
ventureBuilderRouter.patch(`${P}/experiments/:experimentId`, projectAccess("edit", "validation"), validate(s.updateExperimentSchema), h(c.experimentUpdate));
ventureBuilderRouter.post(`${P}/experiments/:experimentId/results`, projectAccess("contribute", "validation"), validate(s.experimentResultSchema), h(c.experimentResult));

const segments = c.crudHandlers({ delegate: prisma.ventureCustomerSegment as unknown as c.CrudDelegate, entityType: "segment", label: "customer segment" });
ventureBuilderRouter.get(`${P}/segments`, projectAccess("read", "validation"), h(segments.list));
ventureBuilderRouter.post(`${P}/segments`, projectAccess("edit", "validation"), validate(s.segmentSchema), h(segments.create));
ventureBuilderRouter.patch(`${P}/segments/:itemId`, projectAccess("edit", "validation"), validate(s.segmentSchema.partial()), h(segments.update));
ventureBuilderRouter.delete(`${P}/segments/:itemId`, projectAccess("edit", "validation"), h(segments.remove));

const competitors = c.crudHandlers({ delegate: prisma.ventureCompetitor as unknown as c.CrudDelegate, entityType: "competitor", label: "competitor" });
ventureBuilderRouter.get(`${P}/competitors`, projectAccess("read", "validation"), h(competitors.list));
ventureBuilderRouter.post(`${P}/competitors`, projectAccess("edit", "validation"), validate(s.competitorSchema), h(competitors.create));
ventureBuilderRouter.patch(`${P}/competitors/:itemId`, projectAccess("edit", "validation"), validate(s.competitorSchema.partial()), h(competitors.update));
ventureBuilderRouter.delete(`${P}/competitors/:itemId`, projectAccess("edit", "validation"), h(competitors.remove));

// ── Assessment ──
ventureBuilderRouter.post(`${P}/assessment`, projectAccess("edit", "assessment"), h(c.assessmentRun));
ventureBuilderRouter.get(`${P}/assessment`, projectAccess("read", "assessment"), h(c.assessmentGet));
ventureBuilderRouter.get(`${P}/assessment/preview`, projectAccess("read", "assessment"), h(c.assessmentPreview));
ventureBuilderRouter.post(`${P}/assessment/explain`, aiLimiter, projectAccess("edit", "assessment"), h(c.assessmentExplain));

// ── Product Studio ──
ventureBuilderRouter.post(`${P}/mvp`, aiLimiter, projectAccess("edit", "product"), h(c.mvpGenerate));
ventureBuilderRouter.get(`${P}/mvp`, projectAccess("read", "product"), h(c.mvpList));
ventureBuilderRouter.get(`${P}/mvp/:sid`, projectAccess("read", "product"), h(c.mvpGet));
ventureBuilderRouter.patch(`${P}/mvp/:sid`, projectAccess("edit", "product"), validate(s.updateSpecSchema), h(c.mvpRevise));
ventureBuilderRouter.get(`${P}/mvp/:sid/export`, projectAccess("read", "product"), h(c.mvpExport));

const features = c.crudHandlers({ delegate: prisma.ventureFeature as unknown as c.CrudDelegate, entityType: "feature", label: "feature" });
ventureBuilderRouter.get(`${P}/features`, projectAccess("read", "product"), h(features.list));
ventureBuilderRouter.post(`${P}/features`, projectAccess("edit", "product"), validate(s.featureSchema), h(features.create));
ventureBuilderRouter.patch(`${P}/features/:itemId`, projectAccess("edit", "product"), validate(s.featureSchema.partial()), h(features.update));
ventureBuilderRouter.delete(`${P}/features/:itemId`, projectAccess("edit", "product"), h(features.remove));

const milestones = c.crudHandlers({ delegate: prisma.ventureMilestone as unknown as c.CrudDelegate, entityType: "milestone", label: "milestone", validate: c.assertAssignee });
ventureBuilderRouter.get(`${P}/milestones`, projectAccess("read", "product"), h(milestones.list));
ventureBuilderRouter.post(`${P}/milestones`, projectAccess("edit", "product"), validate(s.milestoneSchema), h(milestones.create));
ventureBuilderRouter.patch(`${P}/milestones/:itemId`, projectAccess("contribute", "product"), validate(s.milestoneSchema.partial()), h(milestones.update));
ventureBuilderRouter.delete(`${P}/milestones/:itemId`, projectAccess("edit", "product"), h(milestones.remove));

// ── Business model & financial ──
ventureBuilderRouter.get(`${P}/business-model`, projectAccess("read", "business-model"), h(c.businessModelList));
ventureBuilderRouter.post(`${P}/business-model`, projectAccess("edit", "business-model"), validate(s.businessModelSchema), h(c.businessModelCreate));
ventureBuilderRouter.post(`${P}/business-model/compare`, projectAccess("read", "business-model"), validate(s.compareModelsSchema), h(c.businessModelCompare));

const lineItems = c.crudHandlers({ delegate: prisma.ventureFinancialLineItem as unknown as c.CrudDelegate, entityType: "line_item", label: "cost line item", map: c.lineItemDto as never });
ventureBuilderRouter.get(`${P}/financial/line-items`, projectAccess("read", "financial"), h(lineItems.list));
ventureBuilderRouter.post(`${P}/financial/line-items`, projectAccess("edit", "financial"), validate(s.lineItemSchema), h(lineItems.create));
ventureBuilderRouter.patch(`${P}/financial/line-items/:itemId`, projectAccess("edit", "financial"), validate(s.lineItemSchema.partial()), h(lineItems.update));
ventureBuilderRouter.delete(`${P}/financial/line-items/:itemId`, projectAccess("edit", "financial"), h(lineItems.remove));
ventureBuilderRouter.post(`${P}/financial-scenarios`, projectAccess("edit", "financial"), validate(s.scenarioSchema), h(c.scenarioCreate));
ventureBuilderRouter.get(`${P}/financial-scenarios`, projectAccess("read", "financial"), h(c.scenarioList));

// ── Funding ──
ventureBuilderRouter.get(`${P}/funding-matches`, projectAccess("read", "funding"), h(c.fundingMatches));
ventureBuilderRouter.post(`${P}/funding-readiness`, projectAccess("edit", "funding"), h(c.fundingReadiness));

// ── Team & documents ──
ventureBuilderRouter.get(`${P}/members`, projectAccess("read", "team"), h(c.memberList));
ventureBuilderRouter.post(`${P}/members`, projectAccess("manage", "team"), validate(s.inviteMemberSchema), h(c.memberInvite));
ventureBuilderRouter.patch(`${P}/members/:mid`, projectAccess("manage", "team"), validate(s.updateMemberSchema), h(c.memberUpdate));
// Any member may leave; owners and admins remove others (rules enforced in the service).
ventureBuilderRouter.delete(`${P}/members/:mid`, projectAccess("read", "overview"), h(c.memberRemove));
ventureBuilderRouter.get(`${P}/documents`, projectAccess("read", "documents"), h(c.documentList));
ventureBuilderRouter.post(`${P}/documents`, projectAccess("edit", "documents"), validate(s.documentLinkSchema), h(c.documentLink));
ventureBuilderRouter.delete(`${P}/documents/:lid`, projectAccess("edit", "documents"), h(c.documentUnlink));

// ── Growth ──
ventureBuilderRouter.get(`${P}/growth`, projectAccess("read", "growth"), h(c.growthGet));
ventureBuilderRouter.post(`${P}/growth/kpis`, projectAccess("contribute", "growth"), validate(s.kpiSchema), h(c.growthRecord));
