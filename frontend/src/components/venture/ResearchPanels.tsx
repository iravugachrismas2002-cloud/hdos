// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FormError } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage, ventureApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Competitor, CustomerSegment } from "@/lib/venture-types";
import { useVenture } from "./access";
import { dateInputToIso, fromLines, toLines, todayInput } from "./format";
import { useRefreshVenture, ventureKey } from "./hooks";
import { Bullets, ExternalLink, Field, QueryView, ReadOnlyNote, Section } from "./shared";

// ───────────── Research sources ─────────────

export function SourcesPanel() {
  const { id, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const sources = useQuery({ queryKey: ventureKey(id, "sources"), queryFn: () => ventureApi.sources(id) });
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [url, setUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [retrievedAt, setRetrievedAt] = useState(todayInput());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const add = useMutation({
    mutationFn: () =>
      ventureApi.createSource(id, {
        title: title.trim(),
        publisher: publisher.trim(),
        url: url.trim() || null,
        publishedAt: publishedAt ? dateInputToIso(publishedAt) : null,
        retrievedAt: dateInputToIso(retrievedAt),
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      refresh("sources");
      setTitle("");
      setPublisher("");
      setUrl("");
      setPublishedAt("");
      setNotes("");
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <Section title="Research sources" description="Every outside fact needs a publisher and the date you retrieved it, so anyone can trace it.">
      {can("contribute") ? (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            add.mutate();
          }}
        >
          <div className="sm:col-span-2"><FormError message={error} /></div>
          <Field htmlFor="src-title" label="Title" className="sm:col-span-2"><Input id="src-title" required minLength={3} maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field htmlFor="src-publisher" label="Publisher (required)"><Input id="src-publisher" required minLength={2} maxLength={200} value={publisher} onChange={(e) => setPublisher(e.target.value)} /></Field>
          <Field htmlFor="src-url" label="Link (optional)"><Input id="src-url" type="url" maxLength={500} placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
          <Field htmlFor="src-retrieved" label="Date you retrieved it (required)"><Input id="src-retrieved" type="date" required max={todayInput()} value={retrievedAt} onChange={(e) => setRetrievedAt(e.target.value)} /></Field>
          <Field htmlFor="src-published" label="Date it was published (optional)"><Input id="src-published" type="date" max={todayInput()} value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} /></Field>
          <Field htmlFor="src-notes" label="Notes (optional)" className="sm:col-span-2"><Textarea id="src-notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <div className="sm:col-span-2"><Button type="submit" disabled={add.isPending || title.trim().length < 3 || publisher.trim().length < 2 || !retrievedAt}>{add.isPending ? "Saving…" : "Add source"}</Button></div>
        </form>
      ) : <ReadOnlyNote>Contributors and above can add sources.</ReadOnlyNote>}
      <QueryView query={sources}>
        {(rows) => rows.length === 0 ? <p className="text-sm text-muted-foreground">No sources recorded yet.</p> : (
          <ul className="space-y-2">
            {rows.map((s) => (
              <li key={s.id} className="space-y-1 rounded-md border p-3 text-sm">
                <p className="break-words font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {s.publisher} · retrieved {formatDate(s.retrievedAt)}{s.publishedAt ? ` · published ${formatDate(s.publishedAt)}` : ""}
                </p>
                {s.url && <ExternalLink href={s.url} className="text-xs">Open source</ExternalLink>}
                {s.notes && <p className="whitespace-pre-wrap break-words text-xs">{s.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </Section>
  );
}

// ───────────── Customer segments ─────────────

function SegmentForm({ initial, onDone }: { initial?: CustomerSegment; onDone: () => void }) {
  const { id } = useVenture();
  const refresh = useRefreshVenture(id);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [size, setSize] = useState(initial?.size ?? "");
  const [needs, setNeeds] = useState(fromLines(initial?.needs));
  const [alternatives, setAlternatives] = useState(initial?.currentAlternatives ?? "");
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), description: description.trim() || null, size: size.trim() || null, needs: toLines(needs), currentAlternatives: alternatives.trim() || null };
      return initial ? ventureApi.segments.update(id, initial.id, body) : ventureApi.segments.create(id, body);
    },
    onSuccess: () => {
      refresh("segments");
      onDone();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const p = initial ? `seg-${initial.id}` : "seg-new";
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setError(""); save.mutate(); }}>
      <div className="sm:col-span-2"><FormError message={error} /></div>
      <Field htmlFor={`${p}-name`} label="Segment name"><Input id={`${p}-name`} required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field htmlFor={`${p}-size`} label="Rough size (optional)" hint="Only what you can back up, for example “about 300 shops in Nyarugenge”."><Input id={`${p}-size`} maxLength={200} value={size} onChange={(e) => setSize(e.target.value)} /></Field>
      <Field htmlFor={`${p}-desc`} label="Description (optional)" className="sm:col-span-2"><Textarea id={`${p}-desc`} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <Field htmlFor={`${p}-needs`} label="Needs (one per line, up to 10)"><Textarea id={`${p}-needs`} value={needs} onChange={(e) => setNeeds(e.target.value)} /></Field>
      <Field htmlFor={`${p}-alt`} label="What they do today instead (optional)"><Textarea id={`${p}-alt`} maxLength={500} value={alternatives} onChange={(e) => setAlternatives(e.target.value)} /></Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={save.isPending || name.trim().length < 2 || toLines(needs).length > 10}>{save.isPending ? "Saving…" : initial ? "Save changes" : "Add segment"}</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export function SegmentsPanel() {
  const { id, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const segments = useQuery({ queryKey: ventureKey(id, "segments"), queryFn: () => ventureApi.segments.list(id) });
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState("");
  const remove = useMutation({ mutationFn: (itemId: string) => ventureApi.segments.remove(id, itemId), onSuccess: () => refresh("segments"), onError: (e) => setError(getErrorMessage(e)) });
  return (
    <Section title="Customer segments" description="Who exactly is this for? Specific groups beat “everyone”." actions={can("edit") && editing === null ? <Button size="sm" onClick={() => setEditing("new")}>Add segment</Button> : undefined}>
      {!can("edit") && <ReadOnlyNote>Only editors and above can change customer segments.</ReadOnlyNote>}
      <FormError message={error} />
      {editing === "new" && <div className="rounded-md border bg-muted/30 p-3"><SegmentForm onDone={() => setEditing(null)} /></div>}
      <QueryView query={segments}>
        {(rows) => rows.length === 0 && editing !== "new" ? <p className="text-sm text-muted-foreground">No customer segments yet.</p> : (
          <ul className="space-y-2">
            {rows.map((s) => editing === s.id ? (
              <li key={s.id} className="rounded-md border p-3"><SegmentForm initial={s} onDone={() => setEditing(null)} /></li>
            ) : (
              <li key={s.id} className="space-y-1 rounded-md border p-3 text-sm">
                <p className="font-medium">{s.name}{s.size ? <span className="ml-2 text-xs font-normal text-muted-foreground">{s.size}</span> : null}</p>
                {s.description && <p className="whitespace-pre-wrap break-words text-xs">{s.description}</p>}
                {s.needs.length > 0 && <div><p className="text-xs font-medium text-muted-foreground">Needs</p><Bullets items={s.needs} className="text-xs" /></div>}
                {s.currentAlternatives && <p className="text-xs text-muted-foreground">Today they: {s.currentAlternatives}</p>}
                {can("edit") && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(s.id)} aria-label={`Edit segment ${s.name}`}>Edit</Button>
                    <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(s.id)} aria-label={`Delete segment ${s.name}`}>Delete</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </Section>
  );
}

// ───────────── Competitors ─────────────

function CompetitorForm({ initial, onDone }: { initial?: Competitor; onDone: () => void }) {
  const { id } = useVenture();
  const refresh = useRefreshVenture(id);
  const [name, setName] = useState(initial?.name ?? "");
  const [offering, setOffering] = useState(initial?.offering ?? "");
  const [priceNote, setPriceNote] = useState(initial?.priceNote ?? "");
  const [strengths, setStrengths] = useState(initial?.strengths ?? "");
  const [weaknesses, setWeaknesses] = useState(initial?.weaknesses ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), offering: offering.trim() || null, priceNote: priceNote.trim() || null, strengths: strengths.trim() || null, weaknesses: weaknesses.trim() || null, url: url.trim() || null };
      return initial ? ventureApi.competitors.update(id, initial.id, body) : ventureApi.competitors.create(id, body);
    },
    onSuccess: () => {
      refresh("competitors");
      onDone();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const p = initial ? `cmp-${initial.id}` : "cmp-new";
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setError(""); save.mutate(); }}>
      <div className="sm:col-span-2"><FormError message={error} /></div>
      <Field htmlFor={`${p}-name`} label="Competitor or alternative"><Input id={`${p}-name`} required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field htmlFor={`${p}-url`} label="Website (optional)"><Input id={`${p}-url`} type="url" maxLength={500} placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
      <Field htmlFor={`${p}-offer`} label="What they offer (optional)" className="sm:col-span-2"><Textarea id={`${p}-offer`} maxLength={2000} value={offering} onChange={(e) => setOffering(e.target.value)} /></Field>
      <Field htmlFor={`${p}-price`} label="Price (optional)" className="sm:col-span-2"><Input id={`${p}-price`} maxLength={300} value={priceNote} onChange={(e) => setPriceNote(e.target.value)} /></Field>
      <Field htmlFor={`${p}-str`} label="Strengths (optional)"><Textarea id={`${p}-str`} maxLength={500} value={strengths} onChange={(e) => setStrengths(e.target.value)} /></Field>
      <Field htmlFor={`${p}-weak`} label="Weaknesses (optional)"><Textarea id={`${p}-weak`} maxLength={500} value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} /></Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={save.isPending || name.trim().length < 2}>{save.isPending ? "Saving…" : initial ? "Save changes" : "Add competitor"}</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export function CompetitorsPanel() {
  const { id, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const competitors = useQuery({ queryKey: ventureKey(id, "competitors"), queryFn: () => ventureApi.competitors.list(id) });
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState("");
  const remove = useMutation({ mutationFn: (itemId: string) => ventureApi.competitors.remove(id, itemId), onSuccess: () => refresh("competitors"), onError: (e) => setError(getErrorMessage(e)) });
  return (
    <Section title="Competitors and alternatives" description="Include what customers do today, even if it is “nothing” or a manual workaround." actions={can("edit") && editing === null ? <Button size="sm" onClick={() => setEditing("new")}>Add competitor</Button> : undefined}>
      {!can("edit") && <ReadOnlyNote>Only editors and above can change competitors.</ReadOnlyNote>}
      <FormError message={error} />
      {editing === "new" && <div className="rounded-md border bg-muted/30 p-3"><CompetitorForm onDone={() => setEditing(null)} /></div>}
      <QueryView query={competitors}>
        {(rows) => rows.length === 0 && editing !== "new" ? <p className="text-sm text-muted-foreground">No competitors recorded yet.</p> : (
          <ul className="space-y-2">
            {rows.map((c) => editing === c.id ? (
              <li key={c.id} className="rounded-md border p-3"><CompetitorForm initial={c} onDone={() => setEditing(null)} /></li>
            ) : (
              <li key={c.id} className="space-y-1 rounded-md border p-3 text-sm">
                <p className="font-medium">{c.name} {c.url && <ExternalLink href={c.url} className="ml-1 text-xs">Website</ExternalLink>}</p>
                {c.offering && <p className="whitespace-pre-wrap break-words text-xs">{c.offering}</p>}
                {c.priceNote && <p className="text-xs text-muted-foreground">Price: {c.priceNote}</p>}
                {c.strengths && <p className="text-xs"><span className="font-medium">Strengths: </span>{c.strengths}</p>}
                {c.weaknesses && <p className="text-xs"><span className="font-medium">Weaknesses: </span>{c.weaknesses}</p>}
                {can("edit") && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(c.id)} aria-label={`Edit competitor ${c.name}`}>Edit</Button>
                    <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(c.id)} aria-label={`Delete competitor ${c.name}`}>Delete</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </Section>
  );
}
