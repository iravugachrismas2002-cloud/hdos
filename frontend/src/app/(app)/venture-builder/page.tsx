// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EcosystemList } from "@/components/venture/EcosystemList";
import { NewVentureForm } from "@/components/venture/NewVentureForm";
import { Notice, QueryView, Section } from "@/components/venture/shared";
import { ROLE_LABELS, sectionLabel, STATUS_LABELS } from "@/components/venture/format";
import { RoleBadge, VentureStatusBadge } from "@/components/venture/StatusBadges";
import { EmptyState, ErrorState, FormError, ListSkeleton } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getErrorMessage, ventureApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { VentureListItem } from "@/lib/venture-types";
import { useAppearance } from "@/contexts/AppearanceContext";

const STEPS = [
  { title: "Describe", text: "Write down your idea, or ask HDOS to suggest opportunity areas from your profile and national reference data." },
  { title: "Test assumptions", text: "List what must be true for the venture to work, then record real evidence: consented interviews, surveys, sourced statistics and test orders." },
  { title: "Assess honestly", text: "Readiness scores come only from evidence you recorded. Unknown areas stay “Unknown” and are never counted against you or guessed." },
  { title: "Plan the product and the money", text: "Turn validated needs into an MVP specification, a business model and deterministic financial projections you can adjust." },
  { title: "Find support", text: "See funding calls and ecosystem organisations, then apply through their official process. HDOS never submits anything for you." },
];

function VentureCard({ venture }: { venture: VentureListItem }) {
  const c = venture.counts;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <Link href={`/venture-builder/${venture.id}`} className="break-words text-lg font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{venture.name}</Link>
            <div className="flex flex-wrap items-center gap-2">
              <VentureStatusBadge status={venture.status} />
              <RoleBadge role={venture.myRole} />
              {venture.sector && <Badge variant="secondary">{venture.sector.name}</Badge>}
              {venture.district && <span className="text-xs text-muted-foreground">{venture.district.name}</span>}
            </div>
          </div>
          <Button asChild size="sm" variant="outline"><Link href={`/venture-builder/${venture.id}`} aria-label={`Open ${venture.name}`}>Open</Link></Button>
        </div>
        {venture.ideaSummary && <p className="line-clamp-2 text-sm text-muted-foreground">{venture.ideaSummary}</p>}
        {c ? (
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            {([["Assumptions", c.assumptions], ["Evidence", c.evidence], ["Experiments", c.experiments], ["Features", c.features], ["Milestones", c.milestones]] as const).map(([k, v]) => (
              <div key={k} className="flex gap-1"><dt>{k}:</dt><dd className="font-semibold text-foreground">{v}</dd></div>
            ))}
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground">
            Advisor view: you can read {venture.sharedSections.length ? venture.sharedSections.map(sectionLabel).join(", ") : "only the overview"}.
          </p>
        )}
        <p className="text-xs text-muted-foreground">Updated {formatDate(venture.updatedAt)}</p>
      </CardContent>
    </Card>
  );
}

function InvitationsBanner() {
  const queryClient = useQueryClient();
  const invitations = useQuery({ queryKey: ["venture", "invitations"], queryFn: ventureApi.invitations });
  const [error, setError] = useState("");
  const respond = useMutation({
    mutationFn: (v: { id: string; accept: boolean }) => ventureApi.respondToInvitation(v.id, v.accept),
    onSuccess: () => {
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["venture", "invitations"] });
      void queryClient.invalidateQueries({ queryKey: ["venture", "dashboard"] });
    },
    onError: (e) => setError(getErrorMessage(e)),
  });
  if (!invitations.data || invitations.data.length === 0) return null;
  return (
    <Notice tone="info" className="space-y-3">
      <p className="font-semibold">You have {invitations.data.length} pending venture invitation{invitations.data.length === 1 ? "" : "s"}</p>
      <p className="text-xs">Accepting means you consent to join and to the access listed. You can leave at any time.</p>
      <FormError message={error} />
      <ul className="space-y-2">
        {invitations.data.map((inv) => (
          <li key={inv.id} className="flex flex-col gap-2 rounded-md border border-blue-200 bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm">
              <p className="break-words font-semibold">{inv.projectName}</p>
              <p className="text-xs text-muted-foreground">
                {inv.invitedBy ? `From ${inv.invitedBy} · ` : ""}Role: {ROLE_LABELS[inv.role]}
                {inv.role === "ADVISOR" && ` · Sections: ${inv.sharedSections.length ? inv.sharedSections.map(sectionLabel).join(", ") : "overview only"}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={respond.isPending} onClick={() => respond.mutate({ id: inv.id, accept: true })} aria-label={`Accept invitation to ${inv.projectName}`}>Accept</Button>
              <Button size="sm" variant="outline" disabled={respond.isPending} onClick={() => respond.mutate({ id: inv.id, accept: false })} aria-label={`Decline invitation to ${inv.projectName}`}>Decline</Button>
            </div>
          </li>
        ))}
      </ul>
    </Notice>
  );
}

export default function VentureBuilderPage() {
  const { t } = useAppearance();
  const [creating, setCreating] = useState(false);
  const dashboard = useQuery({ queryKey: ["venture", "dashboard"], queryFn: ventureApi.dashboard });
  const ecosystem = useQuery({ queryKey: ["venture", "ecosystem"], queryFn: ventureApi.ecosystem, staleTime: 24 * 60 * 60 * 1000 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("Venture Builder")}</h1>
          <p className="text-muted-foreground">{t("Turn an idea into an evidence-backed venture, one verified step at a time.")}</p>
        </div>
        {!creating && <Button onClick={() => setCreating(true)}>{t("New venture")}</Button>}
      </div>

      <InvitationsBanner />
      {creating && <NewVentureForm onCancel={() => setCreating(false)} />}

      <section aria-labelledby="my-ventures" className="space-y-3">
        <h2 id="my-ventures" className="text-xl font-semibold">My ventures</h2>
        {dashboard.isLoading && <ListSkeleton />}
        {dashboard.isError && <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />}
        {dashboard.data && dashboard.data.ventures.length === 0 && !creating && (
          <EmptyState title="No ventures yet">Create your first venture to get a guided, evidence-first workspace.</EmptyState>
        )}
        {dashboard.data && dashboard.data.ventures.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 text-xs" aria-label="Ventures by status">
              {Object.entries(dashboard.data.byStatus).map(([status, count]) => (
                <Badge key={status} variant="outline">{STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}: {count}</Badge>
              ))}
            </div>
            <ul className="grid gap-3 lg:grid-cols-2">
              {dashboard.data.ventures.map((v) => <li key={v.id}><VentureCard venture={v} /></li>)}
            </ul>
          </>
        )}
      </section>

      <Section title="How Venture Builder works" description="Evidence first: HDOS helps you organise and test your thinking. It does not predict success.">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="space-y-1 rounded-lg border bg-background p-3">
              <p className="text-xs font-bold text-primary">Step {i + 1}</p>
              <p className="font-semibold">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
        <Notice>AI drafts are hypotheses, never evidence. Scores need recorded evidence and always show how much evidence stands behind them.</Notice>
      </Section>

      <Section title="Rwanda's innovation ecosystem" description="Link-only. These are official sources to explore; HDOS does not copy their directories or claim any call is open.">
        <QueryView query={ecosystem}>{(entries) => <EcosystemList entries={entries} />}</QueryView>
      </Section>
    </div>
  );
}
