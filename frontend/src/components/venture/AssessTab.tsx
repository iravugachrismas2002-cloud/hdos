// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { FormError } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getErrorMessage, ventureApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Assessment, AssessmentDimension, AssessmentExplanation, FeasibilityCard, ReadinessPreview } from "@/lib/venture-types";
import { useVenture } from "./access";
import { formatCoverage, formatDateTime, formatScore } from "./format";
import { useRefreshVenture, ventureKey } from "./hooks";
import { Bullets, CheckboxField, Notice, QueryView, ReadOnlyNote, ScoreWithCoverage, Section, TableWrap, tableClass, tdClass, thClass } from "./shared";
import { AiStatusBadge, FeasibilityBadge } from "./StatusBadges";

interface Result {
  overallScore: number | null; overallCoverage: number; provisional: boolean; maturity: { label: string };
  dimensions: AssessmentDimension[]; missingEvidence: string[]; risks: string[]; recommendations: string[]; disclaimer: string;
}

function Overall({ r, title }: { r: Result; title: string }) {
  return (
    <Section title={title}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Readiness score (framework, not a prediction)</p>
          {r.overallScore === null ? (
            <p className="text-lg font-semibold">Not enough evidence yet</p>
          ) : (
            <p className="text-3xl font-bold">{r.overallScore}<span className="text-base font-normal text-muted-foreground">/100</span></p>
          )}
          <p className="text-xs text-muted-foreground">Counts only the dimensions that have evidence; unknown ones are not scored as zero.</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Overall evidence coverage</p>
          <p className="text-lg font-semibold">{formatCoverage(r.overallCoverage)}</p>
          <Progress value={r.overallCoverage * 100} label="Overall evidence coverage" />
          {r.provisional && <Badge variant="warning">Provisional: coverage is below 50%</Badge>}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Maturity</p>
          <p className="text-lg font-semibold">{r.maturity.label}</p>
        </div>
      </div>
      <Notice>{r.disclaimer}</Notice>
    </Section>
  );
}

function Dimensions({ dimensions }: { dimensions: AssessmentDimension[] }) {
  return (
    <Section title="Ten dimensions" description="Each score shows how much evidence stands behind it. “Unknown” means there is not enough evidence to score it.">
      <TableWrap label="Readiness dimensions">
        <table className={`${tableClass} min-w-[44rem]`}>
          <thead><tr><th className={thClass}>Dimension</th><th className={thClass}>Weight</th><th className={thClass}>Score and evidence</th><th className={thClass}>What is missing</th></tr></thead>
          <tbody>
            {dimensions.map((d) => (
              <tr key={d.key}>
                <td className={tdClass}>
                  <p className="font-medium">{d.label}</p>
                  <p className="text-xs text-muted-foreground">{d.evidence.supports} supporting · {d.evidence.contradicts} contradicting · {d.evidence.usable} usable · {d.openAssumptions} open assumptions</p>
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>{d.weight}%</td>
                <td className={tdClass}><ScoreWithCoverage score={d.score} coverage={d.coverage} label={d.label} /></td>
                <td className={tdClass}><Bullets items={d.missing} empty="Nothing flagged." className="text-xs" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </Section>
  );
}

function FeasibilityCards({ cards }: { cards: FeasibilityCard[] }) {
  if (cards.length === 0) return null;
  return (
    <Section title="Five feasibility questions" description="Derived from the same evidence as the dimensions above, so they cannot disagree.">
      <ul className="grid gap-3 lg:grid-cols-2">
        {cards.map((c) => (
          <li key={c.key} className="space-y-2 rounded-lg border bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="font-semibold">{c.label}</p><p className="text-xs text-muted-foreground">{c.question}</p></div>
              <FeasibilityBadge status={c.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              Score: <span className="font-medium text-foreground">{formatScore(c.score)}</span> · Confidence: <span className="font-medium text-foreground">{c.confidence.toLowerCase()}</span> ·
              Evidence: {c.evidence.supports} supporting, {c.evidence.contradicts} contradicting, {c.evidence.usable} usable
            </p>
            {c.missingInformation.length > 0 && <div><p className="text-xs font-medium">Missing information</p><Bullets items={c.missingInformation} className="text-xs" /></div>}
            {c.risks.length > 0 && <div><p className="text-xs font-medium">Risks</p><Bullets items={c.risks} className="text-xs" /></div>}
            {c.outstandingTasks.length > 0 && <div><p className="text-xs font-medium">Outstanding tasks</p><Bullets items={c.outstandingTasks} className="text-xs" /></div>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Findings({ r }: { r: Result }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Section title="Recommendations"><Bullets items={r.recommendations} empty="No recommendations right now." /></Section>
      <Section title="Risks"><Bullets items={r.risks} empty="No risks flagged." /></Section>
      <Section title="Missing evidence"><Bullets items={r.missingEvidence} empty="Nothing flagged as missing." /></Section>
    </div>
  );
}

function Explanation({ e }: { e: AssessmentExplanation }) {
  return (
    <Section title={`Explanation of version ${e.assessmentVersion}`} actions={e.generatedBy === "ai" ? <AiStatusBadge status="AI_GENERATED" /> : <AiStatusBadge status="TEMPLATE_FALLBACK" />}>
      <p className="whitespace-pre-wrap break-words text-sm">{e.explanation}</p>
      {e.nextSteps.length > 0 && <div><p className="text-sm font-medium">Suggested next steps</p><Bullets items={e.nextSteps} /></div>}
      <p className="text-xs text-muted-foreground">{e.note} The explanation describes the saved scores; it cannot change them and is not evidence.</p>
    </Section>
  );
}

export function AssessTab() {
  const { id, can, project } = useVenture();
  const refresh = useRefreshVenture(id);
  const [showPreview, setShowPreview] = useState(false);
  const [runNote, setRunNote] = useState("");
  const [explanation, setExplanation] = useState<AssessmentExplanation | null>(null);
  const [error, setError] = useState("");

  const bundle = useQuery({ queryKey: ventureKey(id, "assessment", "latest"), queryFn: () => ventureApi.assessment(id) });
  const preview = useQuery({ queryKey: ventureKey(id, "assessment", "preview"), queryFn: () => ventureApi.assessmentPreview(id), enabled: showPreview });

  const run = useMutation({
    mutationFn: () => ventureApi.runAssessment(id),
    onSuccess: (a: Assessment) => {
      setExplanation(null);
      setRunNote(a.reused ? `Nothing has changed since version ${a.version}, so the saved assessment is shown. No new version was created.` : `Saved as version ${a.version}.`);
      refresh("assessment");
    },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const explain = useMutation({
    mutationFn: () => ventureApi.explainAssessment(id),
    onSuccess: setExplanation,
    onError: (e) => setError(getErrorMessage(e)),
  });

  const latest = bundle.data?.latest ?? null;

  return (
    <>
      <Section title="Venture readiness assessment" description="Scores come only from evidence recorded in this workspace. Running the same workspace twice returns the same saved assessment.">
        {can("edit") ? (
          <div className="space-y-3">
            <FormError message={error} />
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={run.isPending} onClick={() => { setError(""); setRunNote(""); run.mutate(); }}>{run.isPending ? "Assessing…" : "Run assessment"}</Button>
              <Button variant="outline" disabled={explain.isPending || !latest} onClick={() => { setError(""); explain.mutate(); }}><Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />{explain.isPending ? "Explaining…" : "Explain with HDOS AI"}</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {project.aiProcessingConsent ? "AI assistance is on: the saved scores are sent to an external AI provider to be explained." : "AI assistance is off for this venture: a built-in template explains the scores and nothing leaves HDOS."} The AI can only explain a saved assessment; it cannot change a score.
            </p>
            {runNote && <Notice>{runNote}</Notice>}
          </div>
        ) : <ReadOnlyNote>Only editors and above can run assessments. You can read the latest one below.</ReadOnlyNote>}
        <CheckboxField id="as-preview" checked={showPreview} onChange={setShowPreview}>Show a live preview of how the current workspace would score (not saved)</CheckboxField>
      </Section>

      {showPreview && (
        <QueryView query={preview} rows={3}>
          {(p: ReadinessPreview) => (
            <div className="space-y-6 rounded-xl border-2 border-dashed border-primary/40 p-3">
              <Notice tone="warning">Live preview: this is not saved. Run the assessment to keep a version.</Notice>
              <Overall r={p} title="Live preview" />
              <Dimensions dimensions={p.dimensions} />
              <Findings r={p} />
            </div>
          )}
        </QueryView>
      )}

      {explanation && <Explanation e={explanation} />}

      <QueryView query={bundle} rows={3}>
        {(b) => !b.latest ? <Notice>No saved assessment yet. Run an assessment to record the first one.</Notice> : (
          <>
            <Overall r={b.latest} title={`Saved assessment · version ${b.latest.version}`} />
            <p className="text-xs text-muted-foreground">Saved {formatDateTime(b.latest.createdAt)} · engine {b.latest.engineVersion}</p>
            <Dimensions dimensions={b.latest.dimensions} />
            <FeasibilityCards cards={b.latest.feasibility} />
            <Findings r={b.latest} />
            <Section title="History">
              <TableWrap label="Assessment history">
                <table className={tableClass}>
                  <thead><tr><th className={thClass}>Version</th><th className={thClass}>Date</th><th className={thClass}>Score</th><th className={thClass}>Evidence coverage</th><th className={thClass}>Maturity</th></tr></thead>
                  <tbody>
                    {b.history.map((h) => (
                      <tr key={h.id}>
                        <td className={tdClass}>v{h.version}</td>
                        <td className={`${tdClass} whitespace-nowrap`}>{formatDate(h.createdAt)}</td>
                        <td className={tdClass}>{formatScore(h.overallScore)}</td>
                        <td className={tdClass}>{formatCoverage(h.overallCoverage)}</td>
                        <td className={tdClass}>{h.maturityLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </Section>
          </>
        )}
      </QueryView>
    </>
  );
}
