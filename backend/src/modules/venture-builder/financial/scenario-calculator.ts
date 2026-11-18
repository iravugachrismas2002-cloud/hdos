// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Builds conservative / base / upside scenarios from one set of founder inputs and compares revenue models.
// The multipliers are explicit, user-adjustable assumptions: they are NOT forecasts or market data.
import { calculateFinancials, currencyExponent, type FinancialInput, type FinancialResult } from "./financial-engine";

export type ScenarioCase = "CONSERVATIVE" | "BASE" | "UPSIDE";

export interface ScenarioAdjustment {
  /** Multiplier on month-1 units sold. */
  volume: number;
  price: number;
  variableCost: number;
  fixedCost: number;
  /** Added to the monthly growth rate (0.02 = +2 percentage points). */
  growthDelta: number;
}

export const DEFAULT_ADJUSTMENTS: Record<ScenarioCase, ScenarioAdjustment> = {
  CONSERVATIVE: { volume: 0.7, price: 1, variableCost: 1.1, fixedCost: 1.05, growthDelta: -0.02 },
  BASE: { volume: 1, price: 1, variableCost: 1, fixedCost: 1, growthDelta: 0 },
  UPSIDE: { volume: 1.3, price: 1, variableCost: 0.95, fixedCost: 1, growthDelta: 0.02 },
};

const clampGrowth = (g: number) => Math.min(1, Math.max(-0.5, g));

export const applyAdjustment = (base: FinancialInput, adj: ScenarioAdjustment): FinancialInput => {
  const scale = 10 ** currencyExponent(base.currency);
  const money = (v: number) => Math.round(v * scale) / scale;
  const variableCostPerUnit = money(base.variableCostPerUnit * adj.variableCost);
  const adjusted: FinancialInput = {
    ...base,
    pricePerUnit: money(base.pricePerUnit * adj.price),
    variableCostPerUnit,
    fixedCostsPerMonth: money(base.fixedCostsPerMonth * adj.fixedCost),
    unitsInMonth1: Math.round(base.unitsInMonth1 * adj.volume),
    monthlyGrowthRate: clampGrowth(base.monthlyGrowthRate + adj.growthDelta),
  };
  if (base.costOfGoodsPerUnit !== undefined) {
    adjusted.costOfGoodsPerUnit = Math.min(variableCostPerUnit, money(base.costOfGoodsPerUnit * adj.variableCost));
  }
  return adjusted;
};

export interface ScenarioOutcome {
  caseType: ScenarioCase;
  adjustment: ScenarioAdjustment;
  inputs: FinancialInput;
  results: FinancialResult;
}

export const calculateScenarios = (
  base: FinancialInput,
  overrides: Partial<Record<ScenarioCase, Partial<ScenarioAdjustment>>> = {},
): ScenarioOutcome[] =>
  (["CONSERVATIVE", "BASE", "UPSIDE"] as const).map((caseType) => {
    const adjustment = { ...DEFAULT_ADJUSTMENTS[caseType], ...overrides[caseType] };
    const inputs = applyAdjustment(base, adjustment);
    return { caseType, adjustment, inputs, results: calculateFinancials(inputs) };
  });

export type RevenueModelType =
  | "SUBSCRIPTION"
  | "COMMISSION"
  | "LICENSING"
  | "TRANSACTION_FEE"
  | "SERVICE_DELIVERY"
  | "DIRECT_SALES"
  | "B2B_CONTRACT";

export interface RevenueModelOption {
  type: RevenueModelType;
  label?: string;
  pricePerUnit: number;
  unitsInMonth1: number;
  variableCostPerUnit: number;
  fixedCostsPerMonth: number;
  monthlyGrowthRate: number;
}

export interface RevenueModelComparison {
  type: RevenueModelType;
  label: string | null;
  unitContribution: number;
  breakEvenUnitsPerMonth: number | null;
  operatingBreakEvenMonth: number | null;
  totalOperatingProfit: number;
  lowestCash: number;
  capitalRequired: number;
}

/**
 * Side-by-side comparison. The result is ordered by total operating profit for readability only: nothing is
 * "selected" for the founder, because model choice also depends on customer evidence the engine cannot see.
 */
export const compareRevenueModels = (
  options: RevenueModelOption[],
  shared: Pick<FinancialInput, "currency" | "horizonMonths" | "startupCosts" | "openingCash">,
): RevenueModelComparison[] =>
  options
    .map((o) => {
      const r = calculateFinancials({ ...shared, ...o });
      return {
        type: o.type,
        label: o.label ?? null,
        unitContribution: r.unitContribution,
        breakEvenUnitsPerMonth: r.breakEvenUnitsPerMonth,
        operatingBreakEvenMonth: r.operatingBreakEvenMonth,
        totalOperatingProfit: r.totalOperatingProfit,
        lowestCash: r.lowestCash,
        capitalRequired: r.capitalRequired,
      };
    })
    .sort((a, b) => b.totalOperatingProfit - a.totalOperatingProfit);
