// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { toDetails } from "./validate";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Route not found: ${req.method} ${req.path}`, "ROUTE_NOT_FOUND"));
};

/** Single place that turns any thrown value into the documented `{ error }` envelope. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Validation failed", details: toDetails(err) },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: { code: "CONFLICT", message: "A record with these values already exists" } });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found" } });
    }
  }

  // Body-parser failures (malformed JSON, payload too large) carry a numeric `status`.
  const status = (err as { status?: number }).status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    return res.status(status).json({ error: { code: "BAD_REQUEST", message: "Malformed request" } });
  }

  logger.error("unhandled_error", { method: req.method, path: req.path, error: String(err), stack: (err as Error)?.stack });
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
};
