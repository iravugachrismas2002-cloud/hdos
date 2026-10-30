// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogApi, insightsApi } from "./api";
import type { Indicator } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export const useDistricts = () => useQuery({ queryKey: ["districts"], queryFn: catalogApi.districts, staleTime: DAY });
export const useSectors = () => useQuery({ queryKey: ["sectors"], queryFn: catalogApi.sectors, staleTime: DAY });

export const useNationalIndicators = () => {
  const query = useQuery({ queryKey: ["indicators"], queryFn: insightsApi.national, staleTime: DAY });
  const byCode = new Map<string, Indicator>((query.data ?? []).map((i) => [i.code, i]));
  return { ...query, byCode };
};
