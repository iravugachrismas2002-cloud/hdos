// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState, ErrorState, FormError, ListSkeleton } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { getErrorCode, getErrorMessage, goalsApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Roadmap, RoadmapStep, StepStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<StepStatus, string> = { TODO: "To do", IN_PROGRESS: "In progress", DONE: "Done", SKIPPED: "Skipped" };
const KIND_LABELS: Record<RoadmapStep["kind"], string> = {
  EDUCATION: "Education", SKILL: "Skill", EXPERIENCE: "Experience", APPLY: "Apply", MILESTONE: "Milestone",
};

function StepItem({ step, onChange, disabled }: { step: RoadmapStep; onChange: (s: StepStatus) => void; disabled: boolean }) {
  return (
    <li className={cn("relative space-y-1 rounded-lg border p-4", step.status === "DONE" && "bg-green-50/60")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{KIND_LABELS[step.kind]}</Badge>
          <h4 className={cn("font-medium", step.status === "DONE" && "line-through opacity-70")}>{step.title}</h4>
        </div>
        <Select
          aria-label={`Status for ${step.title}`}
          className="h-9 w-36"
          value={step.status}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as StepStatus)}
        >
          {(Object.keys(STATUS_LABELS) as StepStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">{step.description}</p>
      <p className="text-xs text-muted-foreground">Around month {step.monthOffset}{step.ref ? ` · Linked: ${step.ref.label}` : ""}</p>
    </li>
  );
}

function RoadmapView({ roadmap, goalId }: { roadmap: Roadmap; goalId: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const setStatus = useMutation({
    mutationFn: ({ stepId, status }: { stepId: string; status: StepStatus }) => goalsApi.setStepStatus(goalId, stepId, status),
    onMutate: async ({ stepId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["roadmap", goalId] });
      const previous = queryClient.getQueryData<Roadmap | null>(["roadmap", goalId]);
      if (previous) {
        queryClient.setQueryData<Roadmap>(["roadmap", goalId], {
          ...previous,
          steps: previous.steps.map((s) => (s.id === stepId ? { ...s, status } : s)),
        });
      }
      return { previous };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["roadmap", goalId], ctx.previous);
      setError(getErrorMessage(e));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap", goalId] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goal", goalId] });
    },
  });

  const regenerate = useMutation({
    mutationFn: () => goalsApi.generateRoadmap(goalId),
    onSuccess: (r) => {
      queryClient.setQueryData(["roadmap", goalId], r);
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const phases = new Map<string, RoadmapStep[]>();
  for (const s of roadmap.steps) phases.set(s.phase, [...(phases.get(s.phase) ?? []), s]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-4">
          <p>{roadmap.summary}</p>
          <div className="flex items-center gap-3">
            <Progress value={roadmap.progress} label="Roadmap progress" className="max-w-xs" />
            <span className="text-sm font-medium">{roadmap.progress}% done</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" disabled={regenerate.isPending} onClick={() => regenerate.mutate()}>
              {regenerate.isPending ? "Regenerating…" : "Regenerate from my latest profile"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Generated {formatDate(roadmap.generatedAt)} · {roadmap.engineVersion}. Steps that stay the same keep their status.
            </span>
          </div>
        </CardContent>
      </Card>
      <FormError message={error} />
      {[...phases.entries()].map(([phase, steps]) => (
        <section key={phase} aria-label={phase} className="space-y-3">
          <h3 className="text-lg font-semibold">{phase}</h3>
          <ol className="space-y-3 border-l-2 border-primary/30 pl-4">
            {steps.map((s) => (
              <StepItem key={s.id} step={s} disabled={setStatus.isPending} onChange={(status) => setStatus.mutate({ stepId: s.id, status })} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function RoadmapPanel({ goalId }: { goalId: string }) {
  const queryClient = useQueryClient();
  const roadmap = useQuery({ queryKey: ["roadmap", goalId], queryFn: () => goalsApi.roadmap(goalId) });
  const [error, setError] = useState("");
  const [code, setCode] = useState<string | undefined>();

  const generate = useMutation({
    mutationFn: () => goalsApi.generateRoadmap(goalId),
    onSuccess: (r) => {
      queryClient.setQueryData(["roadmap", goalId], r);
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e) => {
      setCode(getErrorCode(e));
      setError(getErrorMessage(e));
    },
  });

  if (roadmap.isLoading) return <ListSkeleton />;
  if (roadmap.isError) return <ErrorState error={roadmap.error} onRetry={() => roadmap.refetch()} />;
  if (roadmap.data) return <RoadmapView roadmap={roadmap.data} goalId={goalId} />;

  return (
    <div className="space-y-3">
      <EmptyState title="No roadmap yet">
        We will turn your skill gaps, education gap and matching opportunities into dated, trackable steps.
      </EmptyState>
      <FormError message={error} />
      {code === "NO_CATALOG_DATA" && <p className="text-sm text-muted-foreground">Reference data has not been loaded on this server yet.</p>}
      <div className="flex justify-center">
        <Button disabled={generate.isPending} onClick={() => generate.mutate()}>{generate.isPending ? "Building…" : "Generate my roadmap"}</Button>
      </div>
    </div>
  );
}
