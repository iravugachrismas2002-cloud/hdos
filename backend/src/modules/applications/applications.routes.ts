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
  const data = await prisma.applicantDocument.findMany({ where: { userId: currentUserId(req), deletedAt: null }, include: { extractions: { orderBy: { extractedAt: "desc" }, take: 1 }, verifications: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: [{ groupId: "asc" }, { version: "desc" }] });
  res.json({ data: data.map(d => ({ id:d.id,groupId:d.groupId,version:d.version,kind:d.kind,status:d.expiresAt&&d.expiresAt<new Date()?"EXPIRED":d.status,fileName:d.fileName,mimeType:d.mimeType,sizeBytes:d.sizeBytes,sha256:d.sha256,extractedText:d.extractedText,extractionConfirmedAt:d.extractionConfirmedAt,expiresAt:d.expiresAt,retentionUntil:d.retentionUntil,archivedAt:d.archivedAt,createdAt:d.createdAt,extractions:d.extractions.map(x=>({id:x.id,source:x.source,extractedData:x.extractedData,extractedAt:x.extractedAt,confirmedAt:x.confirmedAt})),verifications:d.verifications})) });
}));
applicationsRouter.post("/documents", express.raw({ type: ["application/pdf", "text/plain"], limit: env.DOCUMENT_MAX_BYTES }), asyncHandler(async (req, res) => {
  if (!env.DOCUMENT_ENCRYPTION_CONFIGURED) throw AppError.unavailable("Document storage is temporarily disabled until encryption is configured", "DOCUMENT_STORAGE_DISABLED");
  if (!Buffer.isBuffer(req.body) || req.body.length < 1) throw AppError.badRequest("Upload a PDF or plain text document");
  const userId = currentUserId(req); const mimeType = req.headers["content-type"] as string;
  const name = Array.from(String(req.headers["x-file-name"] ?? "document"), (char) => /[\\/]/.test(char) || char.charCodeAt(0) < 32 ? "_" : char).join("").slice(0, 180);
  const kind = String(req.headers["x-document-kind"] ?? "OTHER").slice(0, 40).toUpperCase().replace(/[ -]+/g, "_");
  const categories = ["CV","DIPLOMA","ACADEMIC_TRANSCRIPT","RECOMMENDATION_LETTER","PASSPORT","NATIONAL_ID","CERTIFICATE","COVER_LETTER","MOTIVATION_LETTER","PORTFOLIO","PROOF_OF_ADDRESS","BIRTH_CERTIFICATE","ACADEMIC_EQUIVALENCE","LANGUAGE_CERTIFICATE","PROFESSIONAL_LICENCE","OTHER"];
  if (!categories.includes(kind)) throw AppError.badRequest("Choose a supported document category");
  const replaceId = String(req.headers["x-replace-document-id"] ?? "");
  const previous = replaceId ? await prisma.applicantDocument.findFirst({ where: { id: replaceId, userId, deletedAt: null } }) : null;
  if (replaceId && !previous) throw AppError.notFound("Document to replace not found");
  if (previous && previous.kind !== kind) throw AppError.badRequest("Replacement must use the same document category");
  if (mimeType === "application/pdf" && req.body.subarray(0, 5).toString() !== "%PDF-") throw AppError.badRequest("File content does not match PDF type");
  if (mimeType === "text/plain" && req.body.includes(0)) throw AppError.badRequest("Invalid text file");
  try { await scanWithClamAv(req.body); } catch (error) { throw AppError.badRequest(error instanceof Error ? error.message : "Malware scan failed", "UPLOAD_SCAN_FAILED"); }
  const id = randomUUID(); const hash = sha256(req.body); const storageKey = await putDocument(userId, id, req.body);
  const extractedText = mimeType === "text/plain" ? { text: req.body.toString("utf8").slice(0, 20000), source: "plain-text", verified: false } : null;
  const groupId = previous?.groupId ?? id; const version = previous ? previous.version + 1 : 1;
  const expiryHeader = req.headers["x-expires-at"];
  const expiresAt = typeof expiryHeader === "string" ? new Date(expiryHeader) : undefined;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) throw AppError.badRequest("Expiry date is invalid");
  const data = await prisma.$transaction(async tx => {
    const created = await tx.applicantDocument.create({ data: { id, userId, kind, groupId, version, status: extractedText ? "AWAITING_CONFIRMATION" : "UPLOADED", fileName: name, mimeType, sizeBytes: req.body.length, sha256: hash, storageKey, expiresAt, ...(extractedText ? { extractedText } : {}) } });
    await tx.applicantDocumentVersion.create({ data: { documentId: id, version, storageKey, sha256: hash, fileName: name, mimeType, sizeBytes: req.body.length } });
    if (extractedText) await tx.documentExtraction.create({ data: { documentId: id, source: "plain-text", extractedData: extractedText } });
    return created;
  });
  res.status(201).json({ data: { id: data.id, groupId, version, kind: data.kind, fileName: data.fileName, sizeBytes: data.sizeBytes, status: data.status, extraction: extractedText, verified: false } });
}));
applicationsRouter.get("/documents/:id/download", asyncHandler(async (req, res) => {
  if (!env.DOCUMENT_ENCRYPTION_CONFIGURED) throw AppError.unavailable("Document downloads are temporarily disabled until encryption is configured", "DOCUMENT_STORAGE_DISABLED");
  const row = await prisma.applicantDocument.findFirst({ where: { id: req.params.id, userId: currentUserId(req), deletedAt: null } });
  if (!row) throw AppError.notFound("Document not found");
  const file = await getDocument(row.userId, row.id);
  await prisma.documentAccessLog.create({ data: { documentId: row.id, userId: row.userId, action: "DOWNLOAD" } });
  res.setHeader("Content-Type", row.mimeType); res.setHeader("Content-Disposition", `attachment; filename="${row.fileName.replace(/"/g, "")}"`); res.setHeader("Cache-Control", "private, no-store"); res.send(file);
}));
applicationsRouter.patch("/documents/:id/confirm-extraction", validate(z.object({ confirmed: z.literal(true) })), asyncHandler(async (req, res) => {
  const userId = currentUserId(req); const existing = await prisma.applicantDocument.findFirst({ where: { id: req.params.id, userId, deletedAt: null } });
  if (!existing) throw AppError.notFound("Document not found");
  await prisma.$transaction(async tx => { await tx.applicantDocument.update({ where: { id: existing.id }, data: { extractionConfirmedAt: new Date(), status: existing.status === "AWAITING_CONFIRMATION" ? "UPLOADED" : existing.status } }); await tx.documentExtraction.updateMany({ where: { documentId: existing.id, confirmedAt: null }, data: { confirmedAt: new Date() } }); });
  res.json({ data: { confirmed: true } });
}));
applicationsRouter.delete("/documents/:id", asyncHandler(async (req, res) => {
  const userId = currentUserId(req); const row = await prisma.applicantDocument.findFirst({ where: { id: req.params.id, userId, deletedAt: null } });
  if (!row) throw AppError.notFound("Document not found");
  const linked = await prisma.applicationDocument.count({ where: { documentId: row.id } });
  if (linked) throw AppError.conflict("This document is preserved in an application package and cannot be deleted");
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
  const userId = currentUserId(req); const application = await prisma.applicantApplication.findFirst({ where: { id: req.params.id, userId }, include: { opportunity: { include: { requirements: true } }, answers: true, documents: { include: { document: { select: { id:true,kind:true,fileName:true,mimeType:true,sizeBytes:true,sha256:true,version:true,status:true,expiresAt:true } } } } } });
  if (!application) throw AppError.notFound("Application not found");
  const profile = await prisma.applicantProfile.findUnique({ where: { userId } });
  if (!profile?.confirmedAt) throw AppError.badRequest("Confirm your applicant profile before generating a package");
  const missing = application.opportunity.requirements.filter((r) => r.mandatory && !application.answers.some((a) => a.questionKey === r.key && a.confirmedAt));
  res.json({ data: { generatedAt: new Date().toISOString(), opportunity: { title: application.opportunity.title, provider: application.opportunity.provider }, opportunityRequirementsVersion: Math.max(0,...application.opportunity.requirements.map(r=>r.version)), applicant: { phone: profile.phone, country: profile.country, location: profile.location, education: profile.education, experience: profile.experience, skills: profile.skills, languages: profile.languages }, answers: application.answers, requirements: application.opportunity.requirements, selectedDocuments: application.documents.map(d=>({applicationDocumentId:d.id,documentId:d.documentId,version:d.version,sha256:d.sha256,fileName:d.document.fileName,category:d.document.kind,mimeType:d.document.mimeType,sizeBytes:d.document.sizeBytes})), missingConfirmedAnswers: missing.map((r) => r.key), canSubmit: missing.length === 0, notice: "Draft only. Review every field and submit through the provider's authorised channel." } });
}));
applicationsRouter.post("/:id/answers", validate(z.object({ answers: z.array(z.object({ questionKey: z.string().min(1).max(100), answer: z.string().max(5000), confirmed: z.boolean() })).max(100) })), asyncHandler(async (req, res) => {
  const userId = currentUserId(req); const owned = await prisma.applicantApplication.findFirst({ where: { id: req.params.id, userId } }); if (!owned) throw AppError.notFound("Application not found");
  const data = await prisma.$transaction(req.body.answers.map((a: {questionKey:string;answer:string;confirmed:boolean}) => prisma.applicationAnswer.upsert({ where: { applicationId_questionKey: { applicationId: owned.id, questionKey: a.questionKey } }, create: { applicationId: owned.id, questionKey: a.questionKey, answer: a.answer, confirmedAt: a.confirmed ? new Date() : null }, update: { answer: a.answer, confirmedAt: a.confirmed ? new Date() : null } })));
  res.json({ data });
}));
applicationsRouter.get("/:id/document-readiness", asyncHandler(async (req,res)=>{
 const userId=currentUserId(req); const application=await prisma.applicantApplication.findFirst({where:{id:req.params.id,userId},include:{opportunity:{include:{requirements:{where:{kind:"document",effectiveUntil:null},orderBy:{version:"desc"}}}}}}); if(!application)throw AppError.notFound("Application not found");
 const docs=await prisma.applicantDocument.findMany({where:{userId,deletedAt:null},orderBy:[{groupId:"asc"},{version:"desc"}]}); const latest=new Map<string,typeof docs[number]>(); for(const d of docs)if(!latest.has(d.groupId))latest.set(d.groupId,d);
 const newestRules=new Map<string,typeof application.opportunity.requirements[number]>();for(const rule of application.opportunity.requirements){const old=newestRules.get(rule.key);if(!old||old.version<rule.version)newestRules.set(rule.key,rule)}
 const checklist=[...newestRules.values()].map(rule=>{const candidates=[...latest.values()].filter(d=>d.kind.toLowerCase()===rule.key.toLowerCase());const doc=candidates.find(d=>!d.expiresAt||d.expiresAt>new Date());const needsConfirmation=Boolean(doc&&doc.extractedText&&!doc.extractionConfirmedAt);return {requirementId:rule.id,label:rule.description,category:rule.key,mandatory:rule.mandatory,documentId:doc?.id??null,status:!doc?(candidates.length?"EXPIRED":"MISSING"):doc.status,needsConfirmation,available:Boolean(doc&&["UPLOADED","VERIFIED"].includes(doc.status)&&!needsConfirmation&&(!doc.expiresAt||doc.expiresAt>new Date()))};});
 res.json({data:{requirementsVersion:Math.max(0,...application.opportunity.requirements.map(r=>r.version)),checklist,ready:checklist.every(x=>!x.mandatory||x.available),missing:checklist.filter(x=>x.mandatory&&!x.available)}});
}));
applicationsRouter.post("/:id/documents", validate(z.object({documentIds:z.array(z.string().min(1)).min(1).max(30)})), asyncHandler(async(req,res)=>{
 const userId=currentUserId(req);const app=await prisma.applicantApplication.findFirst({where:{id:req.params.id,userId},include:{opportunity:{include:{requirements:{where:{kind:"document",effectiveUntil:null},orderBy:{version:"desc"}}}}}});if(!app)throw AppError.notFound("Application not found");
 const docs=await prisma.applicantDocument.findMany({where:{id:{in:req.body.documentIds},userId,deletedAt:null}}); if(docs.length!==new Set(req.body.documentIds).size)throw AppError.badRequest("One or more selected documents are unavailable");
 const valid=docs.filter(d=>["UPLOADED","VERIFIED"].includes(d.status)&&(!d.expiresAt||d.expiresAt>new Date()));if(valid.length!==docs.length)throw AppError.badRequest("Expired or unconfirmed documents cannot be attached");
 const allowed=new Set(app.opportunity.requirements.map(r=>r.key.toLowerCase()));if(app.opportunity.requirements.length&&docs.some(d=>!allowed.has(d.kind.toLowerCase())))throw AppError.badRequest("A selected document does not match this opportunity's document requirements");
 const rows=await prisma.$transaction(docs.map(d=>prisma.applicationDocument.upsert({where:{applicationId_documentId:{applicationId:app.id,documentId:d.id}},create:{applicationId:app.id,documentId:d.id,snapshotStorageKey:d.storageKey,sha256:d.sha256,version:d.version,opportunityRequirementsVersion:Math.max(0,...app.opportunity.requirements.map(r=>r.version))},update:{}})));res.status(201).json({data:rows});
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
