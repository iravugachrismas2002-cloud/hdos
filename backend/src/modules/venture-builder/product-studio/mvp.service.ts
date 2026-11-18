// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// MVP specification generation, editing and versioning. Every change creates a new version, so earlier versions
// stay available. No source code is changed or deployed: the output is a document for human review.
import type { VentureMvpSpecification } from "@prisma/client";
import type { z } from "zod";
import { AppError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import { dataBlock, runStructured } from "../ai/venture-orchestrator";
import { MVP_SYSTEM_PROMPT } from "../ai/venture-prompts";
import { mvpAiSchema, mvpContentSchema } from "../ai/venture-output-schemas";
import { json, logActivity } from "../venture-builder.repository";
import type { updateSpecSchema } from "../venture-builder.schemas";
import type { ProjectAccess } from "../venture-builder.types";
import { mergeAiNarrative, planMvp, type StoredMvpContent } from "./mvp-planner";
import { specToMarkdown } from "./product-requirements.service";

const dto = (r: VentureMvpSpecification, replayed = false) => ({
  id: r.id,
  version: r.version,
  status: r.status,
  generatedBy: r.generatedBy,
  changeNote: r.changeNote,
  createdAt: r.createdAt.toISOString(),
  content: r.content as unknown as StoredMvpContent,
  replayed,
});

export const listSpecs = async (projectId: string) => {
  const rows = await prisma.ventureMvpSpecification.findMany({ where: { projectId }, orderBy: { version: "desc" }, take: 30 });
  return rows.map((r) => dto(r));
};

export const getSpec = async (projectId: string, specId: string) => {
  const row = await prisma.ventureMvpSpecification.findFirst({ where: { id: specId, projectId } });
  if (!row) throw AppError.notFound("Specification not found");
  return dto(row);
};

export const generateSpec = async (access: ProjectAccess, idempotencyKey: string | null) => {
  const { projectId } = access;
  if (idempotencyKey) {
    const prior = await prisma.ventureAiExecution.findUnique({ where: { projectId_idempotencyKey: { projectId, idempotencyKey } } });
    const specId = (prior?.output as { specId?: string } | undefined)?.specId;
    if (prior && specId) {
      const spec = await prisma.ventureMvpSpecification.findUnique({ where: { id: specId } });
      if (spec) return { ...dto(spec, true), aiNote: "Returned the result of an earlier identical request." };
    }
  }

  const [project, segments, features, assumptions] = await Promise.all([
    prisma.ventureProject.findUnique({ where: { id: projectId } }),
    prisma.ventureCustomerSegment.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
    prisma.ventureFeature.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
    prisma.ventureAssumption.findMany({ where: { projectId } }),
  ]);
  if (!project) throw AppError.notFound("Venture not found", "VENTURE_NOT_FOUND");

  const base = planMvp({
    name: project.name,
    idea: project.ideaSummary,
    problem: project.problemStatement,
    segments: segments.map((s) => ({ name: s.name, description: s.description, needs: s.needs })),
    features: features.map((f) => ({ title: f.title, description: f.description, priority: f.priority, userStory: f.userStory, acceptanceCriteria: f.acceptanceCriteria })),
    supportedAssumptions: assumptions.filter((a) => a.status === "SUPPORTED").map((a) => a.statement),
    untestedHighRiskAssumptions: assumptions.filter((a) => a.riskLevel === "HIGH" && ["UNTESTED", "TESTING", "INCONCLUSIVE"].includes(a.status)).map((a) => a.statement),
  });

  const run = await runStructured({
    consent: project.aiProcessingConsent,
    system: MVP_SYSTEM_PROMPT,
    prompt: dataBlock({ name: project.name, idea: project.ideaSummary, problem: project.problemStatement, personas: base.personas.map((p) => p.name), mvpScope: base.mvpScope, supportedAssumptions: base.meta.basedOn.supportedAssumptions }),
    schema: mvpAiSchema,
    maxTokens: 1600,
  });
  const content = run.data ? mergeAiNarrative(base, run.data) : base;

  const latest = await prisma.ventureMvpSpecification.findFirst({ where: { projectId }, orderBy: { version: "desc" }, select: { version: true } });
  const spec = await prisma.ventureMvpSpecification.create({
    data: { projectId, version: (latest?.version ?? 0) + 1, status: "DRAFT", content: json(content), generatedBy: content.meta.generatedBy, changeNote: "Generated", createdById: access.userId },
  });
  try {
    await prisma.ventureAiExecution.create({ data: { projectId, userId: access.userId, kind: "MVP_SPEC", idempotencyKey, status: run.status, provider: run.provider, model: run.model, schemaValid: run.schemaValid, input: json({ features: features.length, segments: segments.length }), output: json({ specId: spec.id, version: spec.version }) } });
  } catch {
    // Same idempotency key raced; the spec above is still valid.
  }
  await logActivity({ projectId, actorId: access.userId, action: "mvp.generated", summary: `Generated MVP specification v${spec.version} (${content.meta.generatedBy})`, entityType: "mvp", entityId: spec.id });
  return { ...dto(spec), aiNote: run.note };
};

/** Editing never mutates a stored version: it writes version N+1 so history is preserved. */
export const reviseSpec = async (access: ProjectAccess, specId: string, input: z.infer<typeof updateSpecSchema>) => {
  const current = await prisma.ventureMvpSpecification.findFirst({ where: { id: specId, projectId: access.projectId } });
  if (!current) throw AppError.notFound("Specification not found");
  const existing = current.content as unknown as StoredMvpContent;
  const merged = { ...existing, ...(input.content ?? {}) };
  const { meta, ...body } = merged;
  const parsed = mvpContentSchema.safeParse(body);
  if (!parsed.success) throw AppError.badRequest("The edited specification is not valid", "INVALID_SPEC", parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })));

  const latest = await prisma.ventureMvpSpecification.findFirst({ where: { projectId: access.projectId }, orderBy: { version: "desc" }, select: { version: true } });
  const version = (latest?.version ?? 0) + 1;
  const row = await prisma.ventureMvpSpecification.create({
    data: {
      projectId: access.projectId,
      version,
      status: input.status ?? "DRAFT",
      content: json({ ...parsed.data, meta: { ...meta, generatedBy: meta.generatedBy } }),
      generatedBy: "edited",
      changeNote: input.changeNote ?? (input.status === "APPROVED" ? "Approved" : "Edited"),
      createdById: access.userId,
    },
  });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: input.status === "APPROVED" ? "mvp.approved" : "mvp.revised", summary: `${input.status === "APPROVED" ? "Approved" : "Revised"} MVP specification → v${version}`, entityType: "mvp", entityId: row.id });
  return dto(row);
};

export const exportSpecMarkdown = async (projectId: string, specId: string) => {
  const [row, project] = await Promise.all([prisma.ventureMvpSpecification.findFirst({ where: { id: specId, projectId } }), prisma.ventureProject.findUnique({ where: { id: projectId }, select: { name: true } })]);
  if (!row || !project) throw AppError.notFound("Specification not found");
  return { filename: `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-mvp-v${row.version}.md`, markdown: specToMarkdown(project.name, row.version, row.content as unknown as StoredMvpContent) };
};
