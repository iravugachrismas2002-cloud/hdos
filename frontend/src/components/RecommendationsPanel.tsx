// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ComponentBars, ConfidenceBadge, BandBadge, FitRing } from "@/components/Scores";
import { SourceBadge } from "@/components/SourceBadge";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { goalsApi } from "@/lib/api";
import { EDUCATION_LABELS, OPPORTUNITY_LABELS, formatDate } from "@/lib/format";
import type { OccupationMatch, OpportunityMatch, ProgramMatch } from "@/lib/types";

function OccupationCard({ match, isTarget }: { match: OccupationMatch; isTarget: boolean }) {
  const o = match.occupation;
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-4">
          <FitRing score={match.fitScore} />
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-semibold">{o.title}</h3>
            <p className="text-sm text-muted-foreground">{o.sector.name} · entry level: {EDUCATION_LABELS[o.minEducation]}</p>
            <div className="flex flex-wrap gap-2">
              <BandBadge band={match.band} />
              <ConfidenceBadge confidence={match.confidence} />
              {isTarget && <Badge variant="default">Your target</Badge>}
            </div>
          </div>
        </div>

        <details className="rounded-md border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Why this score?</summary>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <ComponentBars components={match.components} />
            </div>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {match.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </details>

        {match.missingSkills.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium">Skill gaps to close</p>
            <ul className="flex flex-wrap gap-2">
              {match.missingSkills.map((s) => (
                <li key={s.skillId}><Badge variant="warning">{s.name}: {s.currentLevel} → {s.requiredLevel}</Badge></li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="mb-1 text-sm font-medium">Evidence</p>
          <ul className="space-y-1 text-sm">
            {match.evidence.map((e) => (
              <li key={e.label} className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium">{e.label}:</span> <span>{e.value}</span>
                {e.source ? <SourceBadge source={e.source} compact /> : <span className="text-xs text-muted-foreground">(computed from your profile)</span>}
              </li>
            ))}
            {o.salaryMinRwf === null && <li className="text-muted-foreground">No verified salary data for this occupation.</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgramRow({ m }: { m: ProgramMatch }) {
  const p = m.program;
  return (
    <li className="space-y-1 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{p.name}</p>
        <Badge variant="secondary">Match {m.score}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {p.institution.name}{p.institution.district ? ` · ${p.institution.district}` : ""} · {EDUCATION_LABELS[p.level]}
        {p.durationMonths ? ` · ${p.durationMonths} months` : ""}
      </p>
      {m.closesGaps.length > 0 && <p className="text-sm">Closes gaps: {m.closesGaps.join(", ")}</p>}
      {m.reasons.length > 0 && <p className="text-xs text-muted-foreground">{m.reasons.join(" ")}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <SourceBadge source={p.source} compact />
        {p.institution.website && (
          <a className="text-xs text-primary underline" href={p.institution.website} target="_blank" rel="noopener noreferrer">Institution website</a>
        )}
      </div>
    </li>
  );
}

function OpportunityRow({ m }: { m: OpportunityMatch }) {
  const o = m.opportunity;
  return (
    <li className="space-y-1 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{o.title}</p>
        <div className="flex gap-2">
          <Badge variant="secondary">{OPPORTUNITY_LABELS[o.type]}</Badge>
          <Badge variant={m.eligibleNow ? "success" : "warning"}>{m.eligibleNow ? "You qualify" : "Not yet eligible"}</Badge>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{o.provider}{o.country ? ` · ${o.country}` : ""}</p>
      <p className="text-sm">
        {o.deadline ? `Deadline: ${formatDate(o.deadline)}` : o.isRolling ? "Rolling applications" : "Dates change each cycle: check the provider"}
        {" · "}
        {o.lastVerifiedAt ? `Verified ${formatDate(o.lastVerifiedAt)}` : "Not yet verified: confirm on the provider's site"}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <SourceBadge source={o.source} compact />
        {o.url && <a className="text-xs text-primary underline" href={o.url} target="_blank" rel="noopener noreferrer">Official page</a>}
      </div>
    </li>
  );
}

export function RecommendationsPanel({ goalId, targetOccupationId }: { goalId: string; targetOccupationId: string | null }) {
  const rec = useQuery({ queryKey: ["recommendations", goalId], queryFn: () => goalsApi.recommendations(goalId) });

  if (rec.isLoading) return <ListSkeleton />;
  if (rec.isError) return <ErrorState error={rec.error} onRetry={() => rec.refetch()} />;
  const data = rec.data;
  if (!data) return null;

  return (
    <div className="space-y-8">
      {(data.profileCompleteness < 55 || data.notes.length > 0) && (
        <div role="note" className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {data.notes.map((n) => <p key={n}>{n}</p>)}
          <p><Link href="/profile" className="font-medium underline">Update your profile</Link> to improve accuracy.</p>
        </div>
      )}

      <section aria-labelledby="occ-h" className="space-y-3">
        <h2 id="occ-h" className="text-xl font-semibold">Best-fit pathways</h2>
        {data.occupations.length === 0 ? (
          <EmptyState title="No occupations available yet" />
        ) : (
          data.occupations.map((m) => <OccupationCard key={m.occupation.id} match={m} isTarget={m.occupation.id === targetOccupationId} />)
        )}
      </section>

      <section aria-labelledby="prog-h" className="space-y-3">
        <h2 id="prog-h" className="text-xl font-semibold">Programmes that close your gaps</h2>
        {data.programs.length === 0 ? <EmptyState title="No matching programmes yet" /> : <ul className="space-y-3">{data.programs.map((m) => <ProgramRow key={m.program.id} m={m} />)}</ul>}
      </section>

      <section aria-labelledby="opp-h" className="space-y-3">
        <h2 id="opp-h" className="text-xl font-semibold">Opportunities</h2>
        {data.opportunities.length === 0 ? <EmptyState title="No open opportunities match this goal" /> : <ul className="space-y-3">{data.opportunities.map((m) => <OpportunityRow key={m.opportunity.id} m={m} />)}</ul>}
      </section>

      <Card>
        <CardHeader><CardTitle className="text-base">About these results</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          <p>{data.disclaimer}</p>
          <p>Engine {data.engineVersion} · generated {formatDate(data.generatedAt)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
