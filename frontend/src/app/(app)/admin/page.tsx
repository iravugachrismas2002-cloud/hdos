// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MonitoringPanel } from "@/components/MonitoringPanel";
import { Pagination } from "@/components/Pagination";
import { EmptyState, ErrorState, FormError, ListSkeleton } from "@/components/States";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi, getErrorMessage } from "@/lib/api";
import { ROLE_LABELS, formatDate } from "@/lib/format";
import type { Cell as CellDto, Role } from "@/lib/types";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

function CellChart({ title, cells, min }: { title: string; cells: CellDto[]; min: number }) {
  const data = cells.map((c) => ({ name: c.key.replace(/_/g, " "), count: c.count ?? 0, suppressed: c.suppressed }));
  const hidden = cells.filter((c) => c.suppressed).length;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {data.length === 0 ? (
          <EmptyState title="No data yet" />
        ) : (
          <>
            <div className="h-56" role="img" aria-label={`${title}: ${cells.map((c) => `${c.key} ${c.suppressed ? "suppressed" : c.count}`).join(", ")}`}>
              <ResponsiveContainer>
                <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {hidden > 0 && <p className="text-xs text-muted-foreground">{hidden} group{hidden > 1 ? "s" : ""} below {min} people are hidden (suppressed) to protect privacy.</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Overview() {
  const res = useQuery({ queryKey: ["analytics"], queryFn: adminApi.overview });
  if (res.isLoading) return <ListSkeleton rows={2} />;
  if (res.isError || !res.data) return <ErrorState error={res.error} onRetry={() => res.refetch()} />;
  const d = res.data;
  return (
    <div className="space-y-4">
      <p className="text-sm">
        <strong>{d.totalUsers}</strong> registered users. Groups with fewer than <strong>{d.minimumCohort}</strong> people are suppressed;
        where hiding one group would let it be recomputed, the next smallest is hidden too.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <CellChart title="Users by role" cells={d.usersByRole} min={d.minimumCohort} />
        <CellChart title="Goals by category" cells={d.goalsByCategory} min={d.minimumCohort} />
        <CellChart title="Goals by district" cells={d.goalsByDistrict} min={d.minimumCohort} />
        <CellChart title="Most targeted occupations" cells={d.topTargetOccupations} min={d.minimumCohort} />
      </div>
    </div>
  );
}

function Users() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const res = useQuery({ queryKey: ["admin-users", page], queryFn: () => adminApi.users(page), placeholderData: keepPreviousData });
  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => adminApi.setRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Changing a role ends that user&apos;s sessions and is recorded in the audit log.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <FormError message={error} />
        {res.isLoading && <ListSkeleton rows={2} />}
        {res.isError && <ErrorState error={res.error} onRetry={() => res.refetch()} />}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Registered users</caption>
            <thead><tr className="text-left"><th className="p-2">Email</th><th className="p-2">Verified</th><th className="p-2">Joined</th><th className="p-2">Role</th></tr></thead>
            <tbody>
              {res.data?.data.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.emailVerified ? "Yes" : "No"}</td>
                  <td className="p-2">{formatDate(u.createdAt)}</td>
                  <td className="p-2">
                    <Select
                      aria-label={`Role for ${u.email}`}
                      className="h-9 w-48"
                      value={u.role}
                      disabled={u.id === user?.id || setRole.isPending}
                      onChange={(e) => { setError(""); setRole.mutate({ id: u.id, role: e.target.value as Role }); }}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {res.data && <Pagination meta={res.data.meta} onPage={setPage} />}
      </CardContent>
    </Card>
  );
}

function AuditLog() {
  const [page, setPage] = useState(1);
  const res = useQuery({ queryKey: ["audit", page], queryFn: () => adminApi.audit(page), placeholderData: keepPreviousData });
  return (
    <Card>
      <CardHeader><CardTitle>Audit log</CardTitle><CardDescription>Security-relevant events, newest first.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {res.isLoading && <ListSkeleton rows={2} />}
        {res.isError && <ErrorState error={res.error} onRetry={() => res.refetch()} />}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Audit log</caption>
            <thead><tr className="text-left"><th className="p-2">When</th><th className="p-2">Action</th><th className="p-2">IP</th></tr></thead>
            <tbody>
              {res.data?.data.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2 whitespace-nowrap">{new Date(e.createdAt).toLocaleString("en-GB")}</td>
                  <td className="p-2">{e.action}</td>
                  <td className="p-2">{e.ip ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {res.data && <Pagination meta={res.data.meta} onPage={setPage} />}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  if (!user || (user.role !== "ADMINISTRATOR" && user.role !== "GOVERNMENT_ANALYST")) {
    return (
      <div role="alert" className="mx-auto max-w-md space-y-2 py-16 text-center">
        <h1 className="text-2xl font-bold">Access restricted</h1>
        <p className="text-muted-foreground">Analytics are available to government analysts and administrators only.</p>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Privacy-safe aggregates. No individual&apos;s data is shown here.</p>
      </div>
      {user.role === "ADMINISTRATOR" && <MonitoringPanel />}
      <Overview />
      {user.role === "ADMINISTRATOR" && (
        <>
          <Users />
          <AuditLog />
        </>
      )}
    </div>
  );
}
