// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { audit } from "../../lib/audit";
import { AppError } from "../../lib/errors";
import { asyncHandler, clientIp, meta, pageArgs, paginationSchema } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { authenticate, currentUserId, requireRole } from "../../middleware/auth";
import { revokeSessions } from "../auth/auth.service";
import { validate } from "../../middleware/validate";
import { monitoringRouter } from "./monitoring.routes";
import { suppressSmallCells } from "./suppression";

const ROLES = [
  "STUDENT", "GRADUATE", "JOB_SEEKER", "ENTREPRENEUR", "PROFESSIONAL", "GOVERNMENT_ANALYST", "ADMINISTRATOR",
] as const;

export const analyticsRouter = Router();
analyticsRouter.use(authenticate, requireRole("GOVERNMENT_ANALYST", "ADMINISTRATOR"));

/** Aggregate-only view for institutions and government. No row-level personal data is ever returned. */
analyticsRouter.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const min = env.ANALYTICS_MIN_COHORT;
    const [totalUsers, byRole, byCategory, byDistrict, byOccupation] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.goal.groupBy({ by: ["category"], _count: { _all: true } }),
      prisma.$queryRaw<{ key: string; count: number }[]>`
        SELECT d."name" AS key, COUNT(*)::int AS count
        FROM "Goal" g
        JOIN "Profile" p ON p."userId" = g."userId"
        JOIN "District" d ON d."id" = p."districtId"
        GROUP BY d."name"
        ORDER BY count DESC`,
      prisma.goal.groupBy({
        by: ["targetOccupationId"],
        where: { targetOccupationId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { targetOccupationId: "desc" } },
        take: 10,
      }),
    ]);

    const occupations = await prisma.occupation.findMany({
      where: { id: { in: byOccupation.map((o) => o.targetOccupationId).filter((x): x is string => !!x) } },
      select: { id: true, title: true },
    });
    const titleById = new Map(occupations.map((o) => [o.id, o.title]));

    res.json({
      data: {
        totalUsers,
        minimumCohort: min,
        usersByRole: suppressSmallCells(byRole.map((r) => ({ key: r.role, count: r._count._all })), min),
        goalsByCategory: suppressSmallCells(byCategory.map((r) => ({ key: r.category, count: r._count._all })), min),
        goalsByDistrict: suppressSmallCells(byDistrict, min),
        topTargetOccupations: suppressSmallCells(
          byOccupation.map((r) => ({ key: titleById.get(r.targetOccupationId ?? "") ?? "Unknown", count: r._count._all })),
          min,
        ),
      },
    });
  }),
);

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole("ADMINISTRATOR"));
adminRouter.use("/monitoring", monitoringRouter);

adminRouter.get(
  "/users",
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof paginationSchema>;
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, emailVerified: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        ...pageArgs(query),
      }),
      prisma.user.count(),
    ]);
    res.json({ data: rows.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })), meta: meta(query, total) });
  }),
);

adminRouter.patch(
  "/users/:id/role",
  validate(z.object({ role: z.enum(ROLES) })),
  asyncHandler(async (req, res) => {
    const actorId = currentUserId(req);
    if (req.params.id === actorId) throw AppError.badRequest("You cannot change your own role", "SELF_ROLE_CHANGE");

    const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true } });
    if (!target) throw AppError.notFound("User not found");

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { role: req.body.role },
      select: { id: true, email: true, name: true, role: true, emailVerified: true, createdAt: true },
    });
    // Existing sessions keep their old role in the access token for at most 15 minutes; end them now.
    await revokeSessions({ userId: target.id });
    await audit({
      action: "admin.role_changed",
      actorId,
      targetId: target.id,
      ip: clientIp(req),
      metadata: { from: target.role, to: req.body.role },
    });
    res.json({ data: { ...updated, createdAt: updated.createdAt.toISOString() } });
  }),
);

adminRouter.get(
  "/audit-log",
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof paginationSchema>;
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, ...pageArgs(query) }),
      prisma.auditLog.count(),
    ]);
    res.json({
      data: rows.map((r) => ({ id: r.id, action: r.action, actorId: r.actorId, targetId: r.targetId, ip: r.ip, createdAt: r.createdAt.toISOString() })),
      meta: meta(query, total),
    });
  }),
);
