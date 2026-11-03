// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import type { UsageKind } from "@prisma/client";
import { logger } from "./logger";
import { prisma } from "./prisma";

export interface UsageInput {
  kind: UsageKind;
  feature?: string;
  provider?: string;
  success?: boolean;
  latencyMs?: number;
  errorCode?: string;
}

/** Anonymous operational telemetry. Never throws and never blocks the request. */
export const trackUsage = (event: UsageInput): void => {
  prisma.usageEvent
    .create({ data: { ...event, success: event.success ?? true } })
    .catch((error) => logger.warn("usage_track_failed", { error: String(error) }));
};
