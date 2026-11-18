// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Persists deterministic financial scenarios and business models. Cost inputs come from the founder's line items;
// the engine does the arithmetic, so no AI-generated number can enter a calculation.
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { AppError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import { json, logActivity } from "../venture-builder.repository";
import type { businessModelSchema, compareModelsSchema, scenarioSchema } from "../venture-builder.schemas";
import type { ProjectAccess } from "../venture-builder.types";
import { calculateSensitivity, FinancialInputError, FINANCIAL_ENGINE_VERSION, type FinancialInput } from "./financial-engine";
import { calculateScenarios, compareRevenueModels } from "./scenario-calculator";

export const lineItemDto = (i: { id: string; kind: string; label: string; amount: { toString(): string }; note: string | null; evidenceId: string | null; createdAt: Date }) => ({
  id: i.id,
  kind: i.kind,
  label: i.label,
  amount: Number(i.amount.toString()),
  note: i.note,
  evidenceId: i.evidenceId,
  createdAt: i.createdAt.toISOString(),
});

const wrap = <T>(fn: () => T): T => {
  try {
    return fn();
  } catch (error) {
    if (error instanceof FinancialInputError) throw AppError.badRequest(error.message, "INVALID_FINANCIAL_INPUT");
    throw error;
  }
};

export const createScenarioSet = async (access: ProjectAccess, input: z.infer<typeof scenarioSchema>) => {
  const [project, items] = await Promise.all([
    prisma.ventureProject.findUnique({ where: { id: access.projectId }, select: { currency: true } }),
    prisma.ventureFinancialLineItem.findMany({ where: { projectId: access.projectId } }),
  ]);
  if (!project) throw AppError.notFound("Venture not found", "VENTURE_NOT_FOUND");
  const sum = (kind: string) => items.filter((i) => i.kind === kind).reduce((s, i) => s + Number(i.amount.toString()), 0);

  const base: FinancialInput = {
    currency: input.currency ?? project.currency,
    horizonMonths: input.horizonMonths,
    pricePerUnit: input.pricePerUnit,
    variableCostPerUnit: sum("VARIABLE_COST"),
    ...(input.costOfGoodsPerUnit !== undefined ? { costOfGoodsPerUnit: input.costOfGoodsPerUnit } : {}),
    fixedCostsPerMonth: sum("FIXED_COST"),
    startupCosts: sum("STARTUP_COST"),
    openingCash: input.openingCash,
    unitsInMonth1: input.unitsInMonth1,
    monthlyGrowthRate: input.monthlyGrowthRate,
  };
  const outcomes = wrap(() => calculateScenarios(base, input.adjustments));
  const sensitivity = wrap(() => calculateSensitivity(base));

  const groupId = randomUUID();
  const lineItemSnapshot = items.map(lineItemDto);
  await prisma.ventureFinancialScenario.createMany({
    data: outcomes.map((o) => ({
      projectId: access.projectId,
      groupId,
      caseType: o.caseType,
      currency: base.currency,
      inputs: json({ ...o.inputs, adjustment: o.adjustment, lineItems: lineItemSnapshot }),
      results: json(o.results),
      engineVersion: FINANCIAL_ENGINE_VERSION,
      createdById: access.userId,
    })),
  });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: "financial.scenarios_calculated", summary: `Calculated conservative, base and upside scenarios (${base.currency})`, entityType: "financial", entityId: groupId });
  return {
    groupId,
    engineVersion: FINANCIAL_ENGINE_VERSION,
    currency: base.currency,
    scenarios: outcomes.map((o) => ({ caseType: o.caseType, adjustment: o.adjustment, inputs: o.inputs, results: o.results })),
    sensitivity,
    notes: [
      "All figures are calculated from the numbers you entered; they are projections, not forecasts.",
      "Conservative and upside cases apply the adjustments shown to your base inputs. Change them if they do not fit your venture.",
      ...(items.length === 0 ? ["No cost line items are recorded, so costs are zero. Add start-up, fixed and variable costs for a meaningful result."] : []),
    ],
  };
};

export const listScenarioSets = async (projectId: string) => {
  const rows = await prisma.ventureFinancialScenario.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 60 });
  const groups = new Map<string, typeof rows>();
  for (const r of rows) groups.set(r.groupId, [...(groups.get(r.groupId) ?? []), r]);
  return [...groups.entries()].slice(0, 20).map(([groupId, items]) => ({
    groupId,
    createdAt: items[0].createdAt.toISOString(),
    currency: items[0].currency,
    engineVersion: items[0].engineVersion,
    scenarios: ["CONSERVATIVE", "BASE", "UPSIDE"].flatMap((c) => items.filter((i) => i.caseType === c).map((i) => ({ caseType: i.caseType, inputs: i.inputs, results: i.results }))),
  }));
};

export const compareModels = (input: z.infer<typeof compareModelsSchema>) => ({
  currency: input.currency,
  comparison: wrap(() => compareRevenueModels(input.models, { currency: input.currency, horizonMonths: input.horizonMonths, startupCosts: input.startupCosts, openingCash: input.openingCash })),
  note: "Ordered by total operating profit over the horizon for readability only. HDOS does not choose a revenue model for you: the right choice also depends on customer evidence the calculator cannot see.",
});

// ───────────────────────────── Business model versions ─────────────────────────────

export const listBusinessModels = (projectId: string) => prisma.ventureBusinessModel.findMany({ where: { projectId }, orderBy: { version: "desc" }, take: 30 });

export const createBusinessModel = async (access: ProjectAccess, input: z.infer<typeof businessModelSchema>) => {
  const latest = await prisma.ventureBusinessModel.findFirst({ where: { projectId: access.projectId }, orderBy: { version: "desc" }, select: { version: true } });
  const version = (latest?.version ?? 0) + 1;
  const row = await prisma.ventureBusinessModel.create({ data: { projectId: access.projectId, version, ...input, revenueStreams: json(input.revenueStreams), createdById: access.userId } });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: "business_model.created", summary: `Saved business model v${version}`, entityType: "business_model", entityId: row.id });
  return row;
};
