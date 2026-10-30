// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { Button } from "@/components/ui/button";
import type { Meta } from "@/lib/types";

export function Pagination({ meta, onPage }: { meta: Meta; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-2 pt-2">
      <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {meta.page} of {pages} · {meta.total} results
      </span>
      <Button variant="outline" size="sm" disabled={meta.page >= pages} onClick={() => onPage(meta.page + 1)}>
        Next
      </Button>
    </nav>
  );
}
