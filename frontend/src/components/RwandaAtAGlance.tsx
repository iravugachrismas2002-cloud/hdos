// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { SourceBadge } from "@/components/SourceBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNationalIndicators } from "@/lib/hooks";

const TILES = [
  { code: "LFS_UNEMPLOYMENT_RATE_Q4_2024", label: "Unemployment rate (Nov 2024)" },
  { code: "LFS_LFPR_2024", label: "Labour force participation (2024)" },
  { code: "LFS_EPR_YOUTH_Q4_2024", label: "Youth (16-30) employment ratio" },
  { code: "CENSUS_URBAN_SHARE_2022", label: "Urban share of population (2022)" },
];

export function RwandaAtAGlance() {
  const { byCode, isLoading, isError } = useNationalIndicators();
  if (isError) return <p className="text-sm text-muted-foreground">National statistics are temporarily unavailable.</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TILES.map((t) => {
        const ind = byCode.get(t.code);
        return (
          <Card key={t.code}>
            <CardContent className="space-y-1 p-4">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              {isLoading || !ind ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <p className="text-3xl font-bold">{ind.value}{ind.unit === "%" ? "%" : ""}</p>
                  <SourceBadge source={ind.source} compact />
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
