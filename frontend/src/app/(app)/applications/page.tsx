// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, catalogApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, OPPORTUNITY_LABELS } from "@/lib/format";
import { DocumentVault } from "@/components/DocumentVault";
import { DocumentReadiness } from "@/components/DocumentReadiness";
import { getErrorMessage } from "@/lib/api";
import { useState } from "react";
import { useAppearance } from "@/contexts/AppearanceContext";

const nextAction: Record<string, { label: string; to: string }> = {
  DISCOVERED: { label: "Check documents", to: "ELIGIBLE" }, ELIGIBLE: { label: "Prepare application", to: "PREPARING" },
  PREPARING: { label: "Ready for review", to: "READY_FOR_REVIEW" }, READY_FOR_REVIEW: { label: "Approve application", to: "APPROVED" },
  APPROVED: { label: "Record confirmed submission", to: "SUBMITTED" },
};

export default function ApplicationsPage() {
  const { t } = useAppearance();
  const qc = useQueryClient();
  const apps = useQuery({ queryKey: ["applications"], queryFn: applicationsApi.list });
  const opportunities = useQuery({ queryKey: ["portal-opportunities"], queryFn: () => catalogApi.opportunities({ page: 1, pageSize: 8 }) });
  const [actionError,setActionError]=useState("");
  const [aiBusy,setAiBusy]=useState("");
  const act = async (id: string, status: string) => { const confirmSubmission=status==="SUBMITTED";if(confirmSubmission&&!window.confirm("Did you submit this application on the provider’s official application channel? Choose OK only after completing that external submission."))return;try{await applicationsApi.status(id, status, undefined, confirmSubmission);setActionError("");await qc.invalidateQueries({ queryKey: ["applications"] });}catch(error){setActionError(getErrorMessage(error,"Could not update this application. Check its official document requirements."))} };
  const start = async (id: string) => { await applicationsApi.create(id); await qc.invalidateQueries({ queryKey: ["applications"] }); };
  const applyWithAi = async (opportunityId: string) => {
    setAiBusy(opportunityId); setActionError("");
    try {
      const created = await applicationsApi.create(opportunityId);
      const prepared = await applicationsApi.aiPrepare(created.id);
      await qc.invalidateQueries({ queryKey: ["applications"] });
      setActionError(prepared.missing.length ? `HDOS AI prepared your application and attached ${prepared.attached} document(s). Missing: ${prepared.missing.join(", ")}.` : "HDOS AI prepared your application and matched your documents. Review everything before submitting through the official provider channel.");
    } catch (error) {
      setActionError(getErrorMessage(error, "HDOS AI could not prepare this application. Check the opportunity requirements and your document vault."));
    } finally { setAiBusy(""); }
  };
  return <div className="space-y-7">
    <header><p className="text-xs font-bold tracking-wider text-blue-700">HDOS APPLICATION PORTAL</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{t("Application centre")}</h1><p className="mt-2 text-sm text-slate-600">{t("Track every opportunity, prepare documents, and confirm each submission yourself.")}</p></header>
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Application summary">{["PREPARING", "READY_FOR_REVIEW", "SUBMITTED"].map((s) => <Card key={s} className="rounded-2xl border-slate-200"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.replaceAll("_", " ")}</p><p className="mt-2 text-2xl font-bold">{apps.data?.filter((a) => a.status === s).length ?? 0}</p></CardContent></Card>)}</section>
    <section className="space-y-3"><h2 className="text-xl font-bold">My applications</h2>{actionError&&<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{actionError}</p>}{apps.isLoading&&<p className="text-sm text-slate-500">Loading applications…</p>}{apps.isError&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">Could not load applications. <button className="underline" onClick={()=>void apps.refetch()}>Retry</button></p>}{apps.data?.length ? apps.data.map((a) => <Card key={a.id} className="rounded-2xl border-slate-200"><CardContent className="space-y-3 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{a.opportunity.title}</h3><p className="mt-1 text-sm text-slate-500">{a.opportunity.provider} · Updated {formatDate(a.updatedAt)}{a.opportunity.deadline?` · Deadline ${formatDate(a.opportunity.deadline)}`:""}</p><Badge variant="secondary" className="mt-2">{a.status.replaceAll("_", " ")}</Badge>{a.receiptReference&&<p className="mt-2 text-xs text-emerald-800">Receipt: {a.receiptReference}</p>}</div>{nextAction[a.status] && <Button className="rounded-xl" onClick={() => act(a.id, nextAction[a.status].to)}>{nextAction[a.status].label}</Button>}</div><DocumentReadiness applicationId={a.id}/>{a.events?.length>0&&<ol aria-label="Application history" className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-3">{a.events.map(ev=><li key={ev.id} className="text-xs text-slate-500"><b className="text-slate-700">{ev.status.replaceAll("_"," ")}</b> · {formatDate(ev.createdAt)}</li>)}</ol>}</CardContent></Card>) : !apps.isLoading&&<p className="rounded-2xl border border-dashed p-5 text-sm text-slate-500">No applications yet. Track an opportunity below to get started.</p>}</section>
    <DocumentVault />
    <section className="space-y-3"><div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">HDOS AI application assistant</p><h2 className="mt-1 text-xl font-bold text-slate-900">Apply faster with your document vault</h2><p className="mt-1 text-sm text-slate-700">Press the button on an opportunity to create an application and match your confirmed documents to its checklist. HDOS AI prepares a draft; you must review it and submit on the provider’s official website.</p></div><div><h2 className="text-xl font-bold">Explore opportunities</h2><p className="mt-1 text-sm text-slate-500">Provider requirements and document checklists vary by opportunity. Check its official source before applying.</p></div>{opportunities.isLoading&&<p className="text-sm text-slate-500">Loading opportunities…</p>}{opportunities.isError&&<p role="alert" className="text-sm text-rose-700">Opportunity data could not be loaded.</p>}{opportunities.data?.data.map((o) => { const existing = apps.data?.find((a) => a.opportunity.id === o.id); return <Card key={o.id} className="rounded-2xl border-slate-200"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><h3 className="font-semibold">{o.title}</h3><p className="mt-1 text-sm text-slate-500">{o.provider} · {OPPORTUNITY_LABELS[o.type]}{o.deadline ? ` · Deadline ${formatDate(o.deadline)}` : ""}</p>{o.url&&<a href={o.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-blue-700 underline">Official opportunity source</a>}</div><Button className="rounded-xl" variant="outline" disabled={Boolean(existing)||Boolean(aiBusy)} onClick={() => void applyWithAi(o.id)}>{existing ? "In your applications" : aiBusy===o.id ? "Preparing with HDOS AI…" : "Apply with HDOS AI"}</Button></CardContent></Card>})}</section>
  </div>;
}
