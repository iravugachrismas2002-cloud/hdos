// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { Router } from "express";
import { asyncHandler } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { toSourceRef } from "../../lib/mappers";

export const insightsRouter = Router();

insightsRouter.use((_req, res, next) => {
  res.set("Cache-Control", "public, max-age=300");
  next();
});

/** National indicators. Every value is returned together with its source so the UI can always cite it. */
insightsRouter.get(
  "/national",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.indicatorValue.findMany({
      include: { indicator: true, source: true },
      orderBy: { indicator: { code: "asc" } },
    });
    res.json({
      data: {
        indicators: rows.map((r) => ({
          code: r.indicator.code,
          name: r.indicator.name,
          unit: r.indicator.unit,
          value: r.value,
          period: r.period,
          geography: r.geography,
          source: toSourceRef(r.source),
        })),
      },
    });
  }),
);

insightsRouter.get(
  "/districts",
  asyncHandler(async (_req, res) => {
    const latest = await prisma.districtStat.aggregate({ _max: { year: true } });
    const year = latest._max.year;
    if (!year) {
      res.json({ data: { year: null, source: null, districts: [] } });
      return;
    }
    const rows = await prisma.districtStat.findMany({
      where: { year },
      include: { district: { include: { province: true } }, source: true },
      orderBy: { population: "desc" },
    });
    res.json({
      data: {
        year,
        source: rows[0] ? toSourceRef(rows[0].source) : null,
        districts: rows.map((r) => ({
          districtId: r.districtId,
          name: r.district.name,
          province: r.district.province.name,
          population: r.population,
          urbanPopulation: r.urbanPopulation,
          urbanShare: Math.round((r.urbanPopulation / r.population) * 1000) / 10,
        })),
      },
    });
  }),
);

insightsRouter.get(
  "/sources",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.dataSource.findMany({ orderBy: { name: "asc" } });
    res.json({ data: rows.map(toSourceRef) });
  }),
);
