// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RwandaAtAGlance } from "@/components/RwandaAtAGlance";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { goalsApi, profileApi } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/format";

export default function DashboardPage() {
  const { user } = useAuth();
  const profile = useQuery({ queryKey: ["profile"], queryFn: profileApi.get });
  const goals = useQuery({ queryKey: ["goals"], queryFn: goalsApi.list });
  const completeness = profile.data?.completeness ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome{user?.name ? `, ${user.name}` : ""}</h1>
        <p className="text-muted-foreground">Your pathway, grounded in Rwanda&apos;s public data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Life DNA profile</CardTitle>
          <CardDescription>The more complete it is, the sharper and more trustworthy your matches.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={completeness} label="Profile completeness" className="flex-1" />
            <span className="text-sm font-medium">{completeness}%</span>
          </div>
          {!user?.profileComplete && (
            <p className="text-sm">
              Add your education level and at least one skill to unlock meaningful recommendations.
            </p>
          )}
          <Button asChild variant={user?.profileComplete ? "outline" : "default"}>
            <Link href="/profile">{profile.data ? "Update profile" : "Complete my profile"}</Link>
          </Button>
        </CardContent>
      </Card>

      <section aria-labelledby="goals-h" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="goals-h" className="text-xl font-semibold">Your goals</h2>
          <Button asChild size="sm"><Link href="/goals">Manage goals</Link></Button>
        </div>
        {goals.isLoading && <ListSkeleton rows={2} />}
        {goals.isError && <ErrorState error={goals.error} onRetry={() => goals.refetch()} />}
        {goals.data?.length === 0 && (
          <EmptyState title="No goals yet">
            <Link href="/goals" className="text-primary underline">Create your first goal</Link> to get a roadmap.
          </EmptyState>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.data?.map((g) => (
            <Link key={g.id} href={`/goals/${g.id}`} className="rounded-lg border p-4 hover:bg-accent/50">
              <p className="font-medium">{g.title}</p>
              <p className="mb-2 text-xs text-muted-foreground">{CATEGORY_LABELS[g.category]}</p>
              {g.progress === null ? (
                <p className="text-xs text-muted-foreground">No roadmap yet</p>
              ) : (
                <Progress value={g.progress} label={`Progress for ${g.title}`} />
              )}
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="glance-h" className="space-y-3">
        <h2 id="glance-h" className="text-xl font-semibold">Rwanda at a glance</h2>
        <RwandaAtAGlance />
      </section>
    </div>
  );
}
