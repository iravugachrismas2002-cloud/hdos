// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FormError } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage, ventureApi } from "@/lib/api";
import type { KpiMetric } from "@/lib/venture-types";
import { useVenture } from "./access";
import { useRefreshVenture, ventureKey } from "./hooks";
import { formatMoney, formatPercent, KPI_LABELS, KPI_METRICS, thisMonthInput } from "./format";
import { Field, QueryView, ReadOnlyNote, Section, Stat } from "./shared";

export function GrowthTab() {
  const { id, currency, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const growth = useQuery({ queryKey: ventureKey(id, "growth"), queryFn: () => ventureApi.growth(id) });
  const [period, setPeriod] = useState(thisMonthInput());
  const [metric, setMetric] = useState<KpiMetric>("REVENUE");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const selectedMetric = KPI_LABELS[metric];

  const record = useMutation({
    mutationFn: () => ventureApi.recordKpi(id, { period, metric, value: Number(value), note: note.trim() || null }),
    onSuccess: () => { setValue(""); setNote(""); setError(""); refresh("growth"); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <Section title="Growth tracking" description="Record observed monthly results. Projections are planning comparisons, not guaranteed outcomes.">
        <FormError message={error} />
        {!can("contribute") && <ReadOnlyNote>Contributors and above can record KPI values.</ReadOnlyNote>}
        {can("contribute") && (
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => { e.preventDefault(); setError(""); record.mutate(); }}>
            <Field htmlFor="growth-period" label="Reporting month"><Input id="growth-period" type="month" required value={period} onChange={(e) => setPeriod(e.target.value)} /></Field>
            <Field htmlFor="growth-metric" label="Metric">
              <Select id="growth-metric" value={metric} onChange={(e) => setMetric(e.target.value as KpiMetric)}>
                {KPI_METRICS.map((m) => <option key={m} value={m}>{KPI_LABELS[m].label}</option>)}
              </Select>
            </Field>
            <Field htmlFor="growth-value" label={selectedMetric.percent ? "Value (%)" : selectedMetric.money ? `Value (${currency})` : "Value"}>
              <Input id="growth-value" type="number" min="0" step="any" required value={value} onChange={(e) => setValue(e.target.value)} />
            </Field>
            <Field htmlFor="growth-note" label="Note (optional)"><Textarea id="growth-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <div className="lg:col-span-4"><Button type="submit" disabled={record.isPending || value === "" || !Number.isFinite(Number(value))}>{record.isPending ? "Recording…" : "Record actual"}</Button></div>
          </form>
        )}
      </Section>

      <Section title="Monthly results">
        <QueryView query={growth} rows={3}>
          {(data) => data.periods.length === 0 ? <p className="text-sm text-muted-foreground">No monthly results have been recorded.</p> : (
            <div className="space-y-5">
              {data.notes.length > 0 && <ul className="list-disc pl-5 text-xs text-muted-foreground">{data.notes.map((item) => <li key={item}>{item}</li>)}</ul>}
              {data.periods.map((row) => (
                <section key={row.period} className="space-y-3 rounded-md border p-3" aria-label={`Results for ${row.period}`}>
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{row.period}</h3>{row.projectedMonth !== null && <Badge variant="outline">Projection available</Badge>}</div>
                  {row.actuals.length === 0 ? <p className="text-sm text-muted-foreground">No actuals recorded.</p> : (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {row.actuals.map((actual) => {
                        const config = KPI_LABELS[actual.metric];
                        const display = config.money ? formatMoney(actual.value, currency) : config.percent ? formatPercent(actual.value) : actual.value.toLocaleString();
                        const comparison = row.comparisons.find((item) => item.metric === actual.metric);
                        return (
                          <li key={actual.metric}>
                            <Stat label={config.label} value={display} hint={actual.note ?? undefined} />
                            {comparison && <p className="mt-1 text-xs text-muted-foreground">Compared with projection: {comparison.variancePct === null ? "not available" : formatPercent(comparison.variancePct)}</p>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {row.insights.length > 0 && <ul className="list-disc pl-5 text-sm">{row.insights.map((item) => <li key={item}>{item}</li>)}</ul>}
                </section>
              ))}
            </div>
          )}
        </QueryView>
      </Section>
    </div>
  );
}
