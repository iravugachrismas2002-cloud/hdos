// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormError } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { applicationsApi, getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { FundingMatch } from "@/lib/venture-types";
import { label } from "./format";
import { Bullets, ExternalLink } from "./shared";
import { CallStatusBadge, DemoBadge } from "./StatusBadges";

/** A funding lead from the opportunity catalogue. Only `OPEN` calls look open; a match is never an approval. */
export function FundingMatchCard({ match, canTrack }: { match: FundingMatch; canTrack: boolean }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [tracked, setTracked] = useState(false);
  const track = useMutation({
    mutationFn: () => applicationsApi.create(match.opportunityId),
    onSuccess: () => {
      setTracked(true);
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <li className="space-y-2 rounded-lg border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-semibold">{match.title}</p>
          <p className="text-sm text-muted-foreground">{match.provider}{match.country ? ` · ${match.country}` : ""}</p>
        </div>
        <Badge variant="outline">{label(match.fundingType)}</Badge>
      </div>
      <CallStatusBadge status={match.callStatus} />
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <div className="flex gap-1"><dt>Deadline:</dt><dd className="text-foreground">{match.deadline ? formatDate(match.deadline) : match.isRolling ? "Rolling" : "Not stated"}</dd></div>
        <div className="flex gap-1"><dt>Last verified:</dt><dd className="text-foreground">{match.lastVerifiedAt ? formatDate(match.lastVerifiedAt) : "Never"}</dd></div>
        <div className="flex items-center gap-1"><dt>Source:</dt><dd className="text-foreground">{match.source.publisher}</dd>{match.source.isDemo && <DemoBadge />}</div>
      </dl>
      {match.eligibility && <p className="text-sm"><span className="font-medium">Eligibility: </span>{match.eligibility}</p>}
      <div>
        <p className="text-xs font-medium text-muted-foreground">Why it matched (relevance only, not a chance of funding)</p>
        <Bullets items={match.matchReasons} className="mt-1 text-xs" />
      </div>
      <p className="text-xs text-muted-foreground">{match.disclaimer}</p>
      <FormError message={error} />
      <div className="flex flex-wrap items-center gap-3">
        {match.officialUrl ? <ExternalLink href={match.officialUrl} className="text-sm">Official page</ExternalLink> : <span className="text-xs text-muted-foreground">No official link recorded: confirm with the provider.</span>}
        {canTrack && !tracked && (
          <Button size="sm" variant="outline" disabled={track.isPending} onClick={() => { setError(""); track.mutate(); }}>
            {track.isPending ? "Adding…" : "Track in Applications"}
          </Button>
        )}
        {tracked && (
          <span role="status" className="text-sm text-green-800">
            Added. <Link href="/applications" className="font-semibold underline">Open Applications</Link>
          </span>
        )}
      </div>
    </li>
  );
}
