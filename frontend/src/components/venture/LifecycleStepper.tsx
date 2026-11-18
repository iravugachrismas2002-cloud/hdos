// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { FormError, FormSuccess } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorCode, getErrorDetails, getErrorMessage, ventureApi } from "@/lib/api";
import type { VentureDetailFull, VentureStatus } from "@/lib/venture-types";
import { cn } from "@/lib/utils";
import { useVenture } from "./access";
import { MAIN_STAGES, SIDE_STATUSES, STATUS_LABELS } from "./format";
import { useRefreshVenture } from "./hooks";
import { Bullets, Field, Notice } from "./shared";
import { VentureStatusBadge } from "./StatusBadges";

export function LifecycleStepper({ detail }: { detail: VentureDetailFull }) {
  const currentIndex = MAIN_STAGES.indexOf(detail.status);
  const reachedIndex = MAIN_STAGES.indexOf(detail.lifecycle.reachedStage);
  const onSide = currentIndex === -1;
  return (
    <div className="space-y-3">
      <ol className="flex gap-1 overflow-x-auto pb-2" aria-label="Venture lifecycle">
        {MAIN_STAGES.map((stage, i) => {
          const current = i === currentIndex;
          const reached = i <= reachedIndex;
          return (
            <li
              key={stage}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                current ? "border-primary bg-primary text-primary-foreground" : reached ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground",
              )}
            >
              {reached && !current && <Check className="h-3 w-3" aria-hidden="true" />}
              {STATUS_LABELS[stage]}
              {current && <span className="sr-only"> (current stage)</span>}
              {!current && reached && <span className="sr-only"> (reached)</span>}
            </li>
          );
        })}
      </ol>
      {onSide && (
        <Notice tone="warning">
          This venture is <VentureStatusBadge status={detail.status} />. It can resume at a stage it has already reached (up to {STATUS_LABELS[detail.lifecycle.reachedStage]}).
        </Notice>
      )}
      {detail.lifecycle.nextStage && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p className="font-medium">Next stage: {STATUS_LABELS[detail.lifecycle.nextStage]}</p>
          {detail.lifecycle.nextStageRequirements.length > 0 ? (
            <>
              <p className="mt-1 text-xs text-muted-foreground">Still needed before you can move forward:</p>
              <Bullets items={detail.lifecycle.nextStageRequirements} className="mt-1" />
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">The requirements for this stage are met.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function ChangeStage({ detail }: { detail: VentureDetailFull }) {
  const { id, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const targets = [...MAIN_STAGES, ...(can("manage") ? SIDE_STATUSES : [])].filter((s) => s !== detail.status);
  const defaultTarget = detail.lifecycle.nextStage ?? targets[0];
  const [chosen, setChosen] = useState<VentureStatus>(defaultTarget);
  // After a change the old choice may be the new current status, so fall back to the suggested next stage.
  const target = targets.includes(chosen) ? chosen : defaultTarget;
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [unmet, setUnmet] = useState<string[]>([]);
  const [done, setDone] = useState("");

  const change = useMutation({
    mutationFn: () => ventureApi.changeStatus(id, { toStatus: target, reason: reason.trim() }),
    onSuccess: (r) => {
      setDone(`Status changed from ${STATUS_LABELS[r.from]} to ${STATUS_LABELS[r.to]}.`);
      setReason("");
      refresh("status-history");
    },
    onError: (e) => {
      setDone("");
      if (getErrorCode(e) === "VENTURE_GATE_NOT_MET") {
        setError("This stage has requirements that are not met yet.");
        setUnmet(getErrorDetails(e));
      } else {
        setError(getErrorMessage(e));
        setUnmet([]);
      }
    },
  });

  if (!can("edit")) return <p className="text-sm text-muted-foreground">Your role cannot change the venture stage.</p>;

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        setUnmet([]);
        setDone("");
        change.mutate();
      }}
    >
      <div className="space-y-2 sm:col-span-2">
        <FormError message={error} />
        {unmet.length > 0 && <Notice tone="warning"><p className="font-medium">Unmet requirements</p><Bullets items={unmet} className="mt-1" /></Notice>}
        <FormSuccess message={done} />
      </div>
      <Field htmlFor="stage-target" label="Move to">
        <Select id="stage-target" value={target} onChange={(e) => setChosen(e.target.value as VentureStatus)}>
          {targets.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </Select>
      </Field>
      <Field htmlFor="stage-reason" label="Reason (required)" className="sm:col-span-2" hint="Recorded in the venture's status history. Moving forward is one stage at a time; stepping back is always allowed.">
        <Textarea id="stage-reason" required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={change.isPending || reason.trim().length < 3}>{change.isPending ? "Changing…" : "Change stage"}</Button>
      </div>
    </form>
  );
}
