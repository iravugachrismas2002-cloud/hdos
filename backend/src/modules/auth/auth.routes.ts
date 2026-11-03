// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { Router, type CookieOptions, type Request, type Response } from "express";
import { env } from "../../config/env";
import { asyncHandler, clientIp } from "../../lib/http";
import { authenticate, currentUserId } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import {
  deleteAccountSchema,
  emailOnlySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from "./auth.schemas";
import * as auth from "./auth.service";

export const REFRESH_COOKIE = "hdos_rt";

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: "lax", // blocks cross-site POSTs to /auth/refresh (CSRF)
  path: "/api",
};

const ctx = (req: Request): auth.RequestContext => ({ ip: clientIp(req), userAgent: req.get("user-agent") });

const sendSession = (res: Response, session: auth.Session) => {
  res.cookie(REFRESH_COOKIE, session.refreshToken, { ...cookieOptions, maxAge: auth.REFRESH_TTL_MS });
  res.json({ data: { accessToken: session.accessToken, user: session.user } });
};

export const authRouter = Router();

authRouter.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await auth.registerUser(req.body, ctx(req)) });
  }),
);

authRouter.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => sendSession(res, await auth.loginUser(req.body, ctx(req)))),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    try {
      sendSession(res, await auth.refreshSession(req.cookies?.[REFRESH_COOKIE], ctx(req)));
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, cookieOptions);
      throw error;
    }
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await auth.logoutSession(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    res.status(204).end();
  }),
);

authRouter.post(
  "/verify-email",
  authLimiter,
  validate(tokenSchema),
  asyncHandler(async (req, res) => {
    res.json({ data: await auth.verifyEmail(req.body.token, ctx(req)) });
  }),
);

authRouter.post(
  "/resend-verification",
  authLimiter,
  validate(emailOnlySchema),
  asyncHandler(async (req, res) => {
    await auth.resendVerification(req.body.email);
    res.status(202).json({ data: { message: "If the account exists and is unverified, a new link has been sent." } });
  }),
);

authRouter.post(
  "/forgot-password",
  authLimiter,
  validate(emailOnlySchema),
  asyncHandler(async (req, res) => {
    await auth.forgotPassword(req.body.email, ctx(req));
    res.status(202).json({ data: { message: "If an account exists for this email, a reset link has been sent." } });
  }),
);

authRouter.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    res.json({ data: await auth.resetPassword(req.body.token, req.body.password, ctx(req)) });
  }),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ data: { user: await auth.getMe(currentUserId(req)) } });
  }),
);

export const accountRouter = Router();

accountRouter.delete(
  "/",
  authenticate,
  authLimiter,
  validate(deleteAccountSchema),
  asyncHandler(async (req, res) => {
    await auth.deleteAccount(currentUserId(req), req.body.password, ctx(req));
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    res.status(204).end();
  }),
);
