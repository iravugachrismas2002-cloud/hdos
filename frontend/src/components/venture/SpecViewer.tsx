// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { FormError } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage, ventureApi } from "@/lib/api";
import type { MvpContent, MvpSpec } from "@/lib/venture-types";
import { useVenture } from "./access";
import { downloadBlob, formatDateTime, fromLines, slugify, toLines } from "./format";
import { useRefreshVenture } from "./hooks";
import { Bullets, Field, Notice, Section, TableWrap, tableClass, tdClass, thClass } from "./shared";
import { PriorityBadge } from "./StatusBadges";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return <div className="space-y-1"><h4 className="text-sm font-semibold">{title}</h4>{children}</div>;
}

/** Every content key of an MVP specification, rendered readably. */
function SpecContent({ c }: { c: MvpContent }) {
  return (
    <div className="space-y-5">
      <Block title="Product vision"><p className="whitespace-pre-wrap break-words text-sm">{c.productVision}</p></Block>
      <Block title="Problem statement"><p className="whitespace-pre-wrap break-words text-sm">{c.problemStatement}</p></Block>
      <Block title="Personas">
        <ul className="grid gap-2 sm:grid-cols-2">
          {c.personas.map((p) => (
            <li key={p.name} className="space-y-1 rounded-md border p-3"><p className="text-sm font-medium">{p.name}</p><p className="text-xs">{p.description}</p><Bullets items={p.needs} className="text-xs" /></li>
          ))}
        </ul>
      </Block>
      <Block title="User journeys">
        {c.userJourneys.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : c.userJourneys.map((j, i) => (
          <div key={`${i}-${j.persona}`} className="space-y-1"><p className="text-sm font-medium">{j.persona}</p><ol className="list-decimal space-y-1 pl-5 text-sm">{j.steps.map((s, k) => <li key={k}>{s}</li>)}</ol></div>
        ))}
      </Block>
      <Block title="Product requirements"><Bullets items={c.productRequirements} empty="None." /></Block>
      <div className="grid gap-4 sm:grid-cols-2">
        <Block title="MVP scope: included"><Bullets items={c.mvpScope.included} empty="None." /></Block>
        <Block title="MVP scope: excluded"><Bullets items={c.mvpScope.excluded} empty="None." /></Block>
      </div>
      <Block title="Feature priorities (MoSCoW)">
        {c.featurePriorities.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
          <ul className="space-y-1">
            {c.featurePriorities.map((f, i) => (
              <li key={`${i}-${f.feature}`} className="flex flex-wrap items-center gap-2 text-sm"><PriorityBadge priority={f.priority} /><span>{f.feature}</span>{f.rationale && <span className="text-xs text-muted-foreground">— {f.rationale}</span>}</li>
            ))}
          </ul>
        )}
      </Block>
      <Block title="User stories"><Bullets items={c.userStories} empty="None." /></Block>
      <Block title="Acceptance criteria">
        {c.acceptanceCriteria.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : c.acceptanceCriteria.map((a, i) => (
          <div key={`${i}-${a.story}`} className="space-y-1"><p className="text-sm font-medium">{a.story}</p><Bullets items={a.criteria} className="text-xs" /></div>
        ))}
      </Block>
      <Block title="Functional requirements"><Bullets items={c.functionalRequirements} empty="None." /></Block>
      <Block title="Non-functional requirements"><Bullets items={c.nonFunctionalRequirements} empty="None." /></Block>
      <Block title="Technical architecture">
        <p className="whitespace-pre-wrap break-words text-sm">{c.technicalArchitecture.overview}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><p className="text-xs font-medium text-muted-foreground">Components</p><Bullets items={c.technicalArchitecture.components} empty="None." className="text-xs" /></div>
          <div><p className="text-xs font-medium text-muted-foreground">Technical risks</p><Bullets items={c.technicalArchitecture.risks} empty="None." className="text-xs" /></div>
        </div>
      </Block>
      <Block title="Database design">
        {c.databaseDesign.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
          <TableWrap label="Database design">
            <table className={tableClass}>
              <thead><tr><th className={thClass}>Entity</th><th className={thClass}>Purpose</th><th className={thClass}>Key fields</th></tr></thead>
              <tbody>{c.databaseDesign.map((d, i) => <tr key={`${i}-${d.entity}`}><td className={`${tdClass} font-medium`}>{d.entity}</td><td className={tdClass}>{d.purpose}</td><td className={`${tdClass} text-xs`}>{d.keyFields.join(", ")}</td></tr>)}</tbody>
            </table>
          </TableWrap>
        )}
      </Block>
      <Block title="API catalogue">
        {c.apiCatalogue.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
          <TableWrap label="API catalogue">
            <table className={tableClass}>
              <thead><tr><th className={thClass}>Method</th><th className={thClass}>Path</th><th className={thClass}>Purpose</th></tr></thead>
              <tbody>{c.apiCatalogue.map((a, i) => <tr key={`${i}-${a.path}`}><td className={tdClass}><Badge variant="outline">{a.method}</Badge></td><td className={`${tdClass} font-mono text-xs`}>{a.path}</td><td className={tdClass}>{a.purpose}</td></tr>)}</tbody>
            </table>
          </TableWrap>
        )}
      </Block>
      <Block title="Development roadmap">
        {c.developmentRoadmap.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
          <ol className="space-y-2">
            {c.developmentRoadmap.map((r, i) => (
              <li key={`${i}-${r.phase}`} className="rounded-md border p-3"><p className="text-sm font-medium">{r.phase} <span className="text-xs font-normal text-muted-foreground">· about {r.weeks} week{r.weeks === 1 ? "" : "s"}</span></p><Bullets items={r.deliverables} className="text-xs" /></li>
            ))}
          </ol>
        )}
      </Block>
      <Block title="Testing strategy"><Bullets items={c.testingStrategy} empty="None." /></Block>
      <Block title="Prototype requirements"><Bullets items={c.prototypeRequirements} empty="None." /></Block>
    </div>
  );
}

type ListKey = "productRequirements" | "functionalRequirements" | "nonFunctionalRequirements" | "userStories" | "testingStrategy" | "prototypeRequirements";
const LIST_FIELDS: { key: ListKey; label: string; maxItems: number; maxLength: number }[] = [
  { key: "productRequirements", label: "Product requirements", maxItems: 20, maxLength: 400 },
  { key: "functionalRequirements", label: "Functional requirements", maxItems: 30, maxLength: 400 },
  { key: "nonFunctionalRequirements", label: "Non-functional requirements", maxItems: 20, maxLength: 300 },
  { key: "userStories", label: "User stories", maxItems: 30, maxLength: 400 },
  { key: "testingStrategy", label: "Testing strategy", maxItems: 15, maxLength: 300 },
  { key: "prototypeRequirements", label: "Prototype requirements", maxItems: 15, maxLength: 300 },
];

function SpecEditor({ spec, onDone }: { spec: MvpSpec; onDone: (created: MvpSpec) => void }) {
  const { id } = useVenture();
  const refresh = useRefreshVenture(id);
  const c = spec.content;
  const [vision, setVision] = useState(c.productVision);
  const [problem, setProblem] = useState(c.problemStatement);
  const [lists, setLists] = useState<Record<ListKey, string>>(() => Object.fromEntries(LIST_FIELDS.map((f) => [f.key, fromLines(c[f.key])])) as Record<ListKey, string>);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const problems: string[] = [];
  if (!vision.trim()) problems.push("Product vision cannot be empty.");
  if (vision.length > 1000) problems.push("Product vision is limited to 1,000 characters.");
  if (!problem.trim()) problems.push("Problem statement cannot be empty.");
  if (problem.length > 1000) problems.push("Problem statement is limited to 1,000 characters.");
  for (const f of LIST_FIELDS) {
    const items = toLines(lists[f.key]);
    if (items.length > f.maxItems) problems.push(`${f.label}: at most ${f.maxItems} lines.`);
    if (items.some((i) => i.length > f.maxLength)) problems.push(`${f.label}: each line is limited to ${f.maxLength} characters.`);
  }

  const save = useMutation({
    mutationFn: () => {
      // Only changed fields are sent; the API merges them into the stored content and saves a new version.
      const content: Record<string, string | string[]> = {};
      if (vision.trim() !== c.productVision) content.productVision = vision.trim();
      if (problem.trim() !== c.problemStatement) content.problemStatement = problem.trim();
      for (const f of LIST_FIELDS) {
        const next = toLines(lists[f.key]);
        if (next.join("\n") !== c[f.key].join("\n")) content[f.key] = next;
      }
      return ventureApi.reviseSpec(id, spec.id, { content, ...(note.trim() ? { changeNote: note.trim() } : {}) });
    },
    onSuccess: (created) => {
      refresh("mvp");
      onDone(created);
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(""); save.mutate(); }}>
      <Notice>Saving creates a new version (v{spec.version + 1} or later). Earlier versions are kept. A new version starts as a draft and needs approving again.</Notice>
      <FormError message={error} />
      <Field htmlFor="spec-vision" label="Product vision"><Textarea id="spec-vision" value={vision} onChange={(e) => setVision(e.target.value)} /></Field>
      <Field htmlFor="spec-problem" label="Problem statement"><Textarea id="spec-problem" value={problem} onChange={(e) => setProblem(e.target.value)} /></Field>
      {LIST_FIELDS.map((f) => (
        <Field key={f.key} htmlFor={`spec-${f.key}`} label={`${f.label} (one per line)`}>
          <Textarea id={`spec-${f.key}`} className="min-h-[120px]" value={lists[f.key]} onChange={(e) => setLists((prev) => ({ ...prev, [f.key]: e.target.value }))} />
        </Field>
      ))}
      <Field htmlFor="spec-note" label="Change note (optional)"><Input id="spec-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {problems.length > 0 && <Notice tone="warning"><Bullets items={problems} /></Notice>}
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending || problems.length > 0}>{save.isPending ? "Saving…" : "Save as new version"}</Button>
        <Button type="button" variant="outline" onClick={() => onDone(spec)}>Cancel</Button>
      </div>
    </form>
  );
}

export function SpecViewer({ spec, venturName, onSelect }: { spec: MvpSpec; venturName: string; onSelect: (id: string) => void }) {
  const { id, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const approve = useMutation({
    mutationFn: () => ventureApi.reviseSpec(id, spec.id, { status: "APPROVED", changeNote: "Approved" }),
    onSuccess: (created) => {
      refresh("mvp");
      onSelect(created.id);
    },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const exportMd = useMutation({
    mutationFn: async () => downloadBlob(await ventureApi.exportSpec(id, spec.id), `${slugify(venturName)}-mvp-v${spec.version}.md`),
    onError: (e) => setError(getErrorMessage(e)),
  });
  const warnings = spec.content.meta?.evidenceWarnings ?? [];

  return (
    <Section
      title={`Version ${spec.version}`}
      description={`${spec.status === "APPROVED" ? "Approved" : "Draft"} · ${spec.generatedBy} · ${formatDateTime(spec.createdAt)}${spec.changeNote ? ` · ${spec.changeNote}` : ""}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={exportMd.isPending} onClick={() => { setError(""); exportMd.mutate(); }}><Download className="mr-2 h-4 w-4" aria-hidden="true" />Export Markdown</Button>
          {can("edit") && !editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
          {can("edit") && spec.status !== "APPROVED" && !editing && <Button size="sm" disabled={approve.isPending} onClick={() => { setError(""); approve.mutate(); }}>{approve.isPending ? "Approving…" : "Approve"}</Button>}
        </div>
      }
    >
      <FormError message={error} />
      {warnings.length > 0 && (
        <Notice tone="warning">
          <p className="font-semibold">Evidence warnings: read before building</p>
          <Bullets items={warnings} className="mt-1" />
        </Notice>
      )}
      {spec.content.meta?.generatedBy === "ai-assisted" && <Badge variant="warning">AI-assisted draft: review it, it is not validated evidence</Badge>}
      {spec.status !== "APPROVED" && can("edit") && !editing && <p className="text-xs text-muted-foreground">Approving saves a new version marked approved. The venture needs an approved specification to move into the Building stage.</p>}
      {editing ? <SpecEditor spec={spec} onDone={(created) => { setEditing(false); onSelect(created.id); }} /> : <SpecContent c={spec.content} />}
    </Section>
  );
}
