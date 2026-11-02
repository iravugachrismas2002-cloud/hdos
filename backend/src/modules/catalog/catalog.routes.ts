// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { asyncHandler, meta, pageArgs, paginationSchema } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import {
  occupationInclude,
  opportunityInclude,
  programInclude,
  toOccupation,
  toOpportunity,
  toProgram,
  toSourceRef,
} from "../../lib/mappers";
import { validate } from "../../middleware/validate";
import { OPPORTUNITY_SOURCE_DIRECTORY } from "../../seed/data/opportunitySourceDirectory";

export const catalogRouter = Router();

// Reference data changes rarely; let browsers and proxies cache it briefly.
catalogRouter.use((_req, res, next) => {
  res.set("Cache-Control", "public, max-age=300");
  next();
});

const q = z.string().trim().max(80).optional();
const levels = [
  "NONE", "PRIMARY", "LOWER_SECONDARY", "UPPER_SECONDARY", "TVET_CERTIFICATE", "DIPLOMA", "BACHELORS", "MASTERS", "DOCTORATE",
] as const;

catalogRouter.get(
  "/districts",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.district.findMany({ include: { province: true }, orderBy: { name: "asc" } });
    res.json({ data: rows.map((d) => ({ id: d.id, name: d.name, province: d.province.name })) });
  }),
);

catalogRouter.get(
  "/sectors",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.sector.findMany({ orderBy: { name: "asc" } });
    res.json({ data: rows.map((s) => ({ id: s.id, code: s.code, name: s.name, nst2Priority: s.nst2Priority })) });
  }),
);

catalogRouter.get(
  "/skills",
  validate(z.object({ q, category: z.string().trim().max(60).optional() }), "query"),
  asyncHandler(async (req, res) => {
    const { q: text, category } = req.query as { q?: string; category?: string };
    const rows = await prisma.skill.findMany({
      where: {
        ...(text && { name: { contains: text, mode: "insensitive" } }),
        ...(category && { category }),
      },
      orderBy: { name: "asc" },
      take: 100,
    });
    res.json({ data: rows.map((s) => ({ id: s.id, name: s.name, category: s.category })) });
  }),
);

const occupationQuery = paginationSchema.extend({
  q,
  sectorId: z.string().optional(),
  demand: z.enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH", "UNKNOWN"]).optional(),
});

catalogRouter.get(
  "/occupations",
  validate(occupationQuery, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof occupationQuery>;
    const where: Prisma.OccupationWhereInput = {
      ...(query.q && { title: { contains: query.q, mode: "insensitive" } }),
      ...(query.sectorId && { sectorId: query.sectorId }),
      ...(query.demand && { demand: query.demand }),
    };
    const [rows, total] = await Promise.all([
      prisma.occupation.findMany({ where, include: occupationInclude, orderBy: { title: "asc" }, ...pageArgs(query) }),
      prisma.occupation.count({ where }),
    ]);
    res.json({ data: rows.map(toOccupation), meta: meta(query, total) });
  }),
);

catalogRouter.get(
  "/occupations/:id",
  asyncHandler(async (req, res) => {
    const row = await prisma.occupation.findUnique({
      where: { id: req.params.id },
      include: { ...occupationInclude, skills: { include: { skill: true }, orderBy: { importance: "desc" } } },
    });
    if (!row) throw AppError.notFound("Occupation not found");
    res.json({
      data: {
        ...toOccupation(row),
        skills: row.skills.map((s) => ({
          skillId: s.skillId,
          name: s.skill.name,
          importance: s.importance,
          requiredLevel: s.requiredLevel,
        })),
      },
    });
  }),
);

const programQuery = paginationSchema.extend({
  q,
  level: z.enum(levels).optional(),
  districtId: z.string().optional(),
  institutionType: z.enum(["UNIVERSITY", "POLYTECHNIC", "TVET", "ACADEMY", "OTHER"]).optional(),
});

catalogRouter.get(
  "/programs",
  validate(programQuery, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof programQuery>;
    const where: Prisma.ProgramWhereInput = {
      ...(query.q && {
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { institution: { name: { contains: query.q, mode: "insensitive" } } },
        ],
      }),
      ...(query.level && { level: query.level }),
      institution: {
        ...(query.districtId && { districtId: query.districtId }),
        ...(query.institutionType && { type: query.institutionType }),
      },
    };
    const [rows, total] = await Promise.all([
      prisma.program.findMany({ where, include: programInclude, orderBy: { name: "asc" }, ...pageArgs(query) }),
      prisma.program.count({ where }),
    ]);
    res.json({ data: rows.map(toProgram), meta: meta(query, total) });
  }),
);

const pathInclude = {
  occupation: { select: { id: true, title: true } },
  sector: { select: { id: true, name: true } },
  source: true,
  _count: { select: { steps: true } },
} satisfies Prisma.CareerPathInclude;

const toPath = (p: Prisma.CareerPathGetPayload<{ include: typeof pathInclude }>) => ({
  id: p.id,
  slug: p.slug,
  type: p.type,
  title: p.title,
  summary: p.summary,
  startLevel: p.startLevel,
  durationMonths: p.durationMonths,
  occupation: p.occupation,
  sector: p.sector,
  stepCount: p._count.steps,
  source: toSourceRef(p.source),
});

const pathQuery = paginationSchema.extend({
  q,
  type: z.enum(["LEARNING_PATH", "CAREER_ROADMAP"]).optional(),
  occupationId: z.string().optional(),
  sectorId: z.string().optional(),
});

catalogRouter.get(
  "/paths",
  validate(pathQuery, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof pathQuery>;
    const where: Prisma.CareerPathWhereInput = {
      ...(query.q && { OR: [{ title: { contains: query.q, mode: "insensitive" } }, { summary: { contains: query.q, mode: "insensitive" } }] }),
      ...(query.type && { type: query.type }),
      ...(query.occupationId && { occupationId: query.occupationId }),
      ...(query.sectorId && { sectorId: query.sectorId }),
    };
    const [rows, total] = await Promise.all([
      prisma.careerPath.findMany({ where, include: pathInclude, orderBy: [{ type: "asc" }, { title: "asc" }], ...pageArgs(query) }),
      prisma.careerPath.count({ where }),
    ]);
    res.json({ data: rows.map(toPath), meta: meta(query, total) });
  }),
);

catalogRouter.get(
  "/paths/:slug",
  asyncHandler(async (req, res) => {
    const row = await prisma.careerPath.findUnique({
      where: { slug: req.params.slug },
      include: { ...pathInclude, steps: { orderBy: { order: "asc" } } },
    });
    if (!row) throw AppError.notFound("Path not found");
    res.json({
      data: {
        ...toPath(row),
        steps: row.steps.map((s) => ({
          order: s.order,
          phase: s.phase,
          title: s.title,
          description: s.description,
          kind: s.kind,
          monthOffset: s.monthOffset,
          resource: s.resourceLabel ? { label: s.resourceLabel, url: s.resourceUrl } : null,
        })),
      },
    });
  }),
);

const opportunityQuery = paginationSchema.extend({
  q,
  type: z.enum(["SCHOLARSHIP", "INTERNSHIP", "JOB", "TRAINING", "FELLOWSHIP", "GRANT"]).optional(),
  includeExpired: z.enum(["true", "false"]).default("false"),
});

catalogRouter.get(
  "/opportunity-sources",
  asyncHandler(async (_req, res) => {
    const definitions = OPPORTUNITY_SOURCE_DIRECTORY;
    const records = await prisma.dataSource.findMany({
      where: { slug: { in: definitions.map((entry) => entry.sourceSlug) } },
    });
    const bySlug = new Map(records.map((record) => [record.slug, record]));
    const data = definitions.flatMap((entry) => {
      const source = bySlug.get(entry.sourceSlug);
      return source ? [{
        id: source.id,
        slug: source.slug,
        name: source.name,
        publisher: source.publisher,
        url: source.url,
        isDemo: source.isDemo,
        category: entry.category,
        description: entry.description,
        focus: entry.focus,
      }] : [];
    });
    res.json({ data });
  }),
);

catalogRouter.get(
  "/opportunities",
  validate(opportunityQuery, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof opportunityQuery>;
    const conditions: Prisma.OpportunityWhereInput[] = [];
    if (query.q) {
      conditions.push({
        OR: [
          { title: { contains: query.q, mode: "insensitive" } },
          { provider: { contains: query.q, mode: "insensitive" } },
        ],
      });
    }
    if (query.type) conditions.push({ type: query.type });
    // Expired opportunities are hidden by default; rolling ones have no deadline and always show.
    if (query.includeExpired === "false") conditions.push({ OR: [{ deadline: null }, { deadline: { gte: new Date() } }] });
    const where: Prisma.OpportunityWhereInput = { AND: conditions };

    const [rows, total] = await Promise.all([
      prisma.opportunity.findMany({ where, include: opportunityInclude, orderBy: [{ deadline: "asc" }, { title: "asc" }], ...pageArgs(query) }),
      prisma.opportunity.count({ where }),
    ]);
    res.json({ data: rows.map(toOpportunity), meta: meta(query, total) });
  }),
);
