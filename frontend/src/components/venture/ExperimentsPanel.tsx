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
import { formatDate } from "@/lib/format";
import type { Experiment, ExperimentOutcome, ExperimentStatus } from "@/lib/venture-types";
import { useVenture } from "./access";
import { dateInputToIso, label, parseNumber } from "./format";
import { useRefreshVenture, ventureKey } from "./hooks";
import { CheckboxField, Field, QueryView, ReadOnlyNote, Section } from "./shared";
import { DirectionBadge } from "./StatusBadges";

const EXPERIMENT_STATUSES: ExperimentStatus[] = ["PLANNED", "RUNNING", "COMPLETED", "CANCELLED"];
const OUTCOMES: ExperimentOutcome[] = ["SUPPORTS", "CONTRADICTS", "INCONCLUSIVE"];
const OUTCOME_DIRECTION = { SUPPORTS: "SUPPORTS", CONTRADICTS: "CONTRADICTS", INCONCLUSIVE: "NEUTRAL" } as const;

function ExperimentForm({ onDone }: { onDone: () => void }) {
  const { id } = useVenture();
  const refresh = useRefreshVenture(id);
  const assumptions = useQuery({ queryKey: ventureKey(id, "assumptions"), queryFn: () => ventureApi.assumptions(id) });
  const [assumptionId, setAssumptionId] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [method, setMethod] = useState("");
  const [criteria, setCriteria] = useState("");
  const [sample, setSample] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const sampleNumber = parseNumber(sample);
  const sampleInvalid = sample.trim() !== "" && (sampleNumber === null || !Number.isInteger(sampleNumber) || sampleNumber < 1);
  const datesInvalid = Boolean(start && end && end < start);

  const create = useMutation({
    mutationFn: () =>
      ventureApi.createExperiment(id, {
        assumptionId: assumptionId || null,
        hypothesis: hypothesis.trim(),
        method: method.trim(),
        successCriteria: criteria.trim(),
        targetSample: sampleNumber,
        startDate: start ? dateInputToIso(start) : null,
        endDate: end ? dateInputToIso(end) : null,
      }),
    onSuccess: () => {
      refresh("experiments");
      onDone();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setError(""); create.mutate(); }}>
      <div className="sm:col-span-2"><FormError message={error} /></div>
      <Field htmlFor="x-assumption" label="Assumption being tested (optional)" className="sm:col-span-2">
        <Select id="x-assumption" value={assumptionId} onChange={(e) => setAssumptionId(e.target.value)}>
          <option value="">Not linked</option>
          {(assumptions.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.statement.length > 80 ? `${a.statement.slice(0, 80)}…` : a.statement}</option>)}
        </Select>
      </Field>
      <Field htmlFor="x-hyp" label="Hypothesis" className="sm:col-span-2"><Textarea id="x-hyp" required minLength={5} maxLength={500} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} /></Field>
      <Field htmlFor="x-method" label="Method" hint="For example: 10 customer interviews, a landing page, a pre-order test."><Input id="x-method" required minLength={3} maxLength={500} value={method} onChange={(e) => setMethod(e.target.value)} /></Field>
      <Field htmlFor="x-criteria" label="Success criteria" hint="Decide before you start what result would count as success."><Input id="x-criteria" required minLength={3} maxLength={500} value={criteria} onChange={(e) => setCriteria(e.target.value)} /></Field>
      <Field htmlFor="x-sample" label="Target sample size (optional)"><Input id="x-sample" inputMode="numeric" value={sample} onChange={(e) => setSample(e.target.value)} aria-invalid={sampleInvalid} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field htmlFor="x-start" label="Start (optional)"><Input id="x-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field htmlFor="x-end" label="End (optional)"><Input id="x-end" type="date" min={start || undefined} value={end} onChange={(e) => setEnd(e.target.value)} aria-invalid={datesInvalid} /></Field>
      </div>
      {(sampleInvalid || datesInvalid) && <p role="alert" className="text-sm text-destructive sm:col-span-2">{sampleInvalid ? "Sample size must be a whole number of at least 1." : "The end date must not be before the start date."}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={create.isPending || hypothesis.trim().length < 5 || method.trim().length < 3 || criteria.trim().length < 3 || sampleInvalid || datesInvalid}>{create.isPending ? "Saving…" : "Plan experiment"}</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function ResultForm({ experiment, onDone }: { experiment: Experiment; onDone: () => void }) {
  const { id } = useVenture();
  const refresh = useRefreshVenture(id);
  const [observation, setObservation] = useState("");
  const [outcome, setOutcome] = useState<ExperimentOutcome>("INCONCLUSIVE");
  const [metricName, setMetricName] = useState("");
  const [metricValue, setMetricValue] = useState("");
  const [sampleSize, setSampleSize] = useState("");
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const value = parseNumber(metricValue);
  const size = parseNumber(sampleSize);
  const invalid = (metricValue.trim() !== "" && value === null) || (sampleSize.trim() !== "" && (size === null || !Number.isInteger(size) || size < 0));

  const record = useMutation({
    mutationFn: () =>
      ventureApi.recordExperimentResult(id, experiment.id, {
        observation: observation.trim(),
        outcome,
        metricName: metricName.trim() || null,
        metricValue: value,
        sampleSize: size,
        completeExperiment: complete,
      }),
    onSuccess: () => {
      refresh("experiments", "evidence", "assumptions", "validation-report");
      onDone();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const p = `res-${experiment.id}`;
  return (
    <form className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setError(""); record.mutate(); }}>
      <div className="sm:col-span-2"><FormError message={error} /></div>
      <Field htmlFor={`${p}-obs`} label="What happened?" className="sm:col-span-2" hint="This is also saved as evidence on the linked assumption, marked as user-reported."><Textarea id={`${p}-obs`} required minLength={5} maxLength={4000} value={observation} onChange={(e) => setObservation(e.target.value)} /></Field>
      <Field htmlFor={`${p}-outcome`} label="Outcome against your success criteria">
        <Select id={`${p}-outcome`} value={outcome} onChange={(e) => setOutcome(e.target.value as ExperimentOutcome)}>
          {OUTCOMES.map((o) => <option key={o} value={o}>{label(o)}</option>)}
        </Select>
      </Field>
      <Field htmlFor={`${p}-sample`} label="Sample size (optional)"><Input id={`${p}-sample`} inputMode="numeric" value={sampleSize} onChange={(e) => setSampleSize(e.target.value)} /></Field>
      <Field htmlFor={`${p}-mname`} label="Metric name (optional)"><Input id={`${p}-mname`} maxLength={120} value={metricName} onChange={(e) => setMetricName(e.target.value)} /></Field>
      <Field htmlFor={`${p}-mvalue`} label="Metric value (optional)"><Input id={`${p}-mvalue`} inputMode="decimal" value={metricValue} onChange={(e) => setMetricValue(e.target.value)} /></Field>
      <CheckboxField id={`${p}-done`} checked={complete} onChange={setComplete} className="sm:col-span-2">Mark this experiment as completed</CheckboxField>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={record.isPending || observation.trim().length < 5 || invalid}>{record.isPending ? "Saving…" : "Record result"}</Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function ExperimentCard({ x }: { x: Experiment }) {
  const { id, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const setStatus = useMutation({
    mutationFn: (status: ExperimentStatus) => ventureApi.updateExperiment(id, x.id, { status }),
    onSuccess: () => refresh("experiments", "assumptions"),
    onError: (e) => setError(getErrorMessage(e)),
  });
  return (
    <li className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={x.status === "COMPLETED" ? "success" : x.status === "RUNNING" ? "default" : x.status === "CANCELLED" ? "outline" : "secondary"}>{label(x.status)}</Badge>
        {x.targetSample && <span className="text-xs text-muted-foreground">Target sample {x.targetSample}</span>}
        {(x.startDate || x.endDate) && <span className="text-xs text-muted-foreground">{x.startDate ? formatDate(x.startDate) : "?"} → {x.endDate ? formatDate(x.endDate) : "?"}</span>}
      </div>
      <p className="break-words text-sm font-medium">{x.hypothesis}</p>
      <dl className="grid gap-1 text-xs sm:grid-cols-2">
        <div><dt className="font-medium text-muted-foreground">Method</dt><dd className="break-words">{x.method}</dd></div>
        <div><dt className="font-medium text-muted-foreground">Success criteria</dt><dd className="break-words">{x.successCriteria}</dd></div>
        {x.assumption && <div className="sm:col-span-2"><dt className="font-medium text-muted-foreground">Tests assumption</dt><dd className="break-words">{x.assumption.statement}</dd></div>}
      </dl>
      {x.results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Results</p>
          <ul className="space-y-2">
            {x.results.map((r) => (
              <li key={r.id} className="rounded border bg-background p-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5"><DirectionBadge direction={OUTCOME_DIRECTION[r.outcome]} /><Badge variant="outline">{label(r.outcome)}</Badge><span className="text-muted-foreground">{formatDate(r.recordedAt)}</span></div>
                <p className="mt-1 whitespace-pre-wrap break-words">{r.observation}</p>
                {(r.metricName || r.sampleSize !== null) && <p className="mt-1 text-muted-foreground">{r.metricName ? `${r.metricName}: ${r.metricValue ?? "n/a"}` : ""}{r.metricName && r.sampleSize !== null ? " · " : ""}{r.sampleSize !== null ? `n = ${r.sampleSize}` : ""}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <FormError message={error} />
      <div className="flex flex-wrap items-end gap-2">
        {can("edit") && (
          <div className="space-y-1">
            <label htmlFor={`xs-${x.id}`} className="text-xs font-medium text-muted-foreground">Status</label>
            <Select id={`xs-${x.id}`} className="h-9 w-40" value={x.status} disabled={setStatus.isPending} onChange={(e) => { setError(""); setStatus.mutate(e.target.value as ExperimentStatus); }}>
              {EXPERIMENT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </Select>
          </div>
        )}
        {can("contribute") && x.status !== "CANCELLED" && !recording && <Button size="sm" variant="outline" onClick={() => setRecording(true)}>Record result</Button>}
      </div>
      {recording && <ResultForm experiment={x} onDone={() => setRecording(false)} />}
    </li>
  );
}

export function ExperimentsPanel() {
  const { id, can } = useVenture();
  const experiments = useQuery({ queryKey: ventureKey(id, "experiments"), queryFn: () => ventureApi.experiments(id) });
  const [adding, setAdding] = useState(false);
  return (
    <Section
      title="Experiments"
      description="Small, cheap tests of an assumption. Decide the success criteria first, then record what actually happened."
      actions={can("edit") && !adding ? <Button size="sm" onClick={() => setAdding(true)}>Plan experiment</Button> : undefined}
    >
      {!can("edit") && <ReadOnlyNote>Only editors and above can plan experiments. Contributors can record results.</ReadOnlyNote>}
      {adding && <div className="rounded-md border bg-muted/30 p-3"><ExperimentForm onDone={() => setAdding(false)} /></div>}
      <QueryView query={experiments} rows={3}>
        {(rows) => rows.length === 0 ? <p className="text-sm text-muted-foreground">No experiments yet.</p> : <ul className="space-y-3">{rows.map((x) => <ExperimentCard key={x.id} x={x} />)}</ul>}
      </QueryView>
    </Section>
  );
}
