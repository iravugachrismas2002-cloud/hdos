// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Runs and stores deterministic assessments. The AI may only EXPLAIN a stored assessment; it has no path to alter
// a score, and running the same workspace twice returns the identical stored assessment instead of a new one.
import type { VentureAssessment } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../lib/errors";
import { dataBlock, runStructured } from "../ai/venture-orchestrator";
import { EXPLAIN_SYSTEM_PROMPT } from "../ai/venture-prompts";
import { explanationSchema } from "../ai/venture-output-schemas";
import { json, loadWorkspace, logActivity } from "../venture-builder.repository";
import type { ProjectAccess } from "../venture-builder.types";
import { assessFeasibility, type FeasibilityAssessment } from "./feasibility.engine";
import { assessReadiness, digestSnapshot, type DimensionResult, type ReadinessResult } from "./readiness.engine";

export interface AssessmentDto {
  id: string;
  version: number;
  createdAt: string;
  engineVersion: string;
  inputsDigest: string;
  overallScore: number | null;
  overallCoverage: number;
  provisional: boolean;
  maturity: { key: string; label: string; index: number };
  dimensions: DimensionResult[];
  feasibility: FeasibilityAssessment[];
  missingEvidence: string[];
  risks: string[];
  recommendations: string[];
  disclaimer: string;
  reused: boolean;
}

const toDto = (row: VentureAssessment, reused: boolean): AssessmentDto => {
  const cov = row.evidenceCoverage as { provisional?: boolean; maturity?: AssessmentDto["maturity"]; disclaimer?: string };
  return {
    id: row.id,
    version: row.assessmentVersion,
    createdAt: row.createdAt.toISOString(),
    engineVersion: row.engineVersion,
    inputsDigest: row.inputsDigest,
    overallScore: row.overallScore,
    overallCoverage: row.overallCoverage,
    provisional: cov.provisional ?? row.overallCoverage < 0.5,
    maturity: cov.maturity ?? { key: "UNKNOWN", label: row.maturityLabel, index: -1 },
    dimensions: row.dimensionScores as unknown as DimensionResult[],
    feasibility: (row.feasibility ?? []) as unknown as FeasibilityAssessment[],
    missingEvidence: row.missingEvidence as string[],
    risks: row.risks as string[],
    recommendations: row.recommendations as string[],
    disclaimer: cov.disclaimer ?? "",
    reused,
  };
};

export const runAssessment = async (access: ProjectAccess): Promise<AssessmentDto> => {
  const ws = await loadWorkspace(access.projectId);
  // The act of assessing is part of the venture's maturity, so the snapshot used for scoring counts it.
  const snapshot = { ...ws.snapshot, hasAssessment: true };
  const readiness: ReadinessResult = assessReadiness(snapshot);
  const feasibility = assessFeasibility(snapshot, readiness);
  const digest = digestSnapshot(snapshot);

  const latest = await prisma.ventureAssessment.findFirst({ where: { projectId: access.projectId, kind: "VENTURE_READINESS" }, orderBy: { assessmentVersion: "desc" } });
  if (latest && latest.inputsDigest === digest && latest.engineVersion === readiness.engineVersion) return toDto(latest, true);

  const version = (latest?.assessmentVersion ?? 0) + 1;
  const row = await prisma.ventureAssessment.create({
    data: {
      projectId: access.projectId,
      kind: "VENTURE_READINESS",
      assessmentVersion: version,
      engineVersion: readiness.engineVersion,
      overallScore: readiness.overallScore,
      overallCoverage: readiness.overallCoverage,
      maturityLabel: readiness.maturity.label,
      dimensionScores: json(readiness.dimensions),
      feasibility: json(feasibility),
      evidenceCoverage: json({ provisional: readiness.provisional, knownWeight: readiness.knownWeight, maturity: readiness.maturity, disclaimer: readiness.disclaimer, byDimension: Object.fromEntries(readiness.dimensions.map((d) => [d.key, d.coverage])) }),
      missingEvidence: json(readiness.missingEvidence),
      risks: json(readiness.risks),
      recommendations: json(readiness.recommendations),
      inputsDigest: digest,
      createdById: access.userId,
    },
  });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: "assessment.run", summary: `Ran readiness assessment v${version} (${readiness.overallScore === null ? "no scoreable evidence yet" : `${readiness.overallScore}/100, coverage ${Math.round(readiness.overallCoverage * 100)}%`})`, entityType: "assessment", entityId: row.id });
  return toDto(row, false);
};

export const getAssessments = async (projectId: string) => {
  const rows = await prisma.ventureAssessment.findMany({ where: { projectId, kind: "VENTURE_READINESS" }, orderBy: { assessmentVersion: "desc" }, take: 20 });
  return {
    latest: rows[0] ? toDto(rows[0], false) : null,
    history: rows.map((r) => ({ id: r.id, version: r.assessmentVersion, overallScore: r.overallScore, overallCoverage: r.overallCoverage, maturityLabel: r.maturityLabel, createdAt: r.createdAt.toISOString() })),
  };
};

export interface ExplanationDto {
  assessmentVersion: number;
  explanation: string;
  nextSteps: string[];
  generatedBy: "ai" | "template";
  note: string;
}

export const explainLatestAssessment = async (access: ProjectAccess, idempotencyKey: string | null): Promise<ExplanationDto> => {
  const row = await prisma.ventureAssessment.findFirst({ where: { projectId: access.projectId, kind: "VENTURE_READINESS" }, orderBy: { assessmentVersion: "desc" } });
  if (!row) throw AppError.conflict("Run an assessment first", "NO_ASSESSMENT");

  if (idempotencyKey) {
    const prior = await prisma.ventureAiExecution.findUnique({ where: { projectId_idempotencyKey: { projectId: access.projectId, idempotencyKey } } });
    if (prior) return prior.output as unknown as ExplanationDto;
  }

  const dto = toDto(row, false);
  const project = await prisma.ventureProject.findUnique({ where: { id: access.projectId }, select: { aiProcessingConsent: true } });
  const run = await runStructured({
    consent: Boolean(project?.aiProcessingConsent),
    system: EXPLAIN_SYSTEM_PROMPT,
    prompt: dataBlock({ overallScore: dto.overallScore, coveragePercent: Math.round(dto.overallCoverage * 100), maturity: dto.maturity.label, dimensions: dto.dimensions.map((d) => ({ name: d.label, weight: d.weight, score: d.score ?? "unknown", coveragePercent: Math.round(d.coverage * 100) })), risks: dto.risks, missingEvidence: dto.missingEvidence.slice(0, 12) }),
    schema: explanationSchema,
    maxTokens: 700,
  });

  const out: ExplanationDto = run.data
    ? { assessmentVersion: dto.version, explanation: run.data.explanation, nextSteps: run.data.nextSteps, generatedBy: "ai", note: run.note }
    : {
        assessmentVersion: dto.version,
        generatedBy: "template",
        note: run.note,
        explanation:
          dto.overallScore === null
            ? "There is not enough recorded evidence to score this venture yet. Unknown areas are not counted against you; they simply need evidence."
            : `Your venture readiness is ${dto.overallScore}/100 across the dimensions that have evidence, with ${Math.round(dto.overallCoverage * 100)}% overall evidence coverage. ${dto.provisional ? "Coverage is below 50%, so treat this as provisional. " : ""}This is a framework, not a prediction of success.`,
        nextSteps: dto.recommendations.slice(0, 5),
      };

  try {
    await prisma.ventureAiExecution.create({ data: { projectId: access.projectId, userId: access.userId, kind: "ASSESSMENT_EXPLANATION", idempotencyKey, status: run.status, provider: run.provider, model: run.model, schemaValid: run.schemaValid, input: json({ assessmentVersion: dto.version }), output: json(out) } });
  } catch {
    // A concurrent retry with the same key won the race; the stored result is equivalent.
  }
  return out;
};
