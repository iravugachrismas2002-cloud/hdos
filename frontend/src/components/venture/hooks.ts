// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useQueryClient } from "@tanstack/react-query";

/** Query keys are `["venture", ventureId, ...parts]`; list-level keys use `["venture", "dashboard" | "invitations" | ...]`. */
export const ventureKey = (id: string, ...parts: (string | number)[]) => ["venture", id, ...parts] as const;

/**
 * Returns a function that invalidates the given venture sections plus the data that nearly every change affects
 * (project detail counts and next actions, the live assessment preview, the activity feed and the venture list).
 */
export function useRefreshVenture(id: string) {
  const queryClient = useQueryClient();
  return (...parts: string[]) => {
    const keys = new Set(["detail", "activity", "assessment", ...parts]);
    for (const key of keys) void queryClient.invalidateQueries({ queryKey: ventureKey(id, key) });
    void queryClient.invalidateQueries({ queryKey: ["venture", "dashboard"] });
  };
}
