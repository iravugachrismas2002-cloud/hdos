// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";

/** Forwards rejected promises to the error middleware (Express 4 does not do this itself). */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const pageArgs = (q: { page: number; pageSize: number }) => ({
  skip: (q.page - 1) * q.pageSize,
  take: q.pageSize,
});

export const meta = (q: { page: number; pageSize: number }, total: number) => ({
  page: q.page,
  pageSize: q.pageSize,
  total,
});

export const clientIp = (req: Request): string | undefined => req.ip ?? undefined;
