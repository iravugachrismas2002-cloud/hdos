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
import type { Assumption, Evidence, EvidenceDirection, EvidenceType, ResearchSource, VerificationStatus } from "@/lib/venture-types";
import { useVenture } from "./access";
import { dateInputToIso, EVIDENCE_TYPE_LABELS, EVIDENCE_TYPES, label, todayInput } from "./format";
import { useRefreshVenture, ventureKey } from "./hooks";
import { CheckboxField, ExternalLink, Field, Notice, QueryView, ReadOnlyNote, Section } from "./shared";
import { DirectionBadge, VerificationBadge } from "./StatusBadges";

const DIRECTIONS: EvidenceDirection[] = ["SUPPORTS", "CONTRADICTS", "NEUTRAL"];

function EvidenceForm({ assumptions, sources }: { assumptions: Assumption[]; sources: ResearchSource[] }) {
  const { id, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const [type, setType] = useState<EvidenceType>("INTERVIEW");
  const [direction, setDirection] = useState<EvidenceDirection>("NEUTRAL");
  const [description, setDescription] = useState("");
  const [assumptionId, setAssumptionId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [respondent, setRespondent] = useState("");
  const [consent, setConsent] = useState(false);
  const [verification, setVerification] = useState<"" | VerificationStatus>("");
  const [observed, setObserved] = useState("");
  const [error, setError] = useState("");

  const needsSource = type === "OFFICIAL_STATISTIC" && !sourceId;
  const needsConsent = respondent.trim().length > 0 && !consent;
  const verificationOptions = (["USER_REPORTED", ...(sourceId ? ["SOURCE_LINKED"] : []), ...(can("edit") ? ["VERIFIED", "DISPUTED"] : [])] as VerificationStatus[]);

  const save = useMutation({
    mutationFn: () =>
      ventureApi.createEvidence(id, {
        evidenceType: type,
        direction,
        description: description.trim(),
        assumptionId: assumptionId || null,
        sourceId: sourceId || null,
        respondentLabel: respondent.trim() || null,
        consentGiven: consent,
        ...(verification ? { verificationStatus: verification } : {}),
        ...(observed ? { observedAt: dateInputToIso(observed) } : {}),
      }),
    onSuccess: () => {
      refresh("evidence", "assumptions", "validation-report");
      setDescription("");
      setRespondent("");
      setConsent(false);
      setVerification("");
      setObserved("");
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

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
      <Field htmlFor="ev-type" label="Type of evidence">
        <Select id="ev-type" value={type} onChange={(e) => setType(e.target.value as EvidenceType)}>
          {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{EVIDENCE_TYPE_LABELS[t]}</option>)}
        </Select>
      </Field>
      <Field htmlFor="ev-direction" label="What does it show?" hint="Does it support the assumption, contradict it, or neither?">
        <Select id="ev-direction" value={direction} onChange={(e) => setDirection(e.target.value as EvidenceDirection)}>
          {DIRECTIONS.map((d) => <option key={d} value={d}>{label(d)}</option>)}
        </Select>
      </Field>
      <Field htmlFor="ev-desc" label="What did you find?" className="sm:col-span-2">
        <Textarea id="ev-desc" required minLength={5} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field htmlFor="ev-assumption" label="Linked assumption (optional)">
        <Select id="ev-assumption" value={assumptionId} onChange={(e) => setAssumptionId(e.target.value)}>
          <option value="">Not linked to an assumption</option>
          {assumptions.map((a) => <option key={a.id} value={a.id}>{a.statement.length > 70 ? `${a.statement.slice(0, 70)}…` : a.statement}</option>)}
        </Select>
      </Field>
      <Field htmlFor="ev-source" label={type === "OFFICIAL_STATISTIC" ? "Source (required for a statistic)" : "Research source (optional)"} hint="Add sources in the Market research tab. A source needs a publisher and retrieval date.">
        <Select id="ev-source" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          <option value="">No source</option>
          {sources.map((s) => <option key={s.id} value={s.id}>{s.title} · {s.publisher}</option>)}
        </Select>
      </Field>
      <Field htmlFor="ev-respondent" label="Participant name or label (optional)" hint="A name or other identifying detail can only be stored if the participant consented.">
        <Input id="ev-respondent" maxLength={120} value={respondent} onChange={(e) => setRespondent(e.target.value)} />
      </Field>
      <div className="space-y-2">
        <CheckboxField id="ev-consent" checked={consent} onChange={setConsent}>The participant gave consent for this to be recorded</CheckboxField>
        <p className="pl-6 text-xs text-muted-foreground">Interview evidence without recorded consent counts for nothing in scores.</p>
      </div>
      <Field htmlFor="ev-verification" label="Verification" hint="Leave on automatic unless you have a reason. Only editors can mark evidence verified or disputed.">
        <Select id="ev-verification" value={verification} onChange={(e) => setVerification(e.target.value as "" | VerificationStatus)}>
          <option value="">Automatic (source-linked if a source is chosen, otherwise user-reported)</option>
          {verificationOptions.map((v) => <option key={v} value={v}>{label(v)}</option>)}
        </Select>
      </Field>
      <Field htmlFor="ev-observed" label="Observed on (optional)">
        <Input id="ev-observed" type="date" max={todayInput()} value={observed} onChange={(e) => setObserved(e.target.value)} />
      </Field>
      <div className="space-y-2 sm:col-span-2">
        {needsSource && <Notice tone="warning">A statistic needs a recorded source with publisher and retrieval date. Add one in Market research, then choose it above.</Notice>}
        {needsConsent && <Notice tone="warning">A participant name can only be saved with their consent. Tick the consent box or clear the name.</Notice>}
        <Button type="submit" disabled={save.isPending || description.trim().length < 5 || needsSource || needsConsent}>{save.isPending ? "Saving…" : "Add evidence"}</Button>
      </div>
    </form>
  );
}

function EvidenceItem({ e, assumptions }: { e: Evidence; assumptions: Assumption[] }) {
  const { id, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const [error, setError] = useState("");
  const verify = useMutation({
    mutationFn: (verificationStatus: VerificationStatus) => ventureApi.updateEvidence(id, e.id, { verificationStatus }),
    onSuccess: () => refresh("evidence", "validation-report"),
    onError: (err) => setError(getErrorMessage(err)),
  });
  const linked = assumptions.find((a) => a.id === e.assumptionId);
  const ignored = e.evidenceType === "INTERVIEW" && !e.consentGiven;
  const options: VerificationStatus[] = ["USER_REPORTED", ...(e.sourceId ? (["SOURCE_LINKED"] as const) : []), "VERIFIED", "DISPUTED"];
  return (
    <li className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{EVIDENCE_TYPE_LABELS[e.evidenceType].replace(" (needs a source)", "")}</Badge>
        <DirectionBadge direction={e.direction} />
        <VerificationBadge status={e.verificationStatus} />
        <span className="text-xs text-muted-foreground">Observed {formatDate(e.observedAt)}</span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm">{e.description}</p>
      {linked && <p className="text-xs text-muted-foreground">About: {linked.statement}</p>}
      {e.source && (
        <p className="text-xs text-muted-foreground">
          Source: {e.source.title} · {e.source.publisher} · retrieved {formatDate(e.source.retrievedAt)}{" "}
          {e.source.url && <ExternalLink href={e.source.url}>Open</ExternalLink>}
        </p>
      )}
      {e.respondentLabel && <p className="text-xs text-muted-foreground">Participant: {e.respondentLabel} (consent recorded)</p>}
      {ignored && <Notice tone="warning">No consent is recorded for this interview, so it is not counted in scores.</Notice>}
      {e.consentGiven && !e.respondentLabel && e.evidenceType === "INTERVIEW" && <p className="text-xs text-muted-foreground">Consent recorded{e.consentRecordedAt ? ` on ${formatDate(e.consentRecordedAt)}` : ""}.</p>}
      <FormError message={error} />
      {can("edit") && (
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <label htmlFor={`ver-${e.id}`} className="text-xs font-medium text-muted-foreground">Verification</label>
            <Select id={`ver-${e.id}`} className="h-9 w-48" value={e.verificationStatus} disabled={verify.isPending} onChange={(ev) => { setError(""); verify.mutate(ev.target.value as VerificationStatus); }}>
              {options.map((v) => <option key={v} value={v}>{label(v)}</option>)}
            </Select>
          </div>
        </div>
      )}
    </li>
  );
}

export function EvidencePanel() {
  const { id, can } = useVenture();
  const [filter, setFilter] = useState("");
  const assumptions = useQuery({ queryKey: ventureKey(id, "assumptions"), queryFn: () => ventureApi.assumptions(id) });
  const sources = useQuery({ queryKey: ventureKey(id, "sources"), queryFn: () => ventureApi.sources(id) });
  const evidence = useQuery({ queryKey: ventureKey(id, "evidence", filter), queryFn: () => ventureApi.evidence(id, filter || undefined) });

  return (
    <>
      <Section title="Add evidence" description="Record what real people and sources told you. Only evidence moves a score; AI text never counts.">
        {can("contribute") ? (
          <EvidenceForm assumptions={assumptions.data ?? []} sources={sources.data ?? []} />
        ) : (
          <ReadOnlyNote>Contributors and above can add evidence.</ReadOnlyNote>
        )}
      </Section>
      <Section
        title="Evidence log"
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="ev-filter" className="text-xs font-medium text-muted-foreground">Show</label>
            <Select id="ev-filter" className="h-9 w-56 max-w-full" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All evidence</option>
              {(assumptions.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.statement.length > 50 ? `${a.statement.slice(0, 50)}…` : a.statement}</option>)}
            </Select>
          </div>
        }
      >
        <QueryView query={evidence} rows={3}>
          {(rows) => rows.length === 0 ? <p className="text-sm text-muted-foreground">No evidence recorded yet.</p> : (
            <ul className="space-y-2">{rows.map((e) => <EvidenceItem key={e.id} e={e} assumptions={assumptions.data ?? []} />)}</ul>
          )}
        </QueryView>
      </Section>
    </>
  );
}
