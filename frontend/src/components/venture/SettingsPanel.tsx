// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FormError, FormSuccess } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage, ventureApi } from "@/lib/api";
import { useDistricts, useSectors } from "@/lib/hooks";
import type { VentureProject } from "@/lib/venture-types";
import { useVenture } from "./access";
import { useRefreshVenture } from "./hooks";
import { CheckboxField, Field, ReadOnlyNote } from "./shared";

export function SettingsPanel({ project }: { project: VentureProject }) {
  const { id, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const sectors = useSectors();
  const districts = useDistricts();
  const [name, setName] = useState(project.name);
  const [idea, setIdea] = useState(project.ideaSummary ?? "");
  const [problem, setProblem] = useState(project.problemStatement ?? "");
  const [sectorId, setSectorId] = useState(project.sector?.id ?? "");
  const [districtId, setDistrictId] = useState(project.district?.id ?? "");
  const [currency, setCurrency] = useState(project.currency);
  const [consent, setConsent] = useState(project.aiProcessingConsent);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const canEdit = can("edit");
  const canConsent = can("manage");
  const currencyValid = /^[A-Za-z]{3}$/.test(currency.trim());

  const save = useMutation({
    mutationFn: () =>
      ventureApi.update(id, {
        name: name.trim(),
        ideaSummary: idea.trim() || null,
        problemStatement: problem.trim() || null,
        sectorId: sectorId || null,
        districtId: districtId || null,
        currency: currency.trim().toUpperCase(),
        // Only sent when it actually changes: the API restricts changing consent to the owner or an admin.
        ...(consent !== project.aiProcessingConsent ? { aiProcessingConsent: consent } : {}),
      }),
    onSuccess: () => {
      setSaved("Venture settings saved.");
      refresh();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        setSaved("");
        save.mutate();
      }}
    >
      <div className="space-y-2 sm:col-span-2">
        <FormError message={error} />
        <FormSuccess message={saved} />
        {!canEdit && <ReadOnlyNote>Only editors and above can change venture details.</ReadOnlyNote>}
      </div>
      <Field htmlFor="s-name" label="Venture name" className="sm:col-span-2">
        <Input id="s-name" required minLength={3} maxLength={120} value={name} disabled={!canEdit} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field htmlFor="s-idea" label="Idea summary" className="sm:col-span-2">
        <Textarea id="s-idea" maxLength={4000} value={idea} disabled={!canEdit} onChange={(e) => setIdea(e.target.value)} />
      </Field>
      <Field htmlFor="s-problem" label="Problem statement" className="sm:col-span-2">
        <Textarea id="s-problem" maxLength={2000} value={problem} disabled={!canEdit} onChange={(e) => setProblem(e.target.value)} />
      </Field>
      <Field htmlFor="s-sector" label="Sector">
        <Select id="s-sector" value={sectorId} disabled={!canEdit} onChange={(e) => setSectorId(e.target.value)}>
          <option value="">Not set</option>
          {sectors.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field htmlFor="s-district" label="District">
        <Select id="s-district" value={districtId} disabled={!canEdit} onChange={(e) => setDistrictId(e.target.value)}>
          <option value="">Not set</option>
          {districts.data?.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.province}</option>)}
        </Select>
      </Field>
      <Field htmlFor="s-currency" label="Currency" hint="Changing it does not convert amounts you already entered.">
        <Input id="s-currency" required minLength={3} maxLength={3} className="uppercase" value={currency} disabled={!canEdit} onChange={(e) => setCurrency(e.target.value)} />
      </Field>

      <div className="space-y-2 rounded-md border bg-muted/30 p-3 sm:col-span-2">
        <CheckboxField id="s-ai" checked={consent} disabled={!canConsent} onChange={setConsent}>
          <span className="font-medium">Allow AI assistance for this venture</span>
        </CheckboxField>
        <p className="pl-6 text-xs text-muted-foreground">
          When on, text from this venture is sent to an external AI provider to draft discovery reports, product specifications, explanations and HDOS AI chat answers.
          When off, built-in templates are used and nothing leaves HDOS. {canConsent ? "You can turn it off at any time." : "Only the owner or an admin can change this."}
        </p>
      </div>

      {canEdit && (
        <div className="sm:col-span-2">
          <Button type="submit" disabled={save.isPending || name.trim().length < 3 || !currencyValid}>{save.isPending ? "Saving…" : "Save settings"}</Button>
        </div>
      )}
    </form>
  );
}
