// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import type { RequestHandler } from "express";
import { ZodError, type ZodTypeAny } from "zod";
import { AppError } from "../lib/errors";

type Source = "body" | "query" | "params";

export const toDetails = (error: ZodError) =>
  error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));

/**
 * Validates and *replaces* the chosen request part with the parsed (coerced, stripped) value, so
 * handlers only ever see data that matches the schema.
 */
export const validate =
  (schema: ZodTypeAny, source: Source = "body"): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(AppError.badRequest("Validation failed", "VALIDATION_ERROR", toDetails(result.error)));
    }
    // Express 4 allows reassigning these properties.
    (req as unknown as Record<Source, unknown>)[source] = result.data;
    return next();
  };
