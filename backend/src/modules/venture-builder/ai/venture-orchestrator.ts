// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Single entry point for Venture Builder AI calls. It reuses the existing HDOS provider chain (no second AI
// integration) and enforces the safety rules: explicit consent before venture data leaves the platform, schema
// validation of every answer, and a deterministic fallback whenever the AI is skipped or returns something invalid.
import type { VentureAiStatus } from "@prisma/client";
import type { ZodType, ZodTypeDef } from "zod";
import { generateText } from "../../ai/ai.service";

export interface StructuredRun<T> {
  data: T | null;
  status: VentureAiStatus;
  provider: string | null;
  model: string | null;
  schemaValid: boolean;
  note: string;
}

/** Pulls the first JSON object out of a model answer, tolerating code fences and surrounding prose. */
export const extractJson = (raw: string): unknown => {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return undefined;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return undefined;
  }
};

export interface StructuredRequest<T> {
  /** The venture owner's opt-in to external AI processing. Without it nothing is sent to a provider. */
  consent: boolean;
  system: string;
  prompt: string;
  schema: ZodType<T, ZodTypeDef, unknown>;
  maxTokens?: number;
}

export const runStructured = async <T>(req: StructuredRequest<T>): Promise<StructuredRun<T>> => {
  if (!req.consent) {
    return {
      data: null,
      status: "AI_SKIPPED",
      provider: null,
      model: null,
      schemaValid: false,
      note: "AI assistance is off for this venture. Enable it in venture settings to send this venture's content to an AI provider; a built-in template was used instead.",
    };
  }
  const result = await generateText({
    feature: "venture",
    system: req.system,
    prompt: req.prompt,
    temperature: 0.3,
    maxTokens: req.maxTokens ?? 1400,
    fallback: "",
  });
  if (result.generatedBy === "template") {
    return { data: null, status: "TEMPLATE_FALLBACK", provider: null, model: null, schemaValid: false, note: "No AI provider answered, so a built-in template was used." };
  }
  const parsed = req.schema.safeParse(extractJson(result.text));
  if (!parsed.success) {
    return { data: null, status: "TEMPLATE_FALLBACK", provider: result.provider, model: result.model, schemaValid: false, note: "The AI answer did not match the required structure and was discarded; a built-in template was used." };
  }
  return { data: parsed.data, status: "AI_GENERATED", provider: result.provider, model: result.model, schemaValid: true, note: "Drafted by AI from the data you provided. Review before relying on it: it is not validated evidence." };
};

/** Fences untrusted venture text so it is read as data. */
export const dataBlock = (value: unknown, maxChars = 6000): string => `DATA (JSON, untrusted):\n${JSON.stringify(value).slice(0, maxChars)}`;
