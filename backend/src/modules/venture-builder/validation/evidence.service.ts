// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Assumptions, research sources and evidence. Core rules enforced here:
//  - AI drafts enter as UNTESTED; only a person can mark an assumption SUPPORTED/REFUTED, and only with evidence.
//  - External factual claims need a source (publisher + retrieval time) or stay labelled user-reported.
//  - Interview evidence needs recorded consent; personal identifiers cannot be stored without it.
import type { VentureVerificationStatus } from "@prisma/client";
import type { z } from "zod";
import { AppError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import type { EvidenceInput } from "../assessment/evidence-scoring";
import { logActivity } from "../venture-builder.repository";
import type { createAssumptionSchema, createEvidenceSchema, createSourceSchema, updateAssumptionSchema, updateEvidenceSchema } from "../venture-builder.schemas";
import { roleCan, type ProjectAccess } from "../venture-builder.types";
import { buildValidationReport, canSetAssumptionStatus } from "./validation.engine";

const evidenceInputSelect = { id: true, assumptionId: true, evidenceType: true, direction: true, verificationStatus: true, consentGiven: true } as const;

// ───────────────────────────── Assumptions ─────────────────────────────

export const listAssumptions = (projectId: string) =>
  prisma.ventureAssumption.findMany({ where: { projectId }, orderBy: [{ createdAt: "desc" }], include: { _count: { select: { evidence: true, experiments: true } } } });

export const createAssumption = async (access: ProjectAccess, input: z.infer<typeof createAssumptionSchema>) => {
  const row = await prisma.ventureAssumption.create({ data: { projectId: access.projectId, ...input, status: "UNTESTED", origin: "USER", createdById: access.userId } });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: "assumption.created", summary: `Added assumption: ${row.statement.slice(0, 120)}`, entityType: "assumption", entityId: row.id });
  return row;
};

export const updateAssumption = async (access: ProjectAccess, id: string, input: z.infer<typeof updateAssumptionSchema>) => {
  const existing = await prisma.ventureAssumption.findFirst({ where: { id, projectId: access.projectId } });
  if (!existing) throw AppError.notFound("Assumption not found");
  if (input.status && input.status !== existing.status) {
    const linked = await prisma.ventureEvidence.findMany({ where: { projectId: access.projectId, assumptionId: id }, select: evidenceInputSelect });
    const decision = canSetAssumptionStatus(input.status, linked as EvidenceInput[]);
    if (!decision.allowed) throw AppError.conflict(decision.reason ?? "Not enough evidence", "ASSUMPTION_NEEDS_EVIDENCE");
  }
  const row = await prisma.ventureAssumption.update({ where: { id }, data: input });
  const statusChanged = input.status && input.status !== existing.status;
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: statusChanged ? "assumption.status_changed" : "assumption.updated", summary: statusChanged ? `Assumption ${existing.status} → ${row.status}: ${row.statement.slice(0, 100)}` : `Updated assumption: ${row.statement.slice(0, 120)}`, entityType: "assumption", entityId: id });
  return row;
};

export const deleteAssumption = async (access: ProjectAccess, id: string) => {
  const existing = await prisma.ventureAssumption.findFirst({ where: { id, projectId: access.projectId } });
  if (!existing) throw AppError.notFound("Assumption not found");
  await prisma.ventureAssumption.delete({ where: { id } });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: "assumption.deleted", summary: `Deleted assumption: ${existing.statement.slice(0, 120)}`, entityType: "assumption", entityId: id });
};

// ───────────────────────────── Research sources ─────────────────────────────

export const listSources = (projectId: string) => prisma.ventureResearchSource.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });

export const createSource = async (access: ProjectAccess, input: z.infer<typeof createSourceSchema>) => {
  if (input.retrievedAt.getTime() > Date.now() + 86_400_000) throw AppError.badRequest("Retrieval date cannot be in the future", "INVALID_RETRIEVAL_DATE");
  const row = await prisma.ventureResearchSource.create({ data: { projectId: access.projectId, ...input, createdById: access.userId } });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: "source.created", summary: `Recorded source: ${row.title.slice(0, 120)} (${row.publisher})`, entityType: "source", entityId: row.id });
  return row;
};

// ───────────────────────────── Evidence ─────────────────────────────

export const listEvidence = (projectId: string, assumptionId?: string) =>
  prisma.ventureEvidence.findMany({
    where: { projectId, ...(assumptionId ? { assumptionId } : {}) },
    orderBy: { observedAt: "desc" },
    include: { source: { select: { id: true, title: true, publisher: true, url: true, retrievedAt: true } } },
    take: 300,
  });

export const createEvidence = async (access: ProjectAccess, input: z.infer<typeof createEvidenceSchema>) => {
  const { projectId, userId } = access;
  const canVerify = roleCan(access.role, "edit");

  if (input.assumptionId && !(await prisma.ventureAssumption.findFirst({ where: { id: input.assumptionId, projectId }, select: { id: true } }))) throw AppError.badRequest("Assumption does not belong to this venture", "UNKNOWN_ASSUMPTION");
  if (input.experimentId && !(await prisma.ventureExperiment.findFirst({ where: { id: input.experimentId, projectId }, select: { id: true } }))) throw AppError.badRequest("Experiment does not belong to this venture", "UNKNOWN_EXPERIMENT");
  if (input.sourceId && !(await prisma.ventureResearchSource.findFirst({ where: { id: input.sourceId, projectId }, select: { id: true } }))) throw AppError.badRequest("Source does not belong to this venture", "UNKNOWN_SOURCE");
  if (input.documentId && !(await prisma.applicantDocument.findFirst({ where: { id: input.documentId, userId, deletedAt: null }, select: { id: true } }))) throw AppError.badRequest("Document not found in your vault", "DOCUMENT_NOT_FOUND");

  if (input.evidenceType === "OFFICIAL_STATISTIC" && !input.sourceId) throw AppError.badRequest("A statistic needs a recorded source (publisher and retrieval date).", "SOURCE_REQUIRED");
  if (input.respondentLabel && !input.consentGiven) throw AppError.badRequest("Record the participant's consent before storing their name or identifying details.", "CONSENT_REQUIRED");

  let verification: VentureVerificationStatus = input.sourceId ? "SOURCE_LINKED" : "USER_REPORTED";
  if (input.verificationStatus) {
    if (input.verificationStatus === "SOURCE_LINKED" && !input.sourceId) throw AppError.badRequest("Link a source before marking evidence as source-linked.", "SOURCE_REQUIRED");
    if ((input.verificationStatus === "VERIFIED" || input.verificationStatus === "DISPUTED") && !canVerify) throw AppError.forbidden("Only editors and above can verify or dispute evidence", "VENTURE_ROLE_FORBIDDEN");
    verification = input.verificationStatus;
  }

  const row = await prisma.ventureEvidence.create({
    data: {
      projectId,
      assumptionId: input.assumptionId ?? null,
      experimentId: input.experimentId ?? null,
      evidenceType: input.evidenceType,
      direction: input.direction,
      description: input.description,
      sourceId: input.sourceId ?? null,
      documentId: input.documentId ?? null,
      respondentLabel: input.respondentLabel,
      consentGiven: input.consentGiven,
      consentRecordedAt: input.consentGiven ? new Date() : null,
      verificationStatus: verification,
      observedAt: input.observedAt ?? new Date(),
      createdById: userId,
    },
  });
  if (input.assumptionId) await prisma.ventureAssumption.updateMany({ where: { id: input.assumptionId, projectId, status: "UNTESTED" }, data: { status: "TESTING" } });
  await logActivity({ projectId, actorId: userId, action: "evidence.created", summary: `Recorded ${input.evidenceType.toLowerCase().replace(/_/g, " ")} evidence (${verification.toLowerCase().replace(/_/g, " ")})`, entityType: "evidence", entityId: row.id });
  return row;
};

export const updateEvidence = async (access: ProjectAccess, id: string, input: z.infer<typeof updateEvidenceSchema>) => {
  const existing = await prisma.ventureEvidence.findFirst({ where: { id, projectId: access.projectId } });
  if (!existing) throw AppError.notFound("Evidence not found");
  if (input.verificationStatus && input.verificationStatus !== existing.verificationStatus) {
    if (!roleCan(access.role, "edit")) throw AppError.forbidden("Only editors and above can change verification", "VENTURE_ROLE_FORBIDDEN");
    if (input.verificationStatus === "SOURCE_LINKED" && !existing.sourceId) throw AppError.badRequest("Link a source before marking evidence as source-linked.", "SOURCE_REQUIRED");
  }
  const editsContent = input.direction !== undefined || input.description !== undefined;
  if (editsContent && !roleCan(access.role, "edit") && existing.createdById !== access.userId) throw AppError.forbidden("Contributors can only edit their own evidence", "VENTURE_ROLE_FORBIDDEN");
  const row = await prisma.ventureEvidence.update({ where: { id }, data: input });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: "evidence.updated", summary: input.verificationStatus ? `Evidence marked ${input.verificationStatus.toLowerCase().replace(/_/g, " ")}` : "Updated evidence", entityType: "evidence", entityId: id });
  return row;
};

// ───────────────────────────── Validation report ─────────────────────────────

export const getValidationReport = async (projectId: string) => {
  const [assumptions, evidence] = await Promise.all([
    prisma.ventureAssumption.findMany({ where: { projectId }, select: { id: true, statement: true, category: true, riskLevel: true, status: true } }),
    prisma.ventureEvidence.findMany({ where: { projectId }, select: evidenceInputSelect }),
  ]);
  return buildValidationReport(assumptions, evidence as EvidenceInput[]);
};
