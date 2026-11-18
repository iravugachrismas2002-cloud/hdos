// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Venture Discovery Engine. Every external factual claim in the report comes from a stored data source and carries
// its publisher and retrieval time; anything the AI adds is labelled as an unverified hypothesis, and the report
// lists what is still unknown. National statistics are shown as trends, never as proof of demand.
import type { z } from "zod";
import { AppError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import { discoveryAiSchema, type DiscoveryAiOutput } from "../ai/venture-output-schemas";
import { DISCOVERY_SYSTEM_PROMPT } from "../ai/venture-prompts";
import { dataBlock, runStructured } from "../ai/venture-orchestrator";
import { matchFunding } from "../funding/funding-matcher";
import { json, logActivity } from "../venture-builder.repository";
import type { discoverySchema } from "../venture-builder.schemas";
import type { ProjectAccess } from "../venture-builder.types";
import { discoveryTemplate } from "./discovery-template";
import { rankSectors, type SectorCandidate } from "./opportunity-matcher";

export interface SourceRefDto {
  name: string;
  publisher: string;
  url: string | null;
  retrievedAt: string;
  isDemo: boolean;
}

export interface DiscoveryFact {
  kind: "NATIONAL_STATISTIC" | "SECTOR_REFERENCE";
  statement: string;
  source: SourceRefDto;
  caveat: string;
}

const humanize = (s: string) => s.replace(/_/g, " ").toLowerCase();

const gatherFacts = async (sectorId: string | null): Promise<DiscoveryFact[]> => {
  const [indicators, sector] = await Promise.all([
    prisma.indicatorValue.findMany({ include: { indicator: true, source: true }, orderBy: { indicator: { code: "asc" } }, take: 30 }),
    sectorId
      ? prisma.sector.findUnique({ where: { id: sectorId }, include: { occupations: { select: { demand: true, source: { select: { name: true, publisher: true, url: true, retrievedAt: true, isDemo: true } } }, take: 50 } } })
      : null,
  ]);
  const facts: DiscoveryFact[] = indicators.map((i) => ({
    kind: "NATIONAL_STATISTIC" as const,
    statement: `${i.indicator.name}: ${i.value} ${i.indicator.unit} (${i.period}, ${i.geography})`,
    source: { name: i.source.name, publisher: i.source.publisher, url: i.source.url, retrievedAt: i.source.retrievedAt.toISOString(), isDemo: i.source.isDemo },
    caveat: "A national trend. It does not show demand for your specific product.",
  }));
  if (sector) {
    const demanded = sector.occupations.filter((o) => o.demand === "HIGH" || o.demand === "VERY_HIGH");
    const src = sector.occupations[0]?.source;
    if (src) {
      facts.push({
        kind: "SECTOR_REFERENCE",
        statement: `${sector.name}${sector.nst2Priority ? " is a national priority sector (NST2)" : ""}; ${demanded.length} of ${sector.occupations.length} reference occupations are rated high demand.`,
        source: { name: src.name, publisher: src.publisher, url: src.url, retrievedAt: src.retrievedAt.toISOString(), isDemo: src.isDemo },
        caveat: "Occupation demand ratings are editorial reference data (marked demo where unverified), not market evidence.",
      });
    }
  }
  return facts;
};

const founderProfile = async (userId: string) => {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { educationLevel: true, skills: { select: { level: true, skill: { select: { name: true } } } }, interests: { select: { sectorId: true, sector: { select: { name: true } } } } },
  });
  return {
    educationLevel: profile ? humanize(profile.educationLevel) : null,
    skills: profile?.skills.map((s) => ({ name: s.skill.name, level: s.level })) ?? [],
    interestSectorIds: profile?.interests.map((i) => i.sectorId) ?? [],
    interestNames: profile?.interests.map((i) => i.sector.name) ?? [],
  };
};

const sectorCandidates = async (): Promise<SectorCandidate[]> => {
  const sectors = await prisma.sector.findMany({
    include: { occupations: { select: { demand: true, skills: { select: { skill: { select: { name: true } } } } } } },
  });
  return sectors.map((s) => {
    const skillDemand = new Map<string, number>();
    for (const o of s.occupations) for (const os of o.skills) skillDemand.set(os.skill.name, (skillDemand.get(os.skill.name) ?? 0) + 1);
    return { id: s.id, code: s.code, name: s.name, nst2Priority: s.nst2Priority, skillDemand, highDemandOccupations: s.occupations.filter((o) => o.demand === "HIGH" || o.demand === "VERY_HIGH").length };
  });
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export const runDiscovery = async (access: ProjectAccess, input: z.infer<typeof discoverySchema>, idempotencyKey: string | null) => {
  const { projectId, userId } = access;
  if (idempotencyKey) {
    const prior = await prisma.ventureAiExecution.findUnique({ where: { projectId_idempotencyKey: { projectId, idempotencyKey } } });
    if (prior) return { ...(prior.output as object), replayed: true };
  }

  const project = await prisma.ventureProject.findUnique({ where: { id: projectId }, include: { sector: true } });
  if (!project) throw AppError.notFound("Venture not found", "VENTURE_NOT_FOUND");

  const idea = (input.ideaText?.trim() || project.ideaSummary || "").trim() || null;
  if (input.mode === "OWN_IDEA" && !idea && !project.problemStatement) throw AppError.badRequest("Describe your idea or the problem first, or choose “Discover an opportunity”.", "IDEA_REQUIRED");
  // Remember the founder's own words on the venture so later steps (and AI chat) can continue from them.
  if (input.mode === "OWN_IDEA" && input.ideaText?.trim() && input.ideaText.trim() !== project.ideaSummary) {
    await prisma.ventureProject.update({ where: { id: projectId }, data: { ideaSummary: input.ideaText.trim() } });
  }

  const sectorId = input.sectorId ?? project.sectorId;
  if (input.sectorId && !(await prisma.sector.findUnique({ where: { id: input.sectorId }, select: { id: true } }))) throw AppError.badRequest("Unknown sector", "UNKNOWN_SECTOR");

  const [facts, founder, candidates, segments, competitors, existing, opportunities] = await Promise.all([
    gatherFacts(sectorId),
    founderProfile(userId),
    sectorCandidates(),
    prisma.ventureCustomerSegment.findMany({ where: { projectId }, select: { name: true } }),
    prisma.ventureCompetitor.findMany({ where: { projectId }, select: { name: true } }),
    prisma.ventureAssumption.findMany({ where: { projectId }, select: { statement: true } }),
    prisma.opportunity.findMany({ include: { source: { select: { name: true, publisher: true, url: true, isDemo: true } } }, take: 500 }),
  ]);

  const sectorLeads = rankSectors(candidates, { skills: founder.skills, interestSectorIds: founder.interestSectorIds });
  const sectorName = sectorId ? candidates.find((c) => c.id === sectorId)?.name ?? null : null;
  const fundingLeads = matchFunding(opportunities, { sectorName, country: project.country }).slice(0, 5);

  const template = discoveryTemplate({ name: project.name, idea, problem: project.problemStatement, sectorName, segmentNames: segments.map((s) => s.name), competitorNames: competitors.map((c) => c.name) });
  const run = await runStructured({
    consent: project.aiProcessingConsent,
    system: DISCOVERY_SYSTEM_PROMPT,
    prompt: dataBlock({
      mode: input.mode,
      idea,
      problem: project.problemStatement,
      sector: sectorName,
      founder: { education: founder.educationLevel, skills: founder.skills.map((s) => s.name).slice(0, 15), sectorInterests: founder.interestNames },
      sectorLeads: sectorLeads.map((l) => l.name),
      knownFacts: facts.slice(0, 12).map((f) => `${f.statement} [source: ${f.source.publisher}]`),
      existingAssumptions: existing.map((e) => e.statement).slice(0, 15),
      segments: segments.map((s) => s.name),
      competitors: competitors.map((c) => c.name),
    }),
    schema: discoveryAiSchema,
    maxTokens: 1500,
  });
  const brief: DiscoveryAiOutput = run.data ?? template;

  // Drafts always enter as UNTESTED hypotheses and never carry evidence.
  const seen = new Set(existing.map((e) => norm(e.statement)));
  const drafts = brief.draftAssumptions.filter((d) => !seen.has(norm(d.statement))).slice(0, 8);
  const created = await prisma.$transaction(drafts.map((d) => prisma.ventureAssumption.create({ data: { projectId, statement: d.statement, category: d.category, riskLevel: d.riskLevel, testMethod: d.testMethod ?? null, status: "UNTESTED", origin: "AI_DRAFT", createdById: userId } })));

  const unknowns = [
    "Whether real customers want this specific product (no customer evidence is recorded by this report).",
    "What customers currently pay and what would make them switch.",
    "Market size for your target segment and district: national statistics above are context only.",
    ...(competitors.length === 0 ? ["Who the competitors and substitutes are."] : []),
  ];

  const report = {
    mode: input.mode,
    generatedAt: new Date().toISOString(),
    aiStatus: { status: run.status, provider: run.provider, model: run.model, schemaValid: run.schemaValid, note: run.note },
    summary: brief.summary,
    opportunityBrief: brief.opportunityBrief,
    interviewQuestions: brief.interviewQuestions,
    recommendations: brief.recommendations,
    draftAssumptions: created.map((a) => ({ id: a.id, statement: a.statement, category: a.category, riskLevel: a.riskLevel, testMethod: a.testMethod, status: a.status, origin: a.origin })),
    founderCapability: { educationLevel: founder.educationLevel, skills: founder.skills, interests: founder.interestNames },
    sectorLeads,
    facts,
    fundingLeads,
    unknowns,
    labels: {
      facts: "Each fact is from a stored data source with publisher and retrieval time. Sources marked demo are illustrative.",
      aiContent: "Opportunity brief, draft assumptions and questions are hypotheses (AI-drafted or template). They are not validated evidence.",
    },
  };

  try {
    await prisma.ventureAiExecution.create({ data: { projectId, userId, kind: "DISCOVERY", idempotencyKey, status: run.status, provider: run.provider, model: run.model, schemaValid: run.schemaValid, input: json({ mode: input.mode, sectorId }), output: json(report) } });
  } catch {
    // A concurrent identical request stored first; this response is equivalent.
  }
  await logActivity({ projectId, actorId: userId, action: "discovery.generated", summary: `Generated discovery report (${run.status.toLowerCase().replace(/_/g, " ")}); ${created.length} draft assumption(s) added`, entityType: "discovery" });
  return { ...report, replayed: false };
};

export const listAiExecutions = async (projectId: string) => {
  const rows = await prisma.ventureAiExecution.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, kind: true, status: true, provider: true, model: true, schemaValid: true, createdAt: true } });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
};

export const latestDiscovery = async (projectId: string) => {
  const row = await prisma.ventureAiExecution.findFirst({ where: { projectId, kind: "DISCOVERY" }, orderBy: { createdAt: "desc" } });
  return row ? row.output : null;
};
