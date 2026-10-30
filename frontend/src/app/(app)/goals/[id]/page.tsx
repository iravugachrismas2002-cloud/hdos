// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExplainPanel } from "@/components/ExplainPanel";
import { GuidancePanel } from "@/components/GuidancePanel";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { RoadmapPanel } from "@/components/RoadmapPanel";
import { ErrorState, ListSkeleton } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { goalsApi } from "@/lib/api";
import { CATEGORY_LABELS, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "pathways", label: "Best-fit pathways" },
  { id: "roadmap", label: "Roadmap" },
  { id: "explain", label: "Explain" },
  { id: "guidance", label: "Career guidance & skills" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabId>("pathways");
  const goal = useQuery({ queryKey: ["goal", id], queryFn: () => goalsApi.get(id) });

  if (goal.isLoading) return <ListSkeleton rows={2} />;
  if (goal.isError || !goal.data) return <ErrorState error={goal.error} onRetry={() => goal.refetch()} />;
  const g = goal.data;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/goals" className="text-sm text-primary hover:underline">← All goals</Link>
        <h1 className="text-3xl font-bold">{g.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{CATEGORY_LABELS[g.category]}</Badge>
          <Badge variant="outline">{g.status.toLowerCase()}</Badge>
          {g.targetOccupation && <span>Target: {g.targetOccupation.title}</span>}
          {g.targetDate && <span>By {formatDate(g.targetDate)}</span>}
        </div>
        {g.description && <p className="text-sm">{g.description}</p>}
        {g.progress !== null && <Progress value={g.progress} label="Goal progress" className="max-w-xs" />}
      </div>

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
    </div>
  );
}
