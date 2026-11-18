// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Deterministic financial calculations for Venture Builder. No AI, no I/O, no randomness: every figure is
// derived from the numeric inputs, so the same inputs always produce the same output. All arithmetic runs on
// integer minor units (e.g. cents; RWF has none) and is converted back to major units only for display.

export const FINANCIAL_ENGINE_VERSION = "fin-1.0.0";

/** ISO-4217 minor-unit exponents. Unlisted currencies default to 2. */
const CURRENCY_EXPONENT: Record<string, number> = { RWF: 0, UGX: 0, BIF: 0, USD: 2, EUR: 2, GBP: 2, KES: 2, TZS: 2, ZAR: 2 };

export const currencyExponent = (currency: string): number => CURRENCY_EXPONENT[currency] ?? 2;

export class FinancialInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinancialInputError";
  }
}

export interface FinancialInput {
  currency: string;
  horizonMonths: number;
  pricePerUnit: number;
  /** Total variable cost per unit sold (goods, delivery, payment fees, commissions...). */
  variableCostPerUnit: number;
  /** Optional direct cost of goods per unit, a subset of the variable cost, used only for gross margin. */
  costOfGoodsPerUnit?: number;
  fixedCostsPerMonth: number;
  startupCosts: number;
  openingCash: number;
  unitsInMonth1: number;
  /** Month-on-month growth in units sold as a fraction (0.05 = 5%). */
  monthlyGrowthRate: number;
}

export interface MonthRow {
  month: number;
  units: number;
  revenue: number;
  variableCosts: number;
  fixedCosts: number;
  operatingProfit: number;
  closingCash: number;
}

export type RunwayStatus = "SELF_SUSTAINING" | "FUNDED_THROUGH_HORIZON" | "RUNS_OUT";

export interface FinancialResult {
  engineVersion: string;
  currency: string;
  unitContribution: number;
  grossMarginPct: number | null;
  contributionMarginPct: number | null;
  /** Fixed costs / (price - variable cost), rounded up. Null when each sale loses money or breaks even. */
  breakEvenUnitsPerMonth: number | null;
  breakEvenRevenuePerMonth: number | null;
  operatingBreakEvenMonth: number | null;
  paybackMonth: number | null;
  totalRevenue: number;
  totalOperatingProfit: number;
  endingCash: number;
  lowestCash: number;
  lowestCashMonth: number;
  /** Peak additional funding needed so cash never drops below zero within the horizon. */
  capitalRequired: number;
  runway: { status: RunwayStatus; months: number | null; note: string };
  monthly: MonthRow[];
  warnings: string[];
}

const MAX_MAJOR = 1e12;
const MAX_UNITS = 1e9;

const finiteNonNegative = (name: string, value: number, max = MAX_MAJOR) => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new FinancialInputError(`${name} must be a number`);
  if (value < 0) throw new FinancialInputError(`${name} cannot be negative`);
  if (value > max) throw new FinancialInputError(`${name} is too large`);
};

const safeMinor = (name: string, value: number): number => {
  if (!Number.isSafeInteger(value)) throw new FinancialInputError(`${name} exceeds safe financial precision`);
  return value;
};

const toMinor = (value: number, exponent: number): number => {
  const [rawCoefficient, exponentText = "0"] = value.toString().toLowerCase().split("e");
  const negative = rawCoefficient.startsWith("-");
  const coefficient = negative ? rawCoefficient.slice(1) : rawCoefficient;
  const [whole, fraction = ""] = coefficient.split(".");
  const digits = BigInt(`${whole}${fraction}`);
  const shift = Number(exponentText) - fraction.length + exponent;
  const absoluteMinor = shift >= 0
    ? digits * 10n ** BigInt(shift)
    : (() => {
        const divisor = 10n ** BigInt(-shift);
        return (digits + divisor / 2n) / divisor;
      })();
  const minor = negative ? -absoluteMinor : absoluteMinor;
  return safeMinor("Amount", Number(minor));
};

export const validateFinancialInput = (input: FinancialInput): void => {
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new FinancialInputError("currency must be a 3-letter ISO code such as RWF");
  if (!Number.isInteger(input.horizonMonths) || input.horizonMonths < 1 || input.horizonMonths > 60) {
    throw new FinancialInputError("horizonMonths must be a whole number between 1 and 60");
  }
  finiteNonNegative("pricePerUnit", input.pricePerUnit);
  finiteNonNegative("variableCostPerUnit", input.variableCostPerUnit);
  finiteNonNegative("fixedCostsPerMonth", input.fixedCostsPerMonth);
  finiteNonNegative("startupCosts", input.startupCosts);
  finiteNonNegative("openingCash", input.openingCash);
  finiteNonNegative("unitsInMonth1", input.unitsInMonth1, MAX_UNITS);
  if (input.costOfGoodsPerUnit !== undefined) {
    finiteNonNegative("costOfGoodsPerUnit", input.costOfGoodsPerUnit);
    if (input.costOfGoodsPerUnit > input.variableCostPerUnit) {
      throw new FinancialInputError("costOfGoodsPerUnit cannot exceed variableCostPerUnit");
    }
  }
  if (typeof input.monthlyGrowthRate !== "number" || !Number.isFinite(input.monthlyGrowthRate) || input.monthlyGrowthRate < -0.5 || input.monthlyGrowthRate > 1) {
    throw new FinancialInputError("monthlyGrowthRate must be between -0.5 and 1 (e.g. 0.05 for 5%)");
  }
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export const calculateFinancials = (input: FinancialInput): FinancialResult => {
  validateFinancialInput(input);
  const exp = currencyExponent(input.currency);
  const factor = 10 ** exp;
  const minor = (v: number) => toMinor(v, exp);
  const major = (v: number) => v / factor;

  const price = minor(input.pricePerUnit);
  const variable = minor(input.variableCostPerUnit);
  const cogs = input.costOfGoodsPerUnit === undefined ? variable : minor(input.costOfGoodsPerUnit);
  const fixed = minor(input.fixedCostsPerMonth);
  const startup = minor(input.startupCosts);
  const opening = minor(input.openingCash);

  const unitContribution = safeMinor("Unit contribution", price - variable);
  const warnings: string[] = [];
  if (price === 0) warnings.push("Selling price is zero, so no revenue can be earned.");
  else if (unitContribution <= 0) warnings.push("Each sale does not cover its variable cost, so volume alone can never reach break-even.");

  const rows: { month: number; units: number; revenue: number; variable: number; fixed: number; profit: number; cash: number }[] = [];
  let cash = safeMinor("Initial cash balance", opening - startup);
  let cumulativeProfit = 0;
  let lowestCash = cash;
  let lowestCashMonth = 0;
  let operatingBreakEvenMonth: number | null = null;
  let paybackMonth: number | null = null;
  let totalRevenue = 0;

  for (let m = 1; m <= input.horizonMonths; m += 1) {
    const units = Math.round(input.unitsInMonth1 * (1 + input.monthlyGrowthRate) ** (m - 1));
    if (!Number.isSafeInteger(units) || units > MAX_UNITS) {
      throw new FinancialInputError(`Projected units in month ${m} exceed the supported maximum`);
    }
    const revenue = safeMinor(`Revenue in month ${m}`, units * price);
    const variableCosts = safeMinor(`Variable costs in month ${m}`, units * variable);
    const profit = safeMinor(`Operating profit in month ${m}`, revenue - variableCosts - fixed);
    cash = safeMinor(`Closing cash in month ${m}`, cash + profit);
    cumulativeProfit = safeMinor(`Cumulative profit through month ${m}`, cumulativeProfit + profit);
    totalRevenue = safeMinor(`Total revenue through month ${m}`, totalRevenue + revenue);
    if (cash < lowestCash) {
      lowestCash = cash;
      lowestCashMonth = m;
    }
    if (operatingBreakEvenMonth === null && profit >= 0) operatingBreakEvenMonth = m;
    if (paybackMonth === null && cumulativeProfit >= startup && (startup > 0 || cumulativeProfit > 0)) paybackMonth = m;
    rows.push({ month: m, units, revenue, variable: variableCosts, fixed, profit, cash });
  }

  let breakEvenUnits: number | null = null;
  if (unitContribution > 0) breakEvenUnits = Math.ceil(fixed / unitContribution);

  const last = rows[rows.length - 1];
  const firstNegative = [{ month: 0, cash: opening - startup }, ...rows].find((r) => r.cash < 0);
  let runway: FinancialResult["runway"];
  if (firstNegative) {
    runway = {
      status: "RUNS_OUT",
      months: firstNegative.month - 1 < 0 ? 0 : firstNegative.month - 1,
      note: firstNegative.month === 0 ? "Opening cash does not cover the start-up costs." : `Cash is exhausted in month ${firstNegative.month}.`,
    };
  } else if (last.profit >= 0) {
    runway = { status: "SELF_SUSTAINING", months: null, note: "Operations are cash-positive in the final modelled month." };
  } else {
    const estimate = input.horizonMonths + Math.floor(last.cash / -last.profit);
    runway = { status: "FUNDED_THROUGH_HORIZON", months: estimate, note: "Estimate extends the final month's burn rate; it is not a forecast." };
  }

  const gross = price > 0 ? round1(((price - cogs) / price) * 100) : null;
  const contributionPct = price > 0 ? round1((unitContribution / price) * 100) : null;

  return {
    engineVersion: FINANCIAL_ENGINE_VERSION,
    currency: input.currency,
    unitContribution: major(unitContribution),
    grossMarginPct: gross,
    contributionMarginPct: contributionPct,
    breakEvenUnitsPerMonth: breakEvenUnits,
    breakEvenRevenuePerMonth: breakEvenUnits === null ? null : major(safeMinor("Break-even revenue", breakEvenUnits * price)),
    operatingBreakEvenMonth,
    paybackMonth,
    totalRevenue: major(totalRevenue),
    totalOperatingProfit: major(cumulativeProfit),
    endingCash: major(last.cash),
    lowestCash: major(lowestCash),
    lowestCashMonth,
    capitalRequired: major(Math.max(0, -lowestCash)),
    runway,
    monthly: rows.map((r) => ({
      month: r.month,
      units: r.units,
      revenue: major(r.revenue),
      variableCosts: major(r.variable),
      fixedCosts: major(r.fixed),
      operatingProfit: major(r.profit),
      closingCash: major(r.cash),
    })),
    warnings,
  };
};

export type SensitivityDriver = "pricePerUnit" | "variableCostPerUnit" | "fixedCostsPerMonth" | "unitsInMonth1";

export interface SensitivityRow {
  driver: SensitivityDriver;
  change: number;
  breakEvenUnitsPerMonth: number | null;
  totalOperatingProfit: number;
  lowestCash: number;
  profitDeltaVsBase: number;
}

/** One-at-a-time sensitivity: each driver is moved by each shock while the others stay fixed. */
export const calculateSensitivity = (
  input: FinancialInput,
  shocks: readonly number[] = [-0.2, -0.1, 0.1, 0.2],
): SensitivityRow[] => {
  const base = calculateFinancials(input);
  const drivers: SensitivityDriver[] = ["pricePerUnit", "variableCostPerUnit", "fixedCostsPerMonth", "unitsInMonth1"];
  const rows: SensitivityRow[] = [];
  const exp = currencyExponent(input.currency);
  const factor = 10 ** exp;
  const roundMajor = (v: number) => toMinor(v, exp) / factor;
  const major = (v: number) => v / factor;
  for (const driver of drivers) {
    for (const change of shocks) {
      const shocked: FinancialInput = { ...input, [driver]: roundMajor(input[driver] * (1 + change)) };
      // costOfGoods must stay <= variable cost when the variable cost is shocked downwards.
      if (shocked.costOfGoodsPerUnit !== undefined && shocked.costOfGoodsPerUnit > shocked.variableCostPerUnit) {
        shocked.costOfGoodsPerUnit = shocked.variableCostPerUnit;
      }
      const r = calculateFinancials(shocked);
      const profitDelta = safeMinor(
        "Sensitivity profit delta",
        toMinor(r.totalOperatingProfit, exp) - toMinor(base.totalOperatingProfit, exp),
      );
      rows.push({
        driver,
        change,
        breakEvenUnitsPerMonth: r.breakEvenUnitsPerMonth,
        totalOperatingProfit: r.totalOperatingProfit,
        lowestCash: r.lowestCash,
        profitDeltaVsBase: major(profitDelta),
      });
    }
  }
  return rows;
};
