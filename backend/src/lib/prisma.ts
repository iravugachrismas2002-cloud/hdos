// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
    log: env.isProd || env.isTest ? ["error"] : ["warn", "error"],
  });

if (!env.isProd) globalForPrisma.prisma = prisma;
