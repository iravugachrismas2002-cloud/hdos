// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FormError } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getErrorMessage, ventureApi } from "@/lib/api";
import type { LineItemKind, SensitivityRow } from "@/lib/venture-types";
import { useVenture } from "./access";
import { useRefreshVenture, ventureKey } from "./hooks";
import { formatMoney, formatPercent, LINE_ITEM_LABELS, parseNumber } from "./format";
import { Field, Notice, QueryView, ReadOnlyNote, Section, Stat, TableWrap, tableClass, tdClass, thClass } from "./shared";

export function FinancialTab() {
  const { id, currency, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const lineItems = useQuery({ queryKey: ventureKey(id, "financial-line-items"), queryFn: () => ventureApi.lineItems.list(id) });
  const saved = useQuery({ queryKey: ventureKey(id, "financial-scenarios"), queryFn: () => ventureApi.savedScenarios(id) });
  const [kind, setKind] = useState<LineItemKind>("STARTUP_COST");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [units, setUnits] = useState("");
  const [growth, setGrowth] = useState("0");
  const [openingCash, setOpeningCash] = useState("0");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof ventureApi.calculateScenarios>> | null>(null);

  const addItem = useMutation({
    mutationFn: () => ventureApi.lineItems.create(id, { kind, label: label.trim(), amount: Number(amount) }),
    onSuccess: () => { setLabel(""); setAmount(""); refresh("financial-line-items"); },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const calculate = useMutation({
    mutationFn: () => ventureApi.calculateScenarios(id, {
      pricePerUnit: Number(price),
      unitsInMonth1: Number(units),
      monthlyGrowthRate: Number(growth) / 100,
      openingCash: Number(openingCash),
      currency,
    }),
    onSuccess: (scenarios) => { setResult(scenarios); refresh("financial-scenarios"); },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const validLine = label.trim().length > 0 && parseNumber(amount) !== null && Number(amount) >= 0;
  const validScenario = [price, units, growth, openingCash].every((v) => parseNumber(v) !== null)
    && Number(price) >= 0 && Number(units) >= 0 && Number(openingCash) >= 0
    && Number(growth) >= -50 && Number(growth) <= 100;

  return (
    <div className="space-y-6">
      <Section title="Cost assumptions" description={`Amounts are entered in ${currency}. These are planning inputs, not verified prices or forecasts.`}>
        {!can("edit") && <ReadOnlyNote>Only editors and above can add financial assumptions.</ReadOnlyNote>}
        <FormError message={error} />
        {can("edit") && (
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); setError(""); addItem.mutate(); }}>
            <Field htmlFor="fin-kind" label="Cost type">
              <Select id="fin-kind" value={kind} onChange={(e) => setKind(e.target.value as LineItemKind)}>
                {(Object.keys(LINE_ITEM_LABELS) as LineItemKind[]).map((value) => <option key={value} value={value}>{LINE_ITEM_LABELS[value].title} · {LINE_ITEM_LABELS[value].unit}</option>)}
              </Select>
            </Field>
            <Field htmlFor="fin-label" label="Description"><Input id="fin-label" maxLength={120} required value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
            <Field htmlFor="fin-amount" label={`Amount (${currency})`}><Input id="fin-amount" type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <div className="sm:col-span-3"><Button type="submit" disabled={!validLine || addItem.isPending}>{addItem.isPending ? "Adding…" : "Add cost assumption"}</Button></div>
          </form>
        )}
        <QueryView query={lineItems}>
          {(rows) => rows.length === 0 ? <p className="text-sm text-muted-foreground">No cost assumptions recorded.</p> : (
            <ul className="divide-y rounded-md border">
              {rows.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm"><span>{item.label} <span className="text-muted-foreground">· {LINE_ITEM_LABELS[item.kind].title}</span></span><span className="font-medium">{formatMoney(item.amount, currency)}</span></li>)}
            </ul>
          )}
        </QueryView>
      </Section>

      <Section title="Unit economics scenarios" description="A deterministic planning model. Results depend on the assumptions you enter and are not business forecasts.">
        <Notice>Record start-up, fixed and variable costs above before calculating. The model reads those saved cost entries and shows three scenarios; it does not forecast outcomes.</Notice>
        {!can("edit") && <ReadOnlyNote>Only editors and above can calculate and save scenarios.</ReadOnlyNote>}
        {can("edit") && (
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => { e.preventDefault(); setError(""); calculate.mutate(); }}>
            <Field htmlFor="fin-price" label={`Price per unit (${currency})`}><Input id="fin-price" type="number" min="0" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
            <Field htmlFor="fin-units" label="Units sold in month 1"><Input id="fin-units" type="number" min="0" step="1" required value={units} onChange={(e) => setUnits(e.target.value)} /></Field>
            <Field htmlFor="fin-growth" label="Monthly unit growth (%)"><Input id="fin-growth" type="number" min="-50" max="100" step="0.1" required value={growth} onChange={(e) => setGrowth(e.target.value)} /></Field>
            <Field htmlFor="fin-opening-cash" label={`Opening cash (${currency})`}><Input id="fin-opening-cash" type="number" min="0" step="0.01" required value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} /></Field>
            <div className="flex items-end"><Button type="submit" disabled={!validScenario || calculate.isPending}>{calculate.isPending ? "Calculating…" : "Calculate scenarios"}</Button></div>
          </form>
        )}
        <FormError message={error} />
        {result && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Engine {result.engineVersion} · {result.currency}</p>
            <ul className="grid gap-3 sm:grid-cols-3">
              {result.scenarios.map((scenario) => (
                <li key={scenario.caseType} className="space-y-2 rounded-md border p-3">
                  <Badge variant="outline">{scenario.caseType}</Badge>
                  <Stat label="Total revenue" value={formatMoney(scenario.results.totalRevenue, currency)} />
                  <Stat label="Operating profit" value={formatMoney(scenario.results.totalOperatingProfit, currency)} />
                  <Stat label="Capital required" value={formatMoney(scenario.results.capitalRequired, currency)} />
                  <p className="text-xs text-muted-foreground">{scenario.results.runway.note}</p>
                  {scenario.results.warnings.length > 0 && <p className="text-xs text-amber-800">{scenario.results.warnings.join(" ")}</p>}
                </li>
              ))}
            </ul>
            {result.notes.length > 0 && <ul className="list-disc pl-5 text-xs text-muted-foreground">{result.notes.map((note) => <li key={note}>{note}</li>)}</ul>}
            <Section title="One-at-a-time sensitivity" description="Each input changes independently while the other base assumptions stay fixed. These shocks are illustrative, not probabilities.">
              <TableWrap label="Financial scenario sensitivity">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Input</th>
                      <th className={thClass}>Change</th>
                      <th className={thClass}>Operating profit</th>
                      <th className={thClass}>Change vs base</th>
                      <th className={thClass}>Break-even units/month</th>
                      <th className={thClass}>Lowest cash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.sensitivity.map((row) => <SensitivityResult key={`${row.driver}-${row.change}`} row={row} currency={currency} />)}
                  </tbody>
                </table>
              </TableWrap>
            </Section>
          </div>
        )}
      </Section>

      <Section title="Saved scenario runs">
        <QueryView query={saved}>
          {(rows) => rows.length === 0 ? <p className="text-sm text-muted-foreground">No scenario runs saved yet.</p> : (
            <ul className="space-y-2">
              {rows.map((group) => (
                <li key={group.groupId} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{new Date(group.createdAt).toLocaleString()} · {group.currency} · engine {group.engineVersion}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.scenarios.map((scenario) => <Badge key={scenario.caseType} variant="secondary">{scenario.caseType}: {formatMoney(scenario.results.totalOperatingProfit, group.currency)} operating profit</Badge>)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </QueryView>
      </Section>
    </div>
  );
}

const DRIVER_LABELS: Record<SensitivityRow["driver"], string> = {
  pricePerUnit: "Price per unit",
  variableCostPerUnit: "Variable cost per unit",
  fixedCostsPerMonth: "Fixed costs per month",
  unitsInMonth1: "Units sold in month 1",
};

function SensitivityResult({ row, currency }: { row: SensitivityRow; currency: string }) {
  return (
    <tr>
      <td className={tdClass}>{DRIVER_LABELS[row.driver]}</td>
      <td className={`${tdClass} whitespace-nowrap`}>{formatPercent(row.change * 100)}</td>
      <td className={tdClass}>{formatMoney(row.totalOperatingProfit, currency)}</td>
      <td className={tdClass}>{formatMoney(row.profitDeltaVsBase, currency)}</td>
      <td className={tdClass}>{row.breakEvenUnitsPerMonth ?? "Not reached"}</td>
      <td className={tdClass}>{formatMoney(row.lowestCash, currency)}</td>
    </tr>
  );
}
