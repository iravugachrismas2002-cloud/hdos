// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useMutation } from "@tanstack/react-query";
import { ProviderBadge } from "@/components/ProviderBadge";
import { FormError } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getErrorCode, getErrorMessage, goalsApi } from "@/lib/api";
import { SKILL_LEVELS } from "@/lib/format";
import type { SkillRecommendation } from "@/lib/types";

const levelName = (level: number) => (level >= 1 && level <= SKILL_LEVELS.length ? SKILL_LEVELS[level - 1] : "None");

function SkillGapItem({ item }: { item: SkillRecommendation }) {
  const pct = item.requiredLevel > 0 ? (item.currentLevel / item.requiredLevel) * 100 : 100;
  return (
    <li className="space-y-1 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{item.skill}</span>
        <span className="text-sm text-muted-foreground">
          Level {item.currentLevel} ({levelName(item.currentLevel)}) → {item.requiredLevel} ({levelName(item.requiredLevel)})
        </span>
      </div>
      <Progress value={pct} label={`${item.skill}: level ${item.currentLevel} of ${item.requiredLevel} required`} />
      <p className="text-xs text-muted-foreground">{item.gap > 0 ? `${item.gap} level${item.gap > 1 ? "s" : ""} to go` : "Requirement met"}</p>
    </li>
  );
}

export function GuidancePanel({ goalId }: { goalId: string }) {
  const guidance = useMutation({ mutationFn: () => goalsApi.guidance(goalId) });
  const rateLimited = guidance.isError && getErrorCode(guidance.error) === "RATE_LIMITED";
  const g = guidance.data;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Get personalised career guidance and see which skills to build for this goal. The guidance is advice only: your scores and rankings are not affected.
      </p>
      <Button disabled={guidance.isPending} onClick={() => guidance.mutate()}>
        {guidance.isPending ? "Preparing guidance…" : g ? "Refresh guidance" : "Get career guidance"}
      </Button>
      {guidance.isError && (
        <FormError message={rateLimited ? `${getErrorMessage(guidance.error)} Please wait a moment before trying again.` : getErrorMessage(guidance.error)} />
      )}
      {g && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">Career guidance &amp; skills</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={g.generatedBy === "ai" ? "default" : "secondary"}>{g.generatedBy === "ai" ? "AI-generated" : "Template guidance"}</Badge>
                <ProviderBadge provider={g.provider} model={g.model} />
              </div>
            </div>
            <CardDescription>Based on your profile and this goal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="whitespace-pre-wrap" aria-live="polite">{g.guidance}</p>
            <section aria-labelledby="skill-gaps" className="space-y-2">
              <h4 id="skill-gaps" className="font-semibold">Skills to build</h4>
              {g.skillRecommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No skill gaps were found for this goal. Add more skills to your profile for sharper advice.</p>
              ) : (
                <ul className="space-y-2">
                  {g.skillRecommendations.map((s) => <SkillGapItem key={s.skill} item={s} />)}
                </ul>
              )}
            </section>
            <p className="text-xs text-muted-foreground">{g.disclaimer}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
