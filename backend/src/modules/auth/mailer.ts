// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
  return transporter;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const layout = (heading: string, body: string, cta: { url: string; label: string }) => `<!doctype html>
<html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
  <div style="max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
    <h2 style="margin-top:0">${heading}</h2>
    <p>${body}</p>
    <p><a href="${cta.url}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">${cta.label}</a></p>
    <p style="font-size:12px;color:#6b7280">If the button does not work, copy this link into your browser:<br>${cta.url}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb"><p style="font-size:12px;color:#9ca3af">HDOS Rwanda</p>
  </div></body></html>`;

/** Delivery failures are logged, never thrown: a flaky SMTP server must not turn into a 500 or reveal account existence. */
const send = async (to: string, subject: string, html: string, devLink: string): Promise<void> => {
  try {
    await getTransporter().sendMail({ from: `HDOS Rwanda <${env.SMTP_FROM}>`, to, subject, html });
  } catch (error) {
    logger.error("email_send_failed", { subject, error: String(error) });
  }
  if (!env.isProd && !env.isTest) logger.info("dev_email_link", { to, subject, link: devLink });
};

export const sendVerificationEmail = (to: string, name: string | null, token: string) => {
  const url = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
  return send(
    to,
    "Verify your email - HDOS Rwanda",
    layout(
      `Welcome to HDOS Rwanda, ${escapeHtml(name ?? "there")}!`,
      "Please verify your email address to activate your account. The link expires in 24 hours.",
      { url, label: "Verify email" },
    ),
    url,
  );
};

export const sendPasswordResetEmail = (to: string, name: string | null, token: string) => {
  const url = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return send(
    to,
    "Reset your password - HDOS Rwanda",
    layout(
      "Reset your password",
      `Hello ${escapeHtml(name ?? "there")}, we received a request to reset your password. The link expires in 1 hour and can be used once. If this was not you, ignore this email.`,
      { url, label: "Reset password" },
    ),
    url,
  );
};
