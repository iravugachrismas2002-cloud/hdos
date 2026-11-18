// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { Badge } from "@/components/ui/badge";
import type { EcosystemEntry } from "@/lib/venture-types";
import { ExternalLink } from "./shared";

/** Link-only organisations. HDOS does not mirror their directories and never shows a call from this list as open. */
export function EcosystemList({ entries }: { entries: EcosystemEntry[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {entries.map((e) => (
        <li key={e.id} className="space-y-2 rounded-lg border bg-background p-3">
          <p className="font-semibold">{e.name}</p>
          <p className="text-sm text-muted-foreground">{e.role}</p>
          {e.focus.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {e.focus.map((f) => <Badge key={f} variant="secondary">{f}</Badge>)}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{e.note}</p>
          <p className="text-xs text-muted-foreground">
            Source: {e.source.name} ({e.source.publisher}) · source record loaded {e.source.retrievedAt.slice(0, 10)}
          </p>
          <ExternalLink href={e.officialUrl} className="text-sm">Official website</ExternalLink>
        </li>
      ))}
    </ul>
  );
}
