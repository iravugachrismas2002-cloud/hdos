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
import { getErrorCode, getErrorMessage, ventureApi } from "@/lib/api";
import type { Assumption, AssumptionCategory, AssumptionStatus, RiskLevel } from "@/lib/venture-types";
import { useVenture } from "./access";
import { ASSUMPTION_CATEGORIES, CATEGORY_LABELS, label } from "./format";
import { useRefreshVenture, ventureKey } from "./hooks";
import { Field, Notice, QueryView, ReadOnlyNote, Section } from "./shared";
import { AssumptionStatusBadge, OriginBadge, RiskBadge } from "./StatusBadges";

const STATUSES: AssumptionStatus[] = ["UNTESTED", "TESTING", "SUPPORTED", "REFUTED", "INCONCLUSIVE"];
const RISKS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH"];

function AssumptionForm({ initial, onDone }: { initial?: Assumption; onDone: () => void }) {
  const { id } = useVenture();
  const refresh = useRefreshVenture(id);
  const [statement, setStatement] = useState(initial?.statement ?? "");
  const [category, setCategory] = useState<AssumptionCategory>(initial?.category ?? "CUSTOMER");
  const [risk, setRisk] = useState<RiskLevel>(initial?.riskLevel ?? "MEDIUM");
  const [testMethod, setTestMethod] = useState(initial?.testMethod ?? "");
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () => {
      const body = { statement: statement.trim(), category, riskLevel: risk, testMethod: testMethod.trim() || null };
      return initial ? ventureApi.updateAssumption(id, initial.id, body) : ventureApi.createAssumption(id, body);
    },
    onSuccess: () => {
      refresh("assumptions", "validation-report");
      setStatement("");
      setTestMethod("");
      onDone();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const p = initial ? `a-edit-${initial.id}` : "a-new";
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        save.mutate();
      }}
    >
      <div className="sm:col-span-2"><FormError message={error} /></div>
      <Field htmlFor={`${p}-statement`} label="Assumption" className="sm:col-span-2" hint="Something that must be true for the venture to work, for example “Small shops in Kigali will pay 2,000 RWF a week for delivery”.">
        <Textarea id={`${p}-statement`} required minLength={5} maxLength={400} value={statement} onChange={(e) => setStatement(e.target.value)} />
      </Field>
      <Field htmlFor={`${p}-category`} label="Category">
        <Select id={`${p}-category`} value={category} onChange={(e) => setCategory(e.target.value as AssumptionCategory)}>
          {ASSUMPTION_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </Select>
      </Field>
      <Field htmlFor={`${p}-risk`} label="Risk if wrong">
        <Select id={`${p}-risk`} value={risk} onChange={(e) => setRisk(e.target.value as RiskLevel)}>
          {RISKS.map((r) => <option key={r} value={r}>{label(r)}</option>)}
        </Select>
      </Field>
      <Field htmlFor={`${p}-test`} label="How will you test it? (optional)" className="sm:col-span-2">
        <Input id={`${p}-test`} maxLength={300} value={testMethod} onChange={(e) => setTestMethod(e.target.value)} />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={save.isPending || statement.trim().length < 5}>{save.isPending ? "Saving…" : initial ? "Save changes" : "Add assumption"}</Button>
        {initial && <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>}
      </div>
    </form>
  );
}

function AssumptionRow({ a }: { a: Assumption }) {
  const { id, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [needsEvidence, setNeedsEvidence] = useState(false);

  const setStatus = useMutation({
    // `testMethod` is sent back unchanged: the API treats an omitted testMethod on PATCH as "clear it".
    mutationFn: (status: AssumptionStatus) => ventureApi.updateAssumption(id, a.id, { status, testMethod: a.testMethod }),
    onSuccess: () => {
      setError("");
      setNeedsEvidence(false);
      refresh("assumptions", "validation-report");
    },
    onError: (e) => {
      setError(getErrorMessage(e));
      setNeedsEvidence(getErrorCode(e) === "ASSUMPTION_NEEDS_EVIDENCE");
    },
  });
  const remove = useMutation({
    mutationFn: () => ventureApi.deleteAssumption(id, a.id),
    onSuccess: () => refresh("assumptions", "validation-report", "evidence", "experiments"),
    onError: (e) => setError(getErrorMessage(e)),
  });

  if (editing) return <li className="rounded-md border p-3"><AssumptionForm initial={a} onDone={() => setEditing(false)} /></li>;

  return (
    <li className="space-y-2 rounded-md border p-3">
      <p className="break-words text-sm">{a.statement}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <OriginBadge origin={a.origin} />
        <AssumptionStatusBadge status={a.status} />
        <RiskBadge risk={a.riskLevel} />
        <Badge variant="outline">{CATEGORY_LABELS[a.category]}</Badge>
        <span className="text-xs text-muted-foreground">{a._count?.evidence ?? 0} evidence · {a._count?.experiments ?? 0} experiments</span>
      </div>
      {a.origin === "AI_DRAFT" && <p className="text-xs text-muted-foreground">AI-drafted hypothesis — not validated evidence.</p>}
      {a.testMethod && <p className="text-xs text-muted-foreground">Test: {a.testMethod}</p>}
      {error && (needsEvidence ? <Notice tone="warning">{error} Record evidence on the Evidence tab first.</Notice> : <FormError message={error} />)}
      {can("edit") && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label htmlFor={`as-${a.id}`} className="text-xs font-medium text-muted-foreground">Status</label>
            <Select id={`as-${a.id}`} className="h-9 w-44" value={a.status} disabled={setStatus.isPending} onChange={(e) => setStatus.mutate(e.target.value as AssumptionStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </Select>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} aria-label={`Edit assumption: ${a.statement.slice(0, 40)}`}>Edit</Button>
          {confirming ? (
            <>
              <Button size="sm" variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>Confirm delete</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} aria-label={`Delete assumption: ${a.statement.slice(0, 40)}`}>Delete</Button>
          )}
        </div>
      )}
    </li>
  );
}

export function AssumptionsPanel() {
  const { id, can } = useVenture();
  const assumptions = useQuery({ queryKey: ventureKey(id, "assumptions"), queryFn: () => ventureApi.assumptions(id) });
  const [adding, setAdding] = useState(false);
  return (
    <Section
      title="Assumptions"
      description="Supported or refuted can only be set after you record evidence. AI-drafted assumptions always start untested."
      actions={can("edit") && !adding ? <Button size="sm" onClick={() => setAdding(true)}>Add assumption</Button> : undefined}
    >
      {!can("edit") && <ReadOnlyNote>Only editors and above can add or change assumptions.</ReadOnlyNote>}
      {adding && can("edit") && <div className="rounded-md border bg-muted/30 p-3"><AssumptionForm onDone={() => setAdding(false)} /></div>}
      <QueryView query={assumptions} rows={3}>
        {(rows) => rows.length === 0 ? <p className="text-sm text-muted-foreground">No assumptions yet. Write down what must be true for your idea to work, or run discovery for AI-drafted hypotheses to review.</p> : (
          <ul className="space-y-2">{rows.map((a) => <AssumptionRow key={a.id} a={a} />)}</ul>
        )}
      </QueryView>
    </Section>
  );
}
