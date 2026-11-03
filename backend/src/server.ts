// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";

const app = createApp();
const server = app.listen(env.PORT, () => logger.info("server_started", { port: env.PORT, env: env.NODE_ENV }));

const shutdown = (signal: string) => {
  logger.info("shutdown", { signal });
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => logger.error("unhandled_rejection", { reason: String(reason) }));
