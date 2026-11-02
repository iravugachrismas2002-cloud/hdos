// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { ApplicationStatus } from "@prisma/client";
import express, { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../lib/http";
import { authenticate, currentUserId } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { deleteDocument, getDocument, putDocument, scanWithClamAv, sha256 } from "./document-storage";
import { env } from "../../config/env";
import { randomUUID } from "node:crypto";

export const applicationsRouter = Router();
applicationsRouter.use(authenticate);
applicationsRouter.get("/documents", asyncHandler(async (req, res) => {
  const data = await prisma.applicantDocument.findMany({ where: { userId: currentUserId(req), deletedAt: null }, select: { id: true, kind: true, fileName: true, mimeType: true, sizeBytes: true, extractionConfirmedAt: true, createdAt: true, retentionUntil: true, archivedAt: true }, orderBy: { createdAt: "desc" } });
  res.json({ data });
}));
applicationsRouter.post("/documents", express.raw({ type: ["application/pdf", "text/plain"], limit: env.DOCUMENT_MAX_BYTES }), asyncHandler(async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length < 1) throw AppError.badRequest("Upload a PDF or plain text document");
  const userId = currentUserId(req); const mimeType = req.headers["content-type"] as string;
  const name = Array.from(String(req.headers["x-file-name"] ?? "document"), (char) => /[\\/]/.test(char) || char.charCodeAt(0) < 32 ? "_" : char).join("").slice(0, 180);
  const kind = String(req.headers["x-document-kind"] ?? "OTHER").slice(0, 40);
  if (mimeType === "application/pdf" && req.body.subarray(0, 5).toString() !== "%PDF-") throw AppError.badRequest("File content does not match PDF type");
  if (mimeType === "text/plain" && req.body.includes(0)) throw AppError.badRequest("Invalid text file");
  try { await scanWithClamAv(req.body); } catch (error) { throw AppError.badRequest(error instanceof Error ? error.message : "Malware scan failed", "UPLOAD_SCAN_FAILED"); }
  const id = randomUUID(); const hash = sha256(req.body); const storageKey = await putDocument(userId, id, req.body);
  const extractedText = mimeType === "text/plain" ? { text: req.body.toString("utf8").slice(0, 20000), source: "plain-text", verified: false } : null;
  const data = await prisma.applicantDocument.create({ data: { id, userId, kind, fileName: name, mimeType, sizeBytes: req.body.length, sha256: hash, storageKey, ...(extractedText ? { extractedText } : {}) } });
  res.status(201).json({ data: { id: data.id, kind: data.kind, fileName: data.fileName, sizeBytes: data.sizeBytes, extraction: extractedText, verified: false } });
}));
applicationsRouter.get("/documents/:id/download", asyncHandler(async (req, res) => {
  const row = await prisma.applicantDocument.findFirst({ where: { id: req.params.id, userId: currentUserId(req), deletedAt: null } });
  if (!row) throw AppError.notFound("Document not found");
  const file = await getDocument(row.userId, row.id);
  res.setHeader("Content-Type", row.mimeType); res.setHeader("Content-Disposition", `attachment; filename="${row.fileName.replace(/"/g, "")}"`); res.setHeader("Cache-Control", "private, no-store"); res.send(file);
}));
applicationsRouter.patch("/documents/:id/confirm-extraction", validate(z.object({ confirmed: z.literal(true) })), asyncHandler(async (req, res) => {
  const row = await prisma.applicantDocument.updateMany({ where: { id: req.params.id, userId: currentUserId(req), deletedAt: null }, data: { extractionConfirmedAt: new Date() } });
  if (!row.count) throw AppError.notFound("Document not found");
  res.json({ data: { confirmed: true } });
}));
applicationsRouter.delete("/documents/:id", asyncHandler(async (req, res) => {
  const userId = currentUserId(req); const row = await prisma.applicantDocument.findFirst({ where: { id: req.params.id, userId, deletedAt: null } });
  if (!row) throw AppError.notFound("Document not found");
  await deleteDocument(userId, row.id); await prisma.applicantDocument.update({ where: { id: row.id }, data: { deletedAt: new Date() } }); res.status(204).end();
}));
const applicantProfileSchema = z.object({ phone: z.string().max(40).optional(), country: z.string().length(2).default("RW"), location: z.string().max(120).optional(), education: z.array(z.record(z.unknown())).max(30).default([]), experience: z.array(z.record(z.unknown())).max(50).default([]), skills: z.array(z.string().max(100)).max(200).default([]), languages: z.array(z.string().max(60)).max(30).default([]), preferences: z.record(z.unknown()).default({}), confirmed: z.boolean().default(false) });
applicationsRouter.get("/profile", asyncHandler(async (req, res) => {
  const data = await prisma.applicantProfile.findUnique({ where: { userId: currentUserId(req) } });
  res.json({ data });
}));
applicationsRouter.put("/profile", validate(applicantProfileSchema), asyncHandler(async (req, res) => {
  const { confirmed, ...profile } = req.body;
  const data = await prisma.applicantProfile.upsert({ where: { userId: currentUserId(req) }, create: { ...profile, userId: currentUserId(req), confirmedAt: confirmed ? new Date() : null }, update: { ...profile, confirmedAt: confirmed ? new Date() : null } });
  res.json({ data });
}));
applicationsRouter.get("/", asyncHandler(async (req, res) => {
  const data = await prisma.applicantApplication.findMany({ where: { userId: currentUserId(req) }, include: { opportunity: { include: { source: true } }, events: { orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "desc" } });
  res.json({ data });
}));
applicationsRouter.get("/countries/:code", asyncHandler(async (req, res) => {
  const data = await prisma.countryConfiguration.findUnique({ where: { code: req.params.code.toUpperCase() } });
  if (!data) throw AppError.notFound("Country configuration not found"); res.json({ data });
}));
applicationsRouter.post("/", validate(z.object({ opportunityId: z.string().min(1) })), asyncHandler(async (req, res) => {
  const opportunity = await prisma.opportunity.findUnique({ where: { id: req.body.opportunityId } });
  if (!opportunity) throw AppError.notFound("Opportunity not found");
  const row = await prisma.applicantApplication.upsert({ where: { userId_opportunityId: { userId: currentUserId(req), opportunityId: opportunity.id } }, create: { userId: currentUserId(req), opportunityId: opportunity.id, status: "DISCOVERED" }, update: {} });
  res.status(201).json({ data: row });
}));
applicationsRouter.get("/:id/eligibility", asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const application = await prisma.applicantApplication.findFirst({ where: { id: req.params.id, userId }, include: { opportunity: { include: { requirements: { where: { effectiveUntil: null } } } } } });
  if (!application) throw AppError.notFound("Application not found");
  const profile = await prisma.applicantProfile.findUnique({ where: { userId } });
  const results = application.opportunity.requirements.map((r) => {
    const value = r.kind === "country" ? profile?.country : r.kind === "skill" ? profile?.skills : r.kind === "education" ? profile?.education : undefined;
    const met = value === undefined ? null : r.kind === "skill" ? Array.isArray(value) && value.some((v) => String(v).toLowerCase() === r.key.toLowerCase()) : r.kind === "country" ? value === r.key : Array.isArray(value) && value.some((v) => JSON.stringify(v).toLowerCase().includes(r.key.toLowerCase()));
    return { requirementId: r.id, key: r.key, description: r.description, mandatory: r.mandatory, result: met === null ? "REVIEW_REQUIRED" : met ? "MET" : "NOT_MET" };
  });
  const mandatory = results.filter((x) => x.mandatory);
  const outcome = mandatory.some((x) => x.result === "NOT_MET") ? "NOT_ELIGIBLE" : mandatory.some((x) => x.result !== "MET") ? "REVIEW_REQUIRED" : "ELIGIBLE";
  res.json({ data: { outcome: profile?.confirmedAt ? outcome : "REVIEW_REQUIRED", profileConfirmed: Boolean(profile?.confirmedAt), requirements: results } });
}));
applicationsRouter.get("/:id/package", asyncHandler(async (req, res) => {
  const userId = currentUserId(req); const application = await prisma.applicantApplication.findFirst({ where: { id: req.params.id, userId }, include: { opportunity: { include: { requirements: true } }, answers: true } });
  if (!application) throw AppError.notFound("Application not found");
  const profile = await prisma.applicantProfile.findUnique({ where: { userId } });
  if (!profile?.confirmedAt) throw AppError.badRequest("Confirm your applicant profile before generating a package");
  const missing = application.opportunity.requirements.filter((r) => r.mandatory && !application.answers.some((a) => a.questionKey === r.key && a.confirmedAt));
  res.json({ data: { generatedAt: new Date().toISOString(), opportunity: { title: application.opportunity.title, provider: application.opportunity.provider }, applicant: { phone: profile.phone, country: profile.country, location: profile.location, education: profile.education, experience: profile.experience, skills: profile.skills, languages: profile.languages }, answers: application.answers, requirements: application.opportunity.requirements, missingConfirmedAnswers: missing.map((r) => r.key), canSubmit: missing.length === 0, notice: "Draft only. Review every field and submit through the provider's authorised channel." } });
}));
applicationsRouter.post("/:id/answers", validate(z.object({ answers: z.array(z.object({ questionKey: z.string().min(1).max(100), answer: z.string().max(5000), confirmed: z.boolean() })).max(100) })), asyncHandler(async (req, res) => {
  const userId = currentUserId(req); const owned = await prisma.applicantApplication.findFirst({ where: { id: req.params.id, userId } }); if (!owned) throw AppError.notFound("Application not found");
  const data = await prisma.$transaction(req.body.answers.map((a: {questionKey:string;answer:string;confirmed:boolean}) => prisma.applicationAnswer.upsert({ where: { applicationId_questionKey: { applicationId: owned.id, questionKey: a.questionKey } }, create: { applicationId: owned.id, questionKey: a.questionKey, answer: a.answer, confirmedAt: a.confirmed ? new Date() : null }, update: { answer: a.answer, confirmedAt: a.confirmed ? new Date() : null } })));
  res.json({ data });
}));
const transitions: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  DISCOVERED: ["ELIGIBLE", "INELIGIBLE", "DOCUMENTS_REQUIRED", "PREPARING"], ELIGIBLE: ["PREPARING", "DOCUMENTS_REQUIRED"], DOCUMENTS_REQUIRED: ["PREPARING"], PREPARING: ["READY_FOR_REVIEW"], READY_FOR_REVIEW: ["APPROVED", "PREPARING"], APPROVED: ["SUBMITTED"], SUBMITTED: ["UNDER_REVIEW", "INTERVIEW", "ACCEPTED", "REJECTED", "WITHDRAWN"], UNDER_REVIEW: ["INTERVIEW", "ACCEPTED", "REJECTED", "WITHDRAWN"], INTERVIEW: ["ACCEPTED", "REJECTED", "WITHDRAWN"],
};
applicationsRouter.patch("/:id/status", validate(z.object({ status: z.nativeEnum(ApplicationStatus), notes: z.string().max(2000).optional() })), asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const existing = await prisma.applicantApplication.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) throw AppError.notFound("Application not found");
  if (!transitions[existing.status]?.includes(req.body.status)) throw AppError.badRequest(`Cannot change ${existing.status} to ${req.body.status}`, "INVALID_STATUS_TRANSITION");
  // APPROVED is an explicit applicant action. SUBMITTED records the user's confirmation only.
  const data = await prisma.$transaction(async (tx) => {
    const updated = await tx.applicantApplication.update({ where: { id: existing.id }, data: { status: req.body.status, notes: req.body.notes, ...(req.body.status === "SUBMITTED" ? { submittedAt: new Date() } : {}) } });
    await tx.applicationEvent.create({ data: { applicationId: existing.id, status: req.body.status, detail: req.body.notes } });
    return updated;
  });
  res.json({ data });
}));
applicationsRouter.patch("/:id/receipt", validate(z.object({ reference: z.string().min(1).max(200) })), asyncHandler(async (req, res) => {
  const updated = await prisma.applicantApplication.updateMany({ where: { id: req.params.id, userId: currentUserId(req), status: { in: ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW", "ACCEPTED", "REJECTED"] } }, data: { receiptReference: req.body.reference } });
  if (!updated.count) throw AppError.badRequest("Record a confirmed submission before adding its receipt"); res.json({ data: { saved: true } });
}));
applicationsRouter.post("/archive/expire", asyncHandler(async (req, res) => {
  // User-triggered retention cleanup; physical encrypted files are removed before metadata is tombstoned.
  const userId = currentUserId(req); const expired = await prisma.applicantDocument.findMany({ where: { userId, deletedAt: null, retentionUntil: { lte: new Date() } }, select: { id: true } });
  for (const file of expired) { await deleteDocument(userId, file.id); await prisma.applicantDocument.update({ where: { id: file.id }, data: { deletedAt: new Date() } }); }
  res.json({ data: { deleted: expired.length } });
}));
