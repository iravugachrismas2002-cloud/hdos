// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Thin HTTP adapters for the three supported LLM providers. Secrets come only from environment variables.
import { env } from "../../config/env";

export type ProviderId = "gemini" | "deepseek" | "groq" | "openrouter";

export interface CompletionRequest {
  system: string;
  prompt: string;
  /** Prior turns, oldest first (chat only). */
  history?: { role: "user" | "assistant"; content: string }[];
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

export interface Provider {
  id: ProviderId;
  label: string;
  model: () => string;
  isConfigured: () => boolean;
  complete: (req: CompletionRequest) => Promise<string>;
}

export class ProviderError extends Error {
  constructor(
    public readonly provider: ProviderId,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

const postJson = async (provider: ProviderId, url: string, headers: Record<string, string>, body: unknown, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      // Never include the response body in logs/errors verbatim: it can echo request content.
      throw new ProviderError(provider, `HTTP ${res.status}`, res.status);
    }
    return (await res.json()) as unknown;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new ProviderError(provider, "timeout");
    throw new ProviderError(provider, "network error");
  } finally {
    clearTimeout(timer);
  }
};

const nonEmpty = (provider: ProviderId, text: unknown): string => {
  if (typeof text !== "string" || !text.trim()) throw new ProviderError(provider, "empty response");
  return text.trim();
};

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}
interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

const gemini: Provider = {
  id: "gemini",
  label: "Google Gemini",
  model: () => env.GEMINI_MODEL,
  isConfigured: () => env.GEMINI_API_KEY.length > 0,
  complete: async (req) => {
    const contents = [
      ...(req.history ?? []).map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      { role: "user", parts: [{ text: req.prompt }] },
    ];
    const data = (await postJson(
      "gemini",
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`,
      { "x-goog-api-key": env.GEMINI_API_KEY },
      {
        systemInstruction: { parts: [{ text: req.system }] },
        contents,
        generationConfig: { temperature: req.temperature, maxOutputTokens: req.maxTokens },
      },
      req.timeoutMs,
    )) as GeminiResponse;
    return nonEmpty("gemini", data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join(""));
  },
};

const openAiCompatible = (
  id: ProviderId,
  label: string,
  url: string,
  key: () => string,
  model: () => string,
  extraHeaders: Record<string, string> = {},
): Provider => ({
  id,
  label,
  model,
  isConfigured: () => key().length > 0,
  complete: async (req) => {
    const data = (await postJson(
      id,
      url,
      { Authorization: `Bearer ${key()}`, ...extraHeaders },
      {
        model: model(),
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        messages: [{ role: "system", content: req.system }, ...(req.history ?? []), { role: "user", content: req.prompt }],
      },
      req.timeoutMs,
    )) as ChatCompletionResponse;
    return nonEmpty(id, data.choices?.[0]?.message?.content);
  },
});

const groq = openAiCompatible(
  "groq",
  "Groq",
  "https://api.groq.com/openai/v1/chat/completions",
  () => env.GROQ_API_KEY,
  () => env.GROQ_MODEL,
);

const deepseek = openAiCompatible(
  "deepseek",
  "DeepSeek",
  "https://api.deepseek.com/chat/completions",
  () => env.DEEPSEEK_API_KEY,
  () => env.DEEPSEEK_MODEL,
);

const openrouter = openAiCompatible(
  "openrouter",
  "OpenRouter",
  "https://openrouter.ai/api/v1/chat/completions",
  () => env.OPENROUTER_API_KEY,
  () => env.OPENROUTER_MODEL,
  { "HTTP-Referer": env.FRONTEND_URL, "X-Title": "HDOS Rwanda" },
);

/** Failover order: Gemini -> DeepSeek -> Groq -> OpenRouter. */
export const PROVIDERS: readonly Provider[] = [gemini, deepseek, groq, openrouter];
