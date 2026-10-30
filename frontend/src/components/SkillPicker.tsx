// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { catalogApi } from "@/lib/api";

export function SkillPicker({ chosen, onAdd }: { chosen: Set<string>; onAdd: (s: { id: string; name: string }) => void }) {
  const [q, setQ] = useState("");
  const results = useQuery({ queryKey: ["skills", q], queryFn: () => catalogApi.skills(q), enabled: q.trim().length >= 1 });
  const options = (results.data ?? []).filter((s) => !chosen.has(s.id)).slice(0, 8);
  return (
    <div className="space-y-2">
      <Label htmlFor="skill-search">Add a skill</Label>
      <Input id="skill-search" placeholder="Search e.g. Programming, Welding, Bookkeeping" value={q} onChange={(e) => setQ(e.target.value)} />
      {q.trim() && (
        <ul className="flex flex-wrap gap-2" aria-label="Matching skills">
          {options.map((s) => (
            <li key={s.id}>
              <Button type="button" size="sm" variant="outline" onClick={() => { onAdd(s); setQ(""); }}>
                + {s.name}
              </Button>
            </li>
          ))}
          {!results.isLoading && options.length === 0 && <li className="text-sm text-muted-foreground">No matching skills.</li>}
        </ul>
      )}
    </div>
  );
}
