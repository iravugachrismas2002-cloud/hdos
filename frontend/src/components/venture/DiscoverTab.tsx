// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { FormError } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage, ventureApi } from "@/lib/api";
import { useSectors } from "@/lib/hooks";
import { formatDate } from "@/lib/format";
import type { DiscoveryReport, StartMode } from "@/lib/venture-types";
import { useVenture } from "./access";
import { formatDateTime, label } from "./format";
import { FundingMatchCard } from "./FundingMatchCard";
import { useRefreshVenture, ventureKey } from "./hooks";
import { Bullets, ExternalLink, Field, Notice, QueryView, RadioOption, ReadOnlyNote, Section, TableWrap, tableClass, tdClass, thClass } from "./shared";
import { AiHypothesisLabel, AiStatusBadge, AssumptionStatusBadge, DemoBadge, OriginBadge, RiskBadge } from "./StatusBadges";

function ReportView({ report }: { report: DiscoveryReport }) {
  const brief = report.opportunityBrief;
  const hypothesisLabel = report.aiStatus.status === "AI_GENERATED" ? <AiHypothesisLabel /> : <Badge variant="secondary">Template hypothesis — not validated evidence</Badge>;
  return (
    <div className="space-y-6">
      <Notice tone={report.aiStatus.status === "AI_GENERATED" ? "warning" : "info"}>
        <div className="flex flex-wrap items-center gap-2">
          <AiStatusBadge status={report.aiStatus.status} />
          <span className="text-xs">Generated {formatDateTime(report.generatedAt)}{report.aiStatus.provider ? ` · ${label(report.aiStatus.provider)}` : ""}</span>
          {report.replayed && <Badge variant="outline">Same result as an earlier identical request</Badge>}
        </div>
        <p className="mt-2">{report.aiStatus.note}</p>
        <p className="mt-1 text-xs">{report.labels.aiContent}</p>
      </Notice>

      <Section title="Summary" actions={hypothesisLabel}>
        <p className="whitespace-pre-wrap break-words text-sm">{report.summary}</p>
      </Section>

      <Section title="Opportunity brief" actions={hypothesisLabel}>
        <div className="space-y-1"><p className="text-sm font-medium">Problem</p><p className="whitespace-pre-wrap break-words text-sm">{brief.problem}</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><p className="text-sm font-medium">Affected customer groups</p><Bullets items={brief.affectedCustomerGroups} empty="None listed." /></div>
          <div><p className="text-sm font-medium">Current alternatives</p><Bullets items={brief.currentAlternatives} empty="None listed." /></div>
          <div><p className="text-sm font-medium">Potential solutions</p><Bullets items={brief.potentialSolutions} empty="None listed." /></div>
          <div><p className="text-sm font-medium">Unanswered questions</p><Bullets items={brief.unansweredQuestions} empty="None listed." /></div>
        </div>
      </Section>

      <Section title="Draft assumptions" description="Saved to the Validate tab as untested. Nothing is validated until you record evidence." actions={hypothesisLabel}>
        {report.draftAssumptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No new assumptions were added (they may already exist).</p>
        ) : (
          <ul className="space-y-2">
            {report.draftAssumptions.map((a) => (
              <li key={a.id} className="space-y-1 rounded-md border p-3">
                <p className="break-words text-sm">{a.statement}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <OriginBadge origin={a.origin} />
                  <AssumptionStatusBadge status={a.status} />
                  <RiskBadge risk={a.riskLevel} />
                  <Badge variant="outline">{label(a.category)}</Badge>
                </div>
                {a.testMethod && <p className="text-xs text-muted-foreground">Suggested test: {a.testMethod}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Interview questions" actions={hypothesisLabel}><Bullets items={report.interviewQuestions} empty="None suggested." /></Section>
        <Section title="Recommendations" actions={hypothesisLabel}><Bullets items={report.recommendations} empty="None suggested." /></Section>
      </div>

      <Section title="Sector leads" description="Where your profile and national reference data overlap. A lead to investigate, not market evidence and not a prediction.">
        {report.sectorLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sector stands out yet. Add skills and sector interests to your profile for better leads.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {report.sectorLeads.map((l) => (
              <li key={l.sectorId} className="space-y-1 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{l.name}</p>
                  <Badge variant="outline" title="Overlap with your profile and reference data. Not market demand.">Fit signal {l.score}/100</Badge>
                </div>
                <Bullets items={l.reasons} className="text-xs" />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Facts from stored sources" description={report.labels.facts}>
        {report.facts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stored statistics are available.</p>
        ) : (
          <TableWrap label="Facts with their sources">
            <table className={tableClass}>
              <thead><tr><th className={thClass}>Statement</th><th className={thClass}>Publisher</th><th className={thClass}>Retrieved</th><th className={thClass}>Caveat</th></tr></thead>
              <tbody>
                {report.facts.map((f, i) => (
                  <tr key={`${i}-${f.statement}`}>
                    <td className={tdClass}>{f.statement}</td>
                    <td className={tdClass}>
                      <p>{f.source.publisher}</p>
                      <p className="text-xs text-muted-foreground"><ExternalLink href={f.source.url}>{f.source.name}</ExternalLink></p>
                      {f.source.isDemo && <div className="mt-1"><DemoBadge /></div>}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDate(f.source.retrievedAt)}</td>
                    <td className={`${tdClass} text-xs text-muted-foreground`}>{f.caveat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Section>

      <Section title="Funding leads" description="From the HDOS opportunity catalogue. Confirm every call with its official provider.">
        {report.fundingLeads.length === 0 ? <p className="text-sm text-muted-foreground">No funding leads matched.</p> : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {report.fundingLeads.map((m) => <FundingMatchCard key={m.opportunityId} match={m} canTrack={false} />)}
          </ul>
        )}
      </Section>

      <Section title="What is still unknown"><Bullets items={report.unknowns} /></Section>
    </div>
  );
}

export function DiscoverTab() {
  const { id, project, can } = useVenture();
  const queryClient = useQueryClient();
  const refresh = useRefreshVenture(id);
  const sectors = useSectors();
  const [mode, setMode] = useState<StartMode>(project.startMode ?? "OWN_IDEA");
  const [ideaText, setIdeaText] = useState(project.ideaSummary ?? "");
  const [sectorId, setSectorId] = useState(project.sector?.id ?? "");
  const [error, setError] = useState("");

  const latest = useQuery({ queryKey: ventureKey(id, "discovery"), queryFn: () => ventureApi.discovery(id) });
  const run = useMutation({
    mutationFn: () => ventureApi.runDiscovery(id, { mode, ...(ideaText.trim() ? { ideaText: ideaText.trim() } : {}), ...(sectorId ? { sectorId } : {}) }),
    onSuccess: (report) => {
      queryClient.setQueryData(ventureKey(id, "discovery"), report);
      refresh("assumptions", "validation-report");
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <>
      <Section title="Discover an opportunity" description="Generate a discovery report: a brief, draft assumptions to test, interview questions and sourced facts.">
        {!can("edit") ? (
          <ReadOnlyNote>Only editors and above can run discovery. You can read the latest report below.</ReadOnlyNote>
        ) : (
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              run.mutate();
            }}
          >
            <div className="sm:col-span-2"><FormError message={error} /></div>
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="px-2 py-1.5 text-sm font-medium">Mode</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <RadioOption name="d-mode" value="OWN_IDEA" current={mode} onChange={(v) => setMode(v as StartMode)}>I have an idea</RadioOption>
                <RadioOption name="d-mode" value="DISCOVER" current={mode} onChange={(v) => setMode(v as StartMode)}>Help me discover an opportunity</RadioOption>
              </div>
            </fieldset>
            <Field htmlFor="d-idea" label={mode === "OWN_IDEA" ? "Your idea" : "Anything you already have in mind (optional)"} className="sm:col-span-2" hint={mode === "OWN_IDEA" ? "Your words are saved as the venture's idea summary." : undefined}>
              <Textarea id="d-idea" maxLength={4000} value={ideaText} onChange={(e) => setIdeaText(e.target.value)} />
            </Field>
            <Field htmlFor="d-sector" label="Sector (optional)">
              <Select id="d-sector" value={sectorId} onChange={(e) => setSectorId(e.target.value)}>
                <option value="">No preference</option>
                {sectors.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <div className="space-y-2 sm:col-span-2">
              <Notice tone={project.aiProcessingConsent ? "warning" : "info"}>
                {project.aiProcessingConsent
                  ? "AI assistance is on: your venture text will be sent to an external AI provider to draft this report. AI output is a hypothesis, not evidence."
                  : "AI assistance is off for this venture, so a built-in template will be used and nothing leaves HDOS. The owner or an admin can turn AI on in Settings."}
              </Notice>
              <Button type="submit" disabled={run.isPending}><Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />{run.isPending ? "Generating…" : latest.data ? "Run discovery again" : "Run discovery"}</Button>
            </div>
          </form>
        )}
      </Section>

      <QueryView query={latest} rows={3}>
        {(report) => report ? <ReportView report={report} /> : <Notice>No discovery report yet. Run discovery above to create one.</Notice>}
      </QueryView>
    </>
  );
}
