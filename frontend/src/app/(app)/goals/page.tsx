// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState, ErrorState, FormError, ListSkeleton } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { catalogApi, getErrorMessage, goalsApi } from "@/lib/api";
import { CATEGORY_LABELS, formatDate } from "@/lib/format";
import type { GoalCategory } from "@/lib/types";
import { useAppearance } from "@/contexts/AppearanceContext";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as GoalCategory[];

function NewGoalForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const occupations = useQuery({
    queryKey: ["occupations-all"],
    queryFn: () => catalogApi.occupations({ pageSize: 50 }),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<GoalCategory>("CAREER");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [occupationId, setOccupationId] = useState("");
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: () =>
      goalsApi.create({
        title: title.trim(),
        category,
        description: description.trim() || null,
        targetDate: targetDate ? new Date(`${targetDate}T00:00:00Z`).toISOString() : null,
        targetOccupationId: occupationId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      onDone();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New goal</CardTitle>
        <CardDescription>Be specific. You can pick a target occupation to focus the roadmap, or let HDOS find the best fit.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            create.mutate();
          }}
        >
          <div className="sm:col-span-2"><FormError message={error} /></div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="g-title">What do you want to achieve?</Label>
            <Input id="g-title" required minLength={3} maxLength={120} placeholder="e.g. Become a software developer" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-cat">Category</Label>
            <Select id="g-cat" value={category} onChange={(e) => setCategory(e.target.value as GoalCategory)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-date">Target date (optional)</Label>
            <Input id="g-date" type="date" min={tomorrow} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="g-occ">Target occupation (optional)</Label>
            <Select id="g-occ" value={occupationId} onChange={(e) => setOccupationId(e.target.value)}>
              <option value="">Let HDOS find the best fit</option>
              {occupations.data?.data.map((o) => <option key={o.id} value={o.id}>{o.title} · {o.sector.name}</option>)}
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="g-desc">Notes (optional)</Label>
            <Textarea id="g-desc" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={create.isPending || title.trim().length < 3}>{create.isPending ? "Creating…" : "Create goal"}</Button>
            <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function GoalsPage() {
  const { t } = useAppearance();
  const queryClient = useQueryClient();
  const goals = useQuery({ queryKey: ["goals"], queryFn: goalsApi.list });
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState("");

  const remove = useMutation({
    mutationFn: goalsApi.remove,
    onSuccess: () => {
      setConfirming(null);
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("Goals")}</h1>
          <p className="text-muted-foreground">{t("Each goal gets its own recommendations and roadmap.")}</p>
        </div>
        {!creating && <Button onClick={() => setCreating(true)}>{t("New goal")}</Button>}
      </div>

      {creating && <NewGoalForm onDone={() => setCreating(false)} />}
      <FormError message={error} />

      {goals.isLoading && <ListSkeleton />}
      {goals.isError && <ErrorState error={goals.error} onRetry={() => goals.refetch()} />}
      {goals.data?.length === 0 && !creating && (
        <EmptyState title={t("No goals yet")}>{t("Create a goal to see your best-fit pathways and a step-by-step roadmap.")}</EmptyState>
      )}

      <ul className="space-y-3">
        {goals.data?.map((g) => (
          <li key={g.id}>
            <Card>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex-1 space-y-1">
                  <Link href={`/goals/${g.id}`} className="text-lg font-semibold hover:underline">{g.title}</Link>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{CATEGORY_LABELS[g.category]}</Badge>
                    <Badge variant={g.status === "ACTIVE" ? "default" : "outline"}>{g.status.toLowerCase()}</Badge>
                    {g.targetOccupation && <span>Target: {g.targetOccupation.title}</span>}
                    {g.targetDate && <span>By {formatDate(g.targetDate)}</span>}
                  </div>
                  {g.progress !== null && <Progress value={g.progress} label={`Progress for ${g.title}`} className="max-w-xs" />}
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm"><Link href={`/goals/${g.id}`}>Open</Link></Button>
                  {confirming === g.id ? (
                    <>
                      <Button variant="destructive" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(g.id)}>Confirm delete</Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" aria-label={`Delete ${g.title}`} onClick={() => setConfirming(g.id)}>Delete</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
