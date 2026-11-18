// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { isRestricted, type VentureDetail } from "@/lib/venture-types";
import { formatCoverage, sectionLabel } from "./format";
import { Bullets, Notice, Section, Stat } from "./shared";

export function OverviewTab({ detail, onOpenTab }: { detail: VentureDetail; onOpenTab: (tab: string) => void }) {
  if (isRestricted(detail)) {
    return (
      <Section title="Overview" description="Advisor view">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Sector</dt><dd>{detail.sector?.name ?? "Not set"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">District</dt><dd>{detail.district?.name ?? "Not set"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Currency</dt><dd>{detail.currency}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Created</dt><dd>{formatDate(detail.createdAt)}</dd></div>
        </dl>
        <p className="text-sm text-muted-foreground">
          Counts, next actions and risks are only visible to team members. Shared with you: {detail.sharedSections.length ? detail.sharedSections.map(sectionLabel).join(", ") : "nothing beyond this overview"}.
        </p>
      </Section>
    );
  }

  const { counts, latestAssessment: a } = detail;
  return (
    <>
      <Section title="At a glance" description="Counts of what is recorded in this workspace. More recorded evidence means more reliable scores.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Assumptions" value={counts.assumptions.total} hint={`${counts.assumptions.untested} untested · ${counts.assumptions.supported} supported · ${counts.assumptions.refuted} refuted`} />
          <Stat label="Evidence items" value={counts.evidence} />
          <Stat label="Experiments" value={counts.experiments} />
          <Stat label="Customer segments" value={counts.segments} />
          <Stat label="Competitors" value={counts.competitors} />
          <Stat label="Features" value={counts.features} />
          <Stat label="Milestones" value={counts.milestones} />
          <Stat label="Active members" value={counts.members} />
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Next actions" description="Suggested by what is missing in your workspace, not by AI.">
          <Bullets items={detail.nextActions} empty="Nothing urgent. Keep recording evidence." />
        </Section>
        <Section title="Risks" description="From your own records: untested high-risk assumptions, weak areas and contradicting evidence.">
          <Bullets items={detail.risks} empty="No risks flagged from the evidence recorded so far." />
        </Section>
      </div>

      <Section
        title="Latest readiness assessment"
        actions={<Button size="sm" variant="outline" onClick={() => onOpenTab("assess")}>Open Assess</Button>}
      >
        {a ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-2xl font-bold">
                {a.overallScore === null ? <span className="text-base font-semibold text-muted-foreground">Not enough evidence yet</span> : <>{a.overallScore}<span className="text-sm font-normal text-muted-foreground">/100</span></>}
              </p>
              <Badge variant="outline">Evidence coverage {formatCoverage(a.overallCoverage)}</Badge>
              {a.overallCoverage < 0.5 && <Badge variant="warning">Provisional</Badge>}
              <span className="text-xs text-muted-foreground">Version {a.version} · {formatDate(a.createdAt)}</span>
            </div>
            <p className="text-xs text-muted-foreground">A framework score based only on recorded evidence. It is not a prediction of success.</p>
          </div>
        ) : (
          <Notice>No assessment yet. Add assumptions and evidence, then run an assessment to see what is still unknown.</Notice>
        )}
      </Section>
    </>
  );
}
