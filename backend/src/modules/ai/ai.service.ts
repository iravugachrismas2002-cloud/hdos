// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Provider chain with failover: Gemini -> Groq -> OpenRouter. Callers always supply a deterministic
// fallback, so an AI outage can degrade quality but never break a feature.
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { trackUsage } from "../../lib/usage";
import { PROVIDERS, type CompletionRequest, type Provider, type ProviderId } from "./providers";

export type AiFeature = "explain" | "roadmap" | "guidance" | "skills" | "chat" | "probe";

export interface AiResult {
  text: string;
  /** Provider that answered, or "fallback" when every provider was unavailable. */
  provider: ProviderId | "fallback";
  model: string | null;
  generatedBy: "ai" | "template";
}

export type ProviderState = "online" | "degraded" | "offline";

interface Health {
  consecutiveFailures: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastError: string | null;
  lastLatencyMs: number | null;
}

const health = new Map<ProviderId, Health>(
  PROVIDERS.map((p) => [p.id, { consecutiveFailures: 0, lastSuccessAt: null, lastFailureAt: null, lastError: null, lastLatencyMs: null }]),
);

/** After this many consecutive failures a provider is skipped for COOLDOWN_MS so requests fail over fast. */
const BREAKER_THRESHOLD = 3;
const COOLDOWN_MS = 60_000;

const isCoolingDown = (p: Provider): boolean => {
  const h = health.get(p.id);
  return !!h && h.consecutiveFailures >= BREAKER_THRESHOLD && h.lastFailureAt !== null && Date.now() - h.lastFailureAt < COOLDOWN_MS;
};

const recordSuccess = (p: Provider, latencyMs: number) => {
  const h = health.get(p.id);
  if (!h) return;
  h.consecutiveFailures = 0;
  h.lastSuccessAt = Date.now();
  h.lastLatencyMs = latencyMs;
  h.lastError = null;
};

const recordFailure = (p: Provider, error: string) => {
  const h = health.get(p.id);
  if (!h) return;
  h.consecutiveFailures += 1;
  h.lastFailureAt = Date.now();
  h.lastError = error;
};

export interface GenerateOptions {
  feature: AiFeature;
  system: string;
  prompt: string;
  history?: CompletionRequest["history"];
  temperature?: number;
  maxTokens?: number;
  maxChars?: number;
  /** Deterministic text used when no provider can answer. */
  fallback: string;
  /** Skip providers still in cool-down only when others exist (default true). */
  respectBreaker?: boolean;
}

/** Never rejects: always resolves with provider text or the caller's fallback. */
export const generateText = async (opts: GenerateOptions): Promise<AiResult> => {
  const request: CompletionRequest = {
    system: opts.system,
    prompt: opts.prompt,
    history: opts.history,
    temperature: opts.temperature ?? 0.3,
    maxTokens: opts.maxTokens ?? 600,
    timeoutMs: env.AI_TIMEOUT_MS,
  };

  const configured = PROVIDERS.filter((p) => p.isConfigured());
  const ready = configured.filter((p) => !isCoolingDown(p));
  // If every configured provider is cooling down, try them anyway rather than fail without trying.
  const candidates = opts.respectBreaker === false || ready.length === 0 ? configured : ready;

  for (const provider of candidates) {
    const started = Date.now();
    try {
      const raw = await provider.complete(request);
      const text = opts.maxChars ? raw.slice(0, opts.maxChars) : raw;
      const latencyMs = Date.now() - started;
      recordSuccess(provider, latencyMs);
      trackUsage({ kind: "AI_REQUEST", feature: opts.feature, provider: provider.id, success: true, latencyMs });
      return { text, provider: provider.id, model: provider.model(), generatedBy: "ai" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      recordFailure(provider, message);
      trackUsage({ kind: "AI_REQUEST", feature: opts.feature, provider: provider.id, success: false, latencyMs: Date.now() - started, errorCode: message.slice(0, 60) });
      logger.warn("ai_provider_failed", { provider: provider.id, feature: opts.feature, error: message });
    }
  }

  trackUsage({ kind: "AI_REQUEST", feature: opts.feature, provider: "fallback", success: true });
  return { text: opts.fallback, provider: "fallback", model: null, generatedBy: "template" };
};

export interface ProviderStatus {
  id: ProviderId;
  label: string;
  model: string;
  configured: boolean;
  state: ProviderState;
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  lastLatencyMs: number | null;
}

const stateOf = (configured: boolean, h: Health): ProviderState => {
  if (!configured) return "offline";
  if (h.consecutiveFailures >= BREAKER_THRESHOLD) return "offline";
  if (h.consecutiveFailures > 0) return "degraded";
  return "online";
};

export const getProviderStatuses = (): ProviderStatus[] =>
  PROVIDERS.map((p) => {
    const h = health.get(p.id) as Health;
    const configured = p.isConfigured();
    return {
      id: p.id,
      label: p.label,
      model: p.model(),
      configured,
      state: stateOf(configured, h),
      consecutiveFailures: h.consecutiveFailures,
      lastSuccessAt: h.lastSuccessAt ? new Date(h.lastSuccessAt).toISOString() : null,
      lastFailureAt: h.lastFailureAt ? new Date(h.lastFailureAt).toISOString() : null,
      lastError: h.lastError,
      lastLatencyMs: h.lastLatencyMs,
    };
  });

/** Sends a tiny prompt to each configured provider (admin "test" button). Costs a few tokens per provider. */
export const probeProviders = async (): Promise<ProviderStatus[]> => {
  await Promise.all(
    PROVIDERS.filter((p) => p.isConfigured()).map(async (p) => {
      const started = Date.now();
      try {
        await p.complete({ system: "Reply with the single word: ok", prompt: "ping", temperature: 0, maxTokens: 8, timeoutMs: env.AI_TIMEOUT_MS });
        recordSuccess(p, Date.now() - started);
      } catch (error) {
        recordFailure(p, error instanceof Error ? error.message : "unknown error");
      }
    }),
  );
  return getProviderStatuses();
};

/** Test hook: resets in-memory provider health. */
export const resetProviderHealth = (): void => {
  for (const h of health.values()) {
    h.consecutiveFailures = 0;
    h.lastSuccessAt = null;
    h.lastFailureAt = null;
    h.lastError = null;
    h.lastLatencyMs = null;
  }
};
