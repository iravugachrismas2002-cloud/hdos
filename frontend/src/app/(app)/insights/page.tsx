// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RwandaAtAGlance } from "@/components/RwandaAtAGlance";
import { SourceBadge } from "@/components/SourceBadge";
import { ErrorState, ListSkeleton } from "@/components/States";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { insightsApi } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { useNationalIndicators } from "@/lib/hooks";
import { useAppearance } from "@/contexts/AppearanceContext";

const COLORS = ["#2563eb", "#f59e0b", "#16a34a"];

function Population() {
  const [province, setProvince] = useState("");
  const [showAll, setShowAll] = useState(false);
  const res = useQuery({ queryKey: ["district-insights"], queryFn: insightsApi.districts, staleTime: 24 * 60 * 60 * 1000 });

  if (res.isLoading) return <ListSkeleton rows={2} />;
  if (res.isError || !res.data) return <ErrorState error={res.error} onRetry={() => res.refetch()} />;

  const provinces = [...new Set(res.data.districts.map((d) => d.province))];
  const filtered = res.data.districts.filter((d) => !province || d.province === province);
  const rows = (showAll || province ? filtered : filtered.slice(0, 15)).map((d) => ({
    name: d.name, population: d.population, urbanShare: d.urbanShare,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>District population ({res.data.year})</CardTitle>
        <CardDescription>Resident population by district from the national census.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="prov" className="text-sm font-medium">Province</label>
            <Select id="prov" value={province} onChange={(e) => setProvince(e.target.value)} className="w-56">
              <option value="">All provinces</option>
              {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
          {!province && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show all 30 districts
            </label>
          )}
        </div>
        <div className="h-96 w-full" role="img" aria-label={`Bar chart of population for ${rows.length} districts, largest first. The same data is in the table below.`}>
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={70} fontSize={11} />
              <YAxis tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => formatNumber(Number(v))} />
              <Bar dataKey="population" name="Population" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-medium">View as table</summary>
          <div className="mt-2 max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">District population and urban share</caption>
              <thead><tr className="text-left"><th className="p-1">District</th><th className="p-1">Population</th><th className="p-1">Urban share</th></tr></thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.districtId} className="border-t">
                    <td className="p-1">{d.name}</td><td className="p-1">{formatNumber(d.population)}</td><td className="p-1">{d.urbanShare}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <SourceBadge source={res.data.source} />
      </CardContent>
    </Card>
  );
}

function Labour() {
  const { byCode, isLoading, isError, error, refetch } = useNationalIndicators();
  if (isLoading) return <ListSkeleton rows={2} />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const get = (code: string) => byCode.get(code);
  const structure = [
    { name: "Agriculture", code: "LFS_SHARE_AGRICULTURE_Q4_2024" },
    { name: "Industry", code: "LFS_SHARE_INDUSTRY_Q4_2024" },
    { name: "Services", code: "LFS_SHARE_SERVICES_Q4_2024" },
  ].flatMap((s) => (get(s.code) ? [{ name: s.name, value: get(s.code)?.value ?? 0 }] : []));

  const ratios = [
    { name: "Male", code: "LFS_EPR_MALE_Q4_2024" },
    { name: "Female", code: "LFS_EPR_FEMALE_Q4_2024" },
    { name: "Youth 16-30", code: "LFS_EPR_YOUTH_Q4_2024" },
    { name: "Adults 31+", code: "LFS_EPR_ADULT_Q4_2024" },
  ].flatMap((r) => (get(r.code) ? [{ name: r.name, ratio: get(r.code)?.value ?? 0 }] : []));

  const source = get("LFS_SHARE_AGRICULTURE_Q4_2024")?.source ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Where Rwandans work (Nov 2024)</CardTitle>
          <CardDescription>Share of employed population by broad sector.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-64" role="img" aria-label={structure.map((s) => `${s.name} ${s.value}%`).join(", ")}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={structure} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label={(e) => `${e.name} ${e.value}%`}>
                  {structure.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <SourceBadge source={source} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Employment-to-population ratio (Nov 2024)</CardTitle>
          <CardDescription>Share of each group that is in employment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-64" role="img" aria-label={ratios.map((r) => `${r.name} ${r.ratio}%`).join(", ")}>
            <ResponsiveContainer>
              <BarChart data={ratios}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
                <Bar dataKey="ratio" name="Employed share" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <SourceBadge source={get("LFS_EPR_MALE_Q4_2024")?.source ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function InsightsPage() {
  const { t } = useAppearance();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t("National insights")}</h1>
        <p className="text-muted-foreground">{t("Official statistics, cited. This is the evidence base behind HDOS's national-priority signals.")}</p>
      </div>
      <RwandaAtAGlance />
      <Labour />
      <Population />
    </div>
  );
}
