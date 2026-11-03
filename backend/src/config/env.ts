// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import dotenv from "dotenv";

import { z } from "zod";

// The backend is normally started from `backend/`, while local development
// configuration is commonly kept in the repository root.
dotenv.config({ path: [".env", "../.env"] });

const boolString = z.enum(["true", "false"]).transform((v) => v === "true");
const optionalUrl = z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1).default("postgresql://hdos:hdos@localhost:5432/hdos_db?schema=public"),

  // JWT_SECRET is the documented name; JWT_ACCESS_SECRET is accepted for backwards compatibility.
  JWT_SECRET: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().optional(),

  // FRONTEND_URL is the documented name; APP_BASE_URL is accepted for backwards compatibility.
  FRONTEND_URL: optionalUrl,
  APP_BASE_URL: optionalUrl,
  BACKEND_URL: optionalUrl,
  CORS_ORIGINS: z.string().optional(),
  // Number of reverse proxies in front of the API (used for the real client IP / rate limiting).
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),

  REQUIRE_EMAIL_VERIFICATION: boolString.optional(),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("noreply@hdos.rw"),

  // AI providers, tried in order: Gemini -> DeepSeek -> Groq -> OpenRouter -> deterministic fallback.
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  DEEPSEEK_API_KEY: z.string().default(""),
  DEEPSEEK_MODEL: z.string().default("deepseek-chat"),
  GROQ_API_KEY: z.string().default(""),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  OPENROUTER_API_KEY: z.string().default(""),
  OPENROUTER_MODEL: z.string().default("meta-llama/llama-3.3-70b-instruct:free"),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),

  DOCUMENT_STORAGE_DIR: z.string().default("./private-documents"),
  DOCUMENT_ENCRYPTION_KEY: z.string().default(""),
  DOCUMENT_MAX_BYTES: z.coerce.number().int().positive().default(10485760),
  CLAMAV_HOST: z.string().default(""),
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),

  ANALYTICS_MIN_COHORT: z.coerce.number().int().min(1).default(10),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${issues}`);
}

const raw = parsed.data;
const isProd = raw.NODE_ENV === "production";
const jwtSecret = raw.JWT_SECRET || raw.JWT_ACCESS_SECRET;

// Fail fast: a production server must never fall back to a guessable signing secret.
if (isProd && (!jwtSecret || jwtSecret.length < 32)) {
  throw new Error("JWT_SECRET must be set to at least 32 characters in production");
}

const configuredFrontendUrl = raw.FRONTEND_URL ?? raw.APP_BASE_URL;
if (isProd && !configuredFrontendUrl) {
  throw new Error("APP_BASE_URL must be set to the public frontend URL in production");
}
const frontendUrl = (configuredFrontendUrl ?? "http://localhost:3000").trim().replace(/\/+$/, "");

export const env = {
  ...raw,
  isProd,
  isTest: raw.NODE_ENV === "test",
  JWT_SECRET: jwtSecret ?? "dev-only-access-secret-do-not-use-in-production",
  /** Public URL of the web app; used for links in e-mails. */
  FRONTEND_URL: frontendUrl,
  REQUIRE_EMAIL_VERIFICATION: raw.REQUIRE_EMAIL_VERIFICATION ?? isProd,
  corsOrigins: (raw.CORS_ORIGINS ?? frontendUrl).split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean),
  DOCUMENT_ENCRYPTION_KEY: raw.DOCUMENT_ENCRYPTION_KEY || "development-only-document-key-change-me",
  DOCUMENT_ENCRYPTION_CONFIGURED: raw.DOCUMENT_ENCRYPTION_KEY.length >= 32,
} as const;
