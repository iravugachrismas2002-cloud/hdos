// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Funding & ecosystem intelligence on top of the existing HDOS opportunity catalogue and Application Portal.
import { prisma } from "../../../lib/prisma";
import { evidenceFor, scoreEvidence } from "../assessment/evidence-scoring";
import { json, loadWorkspace, logActivity } from "../venture-builder.repository";
import type { ProjectAccess } from "../venture-builder.types";
import { ECOSYSTEM, hydrateEcosystem } from "./ecosystem";
import { fundingReadinessChecks, matchFunding, type OpportunityRecord } from "./funding-matcher";

const loadOpportunities = async (): Promise<OpportunityRecord[]> => {
  const rows = await prisma.opportunity.findMany({ include: { source: { select: { name: true, publisher: true, url: true, isDemo: true } } }, take: 500 });
  return rows;
};

export const getEcosystem = async () => {
  const sources = await prisma.dataSource.findMany({
    where: { slug: { in: ECOSYSTEM.map((entry) => entry.sourceSlug) } },
    select: { slug: true, name: true, publisher: true, url: true, retrievedAt: true, isDemo: true },
  });
  return hydrateEcosystem(sources);
};

export const getFundingMatches = async (projectId: string) => {
  const [project, opportunities, ecosystem] = await Promise.all([
    prisma.ventureProject.findUnique({ where: { id: projectId }, select: { country: true, sector: { select: { name: true } } } }),
    loadOpportunities(),
    getEcosystem(),
  ]);
  const matches = matchFunding(opportunities, { sectorName: project?.sector?.name ?? null, country: project?.country ?? "RW" });
  return {
    matches,
    summary: { open: matches.filter((m) => m.isActive).length, needsVerification: matches.filter((m) => !m.isActive && m.callStatus !== "EXPIRED").length, expired: matches.filter((m) => m.callStatus === "EXPIRED").length },
    ecosystem,
    notes: [
      "Only calls marked OPEN were verified recently and are not past their deadline. Every other call must be confirmed with the official provider first.",
      "A match is not an approval. To apply, add the opportunity to your Applications and follow the provider's official process.",
    ],
  };
};

export const runFundingReadiness = async (access: ProjectAccess) => {
  const ws = await loadWorkspace(access.projectId);
  const s = ws.snapshot;
  const solid = (cats: Parameters<typeof evidenceFor>[0], types: Parameters<typeof evidenceFor>[1]) => scoreEvidence(evidenceFor(cats, types, s.assumptions, s.evidence)).usable > 0;
  const docs = await prisma.ventureDocumentLink.count({ where: { projectId: access.projectId, document: { deletedAt: null, kind: { in: ["PORTFOLIO", "STUDY_PLAN", "OTHER", "SUBMITTED_APPLICATION"] } } } });

  const checks = fundingReadinessChecks({
    hasProblemEvidence: solid(["PROBLEM"], []),
    hasCustomerEvidence: solid(["CUSTOMER"], ["INTERVIEW", "SURVEY"]),
    hasWillingnessToPayEvidence: solid(["WILLINGNESS_TO_PAY"], ["TEST_ORDER"]),
    hasBaseScenario: s.baseScenario !== null,
    hasBusinessModel: s.hasBusinessModel,
    hasMvpSpec: s.hasMvpSpec,
    hasTeam: s.activeMembers > 1,
    hasPitchDocument: docs > 0,
    hasAssessment: s.hasAssessment,
    openHighRiskAssumptions: s.assumptions.filter((a) => a.riskLevel === "HIGH" && ["UNTESTED", "TESTING", "INCONCLUSIVE"].includes(a.status)).length,
  });
  const met = checks.filter((c) => c.met).length;
  const missing = checks.filter((c) => !c.met);
  const latest = await prisma.ventureAssessment.findFirst({ where: { projectId: access.projectId, kind: "FUNDING_READINESS" }, orderBy: { assessmentVersion: "desc" }, select: { assessmentVersion: true } });
  const version = (latest?.assessmentVersion ?? 0) + 1;
  const row = await prisma.ventureAssessment.create({
    data: {
      projectId: access.projectId,
      kind: "FUNDING_READINESS",
      assessmentVersion: version,
      engineVersion: "frd-1.0.0",
      overallScore: Math.round((met / checks.length) * 100),
      overallCoverage: 1,
      maturityLabel: `${met} of ${checks.length} checks met`,
      dimensionScores: json(checks),
      evidenceCoverage: json({}),
      missingEvidence: json(missing.map((m) => `${m.label}: ${m.detail}`)),
      risks: json([]),
      recommendations: json(missing.map((m) => `Add: ${m.label}`)),
      inputsDigest: `${met}/${checks.length}`,
      createdById: access.userId,
    },
  });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: "funding.readiness_run", summary: `Funding readiness: ${met} of ${checks.length} checks met`, entityType: "assessment", entityId: row.id });
  return {
    id: row.id,
    version,
    createdAt: row.createdAt.toISOString(),
    checks,
    metCount: met,
    totalChecks: checks.length,
    missing: missing.map((m) => ({ key: m.key, label: m.label, detail: m.detail })),
    disclaimer: "A readiness checklist shows which commonly requested items exist in your workspace. It is not a prediction of funding and not an approval. HDOS never contacts investors or submits applications for you.",
  };
};
