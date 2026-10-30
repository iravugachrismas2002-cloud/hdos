// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application } from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimit";
import { adminRouter, analyticsRouter } from "./modules/admin/admin.routes";
import { accountRouter, authRouter } from "./modules/auth/auth.routes";
import { chatRouter } from "./modules/ai/chat.routes";
import { catalogRouter } from "./modules/catalog/catalog.routes";
import { goalsRouter } from "./modules/goals/goals.routes";
import { insightsRouter } from "./modules/insights/insights.routes";
import { profileRouter } from "./modules/profile/profile.routes";

/** Builds the Express app without listening, so tests can drive it with supertest. */
export const createApp = (): Application => {
  const app = express();

  // Behind reverse proxies (Render, Nginx, the Next.js rewrite) the real client IP is needed for rate limiting.
  if (env.isProd) app.set("trust proxy", env.TRUST_PROXY_HOPS);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    const started = Date.now();
    res.on("finish", () => {
      logger.info("http", { method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - started });
    });
    next();
  });

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", db: "up" });
    } catch {
      res.status(503).json({ status: "degraded", db: "down" });
    }
  });

  app.use("/api", apiLimiter);
  app.use("/api/auth", authRouter);
  app.use("/api/account", accountRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/catalog", catalogRouter);
  app.use("/api/insights", insightsRouter);
  app.use("/api/goals", goalsRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/admin", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
