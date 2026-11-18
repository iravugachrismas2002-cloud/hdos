// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormError } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage, ventureApi } from "@/lib/api";
import { useDistricts, useSectors } from "@/lib/hooks";
import type { StartMode } from "@/lib/venture-types";
import { CheckboxField, Field, RadioOption } from "./shared";

export function NewVentureForm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sectors = useSectors();
  const districts = useDistricts();
  const [name, setName] = useState("");
  const [ideaSummary, setIdeaSummary] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [currency, setCurrency] = useState("RWF");
  const [startMode, setStartMode] = useState<StartMode>("OWN_IDEA");
  const [aiConsent, setAiConsent] = useState(false);
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: () =>
      ventureApi.create({
        name: name.trim(),
        ideaSummary: ideaSummary.trim() || null,
        problemStatement: problemStatement.trim() || null,
        sectorId: sectorId || null,
        districtId: districtId || null,
        currency: currency.trim().toUpperCase() || "RWF",
        startMode,
        aiProcessingConsent: aiConsent,
      }),
    onSuccess: (venture) => {
      void queryClient.invalidateQueries({ queryKey: ["venture", "dashboard"] });
      router.push(`/venture-builder/${venture.id}`);
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const currencyValid = /^[A-Za-z]{3}$/.test(currency.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle>New venture</CardTitle>
        <CardDescription>Start with what you know. Everything here can be edited later, and nothing is treated as validated until you record evidence.</CardDescription>
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

          <Field htmlFor="v-name" label="Venture name" className="sm:col-span-2">
            <Input id="v-name" required minLength={3} maxLength={120} placeholder="e.g. Kigali Fresh Delivery" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <fieldset className="space-y-2 sm:col-span-2">
            <legend className="px-2 py-1.5 text-sm font-medium">How do you want to start?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <RadioOption name="v-start" value="OWN_IDEA" current={startMode} onChange={(v) => setStartMode(v as StartMode)}>I have an idea</RadioOption>
              <RadioOption name="v-start" value="DISCOVER" current={startMode} onChange={(v) => setStartMode(v as StartMode)}>Help me discover an opportunity</RadioOption>
            </div>
          </fieldset>

          <Field htmlFor="v-idea" label={startMode === "OWN_IDEA" ? "Your idea (optional now)" : "Any starting thoughts (optional)"} className="sm:col-span-2">
            <Textarea id="v-idea" maxLength={4000} value={ideaSummary} onChange={(e) => setIdeaSummary(e.target.value)} placeholder="Describe the idea in your own words." />
          </Field>
          <Field htmlFor="v-problem" label="Problem statement (optional)" className="sm:col-span-2" hint="Who has the problem, and what happens today?">
            <Textarea id="v-problem" maxLength={2000} value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} />
          </Field>

          <Field htmlFor="v-sector" label="Sector (optional)">
            <Select id="v-sector" value={sectorId} onChange={(e) => setSectorId(e.target.value)}>
              <option value="">Not sure yet</option>
              {sectors.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field htmlFor="v-district" label="District (optional)">
            <Select id="v-district" value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
              <option value="">Not sure yet</option>
              {districts.data?.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.province}</option>)}
            </Select>
          </Field>
          <Field htmlFor="v-currency" label="Currency" hint="3-letter code, for example RWF or USD. Used for all financial figures.">
            <Input id="v-currency" required maxLength={3} minLength={3} className="uppercase" value={currency} onChange={(e) => setCurrency(e.target.value)} aria-invalid={!currencyValid} />
          </Field>

          <div className="space-y-2 rounded-md border bg-muted/30 p-3 sm:col-span-2">
            <CheckboxField id="v-ai" checked={aiConsent} onChange={setAiConsent}>
              <span className="font-medium">Allow AI assistance for this venture</span>
            </CheckboxField>
            <p className="pl-6 text-xs text-muted-foreground">
              Off by default. Only if you tick this, text from this venture (your idea, problem statement, assumptions and similar) is sent to an external AI provider to draft
              discovery reports, product specifications and explanations. If it stays off, built-in templates are used and nothing leaves HDOS. AI output is always labelled as a
              hypothesis and is never treated as evidence. The owner or an admin can change this later in venture settings.
            </p>
          </div>

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={create.isPending || name.trim().length < 3 || !currencyValid}>{create.isPending ? "Creating…" : "Create venture"}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
