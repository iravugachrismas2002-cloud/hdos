// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeleteAccount } from "@/components/DeleteAccount";
import { SkillPicker } from "@/components/SkillPicker";
import { ErrorState, FormError, FormSuccess, ListSkeleton } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage, profileApi } from "@/lib/api";
import { EDUCATION_LABELS, EDUCATION_LEVELS, SKILL_LEVELS } from "@/lib/format";
import { useDistricts, useSectors } from "@/lib/hooks";
import type { EducationLevel, ProfileInput } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FormState {
  educationLevel: EducationLevel;
  districtId: string;
  birthYear: string;
  bio: string;
  income: string;
  skills: { skillId: string; name: string; level: number }[];
  sectorIds: string[];
}

const EMPTY: FormState = { educationLevel: "UPPER_SECONDARY", districtId: "", birthYear: "", bio: "", income: "", skills: [], sectorIds: [] };

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const profile = useQuery({ queryKey: ["profile"], queryFn: profileApi.get });
  const districts = useDistricts();
  const sectors = useSectors();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setForm({
      educationLevel: p.educationLevel,
      districtId: p.districtId ?? "",
      birthYear: p.birthYear?.toString() ?? "",
      bio: p.bio ?? "",
      income: p.targetMonthlyIncomeRwf?.toString() ?? "",
      skills: p.skills,
      sectorIds: p.sectorInterests.map((s) => s.sectorId),
    });
  }, [profile.data]);

  const save = useMutation({
    mutationFn: (input: ProfileInput) => profileApi.save(input),
    onSuccess: async (p) => {
      queryClient.setQueryData(["profile"], p);
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      await refreshUser();
      setSaved("Profile saved. Your recommendations will use the new information.");
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved("");
    setError("");
    save.mutate({
      educationLevel: form.educationLevel,
      districtId: form.districtId || null,
      birthYear: form.birthYear ? Number(form.birthYear) : null,
      bio: form.bio.trim() || null,
      targetMonthlyIncomeRwf: form.income ? Number(form.income) : null,
      skills: form.skills.map((s) => ({ skillId: s.skillId, level: s.level })),
      sectorIds: form.sectorIds,
    });
  };

  if (profile.isLoading) return <ListSkeleton rows={4} />;
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />;

  const byProvince = new Map<string, NonNullable<typeof districts.data>>();
  for (const d of districts.data ?? []) byProvince.set(d.province, [...(byProvince.get(d.province) ?? []), d]);

  const chosen = new Set(form.skills.map((s) => s.skillId));
  const completeness = profile.data?.completeness ?? 0;
  const toggleSector = (id: string) =>
    setForm((f) => ({ ...f, sectorIds: f.sectorIds.includes(id) ? f.sectorIds.filter((s) => s !== id) : [...f.sectorIds, id] }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My profile (Life DNA)</h1>
        <p className="text-muted-foreground">Everything here is editable and is the only personal data used to personalise your results.</p>
      </div>
      <div className="flex items-center gap-3">
        <Progress value={completeness} label="Profile completeness" className="max-w-xs" />
        <span className="text-sm">{completeness}% complete</span>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <FormError message={error} />
        <FormSuccess message={saved} />

        <Card>
          <CardHeader><CardTitle>About you</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edu">Highest education completed</Label>
              <Select id="edu" value={form.educationLevel} onChange={(e) => setForm({ ...form, educationLevel: e.target.value as EducationLevel })}>
                {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{EDUCATION_LABELS[l]}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Select id="district" value={form.districtId} onChange={(e) => setForm({ ...form, districtId: e.target.value })}>
                <option value="">Prefer not to say</option>
                {[...byProvince.entries()].map(([province, list]) => (
                  <optgroup key={province} label={province}>
                    {list.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </optgroup>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth">Birth year (optional)</Label>
              <Input id="birth" type="number" inputMode="numeric" min={1930} max={new Date().getFullYear() - 10} value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="income">Target monthly income, RWF (optional)</Label>
              <Input id="income" type="number" inputMode="numeric" min={0} step={10000} value={form.income} onChange={(e) => setForm({ ...form, income: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bio">Short bio (optional)</Label>
              <Textarea id="bio" maxLength={500} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              <p className="text-xs text-muted-foreground">{form.bio.length}/500</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
            <CardDescription>Rate yourself honestly: scores depend on the gap between your level and what an occupation needs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SkillPicker
              chosen={chosen}
              onAdd={(s) => setForm((f) => ({ ...f, skills: [...f.skills, { skillId: s.id, name: s.name, level: 2 }] }))}
            />
            {form.skills.length === 0 && <p className="text-sm text-muted-foreground">No skills added yet.</p>}
            <ul className="space-y-2">
              {form.skills.map((s) => (
                <li key={s.skillId} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                  <span className="min-w-32 flex-1 text-sm font-medium">{s.name}</span>
                  <Select
                    aria-label={`Level for ${s.name}`}
                    className="w-40"
                    value={s.level}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, skills: f.skills.map((x) => (x.skillId === s.skillId ? { ...x, level: Number(e.target.value) } : x)) }))
                    }
                  >
                    {SKILL_LEVELS.map((label, i) => <option key={label} value={i + 1}>{i + 1} · {label}</option>)}
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${s.name}`}
                    onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((x) => x.skillId !== s.skillId) }))}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sectors that interest you</CardTitle>
            <CardDescription>Sectors marked ★ are flagged as national development priorities in our editorial model.</CardDescription>
          </CardHeader>
          <CardContent>
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Sector interests</legend>
              {sectors.data?.map((s) => {
                const on = form.sectorIds.includes(s.id);
                return (
                  <label key={s.id} className={cn("cursor-pointer rounded-full border px-3 py-1.5 text-sm", on && "border-primary bg-primary/10 font-medium")}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleSector(s.id)} />
                    {s.nst2Priority && <span aria-label="national priority">★ </span>}
                    {s.name}
                    {on && <Badge className="ml-2" variant="default">Selected</Badge>}
                  </label>
                );
              })}
            </fieldset>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save profile"}</Button>
      </form>

      <DeleteAccount />
    </div>
  );
}
