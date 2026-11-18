// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import type { AssumptionVerdict, ValidationReport } from "@/lib/venture-types";
import { useVenture } from "./access";
import { AssumptionsPanel } from "./AssumptionsPanel";
import { EvidencePanel } from "./EvidencePanel";
import { ExperimentsPanel } from "./ExperimentsPanel";
import { formatCoverage, label } from "./format";
import { ventureKey } from "./hooks";
import { CompetitorsPanel, SegmentsPanel, SourcesPanel } from "./ResearchPanels";
import { Bullets, Notice, QueryView, Section, Stat, SubTabs, subPanelProps } from "./shared";
import { AssumptionStatusBadge, RiskBadge } from "./StatusBadges";
import { ventureApi } from "@/lib/api";

const SUBTABS = [
  { id: "report", label: "Validation report" },
  { id: "assumptions", label: "Assumptions" },
  { id: "evidence", label: "Evidence" },
  { id: "experiments", label: "Experiments" },
  { id: "research", label: "Market research" },
] as const;
type SubTab = (typeof SUBTABS)[number]["id"];

function VerdictList({ title, items, empty }: { title: string; items: AssumptionVerdict[]; empty: string }) {
  return (
    <Section title={`${title} (${items.length})`}>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
        <ul className="space-y-2">
          {items.map((v) => (
            <li key={v.id} className="space-y-1 rounded-md border p-3">
              <p className="break-words text-sm">{v.statement}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <AssumptionStatusBadge status={v.status} />
                <RiskBadge risk={v.riskLevel} />
                <Badge variant="outline">{label(v.category)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Evidence coverage {formatCoverage(v.evidence.coverage)} · {v.evidence.supports} supporting · {v.evidence.contradicts} contradicting · {v.evidence.usable} usable
              </p>
              {v.suggestion && v.suggestion !== v.status && (
                <p className="text-xs text-muted-foreground">Advisory only: the evidence leans towards “{label(v.suggestion)}”. You decide the status.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function ReportView({ report }: { report: ValidationReport }) {
  const s = report.summary;
  return (
    <>
      <Notice>{report.disclaimer}</Notice>
      <Section title="Where your assumptions stand">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Total" value={s.total} />
          <Stat label="Supported" value={s.supported} />
          <Stat label="Refuted" value={s.refuted} />
          <Stat label="Uncertain" value={s.inconclusive + s.testing} hint={`${s.testing} testing · ${s.inconclusive} inconclusive`} />
          <Stat label="Untested" value={s.untested} />
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-medium">Interviews</p>
          <p className="text-muted-foreground">
            {report.interviews.total} recorded · {report.interviews.withConsent} with consent (counted) · {report.interviews.withoutConsent} without consent (not counted)
          </p>
        </div>
        {report.gaps.length > 0 && <div><p className="text-sm font-medium">Gaps</p><Bullets items={report.gaps} /></div>}
      </Section>
      <VerdictList title="Supported by evidence" items={report.supported} empty="Nothing is supported yet. That is normal early on." />
      <VerdictList title="Refuted by evidence" items={report.refuted} empty="No assumption has been refuted." />
      <VerdictList title="Uncertain" items={report.uncertain} empty="No assumptions are in testing or inconclusive." />
      <VerdictList title="Untested" items={report.untested} empty="Every assumption has been looked at." />
    </>
  );
}

export function ValidateTab() {
  const { id } = useVenture();
  const [sub, setSub] = useState<SubTab>("report");
  const report = useQuery({ queryKey: ventureKey(id, "validation-report"), queryFn: () => ventureApi.validationReport(id) });
  return (
    <div className="space-y-6">
      <SubTabs prefix="val" label="Validation sections" tabs={SUBTABS} value={sub} onChange={setSub} />
      <div {...subPanelProps("val", sub)}>
        {sub === "report" && <QueryView query={report} rows={3}>{(r) => <ReportView report={r} />}</QueryView>}
        {sub === "assumptions" && <AssumptionsPanel />}
        {sub === "evidence" && <EvidencePanel />}
        {sub === "experiments" && <ExperimentsPanel />}
        {sub === "research" && (<><SourcesPanel /><SegmentsPanel /><CompetitorsPanel /></>)}
      </div>
    </div>
  );
}
