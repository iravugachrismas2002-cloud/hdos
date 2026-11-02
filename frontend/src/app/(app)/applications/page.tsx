// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, catalogApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, OPPORTUNITY_LABELS } from "@/lib/format";
import { useState } from "react";

const nextAction: Record<string, { label: string; to: string }> = {
  DISCOVERED: { label: "Mark eligible", to: "ELIGIBLE" }, ELIGIBLE: { label: "Prepare application", to: "PREPARING" },
  PREPARING: { label: "Ready for review", to: "READY_FOR_REVIEW" }, READY_FOR_REVIEW: { label: "Approve application", to: "APPROVED" },
  APPROVED: { label: "Record confirmed submission", to: "SUBMITTED" },
};

export default function ApplicationsPage() {
  const qc = useQueryClient();
  const apps = useQuery({ queryKey: ["applications"], queryFn: applicationsApi.list });
  const opportunities = useQuery({ queryKey: ["portal-opportunities"], queryFn: () => catalogApi.opportunities({ page: 1, pageSize: 8 }) });
  const documents = useQuery({ queryKey: ["portal-documents"], queryFn: applicationsApi.documents });
  const [uploadMessage, setUploadMessage] = useState("");
  const upload = async (file?: File) => { if (!file) return; try { await applicationsApi.uploadDocument(file, "SUPPORTING"); setUploadMessage("Uploaded and scanned successfully. Confirm extracted text after reviewing it."); await qc.invalidateQueries({ queryKey: ["portal-documents"] }); } catch (e) { setUploadMessage(e instanceof Error ? e.message : "Upload failed. Check scanner configuration."); } };
  const act = async (id: string, status: string) => { await applicationsApi.status(id, status); await qc.invalidateQueries({ queryKey: ["applications"] }); };
  const start = async (id: string) => { await applicationsApi.create(id); await qc.invalidateQueries({ queryKey: ["applications"] }); };
  return <div className="space-y-6">
    <header><p className="text-sm font-medium text-primary">HDOS Application Portal</p><h1 className="text-3xl font-bold">Application centre</h1><p className="text-muted-foreground">Discover opportunities, keep track of your applications, and confirm each submission yourself.</p></header>
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Application summary">
      {["PREPARING", "READY_FOR_REVIEW", "SUBMITTED"].map((s) => <Card key={s}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.replaceAll("_", " ")}</p><p className="text-2xl font-bold">{apps.data?.filter((a) => a.status === s).length ?? 0}</p></CardContent></Card>)}
    </section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">My applications</h2>{apps.data?.length ? apps.data.map((a) => <Card key={a.id}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><h3 className="font-semibold">{a.opportunity.title}</h3><p className="text-sm text-muted-foreground">{a.opportunity.provider} · Updated {formatDate(a.updatedAt)}</p><Badge variant="secondary" className="mt-2">{a.status.replaceAll("_", " ")}</Badge></div>{nextAction[a.status] && <Button onClick={() => act(a.id, nextAction[a.status].to)}>{nextAction[a.status].label}</Button>}</CardContent></Card>) : <p className="text-sm text-muted-foreground">No applications yet. Start with an opportunity below.</p>}</section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Secure document vault</h2><p className="text-sm text-muted-foreground">PDF or plain text, encrypted at rest. Malware scanner must be configured. Extracted text requires your confirmation.</p><input aria-label="Upload document" type="file" accept="application/pdf,text/plain" onChange={(e) => void upload(e.target.files?.[0])} />{uploadMessage && <p role="status" className="text-sm">{uploadMessage}</p>}{documents.data?.map((doc) => <Card key={doc.id}><CardContent className="flex flex-wrap items-center justify-between gap-2 p-3"><span>{doc.fileName} · {Math.ceil(doc.sizeBytes / 1024)} KB · {doc.extractionConfirmedAt ? "Verified" : "Needs review"}</span><div className="flex gap-2">{!doc.extractionConfirmedAt && <Button size="sm" variant="outline" onClick={async () => { await applicationsApi.confirmExtraction(doc.id); await qc.invalidateQueries({ queryKey: ["portal-documents"] }); }}>Confirm review</Button>}<Button size="sm" variant="outline" onClick={async () => { await applicationsApi.deleteDocument(doc.id); await qc.invalidateQueries({ queryKey: ["portal-documents"] }); }}>Delete</Button></div></CardContent></Card>)}</section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Explore opportunities</h2><p className="text-sm text-muted-foreground">Confirm eligibility and required documents with the provider. Requirements are not automatically verified in this initial portal.</p>{opportunities.data?.data.map((o) => { const already = apps.data?.some((a) => a.opportunity.id === o.id); return <Card key={o.id}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><h3 className="font-semibold">{o.title}</h3><p className="text-sm text-muted-foreground">{o.provider} · {OPPORTUNITY_LABELS[o.type]}{o.deadline ? ` · Deadline ${formatDate(o.deadline)}` : ""}</p></div><Button variant="outline" disabled={already} onClick={() => start(o.id)}>{already ? "In your applications" : "Track application"}</Button></CardContent></Card>})}</section>
  </div>;
}
