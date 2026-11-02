// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pagination } from "@/components/Pagination";
import { PathsExplorer } from "@/components/PathsExplorer";
import { SourceBadge } from "@/components/SourceBadge";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { catalogApi } from "@/lib/api";
import { applicationsApi, getErrorMessage } from "@/lib/api";
import { DEMAND_LABELS, EDUCATION_LABELS, EDUCATION_LEVELS, OPPORTUNITY_LABELS, formatDate, formatNumber } from "@/lib/format";
import { useDistricts, useSectors } from "@/lib/hooks";
import type { DemandLevel, InstitutionType, OpportunityType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = ["Occupations", "Programmes", "Opportunities", "Opportunity sources", "Learning paths & career roadmaps"] as const;
type Tab = (typeof TABS)[number];

function Filters({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Occupations() {
  const sectors = useSectors();
  const [q, setQ] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [demand, setDemand] = useState("");
  const [page, setPage] = useState(1);
  const params = { q: q || undefined, sectorId: sectorId || undefined, demand: demand || undefined, page, pageSize: 10 };
  const res = useQuery({ queryKey: ["occupations", params], queryFn: () => catalogApi.occupations(params), placeholderData: keepPreviousData });

  return (
    <div className="space-y-4">
      <Filters>
        <Field id="o-q" label="Search"><Input id="o-q" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></Field>
        <Field id="o-s" label="Sector">
          <Select id="o-s" value={sectorId} onChange={(e) => { setSectorId(e.target.value); setPage(1); }}>
            <option value="">All sectors</option>
            {sectors.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field id="o-d" label="Demand">
          <Select id="o-d" value={demand} onChange={(e) => { setDemand(e.target.value); setPage(1); }}>
            <option value="">Any</option>
            {(["VERY_HIGH", "HIGH", "MEDIUM", "LOW"] as DemandLevel[]).map((d) => <option key={d} value={d}>{DEMAND_LABELS[d]}</option>)}
          </Select>
        </Field>
      </Filters>
      {res.isLoading && <ListSkeleton />}
      {res.isError && <ErrorState error={res.error} onRetry={() => res.refetch()} />}
      {res.data?.data.length === 0 && <EmptyState title="No occupations match these filters" />}
      <ul className="space-y-3">
        {res.data?.data.map((o) => (
          <li key={o.id}>
            <Card>
              <CardContent className="space-y-1 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{o.title}</h3>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{o.sector.name}</Badge>
                    {o.sector.nst2Priority && <Badge variant="default">★ Priority sector</Badge>}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{o.description}</p>
                <p className="text-sm">
                  Entry level: {EDUCATION_LABELS[o.minEducation]} · Demand: {DEMAND_LABELS[o.demand]} ·{" "}
                  {o.salaryMinRwf !== null && o.salaryMaxRwf !== null
                    ? `Salary: ${formatNumber(o.salaryMinRwf)}–${formatNumber(o.salaryMaxRwf)} RWF/month`
                    : "No verified salary data"}
                </p>
                <SourceBadge source={o.demandSource} compact />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {res.data && <Pagination meta={res.data.meta} onPage={setPage} />}
    </div>
  );
}

function Programmes() {
  const districts = useDistricts();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const params = { q: q || undefined, level: level || undefined, districtId: districtId || undefined, institutionType: type || undefined, page, pageSize: 10 };
  const res = useQuery({ queryKey: ["programs", params], queryFn: () => catalogApi.programs(params), placeholderData: keepPreviousData });
  const reset = () => setPage(1);

  return (
    <div className="space-y-4">
      <Filters>
        <Field id="p-q" label="Search programme or institution"><Input id="p-q" value={q} onChange={(e) => { setQ(e.target.value); reset(); }} /></Field>
        <Field id="p-l" label="Level">
          <Select id="p-l" value={level} onChange={(e) => { setLevel(e.target.value); reset(); }}>
            <option value="">Any level</option>
            {EDUCATION_LEVELS.filter((l) => !["NONE", "PRIMARY", "LOWER_SECONDARY"].includes(l)).map((l) => <option key={l} value={l}>{EDUCATION_LABELS[l]}</option>)}
          </Select>
        </Field>
        <Field id="p-d" label="District">
          <Select id="p-d" value={districtId} onChange={(e) => { setDistrictId(e.target.value); reset(); }}>
            <option value="">Anywhere</option>
            {districts.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field id="p-t" label="Institution type">
          <Select id="p-t" value={type} onChange={(e) => { setType(e.target.value); reset(); }}>
            <option value="">Any</option>
            {(["UNIVERSITY", "POLYTECHNIC", "TVET", "ACADEMY", "OTHER"] as InstitutionType[]).map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
          </Select>
        </Field>
      </Filters>
      {res.isLoading && <ListSkeleton />}
      {res.isError && <ErrorState error={res.error} onRetry={() => res.refetch()} />}
      {res.data?.data.length === 0 && <EmptyState title="No programmes match these filters" />}
      <ul className="space-y-3">
        {res.data?.data.map((p) => (
          <li key={p.id}>
            <Card>
              <CardContent className="space-y-1 p-4">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {p.institution.name}{p.institution.district ? ` · ${p.institution.district}` : " · multiple campuses / not specified"} ·{" "}
                  {EDUCATION_LABELS[p.level]}{p.durationMonths ? ` · ${p.durationMonths} months` : ""}
                </p>
                {p.skills.length > 0 && <p className="text-sm">Skills: {p.skills.join(", ")}</p>}
                <div className="flex flex-wrap items-center gap-3">
                  <SourceBadge source={p.source} compact />
                  {p.institution.website && <a className="text-xs text-primary underline" href={p.institution.website} target="_blank" rel="noopener noreferrer">Website</a>}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {res.data && <Pagination meta={res.data.meta} onPage={setPage} />}
    </div>
  );
}

function Opportunities() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const params = { q: q || undefined, type: type || undefined, page, pageSize: 10 };
  const res = useQuery({ queryKey: ["opportunities", params], queryFn: () => catalogApi.opportunities(params), placeholderData: keepPreviousData });
  const [livePage, setLivePage] = useState(1);
  const liveParams = { q: q || undefined, page: livePage, pageSize: 10 };
  const live = useQuery({ queryKey: ["live-opportunities", liveParams], queryFn: () => catalogApi.liveOpportunities(liveParams), placeholderData: keepPreviousData });
  const [tracked, setTracked] = useState<Record<string, string>>({});
  const track = useMutation({
    mutationFn: applicationsApi.trackReliefWebJob,
    onSuccess: async (result, externalId) => {
      setTracked((current) => ({ ...current, [externalId]: result.applicationId }));
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  return (
    <div className="space-y-4">
      <Filters>
        <Field id="op-q" label="Search"><Input id="op-q" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); setLivePage(1); }} /></Field>
        <Field id="op-t" label="Type">
          <Select id="op-t" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">All types</option>
            {(Object.keys(OPPORTUNITY_LABELS) as OpportunityType[]).map((t) => <option key={t} value={t}>{OPPORTUNITY_LABELS[t]}</option>)}
          </Select>
        </Field>
      </Filters>
      <p role="note" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        Deadlines and eligibility change every cycle. Always confirm on the provider&apos;s official page before applying.
      </p>
      {(!type || type === "JOB") && <section className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-4" aria-labelledby="reliefweb-title">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><div className="flex items-center gap-2"><h2 id="reliefweb-title" className="text-lg font-semibold">Live humanitarian jobs in Rwanda</h2>{live.data?.status === "CONNECTED" && <Badge>Live feed</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">ReliefWeb results are fetched from its API and cached briefly. Apply on the original posting.</p></div>
          <a className="text-sm font-medium text-primary underline" href="https://reliefweb.int/jobs" target="_blank" rel="noopener noreferrer">Browse ReliefWeb <ExternalLink size={13} className="ml-1 inline" aria-hidden="true" /></a>
        </div>
        {live.isLoading && <ListSkeleton rows={2} />}
        {live.isError && <ErrorState error={live.error} onRetry={() => live.refetch()} />}
        {live.data?.status === "NOT_CONFIGURED" && <div className="rounded-xl border border-amber-300 bg-white p-3 text-sm text-amber-950"><p className="font-semibold">Live feed needs one approved setting</p><p className="mt-1">ReliefWeb requires a pre-approved API app name. Request one from ReliefWeb, then set <code>RELIEFWEB_APP_NAME</code> in Render. Until then, use the provider link above.</p><a className="mt-2 inline-block underline" href={live.data.sourceUrl} target="_blank" rel="noopener noreferrer">ReliefWeb API setup guide <ExternalLink size={12} className="ml-1 inline" aria-hidden="true" /></a></div>}
        {live.data?.status === "CONNECTED" && <>
          {live.data.fetchedAt && <p className="text-xs text-muted-foreground">Feed retrieved {new Date(live.data.fetchedAt).toLocaleString()}</p>}
          {live.data.items.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-muted-foreground">No matching Rwanda listings were returned. Try another search or check the source page.</p>}
          <ul className="space-y-2">{live.data.items.map((job) => <li key={job.externalId} className="rounded-xl border bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h3 className="font-semibold">{job.title}</h3><p className="mt-1 text-sm text-muted-foreground">{job.organization}{job.city ? ` · ${job.city}` : ""}{job.country ? ` · ${job.country}` : ""}</p>{job.description && <p className="mt-2 line-clamp-3 text-sm">{job.description}</p>}<p className="mt-2 text-xs text-muted-foreground">{job.closingAt ? `Closes ${formatDate(job.closingAt)}` : "No closing date shown by source"}{job.experience.length ? ` · ${job.experience.join(", ")} experience` : ""}</p><p className="mt-1 text-[11px] text-muted-foreground">Source: ReliefWeb · Confirm vacancy details on the original posting.</p></div><div className="flex shrink-0 flex-col gap-2"><a className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-primary underline" href={job.url} target="_blank" rel="noopener noreferrer">Open vacancy <ExternalLink size={13} aria-hidden="true" /></a><Button size="sm" variant={tracked[job.externalId] ? "secondary" : "outline"} disabled={track.isPending || Boolean(tracked[job.externalId])} onClick={() => track.mutate(job.externalId)}>{tracked[job.externalId] ? "Tracked in HDOS" : "Track in HDOS"}</Button></div></div>
          </li>)}</ul>
          {track.isError && <p role="alert" className="text-sm text-rose-700">{getErrorMessage(track.error, "Could not add this job to your application centre.")}</p>}
          {track.isSuccess && <p role="status" className="text-sm text-emerald-800">Added to your application centre. Review the provider posting for its current requirements before preparing an application.</p>}
          <Pagination meta={{ page: live.data.page, pageSize: live.data.pageSize, total: live.data.total }} onPage={setLivePage} />
        </>}
      </section>}
      {res.isLoading && <ListSkeleton />}
      {res.isError && <ErrorState error={res.error} onRetry={() => res.refetch()} />}
      {res.data?.data.length === 0 && <EmptyState title="No opportunities match these filters" />}
      <ul className="space-y-3">
        {res.data?.data.map((o) => (
          <li key={o.id}>
            <Card>
              <CardContent className="space-y-1 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{o.title}</h3>
                  <Badge variant="secondary">{OPPORTUNITY_LABELS[o.type]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{o.provider}{o.country ? ` · ${o.country}` : ""}</p>
                {o.description && <p className="text-sm">{o.description}</p>}
                {o.eligibility && <p className="text-sm text-muted-foreground">Eligibility: {o.eligibility}</p>}
                <p className="text-xs text-muted-foreground">
                  {o.deadline ? `Deadline ${formatDate(o.deadline)}` : o.isRolling ? "Rolling applications" : "Annual cycle: check dates"} ·{" "}
                  {o.lastVerifiedAt ? `Verified ${formatDate(o.lastVerifiedAt)}` : "Not yet verified"}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <SourceBadge source={o.source} compact />
                  {o.url && <a className="text-xs text-primary underline" href={o.url} target="_blank" rel="noopener noreferrer">Official page</a>}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {res.data && <Pagination meta={res.data.meta} onPage={setPage} />}
    </div>
  );
}

function OpportunitySources() {
  const [category, setCategory] = useState("");
  const res = useQuery({ queryKey: ["opportunity-sources"], queryFn: catalogApi.opportunitySources });
  const sources = (res.data ?? []).filter((source) => !category || source.category === category);
  const categories = [
    ["", "All sources"], ["JOBS", "Jobs & humanitarian"], ["SCHOLARSHIPS", "Scholarships"],
    ["LEARNING", "Learning & skills"], ["BUSINESS", "Business support"],
  ];
  return (
    <div className="space-y-4">
      <div className="max-w-3xl rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <h2 className="font-semibold">Opportunity boards and official services</h2>
        <p className="mt-1">Open a provider to browse its listings or services. HDOS can show live ReliefWeb jobs when its API approval is configured; other boards are external links. Confirm eligibility, deadlines and application instructions on the provider&apos;s page.</p>
      </div>
      <Field id="source-category" label="Filter by category">
        <Select id="source-category" value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </Select>
      </Field>
      {res.isLoading && <ListSkeleton />}
      {res.isError && <ErrorState error={res.error} onRetry={() => res.refetch()} />}
      {sources.length === 0 && !res.isLoading && !res.isError && <EmptyState title="No opportunity sources are available" />}
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sources.map((source) => (
          <li key={source.id}>
            <Card className="h-full">
              <CardContent className="flex h-full flex-col items-start gap-3 p-4">
                <div>
                  <Badge variant="secondary">{source.category === "JOBS" ? "Jobs & humanitarian" : source.category === "SCHOLARSHIPS" ? "Scholarships" : source.category === "LEARNING" ? "Learning & skills" : "Business support"}</Badge>
                  <h3 className="mt-2 font-semibold">{source.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{source.publisher}</p>
                </div>
                <p className="text-sm text-muted-foreground">{source.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {source.focus.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700">{tag}</span>)}
                </div>
                {source.url && <a className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-primary underline" href={source.url} target="_blank" rel="noopener noreferrer">Open provider site <ExternalLink size={14} aria-hidden="true" /></a>}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>("Occupations");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Explore</h1>
        <p className="text-muted-foreground">Browse the reference data HDOS uses. Records marked &ldquo;Illustrative data&rdquo; are editorial placeholders, not official statistics.</p>
      </div>
      <div role="tablist" aria-label="Catalogue" className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-medium", tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "Occupations" && <Occupations />}
        {tab === "Programmes" && <Programmes />}
        {tab === "Opportunities" && <Opportunities />}
        {tab === "Opportunity sources" && <OpportunitySources />}
        {tab === "Learning paths & career roadmaps" && <PathsExplorer />}
      </div>
    </div>
  );
}
