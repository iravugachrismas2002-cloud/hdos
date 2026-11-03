// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { z } from "zod";

/** Roles a person may pick for themselves. Privileged roles are granted only by an administrator. */
export const SELF_ASSIGNABLE_ROLES = ["STUDENT", "GRADUATE", "JOB_SEEKER", "ENTREPRENEUR", "PROFESSIONAL"] as const;

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number");

export const registerSchema = z.object({
  email,
  password: passwordSchema,
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80).optional(),
  role: z.enum(SELF_ASSIGNABLE_ROLES).default("STUDENT"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(128),
});

export const tokenSchema = z.object({ token: z.string().min(10).max(200) });
export const emailOnlySchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(10).max(200), password: passwordSchema });
export const deleteAccountSchema = z.object({ password: z.string().min(1).max(128) });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
