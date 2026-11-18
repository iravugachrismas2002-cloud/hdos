// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Growth Intelligence: records ACTUAL operating results and compares them with the founder's own projections.
// Actuals live in their own table and are never blended into projections.
import type { VentureKpiMetric } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { logActivity } from "../venture-builder.repository";
import type { kpiSchema } from "../venture-builder.schemas";
import type { ProjectAccess } from "../venture-builder.types";

export const recordKpi = async (access: ProjectAccess, input: z.infer<typeof kpiSchema>) => {
  const row = await prisma.ventureKpiEntry.upsert({
    where: { projectId_period_metric: { projectId: access.projectId, period: input.period, metric: input.metric } },
    create: { projectId: access.projectId, period: input.period, metric: input.metric, value: input.value, note: input.note, recordedById: access.userId },
    update: { value: input.value, note: input.note, recordedById: access.userId },
  });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: "kpi.recorded", summary: `Recorded ${input.metric.toLowerCase().replace(/_/g, " ")} for ${input.period}`, entityType: "kpi", entityId: row.id });
  return { id: row.id, period: row.period, metric: row.metric, value: Number(row.value.toString()), note: row.note };
};

/** Month index (1-based) of `period` counted from the launch month; null when the period precedes launch. */
export const monthIndex = (launchedAt: Date, period: string): number | null => {
  const [y, m] = period.split("-").map(Number);
  const idx = (y - launchedAt.getUTCFullYear()) * 12 + (m - 1 - launchedAt.getUTCMonth()) + 1;
  return idx >= 1 ? idx : null;
};

export interface Comparison {
  metric: VentureKpiMetric;
  actual: number;
  projected: number;
  variancePct: number | null;
}

export const compareToProjection = (
  actuals: { metric: VentureKpiMetric; value: number }[],
  projected: { revenue: number; operatingCosts: number } | null,
): Comparison[] => {
  if (!projected) return [];
  const out: Comparison[] = [];
  const add = (metric: VentureKpiMetric, target: number) => {
    const a = actuals.find((x) => x.metric === metric);
    if (!a) return;
    out.push({ metric, actual: a.value, projected: target, variancePct: target > 0 ? Math.round(((a.value - target) / target) * 1000) / 10 : null });
  };
  add("REVENUE", projected.revenue);
  add("MONTHLY_OPERATING_COSTS", projected.operatingCosts);
  return out;
};

export const insightsFrom = (comparisons: Comparison[]): string[] => {
  const out: string[] = [];
  for (const c of comparisons) {
    if (c.variancePct === null) continue;
    if (c.metric === "REVENUE" && c.variancePct <= -20) out.push(`Revenue is ${Math.abs(c.variancePct)}% below your base projection. Re-check price, volume and conversion assumptions against customer evidence.`);
    if (c.metric === "REVENUE" && c.variancePct >= 20) out.push(`Revenue is ${c.variancePct}% above your base projection. Confirm costs and delivery capacity can keep up.`);
    if (c.metric === "MONTHLY_OPERATING_COSTS" && c.variancePct >= 10) out.push(`Operating costs are ${c.variancePct}% above your base projection. Review fixed-cost line items and variable cost per unit.`);
  }
  return out;
};

export const getGrowth = async (projectId: string) => {
  const [project, entries, baseRow] = await Promise.all([
    prisma.ventureProject.findUnique({ where: { id: projectId }, select: { launchedAt: true, currency: true } }),
    prisma.ventureKpiEntry.findMany({ where: { projectId }, orderBy: [{ period: "desc" }, { metric: "asc" }] }),
    prisma.ventureFinancialScenario.findFirst({ where: { projectId, caseType: "BASE" }, orderBy: { createdAt: "desc" }, select: { results: true, createdAt: true } }),
  ]);
  const monthly = (baseRow?.results as { monthly?: { revenue: number; variableCosts: number; fixedCosts: number }[] } | undefined)?.monthly ?? [];

  const byPeriod = new Map<string, { metric: VentureKpiMetric; value: number; note: string | null }[]>();
  for (const e of entries) byPeriod.set(e.period, [...(byPeriod.get(e.period) ?? []), { metric: e.metric, value: Number(e.value.toString()), note: e.note }]);

  const periods = [...byPeriod.entries()].map(([period, actuals]) => {
    const idx = project?.launchedAt ? monthIndex(project.launchedAt, period) : null;
    const row = idx ? monthly[idx - 1] : undefined;
    const projected = row ? { revenue: row.revenue, operatingCosts: row.variableCosts + row.fixedCosts } : null;
    const comparisons = compareToProjection(actuals, projected);
    return { period, actuals, projectedMonth: idx, comparisons, insights: insightsFrom(comparisons) };
  });

  return {
    currency: project?.currency ?? "RWF",
    launchedAt: project?.launchedAt?.toISOString() ?? null,
    hasProjection: monthly.length > 0,
    periods,
    notes: [
      "Actual results are recorded separately from projections and never overwrite them.",
      ...(project?.launchedAt ? [] : ["Projections are compared once the venture is marked ACTIVE (its launch month)."]),
      ...(monthly.length === 0 ? ["Calculate a financial scenario to compare actual revenue and costs against your assumptions."] : []),
    ],
  };
};
