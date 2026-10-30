// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import bcrypt from "bcryptjs";
import type { Role, TokenPurpose, User } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { audit } from "../../lib/audit";
import { randomToken, sha256 } from "../../lib/crypto";
import { signAccessToken } from "../../middleware/auth";
import { profileCompleteness } from "../profile/completeness";
import { sendPasswordResetEmail, sendVerificationEmail } from "./mailer";
import type { LoginInput, RegisterInput } from "./auth.schemas";

const BCRYPT_ROUNDS = 12;
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
/** Concurrent tabs may legitimately present the same just-rotated token; tolerate a short window. */
const REUSE_GRACE_MS = 10_000;

/**
 * Ends sessions deliberately (logout, password reset, role change). The revocation time is back-dated past
 * REUSE_GRACE_MS so the concurrent-tab grace window can never resurrect a session that was ended on purpose.
 */
export const revokeSessions = async (where: { userId?: string; familyId?: string }): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { ...where, revokedAt: null },
    data: { revokedAt: new Date(Date.now() - REUSE_GRACE_MS - 1000) },
  });
};

// Compared against when the e-mail is unknown so response time does not reveal account existence.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_ROUNDS);

export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  emailVerified: boolean;
  profileComplete: boolean;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

const toPublicUser = async (user: Pick<User, "id" | "email" | "name" | "role" | "emailVerified">): Promise<PublicUser> => {
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: {
      educationLevel: true,
      districtId: true,
      birthYear: true,
      bio: true,
      targetMonthlyIncomeRwf: true,
      _count: { select: { skills: true, interests: true } },
    },
  });
  const completeness = profile
    ? profileCompleteness({
        educationLevel: profile.educationLevel,
        districtId: profile.districtId,
        birthYear: profile.birthYear,
        bio: profile.bio,
        targetMonthlyIncomeRwf: profile.targetMonthlyIncomeRwf,
        skillCount: profile._count.skills,
        interestCount: profile._count.interests,
      })
    : 0;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
    // "Complete enough for useful matches": education + at least one skill.
    profileComplete: completeness >= 55,
  };
};

const createOneTimeToken = async (userId: string, purpose: TokenPurpose, ttlMs: number): Promise<string> => {
  // Invalidate earlier unused tokens of the same purpose so only the latest link works.
  await prisma.oneTimeToken.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });
  const raw = randomToken();
  await prisma.oneTimeToken.create({
    data: { userId, purpose, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return raw;
};

const createRefreshToken = async (userId: string, familyId: string, ctx: RequestContext): Promise<string> => {
  const raw = randomToken(48);
  await prisma.refreshToken.create({
    data: {
      userId,
      familyId,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      userAgent: ctx.userAgent?.slice(0, 255),
      ip: ctx.ip,
    },
  });
  return raw;
};

const startSession = async (user: User, familyId: string, ctx: RequestContext): Promise<Session> => ({
  accessToken: signAccessToken(user.id, user.role),
  refreshToken: await createRefreshToken(user.id, familyId, ctx),
  user: await toPublicUser(user),
});

export const registerUser = async (input: RegisterInput, ctx: RequestContext) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw AppError.conflict("An account with this email already exists", "EMAIL_TAKEN");

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    },
  });

  const token = await createOneTimeToken(user.id, "VERIFY_EMAIL", VERIFY_TTL_MS);
  await sendVerificationEmail(user.email, user.name, token);
  await audit({ action: "auth.register", actorId: user.id, ip: ctx.ip });

  return { user: await toPublicUser(user), requiresVerification: env.REQUIRE_EMAIL_VERIFICATION };
};

export const loginUser = async (input: LoginInput, ctx: RequestContext): Promise<Session> => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid) {
    await audit({ action: "auth.login_failed", targetId: user?.id, ip: ctx.ip });
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }
  if (env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
    throw AppError.forbidden("Please verify your email before signing in", "EMAIL_NOT_VERIFIED");
  }

  await audit({ action: "auth.login", actorId: user.id, ip: ctx.ip });
  return startSession(user, randomToken(12), ctx);
};

/** Rotates the refresh token. Replaying an already-rotated token revokes the whole family. */
export const refreshSession = async (rawToken: string | undefined, ctx: RequestContext): Promise<Session> => {
  if (!rawToken) throw AppError.unauthorized("No refresh token", "NO_REFRESH_TOKEN");

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: { user: true },
  });
  if (!stored || stored.expiresAt < new Date()) {
    throw AppError.unauthorized("Session expired", "INVALID_REFRESH_TOKEN");
  }

  if (stored.revokedAt) {
    const withinGrace = Date.now() - stored.revokedAt.getTime() < REUSE_GRACE_MS;
    if (!withinGrace) {
      await prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await audit({ action: "auth.refresh_reuse_detected", actorId: stored.userId, ip: ctx.ip });
      throw AppError.unauthorized("Session expired", "INVALID_REFRESH_TOKEN");
    }
  } else {
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  }

  return startSession(stored.user, stored.familyId, ctx);
};

export const logoutSession = async (rawToken: string | undefined): Promise<void> => {
  if (!rawToken) return;
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(rawToken) }, select: { familyId: true } });
  if (stored) await revokeSessions({ familyId: stored.familyId });
};

/** Consumes a single-use token atomically; returns the owning user id or throws. */
const consumeOneTimeToken = async (raw: string, purpose: TokenPurpose): Promise<string> => {
  const record = await prisma.oneTimeToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt < new Date()) {
    throw AppError.badRequest("This link is invalid or has expired", "INVALID_TOKEN");
  }
  // `updateMany` with the usedAt guard makes consumption race-safe: only one caller gets count === 1.
  const claimed = await prisma.oneTimeToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) throw AppError.badRequest("This link is invalid or has expired", "INVALID_TOKEN");
  return record.userId;
};

export const verifyEmail = async (token: string, ctx: RequestContext) => {
  const userId = await consumeOneTimeToken(token, "VERIFY_EMAIL");
  await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
  await audit({ action: "auth.email_verified", actorId: userId, ip: ctx.ip });
  return { message: "Email verified. You can now sign in." };
};

export const resendVerification = async (email: string): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) return; // silent: no account enumeration
  const token = await createOneTimeToken(user.id, "VERIFY_EMAIL", VERIFY_TTL_MS);
  await sendVerificationEmail(user.email, user.name, token);
};

export const forgotPassword = async (email: string, ctx: RequestContext): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // silent: no account enumeration
  const token = await createOneTimeToken(user.id, "RESET_PASSWORD", RESET_TTL_MS);
  await sendPasswordResetEmail(user.email, user.name, token);
  await audit({ action: "auth.password_reset_requested", actorId: user.id, ip: ctx.ip });
};

export const resetPassword = async (token: string, password: string, ctx: RequestContext) => {
  const userId = await consumeOneTimeToken(token, "RESET_PASSWORD");
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) } }),
    // A reset means the old credentials may be compromised: end every session.
  ]);
  await revokeSessions({ userId });
  await audit({ action: "auth.password_reset", actorId: userId, ip: ctx.ip });
  return { message: "Password updated. You can now sign in with your new password." };
};

export const getMe = async (userId: string): Promise<PublicUser> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized("Account no longer exists", "INVALID_TOKEN");
  return toPublicUser(user);
};

export const deleteAccount = async (userId: string, password: string, ctx: RequestContext): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw AppError.forbidden("Password is incorrect", "INVALID_CREDENTIALS");
  }
  // All personal data (profile, goals, roadmaps, tokens) is removed by ON DELETE CASCADE.
  await prisma.user.delete({ where: { id: userId } });
  await audit({ action: "account.deleted", actorId: null, targetId: userId, ip: ctx.ip });
};
