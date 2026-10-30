// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const handler = (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) =>
  res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests, please try again later" } });

const common = { standardHeaders: true, legacyHeaders: false, handler, skip: () => env.isTest } as const;

/** Strict limiter for credential endpoints (brute-force and e-mail bombing protection). */
export const authLimiter = rateLimit({ ...common, windowMs: 15 * 60 * 1000, limit: 20 });

/** General API limiter. */
export const apiLimiter = rateLimit({ ...common, windowMs: 60 * 1000, limit: 300 });

/** Chat is conversational, so it gets a more generous (but still bounded) allowance. */
export const chatLimiter = rateLimit({ ...common, windowMs: 15 * 60 * 1000, limit: 40 });

/** AI calls cost money — keep them tight per IP. */
export const aiLimiter = rateLimit({ ...common, windowMs: 60 * 60 * 1000, limit: 30 });
