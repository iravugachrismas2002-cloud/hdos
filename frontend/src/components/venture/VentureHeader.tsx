// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, MessageSquare, Settings2, SlidersHorizontal } from "lucide-react";
import { FormError } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getErrorMessage, ventureApi } from "@/lib/api";
import { isRestricted, type VentureDetail } from "@/lib/venture-types";
import { useVenture } from "./access";
import { downloadBlob, sectionLabel, slugify } from "./format";
import { ChangeStage, LifecycleStepper } from "./LifecycleStepper";
import { SettingsPanel } from "./SettingsPanel";
import { Section } from "./shared";
import { RoleBadge, VentureStatusBadge } from "./StatusBadges";

export function VentureHeader({ detail }: { detail: VentureDetail }) {
  const { id, can } = useVenture();
  const [panel, setPanel] = useState<"stage" | "settings" | null>(null);
  const [error, setError] = useState("");
  const restricted = isRestricted(detail);
  const advisor = detail.myRole === "ADVISOR";

  const exportAll = useMutation({
    mutationFn: async () => {
      const data = await ventureApi.export(id);
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `venture-${slugify(detail.name)}-export.json`);
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const toggle = (next: "stage" | "settings") => setPanel((current) => (current === next ? null : next));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Link href="/venture-builder" className="text-sm text-primary hover:underline">← All ventures</Link>
        <h1 className="break-words text-3xl font-bold">{detail.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <VentureStatusBadge status={detail.status} />
          {!restricted && <Badge variant="outline">Stage: {detail.stage.label}</Badge>}
          <RoleBadge role={detail.myRole} />
          {detail.sector && <Badge variant="secondary">{detail.sector.name}</Badge>}
          {detail.district && <span className="text-xs text-muted-foreground">{detail.district.name}</span>}
          <Badge variant={detail.aiProcessingConsent ? "warning" : "secondary"} title={detail.aiProcessingConsent ? "Venture text may be sent to an external AI provider" : "Nothing from this venture is sent to an AI provider"}>
            AI assistance {detail.aiProcessingConsent ? "on" : "off"}
          </Badge>
        </div>
        {detail.ideaSummary && <p className="max-w-3xl whitespace-pre-wrap break-words text-sm">{detail.ideaSummary}</p>}
        {detail.problemStatement && <p className="max-w-3xl whitespace-pre-wrap break-words text-sm text-muted-foreground"><span className="font-medium text-foreground">Problem: </span>{detail.problemStatement}</p>}
      </div>

      {restricted && (
        <div role="note" className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
          You are an advisor on this venture. You can read the sections the owner shared with you:{" "}
          <strong>{detail.sharedSections.length ? detail.sharedSections.map(sectionLabel).join(", ") : "none beyond the overview"}</strong>.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!advisor && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/assistant?ventureId=${encodeURIComponent(id)}`}><MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />Ask HDOS AI about this venture</Link>
          </Button>
        )}
        {!restricted && can("edit") && (
          <Button size="sm" variant="outline" aria-expanded={panel === "stage"} onClick={() => toggle("stage")}>
            <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />Change stage
          </Button>
        )}
        {!advisor && (
          <Button size="sm" variant="outline" aria-expanded={panel === "settings"} onClick={() => toggle("settings")}>
            <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />Settings
          </Button>
        )}
        {can("own") && (
          <Button size="sm" variant="outline" disabled={exportAll.isPending} onClick={() => { setError(""); exportAll.mutate(); }}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />{exportAll.isPending ? "Preparing…" : "Export workspace (JSON)"}
          </Button>
        )}
      </div>
      <FormError message={error} />

      {!restricted && <LifecycleStepper detail={detail} />}
      {!restricted && panel === "stage" && <Section title="Change stage" description="Stage changes are recorded with your reason. Pausing, stopping or archiving needs the owner or an admin."><ChangeStage detail={detail} /></Section>}
      {panel === "settings" && <Section title="Venture settings"><SettingsPanel project={detail} /></Section>}
    </div>
  );
}
