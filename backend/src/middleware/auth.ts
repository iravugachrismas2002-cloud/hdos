// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env";
import { AppError } from "../lib/errors";

export const JWT_ISSUER = "hdos-rwanda";
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

const ROLES: readonly Role[] = [
  "STUDENT",
  "GRADUATE",
  "JOB_SEEKER",
  "ENTREPRENEUR",
  "PROFESSIONAL",
  "GOVERNMENT_ANALYST",
  "ADMINISTRATOR",
];

const isRole = (value: unknown): value is Role => typeof value === "string" && ROLES.includes(value as Role);

export const signAccessToken = (userId: string, role: Role): string =>
  jwt.sign({ role }, env.JWT_SECRET, {
    algorithm: "HS256",
    issuer: JWT_ISSUER,
    subject: userId,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });

/** Verifies the bearer token. Algorithm and issuer are pinned to defeat `alg: none` style attacks. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(AppError.unauthorized("Missing bearer token"));
  }
  try {
    const claims = jwt.verify(header.slice(7), env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
    });
    if (
      typeof claims !== "object" ||
      claims === null ||
      typeof claims.sub !== "string" ||
      claims.sub.length === 0 ||
      !isRole(claims.role)
    ) {
      return next(AppError.unauthorized("Invalid access token", "INVALID_TOKEN"));
    }
    req.auth = { userId: claims.sub, role: claims.role };
    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(AppError.unauthorized("Access token expired", "TOKEN_EXPIRED"));
    }
    return next(AppError.unauthorized("Invalid access token", "INVALID_TOKEN"));
  }
};

/** Must run after `authenticate`. */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) return next(AppError.unauthorized());
    if (!roles.includes(req.auth.role)) return next(AppError.forbidden());
    return next();
  };

/** Returns the authenticated user id or throws; keeps handlers free of non-null assertions. */
export const currentUserId = (req: Express.Request): string => {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth.userId;
};
