// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { SourceBadge } from "@/components/SourceBadge";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { catalogApi } from "@/lib/api";
import { EDUCATION_LABELS, PATH_KIND_LABELS, PATH_TYPE_LABELS } from "@/lib/format";
import type { PathStep, PathSummary, PathType } from "@/lib/types";

function PathSteps({ slug }: { slug: string }) {
  const res = useQuery({ queryKey: ["path", slug], queryFn: () => catalogApi.path(slug) });
  if (res.isLoading) return <ListSkeleton rows={2} />;
  if (res.isError || !res.data) return <ErrorState error={res.error} onRetry={() => res.refetch()} />;
  if (res.data.steps.length === 0) return <EmptyState title="No steps have been published for this path yet" />;

  const phases = new Map<string, PathStep[]>();
  for (const s of [...res.data.steps].sort((a, b) => a.order - b.order)) phases.set(s.phase, [...(phases.get(s.phase) ?? []), s]);

  return (
    <div className="space-y-4">
      {[...phases.entries()].map(([phase, steps]) => (
        <section key={phase} aria-label={phase} className="space-y-2">
          <h4 className="font-semibold">{phase}</h4>
          <ol className="space-y-2 border-l-2 border-primary/30 pl-4">
            {steps.map((s) => (
              <li key={s.order} className="space-y-1 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{s.order}.</span>
                  <Badge variant="secondary">{PATH_KIND_LABELS[s.kind]}</Badge>
                  <h5 className="font-medium">{s.title}</h5>
                </div>
                <p className="text-sm text-muted-foreground">{s.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{s.monthOffset === 0 ? "Start" : `Around month ${s.monthOffset}`}</span>
                  {s.resource &&
                    (s.resource.url ? (
                      <a className="text-primary underline" href={s.resource.url} target="_blank" rel="noopener noreferrer">
                        {s.resource.label}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <span>Resource: {s.resource.label}</span>
                    ))}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function PathCard({ path }: { path: PathSummary }) {
  const [open, setOpen] = useState(false);
  const panelId = `path-steps-${path.id}`;
  return (
    <li>
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{path.title}</h3>
            <Badge variant={path.type === "CAREER_ROADMAP" ? "default" : "secondary"}>{PATH_TYPE_LABELS[path.type]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{path.summary}</p>
          <p className="text-sm">
            {[
              path.occupation ? `Occupation: ${path.occupation.title}` : null,
              path.sector ? `Sector: ${path.sector.name}` : null,
              path.startLevel ? `Start: ${EDUCATION_LABELS[path.startLevel]}` : null,
              path.durationMonths ? `${path.durationMonths} months` : null,
              `${path.stepCount} step${path.stepCount === 1 ? "" : "s"}`,
            ].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SourceBadge source={path.source} compact />
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {open ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
              {open ? "Hide steps" : "View steps"}
              <span className="sr-only"> for {path.title}</span>
            </button>
          </div>
          <div id={panelId} hidden={!open} className="pt-2">
            {open && <PathSteps slug={path.slug} />}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

export function PathsExplorer() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<PathType | "">("");
  const [page, setPage] = useState(1);
  const params = { q: q || undefined, type: type || undefined, page, pageSize: 10 };
  const res = useQuery({ queryKey: ["paths", params], queryFn: () => catalogApi.paths(params), placeholderData: keepPreviousData });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="pa-q">Search</Label>
          <Input id="pa-q" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pa-t">Type</Label>
          <Select id="pa-t" value={type} onChange={(e) => { setType(e.target.value as PathType | ""); setPage(1); }}>
            <option value="">All types</option>
            {(Object.keys(PATH_TYPE_LABELS) as PathType[]).map((t) => <option key={t} value={t}>{PATH_TYPE_LABELS[t]}</option>)}
          </Select>
        </div>
      </div>
      {res.isLoading && <ListSkeleton />}
      {res.isError && <ErrorState error={res.error} onRetry={() => res.refetch()} />}
      {res.data?.data.length === 0 && (
        <EmptyState title={q || type ? "No learning paths or roadmaps match these filters" : "No learning paths or roadmaps are available yet"}>
          {q || type ? "Try a different search or type." : "They will appear here once the reference data has been loaded."}
        </EmptyState>
      )}
      <ul className="space-y-3">
        {res.data?.data.map((p) => <PathCard key={p.id} path={p} />)}
      </ul>
      {res.data && <Pagination meta={res.data.meta} onPage={setPage} />}
    </div>
  );
}
