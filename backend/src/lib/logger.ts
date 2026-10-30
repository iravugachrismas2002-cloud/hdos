// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { env } from "../config/env";

type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = env.isTest ? 100 : env.isProd ? order.info : order.debug;

const REDACTED_KEYS = /pass(word)?|token|secret|authorization|cookie/i;

const redact = (value: unknown, depth = 0): unknown => {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      REDACTED_KEYS.test(k) ? "[REDACTED]" : redact(v, depth + 1),
    ]),
  );
};

const write = (level: Level, message: string, fields?: Record<string, unknown>) => {
  if (order[level] < threshold) return;
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    msg: message,
    ...(redact(fields) as Record<string, unknown> | undefined),
  });
  // eslint-disable-next-line no-console
  (level === "error" ? console.error : console.log)(line);
};

/** Minimal structured (JSON-lines) logger that redacts credential-like keys. */
export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => write("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write("error", msg, fields),
};
