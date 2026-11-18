// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FormError, FormSuccess } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage, ventureApi } from "@/lib/api";
import type { BusinessModelInput, CompareModelsResult, RevenueModelOptionInput, RevenueType } from "@/lib/venture-types";
import { useVenture } from "./access";
import { useRefreshVenture, ventureKey } from "./hooks";
import { formatMoney, fromLines, REVENUE_TYPES, REVENUE_TYPE_LABELS, toLines } from "./format";
import { Field, Notice, QueryView, ReadOnlyNote, Section, Stat } from "./shared";
import { parseNumber } from "./format";

interface ModelDraft {
  type: RevenueType;
  label: string;
  pricePerUnit: string;
  unitsInMonth1: string;
  variableCostPerUnit: string;
  fixedCostsPerMonth: string;
  monthlyGrowthRate: string;
}

const newModel = (label: string): ModelDraft => ({
  type: "DIRECT_SALES",
  label,
  pricePerUnit: "",
  unitsInMonth1: "",
  variableCostPerUnit: "",
  fixedCostsPerMonth: "",
  monthlyGrowthRate: "0",
});

const MODEL_FIELDS = [
  ["pricePerUnit", "Price per unit"],
  ["unitsInMonth1", "Units in month 1"],
  ["variableCostPerUnit", "Variable cost per unit"],
  ["fixedCostsPerMonth", "Fixed costs per month"],
  ["monthlyGrowthRate", "Monthly unit growth (%)"],
] as const;
type ModelNumberField = (typeof MODEL_FIELDS)[number][0];

const LIST_FIELDS = [
  ["customerSegments", "Customer segments"],
  ["valueProposition", "Value proposition"],
  ["channels", "Channels"],
  ["customerRelationships", "Customer relationships"],
  ["keyActivities", "Key activities"],
  ["keyResources", "Key resources"],
  ["keyPartners", "Key partners"],
  ["costStructure", "Cost structure"],
] as const;
type ListField = (typeof LIST_FIELDS)[number][0];
type Lists = Record<ListField, string>;

const EMPTY_LISTS: Lists = {
  customerSegments: "",
  valueProposition: "",
  channels: "",
  customerRelationships: "",
  keyActivities: "",
  keyResources: "",
  keyPartners: "",
  costStructure: "",
};

export function BusinessModelTab() {
  const { id, currency, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const models = useQuery({ queryKey: ventureKey(id, "business-model"), queryFn: () => ventureApi.businessModels(id) });
  const [lists, setLists] = useState<Lists>(EMPTY_LISTS);
  const [revenueType, setRevenueType] = useState<RevenueType>("DIRECT_SALES");
  const [revenueDescription, setRevenueDescription] = useState("");
  const [pricingNote, setPricingNote] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [comparisonModels, setComparisonModels] = useState<ModelDraft[]>([newModel("Option A"), newModel("Option B")]);
  const [horizonMonths, setHorizonMonths] = useState("12");
  const [startupCosts, setStartupCosts] = useState("0");
  const [openingCash, setOpeningCash] = useState("0");

  const compare = useMutation({
    mutationFn: () => {
      const inputModels: RevenueModelOptionInput[] = comparisonModels.map((model) => ({
        type: model.type,
        label: model.label.trim() || undefined,
        pricePerUnit: Number(model.pricePerUnit),
        unitsInMonth1: Number(model.unitsInMonth1),
        variableCostPerUnit: Number(model.variableCostPerUnit),
        fixedCostsPerMonth: Number(model.fixedCostsPerMonth),
        monthlyGrowthRate: Number(model.monthlyGrowthRate) / 100,
      }));
      return ventureApi.compareModels(id, {
        currency,
        horizonMonths: Number(horizonMonths),
        startupCosts: Number(startupCosts),
        openingCash: Number(openingCash),
        models: inputModels,
      });
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const comparisonValid =
    comparisonModels.length >= 2 &&
    [horizonMonths, startupCosts, openingCash].every((value) => parseNumber(value) !== null) &&
    Number(horizonMonths) >= 1 && Number(horizonMonths) <= 60 && Number.isInteger(Number(horizonMonths)) &&
    Number(startupCosts) >= 0 && Number(openingCash) >= 0 &&
    comparisonModels.every((model) => {
      const requiredNumbers = [model.pricePerUnit, model.unitsInMonth1, model.variableCostPerUnit, model.fixedCostsPerMonth, model.monthlyGrowthRate];
      return requiredNumbers.every((value) => parseNumber(value) !== null) &&
        Number(model.pricePerUnit) >= 0 &&
        Number(model.unitsInMonth1) >= 0 &&
        Number(model.variableCostPerUnit) >= 0 &&
        Number(model.fixedCostsPerMonth) >= 0 &&
        Number(model.monthlyGrowthRate) >= -50 &&
        Number(model.monthlyGrowthRate) <= 100;
    });

  const updateModel = <K extends keyof ModelDraft>(index: number, key: K, value: ModelDraft[K]) =>
    setComparisonModels((current) => current.map((model, i) => i === index ? { ...model, [key]: value } : model));

  const save = useMutation({
    mutationFn: () => {
      const input: BusinessModelInput = {
        customerSegments: toLines(lists.customerSegments),
        valueProposition: toLines(lists.valueProposition),
        channels: toLines(lists.channels),
        customerRelationships: toLines(lists.customerRelationships),
        revenueStreams: revenueDescription.trim()
          ? [{ type: revenueType, description: revenueDescription.trim(), pricingNote: pricingNote.trim() || null }]
          : [],
        keyActivities: toLines(lists.keyActivities),
        keyResources: toLines(lists.keyResources),
        keyPartners: toLines(lists.keyPartners),
        costStructure: toLines(lists.costStructure),
        notes: notes.trim() || null,
      };
      return ventureApi.saveBusinessModel(id, input);
    },
    onSuccess: (model) => {
      setSaved(`Saved version ${model.version}.`);
      setError("");
      setLists(EMPTY_LISTS);
      setRevenueDescription("");
      setPricingNote("");
      setNotes("");
      refresh("business-model");
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <Section title="Business model" description={`Record the current model in ${currency}. Saving creates a version; it does not validate the assumptions.`}>
        {!can("edit") && <ReadOnlyNote>Only editors and above can save a business-model version.</ReadOnlyNote>}
        <FormError message={error} />
        <FormSuccess message={saved} />
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setError(""); setSaved(""); save.mutate(); }}>
          {LIST_FIELDS.map(([key, label]) => (
            <Field key={key} htmlFor={`bm-${key}`} label={label} hint="One item per line.">
              <Textarea id={`bm-${key}`} value={lists[key]} disabled={!can("edit")} onChange={(e) => setLists((v) => ({ ...v, [key]: e.target.value }))} />
            </Field>
          ))}
          <Field htmlFor="bm-revenue-type" label="Revenue stream">
            <Select id="bm-revenue-type" value={revenueType} disabled={!can("edit")} onChange={(e) => setRevenueType(e.target.value as RevenueType)}>
              {REVENUE_TYPES.map((type) => <option key={type} value={type}>{REVENUE_TYPE_LABELS[type]}</option>)}
            </Select>
          </Field>
          <Field htmlFor="bm-revenue-description" label="Revenue description">
            <Input id="bm-revenue-description" maxLength={500} value={revenueDescription} disabled={!can("edit")} onChange={(e) => setRevenueDescription(e.target.value)} placeholder="What customers pay for" />
          </Field>
          <Field htmlFor="bm-pricing-note" label="Pricing note (optional)">
            <Input id="bm-pricing-note" maxLength={300} value={pricingNote} disabled={!can("edit")} onChange={(e) => setPricingNote(e.target.value)} />
          </Field>
          <Field htmlFor="bm-notes" label="Notes (optional)" className="sm:col-span-2">
            <Textarea id="bm-notes" maxLength={2000} value={notes} disabled={!can("edit")} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {can("edit") && <div className="sm:col-span-2"><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save business-model version"}</Button></div>}
        </form>
      </Section>

      <Section title="Saved versions" description="Earlier versions remain available for comparison and review.">
        <QueryView query={models}>
          {(rows) => rows.length === 0 ? <p className="text-sm text-muted-foreground">No business-model versions have been saved.</p> : (
            <ol className="space-y-3">
              {rows.map((model) => (
                <li key={model.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Version {model.version}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(model.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><p className="font-medium">Customers</p><p className="text-muted-foreground">{fromLines(model.customerSegments) || "Not recorded"}</p></div>
                    <div><p className="font-medium">Value proposition</p><p className="text-muted-foreground">{fromLines(model.valueProposition) || "Not recorded"}</p></div>
                    <div><p className="font-medium">Revenue streams</p><p className="text-muted-foreground">{model.revenueStreams.map((s) => `${REVENUE_TYPE_LABELS[s.type]}: ${s.description}`).join("; ") || "Not recorded"}</p></div>
                    <div><p className="font-medium">Cost structure</p><p className="text-muted-foreground">{fromLines(model.costStructure) || "Not recorded"}</p></div>
                  </div>
                  {model.notes && <p className="whitespace-pre-wrap text-sm">{model.notes}</p>}
                </li>
              ))}
            </ol>
          )}
        </QueryView>
      </Section>

      <Section title="Compare revenue models" description={`Compare founder-entered assumptions in ${currency} over the same time horizon.`}>
        <Notice>HDOS calculates each option using the deterministic financial engine and orders results by operating profit for readability. It does not choose a model, verify your assumptions, or predict business performance.</Notice>
        <FormError message={compare.error ? getErrorMessage(compare.error) : ""} />
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setError(""); compare.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field htmlFor="bm-horizon" label="Model horizon (months)">
              <Input id="bm-horizon" type="number" min="1" max="60" step="1" value={horizonMonths} onChange={(e) => setHorizonMonths(e.target.value)} />
            </Field>
            <Field htmlFor="bm-startup-costs" label={`Start-up costs (${currency})`}>
              <Input id="bm-startup-costs" type="number" min="0" step="any" value={startupCosts} onChange={(e) => setStartupCosts(e.target.value)} />
            </Field>
            <Field htmlFor="bm-opening-cash" label={`Opening cash (${currency})`}>
              <Input id="bm-opening-cash" type="number" min="0" step="any" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} />
            </Field>
          </div>
          {comparisonModels.map((model, index) => (
            <fieldset key={index} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
              <legend className="px-1 text-sm font-semibold">Model option {index + 1}</legend>
              <Field htmlFor={`bm-compare-label-${index}`} label="Option name">
                <Input id={`bm-compare-label-${index}`} maxLength={120} value={model.label} onChange={(e) => updateModel(index, "label", e.target.value)} />
              </Field>
              <Field htmlFor={`bm-compare-type-${index}`} label="Revenue approach">
                <Select id={`bm-compare-type-${index}`} value={model.type} onChange={(e) => updateModel(index, "type", e.target.value as RevenueType)}>
                  {REVENUE_TYPES.map((type) => <option key={type} value={type}>{REVENUE_TYPE_LABELS[type]}</option>)}
                </Select>
              </Field>
              {MODEL_FIELDS.map(([key, label]) => (
                <Field key={key} htmlFor={`bm-compare-${key}-${index}`} label={key === "monthlyGrowthRate" ? label : `${label}${key === "unitsInMonth1" ? "" : ` (${currency})`}`}>
                  <Input
                    id={`bm-compare-${key}-${index}`}
                    type="number"
                    min={key === "monthlyGrowthRate" ? "-50" : "0"}
                    max={key === "monthlyGrowthRate" ? "100" : undefined}
                    step={key === "unitsInMonth1" ? "1" : "any"}
                    value={model[key]}
                    onChange={(e) => updateModel(index, key as ModelNumberField, e.target.value)}
                  />
                </Field>
              ))}
              {comparisonModels.length > 2 && (
                <div className="flex items-end">
                  <Button type="button" size="sm" variant="outline" onClick={() => setComparisonModels((rows) => rows.filter((_, i) => i !== index))}>
                    Remove option
                  </Button>
                </div>
              )}
            </fieldset>
          ))}
          <div className="flex flex-wrap gap-2">
            {comparisonModels.length < 7 && (
              <Button type="button" variant="outline" onClick={() => setComparisonModels((rows) => [...rows, newModel(`Option ${String.fromCharCode(65 + rows.length)}`)])}>
                Add model option
              </Button>
            )}
            <Button type="submit" disabled={!comparisonValid || compare.isPending}>
              {compare.isPending ? "Comparing…" : "Compare options"}
            </Button>
          </div>
        </form>

        {compare.data && <ModelComparison result={compare.data} currency={currency} />}
      </Section>
    </div>
  );
}

function ModelComparison({ result, currency }: { result: CompareModelsResult; currency: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{result.note}</p>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {result.comparison.map((option, index) => (
          <li key={`${option.type}-${option.label ?? index}`} className="space-y-3 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{option.label || REVENUE_TYPE_LABELS[option.type]}</h3>
              <Badge variant="outline">{REVENUE_TYPE_LABELS[option.type]}</Badge>
              <span className="text-xs text-muted-foreground">Ranked {index + 1} by modelled operating profit</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Unit contribution" value={formatMoney(option.unitContribution, currency)} />
              <Stat label="Operating profit" value={formatMoney(option.totalOperatingProfit, currency)} />
              <Stat label="Capital required" value={formatMoney(option.capitalRequired, currency)} />
              <Stat label="Lowest cash" value={formatMoney(option.lowestCash, currency)} />
              <Stat label="Break-even units/month" value={option.breakEvenUnitsPerMonth ?? "Not reached"} />
              <Stat label="Operating break-even" value={option.operatingBreakEvenMonth === null ? "Not reached" : `Month ${option.operatingBreakEvenMonth}`} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
