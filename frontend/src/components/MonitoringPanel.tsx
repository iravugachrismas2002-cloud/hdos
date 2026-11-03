// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { Fragment } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Loader2 } from "lucide-react";
import { ErrorState, FormError, FormSuccess, ListSkeleton } from "@/components/States";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, getErrorMessage } from "@/lib/api";
import { formatNumber, providerLabel } from "@/lib/format";
import type { MonitoringReport, ServiceState } from "@/lib/types";

const REFRESH_MS = 30_000;

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const formatMs = (ms: number | null) => (ms === null ? "–" : `${formatNumber(Math.round(ms))} ms`);
const stepLabel = (id: string) => (id === "fallback" ? "Built-in fallback" : providerLabel(id));

function StatusCard({ title, status, detail }: { title: string; status: ServiceState | null; detail: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {status ? <StatusBadge status={status} /> : <span className="text-xs text-muted-foreground">Not reported</span>}
        </div>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function Counter({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-bold">{formatNumber(value)}</dd>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ProviderTable({ ai }: { ai: MonitoringReport["ai"] }) {
  const stats = new Map(ai.byProvider.map((p) => [p.provider, p]));
  const order = [...ai.fallbackOrder.filter((id) => id !== "fallback"), "fallback"];
  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-medium">Failover order: </span>
        {order.map((id, i) => (
          <Fragment key={id}>
            {i > 0 && <span aria-hidden="true"> → </span>}
            {i > 0 && <span className="sr-only"> then </span>}
            <span className="font-medium">{stepLabel(id)}</span>
          </Fragment>
        ))}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">AI providers</caption>
          <thead>
            <tr className="text-left">
              <th className="p-2">Provider</th><th className="p-2">Model</th><th className="p-2">Configured</th><th className="p-2">State</th>
              <th className="p-2">Last latency</th><th className="p-2">Last error</th><th className="p-2">24h requests</th>
              <th className="p-2">24h failures</th><th className="p-2">24h avg latency</th>
            </tr>
          </thead>
          <tbody>
            {ai.providers.map((p) => {
              const s = stats.get(p.id);
              return (
                <tr key={p.id} className="border-t align-top">
                  <td className="p-2 font-medium">{p.label}</td>
                  <td className="p-2">{p.model}</td>
                  <td className="p-2">{p.configured ? "Yes" : "No"}</td>
                  <td className="space-y-1 p-2">
                    <StatusBadge status={p.state} />
                    {p.consecutiveFailures > 0 && <p className="text-xs text-muted-foreground">{p.consecutiveFailures} failure{p.consecutiveFailures > 1 ? "s" : ""} in a row</p>}
                  </td>
                  <td className="p-2 whitespace-nowrap">{formatMs(p.lastLatencyMs)}</td>
                  <td className="max-w-xs p-2 break-words text-xs">
                    {p.lastError ? (
                      <span title={p.lastFailureAt ? new Date(p.lastFailureAt).toLocaleString("en-GB") : undefined}>{p.lastError}</span>
                    ) : "–"}
                  </td>
                  <td className="p-2">{formatNumber(s?.requests24h ?? 0)}</td>
                  <td className="p-2">{formatNumber(s?.failures24h ?? 0)}</td>
                  <td className="p-2 whitespace-nowrap">{formatMs(s?.avgLatencyMs ?? null)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Report({ report }: { report: MonitoringReport }) {
  const { system, database, totals, ai } = report;
  const email = report.services.find((s) => /mail/i.test(s.name));
  const others = report.services.filter((s) => s !== email && !/^(api|database|db|ai)\b/i.test(s.name));
  const configured = ai.providers.filter((p) => p.configured).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard title="API" status={system.status} detail={`Up ${formatUptime(system.uptimeSeconds)} · ${system.environment} · Node ${system.nodeVersion} · ${formatNumber(system.memoryMb)} MB`} />
        <StatusCard title="Database" status={database.status} detail={database.latencyMs === null ? "Latency unavailable" : `Query latency ${formatMs(database.latencyMs)}`} />
        <StatusCard title="AI providers" status={ai.status} detail={`${configured} of ${ai.providers.length} configured · built-in fallback always available`} />
        <StatusCard title="Email" status={email?.status ?? null} detail={email?.detail ?? "The server did not report an email service."} />
      </div>
      {others.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((s) => (
            <li key={s.name}><StatusCard title={s.name} status={s.status} detail={s.detail} /></li>
          ))}
        </ul>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Counter label="Users" value={totals.users} />
        <Counter label="New users (7 days)" value={totals.usersLast7d} />
        <Counter label="Goals" value={totals.goals} />
        <Counter label="Roadmaps" value={totals.roadmaps} />
        <Counter label="Recommendations" value={totals.recommendations} hint={`${formatNumber(totals.recommendations24h)} in last 24h`} />
        <Counter label="Chat messages" value={totals.chatMessages} />
        <Counter label="AI requests (24h)" value={ai.requests24h} />
        <Counter label="AI requests (total)" value={ai.requestsTotal} />
        <Counter label="AI failures (24h)" value={ai.failures24h} />
        <Counter label="Fallback responses (24h)" value={ai.fallbackResponses24h} />
      </dl>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI providers</CardTitle>
          <CardDescription>Requests try each provider in order and fall back to the next one on failure.</CardDescription>
        </CardHeader>
        <CardContent><ProviderTable ai={ai} /></CardContent>
      </Card>
    </div>
  );
}

export function MonitoringPanel() {
  const queryClient = useQueryClient();
  const res = useQuery({
    queryKey: ["admin-monitoring"],
    queryFn: adminApi.monitoring,
    refetchInterval: REFRESH_MS,
    staleTime: 0,
  });
  const probe = useMutation({
    mutationFn: adminApi.probeAi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-monitoring"] }),
  });

  return (
    <section aria-labelledby="monitoring-title" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="monitoring-title" className="text-2xl font-semibold">System monitoring</h2>
            {res.data && (
              <span className="inline-flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" aria-hidden="true" /> Overall: <StatusBadge status={res.data.system.status} />
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground" aria-live="off">
            {res.data
              ? `Last updated ${new Date(res.data.generatedAt).toLocaleTimeString("en-GB")} · refreshes every ${REFRESH_MS / 1000} seconds`
              : `Refreshes every ${REFRESH_MS / 1000} seconds`}
            {res.isFetching && !res.isLoading && " · updating…"}
          </p>
        </div>
        <Button variant="outline" disabled={probe.isPending || !res.data} onClick={() => probe.mutate()}>
          {probe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {probe.isPending ? "Testing providers…" : "Test AI providers"}
        </Button>
      </div>
      {probe.isError && <FormError message={getErrorMessage(probe.error)} />}
      {probe.isSuccess && !probe.isPending && <FormSuccess message="Test finished. Provider status has been refreshed." />}
      {res.isLoading && <ListSkeleton rows={2} />}
      {res.isError && !res.data && <ErrorState error={res.error} onRetry={() => res.refetch()} />}
      {res.isError && res.data && <FormError message="Could not refresh monitoring data. Showing the last data received." />}
      {res.data && <Report report={res.data} />}
    </section>
  );
}
