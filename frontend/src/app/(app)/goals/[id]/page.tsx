// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExplainPanel } from "@/components/ExplainPanel";
import { GuidancePanel } from "@/components/GuidancePanel";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { RoadmapPanel } from "@/components/RoadmapPanel";
import { ErrorState, FormError, ListSkeleton } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { catalogApi, getErrorMessage, goalsApi } from "@/lib/api";
import { CATEGORY_LABELS, formatDate } from "@/lib/format";
import type { GoalCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "pathways", label: "Best-fit pathways" },
  { id: "roadmap", label: "Roadmap" },
  { id: "explain", label: "Explain" },
  { id: "guidance", label: "Career guidance & skills" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function EditGoalForm({ goal, onDone }: { goal: Awaited<ReturnType<typeof goalsApi.get>>; onDone: () => void }) {
  const queryClient = useQueryClient();
  const occupations = useQuery({
    queryKey: ["occupations-all"],
    queryFn: () => catalogApi.occupations({ pageSize: 50 }),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const [title, setTitle] = useState(goal.title);
  const [category, setCategory] = useState<GoalCategory>(goal.category);
  const [description, setDescription] = useState(goal.description ?? "");
  const [targetDate, setTargetDate] = useState(goal.targetDate ? goal.targetDate.slice(0, 10) : "");
  const [occupationId, setOccupationId] = useState(goal.targetOccupation?.id ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(goal.title);
    setCategory(goal.category);
    setDescription(goal.description ?? "");
    setTargetDate(goal.targetDate ? goal.targetDate.slice(0, 10) : "");
    setOccupationId(goal.targetOccupation?.id ?? "");
  }, [goal]);

  const update = useMutation({
    mutationFn: () =>
      goalsApi.update(goal.id, {
        title: title.trim(),
        category,
        description: description.trim() || null,
        targetDate: targetDate ? new Date(`${targetDate}T00:00:00Z`).toISOString() : null,
        targetOccupationId: occupationId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal", goal.id] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations", goal.id] });
      queryClient.invalidateQueries({ queryKey: ["roadmap", goal.id] });
      onDone();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Edit goal</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
      </div>
      <FormError message={error} />
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          update.mutate();
        }}
      >
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edit-goal-title">Title</Label>
          <Input id="edit-goal-title" required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-goal-category">Category</Label>
          <Select id="edit-goal-category" value={category} onChange={(e) => setCategory(e.target.value as GoalCategory)}>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-goal-date">Target date</Label>
          <Input id="edit-goal-date" type="date" min={tomorrow} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edit-goal-occupation">Target occupation</Label>
          <Select id="edit-goal-occupation" value={occupationId} onChange={(e) => setOccupationId(e.target.value)}>
            <option value="">Let HDOS find the best fit</option>
            {occupations.data?.data.map((o) => (
              <option key={o.id} value={o.id}>{o.title} · {o.sector.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edit-goal-description">Notes</Label>
          <Textarea id="edit-goal-description" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={update.isPending || title.trim().length < 3}>Save changes</Button>
          <Button type="button" variant="outline" onClick={onDone}>Close</Button>
        </div>
      </form>
    </div>
  );
}

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabId>("pathways");
  const [editing, setEditing] = useState(false);
  const goal = useQuery({ queryKey: ["goal", id], queryFn: () => goalsApi.get(id) });

  if (goal.isLoading) return <ListSkeleton rows={2} />;
  if (goal.isError || !goal.data) return <ErrorState error={goal.error} onRetry={() => goal.refetch()} />;
  const g = goal.data;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/goals" className="text-sm text-primary hover:underline">← All goals</Link>
        {!editing ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-3xl font-bold">{g.title}</h1>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit goal</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{CATEGORY_LABELS[g.category]}</Badge>
              <Badge variant="outline">{g.status.toLowerCase()}</Badge>
              {g.targetOccupation && <span>Target: {g.targetOccupation.title}</span>}
              {g.targetDate && <span>By {formatDate(g.targetDate)}</span>}
            </div>
            {g.description && <p className="text-sm">{g.description}</p>}
            {g.progress !== null && <Progress value={g.progress} label="Goal progress" className="max-w-xs" />}
          </>
        ) : (
          <EditGoalForm goal={g} onDone={() => setEditing(false)} />
        )}
      </div>

      {!editing && (
        <>
          <div role="tablist" aria-label="Goal sections" className="flex gap-1 border-b">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-medium", tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "pathways" && <RecommendationsPanel goalId={g.id} targetOccupationId={g.targetOccupation?.id ?? null} />}
            {tab === "roadmap" && <RoadmapPanel goalId={g.id} />}
            {tab === "explain" && <ExplainPanel goalId={g.id} />}
            {tab === "guidance" && <GuidancePanel goalId={g.id} />}
          </div>
        </>
      )}
    </div>
  );
}
