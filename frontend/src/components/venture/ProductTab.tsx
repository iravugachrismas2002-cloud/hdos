// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FormError } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage, ventureApi } from "@/lib/api";
import type { FeaturePriority } from "@/lib/venture-types";
import { useVenture } from "./access";
import { useRefreshVenture, ventureKey } from "./hooks";
import { PRIORITIES, PRIORITY_LABELS, toLines } from "./format";
import { Field, QueryView, ReadOnlyNote, Section } from "./shared";
import { SpecViewer } from "./SpecViewer";

export function ProductTab() {
  const { id, project, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const specs = useQuery({ queryKey: ventureKey(id, "mvp"), queryFn: () => ventureApi.specs(id) });
  const features = useQuery({ queryKey: ventureKey(id, "features"), queryFn: () => ventureApi.features.list(id) });
  const milestones = useQuery({ queryKey: ventureKey(id, "milestones"), queryFn: () => ventureApi.milestones.list(id) });
  const [selectedSpec, setSelectedSpec] = useState("");
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");
  const [featurePriority, setFeaturePriority] = useState<FeaturePriority>("SHOULD");
  const [featureStory, setFeatureStory] = useState("");
  const [featureCriteria, setFeatureCriteria] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [error, setError] = useState("");

  const generate = useMutation({
    mutationFn: () => ventureApi.generateMvp(id),
    onSuccess: (spec) => { setSelectedSpec(spec.id); refresh("mvp"); },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const addFeature = useMutation({
    mutationFn: () => ventureApi.features.create(id, {
      title: featureTitle.trim(),
      description: featureDescription.trim() || null,
      priority: featurePriority,
      userStory: featureStory.trim() || null,
      acceptanceCriteria: toLines(featureCriteria),
    }),
    onSuccess: () => { setFeatureTitle(""); setFeatureDescription(""); setFeatureStory(""); setFeatureCriteria(""); refresh("features"); },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const addMilestone = useMutation({
    mutationFn: () => ventureApi.milestones.create(id, { title: milestoneTitle.trim(), dueDate: milestoneDate || null }),
    onSuccess: () => { setMilestoneTitle(""); setMilestoneDate(""); refresh("milestones"); },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const spec = specs.data?.find((row) => row.id === selectedSpec) ?? specs.data?.[0];

  return (
    <div className="space-y-6">
      <Section title="Product Studio" description="Draft a reviewable product specification from the information recorded so far. Generated content is a hypothesis, not validation.">
        <FormError message={error} />
        {!can("edit") && <ReadOnlyNote>Only editors and above can generate or revise the specification.</ReadOnlyNote>}
        {can("edit") && (
          <Button type="button" disabled={generate.isPending} onClick={() => { setError(""); generate.mutate(); }}>
            {generate.isPending ? "Preparing draft…" : specs.data?.length ? "Generate a new specification version" : "Generate product specification"}
          </Button>
        )}
        <QueryView query={specs}>
          {(rows) => rows.length === 0 ? <p className="text-sm text-muted-foreground">No specification yet. Record discovery and validation inputs before generating one.</p> : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Specification versions">
                {rows.map((row) => <Button key={row.id} type="button" size="sm" variant={(spec?.id ?? "") === row.id ? "default" : "outline"} onClick={() => setSelectedSpec(row.id)}>Version {row.version} · {row.status}</Button>)}
              </div>
              {spec && <SpecViewer spec={spec} venturName={project.name} onSelect={setSelectedSpec} />}
            </div>
          )}
        </QueryView>
      </Section>

      <Section title="Feature backlog" description="Keep product work tied to a user need and acceptance criteria.">
        {!can("edit") && <ReadOnlyNote>Only editors and above can add backlog features.</ReadOnlyNote>}
        {can("edit") && (
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setError(""); addFeature.mutate(); }}>
            <Field htmlFor="product-feature-title" label="Feature title"><Input id="product-feature-title" required maxLength={160} value={featureTitle} onChange={(e) => setFeatureTitle(e.target.value)} /></Field>
            <Field htmlFor="product-feature-priority" label="Priority">
              <Select id="product-feature-priority" value={featurePriority} onChange={(e) => setFeaturePriority(e.target.value as FeaturePriority)}>
                {PRIORITIES.map((value) => <option key={value} value={value}>{PRIORITY_LABELS[value]}</option>)}
              </Select>
            </Field>
            <Field htmlFor="product-feature-description" label="Description"><Textarea id="product-feature-description" maxLength={1000} value={featureDescription} onChange={(e) => setFeatureDescription(e.target.value)} /></Field>
            <Field htmlFor="product-feature-story" label="User story"><Textarea id="product-feature-story" maxLength={500} value={featureStory} onChange={(e) => setFeatureStory(e.target.value)} /></Field>
            <Field htmlFor="product-feature-criteria" label="Acceptance criteria" hint="One criterion per line."><Textarea id="product-feature-criteria" value={featureCriteria} onChange={(e) => setFeatureCriteria(e.target.value)} /></Field>
            <div className="flex items-end"><Button type="submit" disabled={addFeature.isPending || featureTitle.trim().length < 2}>{addFeature.isPending ? "Adding…" : "Add feature"}</Button></div>
          </form>
        )}
        <QueryView query={features}>
          {(rows) => rows.length === 0 ? <p className="text-sm text-muted-foreground">No features in the backlog.</p> : (
            <ul className="space-y-2">
              {rows.map((feature) => (
                <li key={feature.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{feature.title}</h3><Badge variant="outline">{PRIORITY_LABELS[feature.priority]}</Badge><Badge variant="secondary">{feature.status.replace(/_/g, " ")}</Badge></div>
                  {feature.description && <p className="text-sm text-muted-foreground">{feature.description}</p>}
                  {feature.userStory && <p className="text-sm">{feature.userStory}</p>}
                  {feature.acceptanceCriteria.length > 0 && <ul className="list-disc pl-5 text-xs">{feature.acceptanceCriteria.map((criterion, i) => <li key={`${feature.id}-${i}`}>{criterion}</li>)}</ul>}
                </li>
              ))}
            </ul>
          )}
        </QueryView>
      </Section>

      <Section title="Milestones" description="Track work toward the next product or venture stage.">
        {!can("contribute") && <ReadOnlyNote>Contributors and above can add milestones.</ReadOnlyNote>}
        {can("contribute") && (
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); setError(""); addMilestone.mutate(); }}>
            <Field htmlFor="product-milestone-title" label="Milestone"><Input id="product-milestone-title" required maxLength={160} value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} /></Field>
            <Field htmlFor="product-milestone-date" label="Target date (optional)"><Input id="product-milestone-date" type="date" value={milestoneDate} onChange={(e) => setMilestoneDate(e.target.value)} /></Field>
            <div className="flex items-end"><Button type="submit" disabled={addMilestone.isPending || !milestoneTitle.trim()}>{addMilestone.isPending ? "Adding…" : "Add milestone"}</Button></div>
          </form>
        )}
        <QueryView query={milestones}>
          {(rows) => rows.length === 0 ? <p className="text-sm text-muted-foreground">No milestones recorded.</p> : (
            <ul className="space-y-2">
              {rows.map((milestone) => <li key={milestone.id} className="flex flex-wrap justify-between gap-2 rounded-md border p-3 text-sm"><span>{milestone.title}</span><span className="text-muted-foreground">{milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : "No target date"} · {milestone.status.replace(/_/g, " ")}</span></li>)}
            </ul>
          )}
        </QueryView>
      </Section>
    </div>
  );
}
