// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Prisma rows -> API DTOs (see docs/API.md). Keeping this in one place guarantees every endpoint
// exposes provenance the same way.
import type { Prisma } from "@prisma/client";

export const occupationInclude = { sector: true, source: true } satisfies Prisma.OccupationInclude;
export const programInclude = {
  institution: { include: { district: true } },
  skills: { include: { skill: true } },
  source: true,
} satisfies Prisma.ProgramInclude;
export const opportunityInclude = { source: true } satisfies Prisma.OpportunityInclude;

type SourceRow = {
  id: string;
  name: string;
  publisher: string;
  url: string | null;
  publishedAt: Date | null;
  isDemo: boolean;
};

export const toSourceRef = (s: SourceRow) => ({
  id: s.id,
  name: s.name,
  publisher: s.publisher,
  url: s.url,
  publishedAt: s.publishedAt?.toISOString() ?? null,
  isDemo: s.isDemo,
});

export const toOccupation = (o: Prisma.OccupationGetPayload<{ include: typeof occupationInclude }>) => ({
  id: o.id,
  title: o.title,
  description: o.description,
  sector: { id: o.sector.id, name: o.sector.name, nst2Priority: o.sector.nst2Priority },
  minEducation: o.minEducation,
  demand: o.demand,
  salaryMinRwf: o.salaryMinRwf,
  salaryMaxRwf: o.salaryMaxRwf,
  demandSource: o.source ? toSourceRef(o.source) : null,
});

export const toProgram = (p: Prisma.ProgramGetPayload<{ include: typeof programInclude }>) => ({
  id: p.id,
  name: p.name,
  level: p.level,
  durationMonths: p.durationMonths,
  url: p.url,
  institution: {
    id: p.institution.id,
    name: p.institution.name,
    type: p.institution.type,
    district: p.institution.district?.name ?? null,
    website: p.institution.website,
  },
  skills: p.skills.map((s) => s.skill.name),
  source: toSourceRef(p.source),
});

export const toOpportunity = (o: Prisma.OpportunityGetPayload<{ include: typeof opportunityInclude }>) => ({
  id: o.id,
  type: o.type,
  title: o.title,
  provider: o.provider,
  description: o.description,
  eligibility: o.eligibility,
  minEducation: o.minEducation,
  deadline: o.deadline?.toISOString() ?? null,
  isRolling: o.isRolling,
  country: o.country,
  url: o.url,
  lastVerifiedAt: o.lastVerifiedAt?.toISOString() ?? null,
  source: toSourceRef(o.source),
});

export type OccupationDto = ReturnType<typeof toOccupation>;
export type ProgramDto = ReturnType<typeof toProgram>;
export type OpportunityDto = ReturnType<typeof toOpportunity>;
