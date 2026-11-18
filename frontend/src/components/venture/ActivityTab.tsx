// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { ventureApi } from "@/lib/api";
import { useVenture } from "./access";
import { ventureKey } from "./hooks";
import { QueryView, Section } from "./shared";

const PAGE_SIZE = 25;

export function ActivityTab() {
  const { id } = useVenture();
  const [page, setPage] = useState(1);
  const activity = useQuery({
    queryKey: ventureKey(id, "activity", page),
    queryFn: () => ventureApi.activity(id, page, PAGE_SIZE),
  });

  return (
    <Section title="Activity" description="A record of changes in this venture workspace.">
      <QueryView query={activity}>
        {(result) => (
          <div className="space-y-4">
            {result.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity has been recorded yet.</p>
            ) : (
              <ol className="space-y-3">
                {result.data.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-muted pl-4">
                    <p className="break-words text-sm">{entry.summary}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.action.replace(/_/g, " ")} · {formatDate(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {result.meta.total} entr{result.meta.total === 1 ? "y" : "ies"} · Page {result.meta.page}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={page * result.meta.pageSize >= result.meta.total} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </QueryView>
    </Section>
  );
}
