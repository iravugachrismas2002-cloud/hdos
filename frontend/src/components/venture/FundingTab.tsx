// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FormError } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getErrorMessage, ventureApi } from "@/lib/api";
import { formatDateTime } from "./format";
import { useVenture } from "./access";
import { useRefreshVenture, ventureKey } from "./hooks";
import { EcosystemList } from "./EcosystemList";
import { FundingMatchCard } from "./FundingMatchCard";
import { Bullets, Notice, QueryView, ReadOnlyNote, Section } from "./shared";

export function FundingTab() {
  const { id, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const matches = useQuery({ queryKey: ventureKey(id, "funding-matches"), queryFn: () => ventureApi.fundingMatches(id) });
  const [error, setError] = useState("");
  const assess = useMutation({
    mutationFn: () => ventureApi.fundingReadiness(id),
    onSuccess: () => refresh("funding-readiness"),
    onError: (e) => setError(getErrorMessage(e)),
  });
  const readiness = assess.data;

  return (
    <div className="space-y-6">
      <Section title="Funding readiness" description="A checklist of venture records that may help with preparation. It is not a funding decision or guarantee.">
        {!can("edit") && <ReadOnlyNote>Only editors and above can create a readiness assessment.</ReadOnlyNote>}
        <FormError message={error} />
        {can("edit") && <Button type="button" disabled={assess.isPending} onClick={() => { setError(""); assess.mutate(); }}>{assess.isPending ? "Checking…" : "Run readiness checklist"}</Button>}
        {readiness && (
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{readiness.metCount}/{readiness.totalChecks} checks met</Badge>
              <span className="text-xs text-muted-foreground">Version {readiness.version} · {formatDateTime(readiness.createdAt)}</span>
            </div>
            <p className="text-sm">{readiness.disclaimer}</p>
            {readiness.checks.length > 0 && (
              <ul className="space-y-2">
                {readiness.checks.map((check) => (
                  <li key={check.key} className="flex items-start gap-2 text-sm">
                    <span aria-label={check.met ? "Met" : "Not met"}>{check.met ? "✓" : "○"}</span>
                    <span><strong>{check.label}:</strong> {check.detail}</span>
                  </li>
                ))}
              </ul>
            )}
            {readiness.missing.length > 0 && <div><p className="text-sm font-medium">Still to prepare</p><Bullets items={readiness.missing.map((x) => `${x.label}: ${x.detail}`)} /></div>}
          </div>
        )}
      </Section>

      <Section title="Funding opportunities" description="Matches are relevance leads only. Verify each call with its provider; HDOS cannot confirm eligibility or award outcomes.">
        <QueryView query={matches} rows={3}>
          {(data) => (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{data.summary.open} open</Badge>
                <Badge variant="warning">{data.summary.needsVerification} need verification</Badge>
                <Badge variant="secondary">{data.summary.expired} expired</Badge>
              </div>
              {data.notes.length > 0 && <Notice><Bullets items={data.notes} /></Notice>}
              {data.matches.length === 0 ? <p className="text-sm text-muted-foreground">No funding leads matched this venture.</p> : (
                <ul className="grid gap-3 lg:grid-cols-2">{data.matches.map((match) => <FundingMatchCard key={match.opportunityId} match={match} canTrack={can("contribute")} />)}</ul>
              )}
            </div>
          )}
        </QueryView>
      </Section>

      <Section title="Support ecosystem" description="These are links to external organisations, not confirmed funding calls or HDOS integrations.">
        <QueryView query={useQuery({ queryKey: ["venture", "ecosystem"], queryFn: () => ventureApi.ecosystem() })}>
          {(entries) => <EcosystemList entries={entries} />}
        </QueryView>
      </Section>
    </div>
  );
}
