// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Operational dashboard for administrators. Everything here is aggregate: no user content is exposed.
import { Router } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { getProviderStatuses, probeProviders, type ProviderState, type ProviderStatus } from "../ai/ai.service";

export const monitoringRouter = Router();

const DAY_MS = 86_400_000;

const worst = (...states: ProviderState[]): ProviderState =>
  states.includes("offline") ? "offline" : states.includes("degraded") ? "degraded" : "online";

const checkDatabase = async (): Promise<{ status: ProviderState; latencyMs: number | null; detail: string }> => {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - started;
    return { status: latencyMs > 1500 ? "degraded" : "online", latencyMs, detail: latencyMs > 1500 ? "Slow responses" : "Connected" };
  } catch {
    return { status: "offline", latencyMs: null, detail: "Cannot reach the database" };
  }
};

/** AI is "online" if any provider works, "degraded" if only some do, "offline" if the built-in fallback is all that is left. */
const aiOverall = (providers: ProviderStatus[]): { status: ProviderState; detail: string } => {
  const configured = providers.filter((p) => p.configured);
  if (configured.length === 0) return { status: "offline", detail: "No AI provider configured; using built-in fallback answers" };
  const healthy = configured.filter((p) => p.state === "online");
  if (healthy.length === 0) return { status: "offline", detail: "All providers failing; using built-in fallback answers" };
  if (healthy.length < providers.length) return { status: "degraded", detail: `${healthy.length} of ${providers.length} providers available` };
  return { status: "online", detail: "All providers available" };
};

monitoringRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const since24h = new Date(Date.now() - DAY_MS);
    const since7d = new Date(Date.now() - 7 * DAY_MS);

    const [database, users, usersLast7d, goals, roadmaps, chatMessages, recommendationsTotal, recommendations24h, ai24h, aiAll, aiByProvider] =
      await Promise.all([
        checkDatabase(),
        prisma.user.count().catch(() => 0),
        prisma.user.count({ where: { createdAt: { gte: since7d } } }).catch(() => 0),
        prisma.goal.count().catch(() => 0),
        prisma.roadmap.count().catch(() => 0),
        prisma.chatMessage.count({ where: { role: "USER" } }).catch(() => 0),
        prisma.usageEvent.count({ where: { kind: "RECOMMENDATION" } }).catch(() => 0),
        prisma.usageEvent.count({ where: { kind: "RECOMMENDATION", createdAt: { gte: since24h } } }).catch(() => 0),
        prisma.usageEvent.groupBy({ by: ["success"], where: { kind: "AI_REQUEST", createdAt: { gte: since24h } }, _count: { _all: true } }).catch(() => []),
        prisma.usageEvent.count({ where: { kind: "AI_REQUEST" } }).catch(() => 0),
        prisma.usageEvent
          .groupBy({ by: ["provider", "success"], where: { kind: "AI_REQUEST", createdAt: { gte: since24h } }, _count: { _all: true }, _avg: { latencyMs: true } })
          .catch(() => []),
      ]);

    const providers = getProviderStatuses();
    const ai = aiOverall(providers);
    const smtpConfigured = env.SMTP_HOST !== "localhost" && env.SMTP_HOST.length > 0;

    const services = [
      { name: "API server", status: "online" as ProviderState, detail: `Uptime ${Math.round(process.uptime() / 60)} min` },
      { name: "Database", status: database.status, detail: database.latencyMs !== null ? `${database.detail} (${database.latencyMs} ms)` : database.detail },
      { name: "AI providers", status: ai.status, detail: ai.detail },
      {
        name: "Email (SMTP)",
        status: (smtpConfigured ? "online" : env.isProd ? "degraded" : "online") as ProviderState,
        detail: smtpConfigured ? `Configured (${env.SMTP_HOST})` : "Not configured; verification and reset emails are only logged",
      },
    ];

    // AI being on fallback degrades the platform but never takes it offline; the database does.
    const system = database.status === "offline" ? "offline" : worst(database.status, ai.status === "offline" ? "degraded" : ai.status, services[3].status);

    const total24 = ai24h.reduce((a, r) => a + r._count._all, 0);
    const failed24 = ai24h.filter((r) => !r.success).reduce((a, r) => a + r._count._all, 0);
    const fallback24 = aiByProvider.filter((r) => r.provider === "fallback").reduce((a, r) => a + r._count._all, 0);

    const byProvider = providers.map((p) => {
      const rows = aiByProvider.filter((r) => r.provider === p.id);
      const requests = rows.reduce((a, r) => a + r._count._all, 0);
      const failures = rows.filter((r) => !r.success).reduce((a, r) => a + r._count._all, 0);
      const latencies = rows.filter((r) => r._avg.latencyMs !== null).map((r) => r._avg.latencyMs as number);
      return { provider: p.id, requests24h: requests, failures24h: failures, avgLatencyMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null };
    });

    res.json({
      data: {
        generatedAt: new Date().toISOString(),
        system: {
          status: system,
          environment: env.NODE_ENV,
          uptimeSeconds: Math.round(process.uptime()),
          nodeVersion: process.version,
          memoryMb: Math.round(process.memoryUsage().rss / 1_048_576),
        },
        services,
        database: { status: database.status, latencyMs: database.latencyMs },
        totals: { users, usersLast7d, goals, roadmaps, chatMessages, recommendations: recommendationsTotal, recommendations24h },
        ai: {
          status: ai.status,
          providers,
          fallbackOrder: providers.map((p) => p.id),
          requestsTotal: aiAll,
          requests24h: total24,
          failures24h: failed24,
          fallbackResponses24h: fallback24,
          byProvider,
        },
      },
    });
  }),
);

/** Sends a tiny prompt to every configured provider so an admin can verify keys and connectivity. */
monitoringRouter.post(
  "/ai-probe",
  asyncHandler(async (_req, res) => {
    res.json({ data: { providers: await probeProviders() } });
  }),
);
