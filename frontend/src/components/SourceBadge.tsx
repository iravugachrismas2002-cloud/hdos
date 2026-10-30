// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { Badge } from "@/components/ui/badge";
import type { SourceRef } from "@/lib/types";

/** Every figure and record shows where it came from; illustrative data is always labelled as such. */
export function SourceBadge({ source, compact = false }: { source: SourceRef | null; compact?: boolean }) {
  if (!source) {
    return <span className="text-xs text-muted-foreground">No source recorded</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {source.isDemo && <Badge variant="warning">Illustrative data</Badge>}
      <span>
        Source:{" "}
        {source.url ? (
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
            {compact ? source.publisher : source.name}
          </a>
        ) : (
          <span>{compact ? source.publisher : source.name}</span>
        )}
        {!compact && <> · {source.publisher}</>}
      </span>
    </span>
  );
}
