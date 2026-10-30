// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { logger } from "./logger";

interface AuditEvent {
  action: string;
  actorId?: string | null;
  targetId?: string | null;
  ip?: string;
  metadata?: Prisma.InputJsonValue;
}

/** Security-relevant events. Never throws: an audit failure must not break the user's request. */
export const audit = async (event: AuditEvent): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        action: event.action,
        actorId: event.actorId ?? null,
        targetId: event.targetId ?? null,
        ip: event.ip,
        metadata: event.metadata,
      },
    });
  } catch (error) {
    logger.error("audit_write_failed", { action: event.action, error: String(error) });
  }
};
