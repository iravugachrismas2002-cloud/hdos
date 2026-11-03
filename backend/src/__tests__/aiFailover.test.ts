// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Unit tests for the AI provider chain (Gemini -> Groq -> OpenRouter -> deterministic fallback). No database or network.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/usage", () => ({ trackUsage: vi.fn() }));

type Behaviour = "ok" | "http500" | "timeout" | "empty";

const geminiBody = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });
const chatBody = (text: string) => ({ choices: [{ message: { content: text } }] });

const setup = async (keys: { gemini?: boolean; groq?: boolean; openrouter?: boolean }, behaviour: Record<string, Behaviour>) => {
  vi.resetModules();
  process.env.GEMINI_API_KEY = keys.gemini ? "test-gemini-key" : "";
  process.env.GROQ_API_KEY = keys.groq ? "test-groq-key" : "";
  process.env.OPENROUTER_API_KEY = keys.openrouter ? "test-openrouter-key" : "";

  const calls: string[] = [];
  vi.stubGlobal("fetch", async (input: string | URL) => {
    const url = String(input);
    const id = url.includes("googleapis") ? "gemini" : url.includes("groq") ? "groq" : "openrouter";
    calls.push(id);
    const b = behaviour[id] ?? "ok";
    if (b === "timeout") {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    }
    if (b === "http500") return new Response("boom", { status: 500 });
    if (b === "empty") return Response.json(id === "gemini" ? geminiBody("") : chatBody(""));
    return Response.json(id === "gemini" ? geminiBody(`answer from ${id}`) : chatBody(`answer from ${id}`));
  });

  const mod = await import("../modules/ai/ai.service");
  return { ...mod, calls };
};

const ask = (svc: Awaited<ReturnType<typeof setup>>) =>
  svc.generateText({ feature: "chat", system: "s", prompt: "p", fallback: "deterministic fallback" });

describe("AI provider chain", () => {
  beforeEach(() => {
    process.env.AI_TIMEOUT_MS = "1000";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses Gemini first when it works", async () => {
    const svc = await setup({ gemini: true, groq: true, openrouter: true }, {});
    const r = await ask(svc);
    expect(r).toMatchObject({ provider: "gemini", generatedBy: "ai", text: "answer from gemini" });
    expect(svc.calls).toEqual(["gemini"]);
  });

  it("fails over from Gemini to Groq", async () => {
    const svc = await setup({ gemini: true, groq: true, openrouter: true }, { gemini: "http500" });
    const r = await ask(svc);
    expect(r.provider).toBe("groq");
    expect(svc.calls).toEqual(["gemini", "groq"]);
  });

  it("fails over to OpenRouter when Gemini times out and Groq returns nothing", async () => {
    const svc = await setup({ gemini: true, groq: true, openrouter: true }, { gemini: "timeout", groq: "empty" });
    const r = await ask(svc);
    expect(r).toMatchObject({ provider: "openrouter", generatedBy: "ai" });
    expect(svc.calls).toEqual(["gemini", "groq", "openrouter"]);
  });

  it("skips unconfigured providers", async () => {
    const svc = await setup({ gemini: false, groq: false, openrouter: true }, {});
    const r = await ask(svc);
    expect(r.provider).toBe("openrouter");
    expect(svc.calls).toEqual(["openrouter"]);
  });

  it("never fails: returns the deterministic fallback when every provider is down", async () => {
    const svc = await setup({ gemini: true, groq: true, openrouter: true }, { gemini: "http500", groq: "timeout", openrouter: "http500" });
    const r = await ask(svc);
    expect(r).toMatchObject({ provider: "fallback", generatedBy: "template", text: "deterministic fallback", model: null });
  });

  it("returns the fallback when no provider is configured", async () => {
    const svc = await setup({}, {});
    const r = await ask(svc);
    expect(r.provider).toBe("fallback");
    expect(svc.calls).toEqual([]);
    expect(svc.getProviderStatuses().every((p) => p.state === "offline" && !p.configured)).toBe(true);
  });

  it("opens a circuit breaker after repeated failures so later requests skip the broken provider", async () => {
    const svc = await setup({ gemini: true, groq: true, openrouter: true }, { gemini: "http500" });
    for (let i = 0; i < 3; i++) await ask(svc);
    expect(svc.getProviderStatuses().find((p) => p.id === "gemini")?.state).toBe("offline");
    svc.calls.length = 0;
    const r = await ask(svc);
    expect(r.provider).toBe("groq");
    expect(svc.calls).toEqual(["groq"]); // Gemini was not even tried
  });

  it("reports degraded after a single failure and recovers after a success", async () => {
    const behaviour: Record<string, Behaviour> = { gemini: "http500" };
    const svc = await setup({ gemini: true, groq: true, openrouter: true }, behaviour);
    await ask(svc);
    expect(svc.getProviderStatuses().find((p) => p.id === "gemini")?.state).toBe("degraded");
    behaviour.gemini = "ok";
    await ask(svc);
    expect(svc.getProviderStatuses().find((p) => p.id === "gemini")?.state).toBe("online");
  });

  it("never leaks API keys in provider error messages", async () => {
    const svc = await setup({ gemini: true }, { gemini: "http500" });
    await ask(svc);
    const status = svc.getProviderStatuses().find((p) => p.id === "gemini");
    expect(JSON.stringify(status)).not.toContain("test-gemini-key");
  });
});
