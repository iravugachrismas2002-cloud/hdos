// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Collaboration: invitations (the invitee must consent), role changes (audited) and vault-document links.
import type { VentureMemberRole } from "@prisma/client";
import type { z } from "zod";
import { audit } from "../../../lib/audit";
import { AppError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import { logActivity, roleRank } from "../venture-builder.repository";
import type { documentLinkSchema, inviteMemberSchema, updateMemberSchema } from "../venture-builder.schemas";
import type { ProjectAccess } from "../venture-builder.types";

type MemberRow = {
  id: string; userId: string; role: VentureMemberRole; status: string; sharedSections: string[]; createdAt: Date; consentedAt: Date | null;
  user: { name: string | null; email: string };
};

const memberDto = (m: MemberRow) => ({
  id: m.id,
  userId: m.userId,
  name: m.user.name,
  email: m.user.email,
  role: m.role,
  status: m.status,
  sharedSections: m.sharedSections,
  consentedAt: m.consentedAt?.toISOString() ?? null,
  createdAt: m.createdAt.toISOString(),
});

const userSelect = { user: { select: { name: true, email: true } } } as const;

export const listMembers = async (projectId: string) => {
  const rows = await prisma.ventureMember.findMany({ where: { projectId, status: { in: ["ACTIVE", "INVITED"] } }, include: userSelect, orderBy: { createdAt: "asc" } });
  return rows.map(memberDto);
};

/** Admins may manage roles below their own; only the owner can grant or touch ADMIN. */
const assertCanManageRole = (actor: ProjectAccess, targetRole: VentureMemberRole) => {
  if (targetRole === "OWNER") throw AppError.forbidden("The owner's role cannot be changed", "VENTURE_ROLE_FORBIDDEN");
  if (actor.role !== "OWNER" && roleRank[targetRole] >= roleRank[actor.role]) throw AppError.forbidden("Only the owner can manage admins", "VENTURE_ROLE_FORBIDDEN");
};

export const inviteMember = async (access: ProjectAccess, input: z.infer<typeof inviteMemberSchema>) => {
  assertCanManageRole(access, input.role);
  const invitee = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (!invitee) throw AppError.notFound("No HDOS account exists for this email. Ask them to register first.", "USER_NOT_FOUND");
  if (invitee.id === access.userId) throw AppError.badRequest("You are already a member of this venture");
  const existing = await prisma.ventureMember.findUnique({ where: { projectId_userId: { projectId: access.projectId, userId: invitee.id } } });
  if (existing && (existing.status === "ACTIVE" || existing.status === "INVITED")) throw AppError.conflict("This person is already a member or has a pending invitation", "ALREADY_MEMBER");
  const sharedSections = input.role === "ADVISOR" ? input.sharedSections : [];
  const row = await prisma.ventureMember.upsert({
    where: { projectId_userId: { projectId: access.projectId, userId: invitee.id } },
    create: { projectId: access.projectId, userId: invitee.id, role: input.role, status: "INVITED", sharedSections, invitedById: access.userId },
    update: { role: input.role, status: "INVITED", sharedSections, invitedById: access.userId, consentedAt: null },
    include: userSelect,
  });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: "member.invited", summary: `Invited a collaborator as ${input.role}`, entityType: "member", entityId: row.id });
  await audit({ action: "venture.member_invited", actorId: access.userId, targetId: access.projectId, metadata: { memberId: row.id, role: input.role } });
  return memberDto(row);
};

export const updateMember = async (access: ProjectAccess, memberId: string, input: z.infer<typeof updateMemberSchema>) => {
  const target = await prisma.ventureMember.findFirst({ where: { id: memberId, projectId: access.projectId, status: { in: ["ACTIVE", "INVITED"] } } });
  if (!target) throw AppError.notFound("Member not found");
  if (target.userId === access.userId) throw AppError.badRequest("You cannot change your own role");
  assertCanManageRole(access, target.role);
  if (input.role) assertCanManageRole(access, input.role);
  const role = input.role ?? target.role;
  const sharedSections = role === "ADVISOR" ? input.sharedSections ?? target.sharedSections : [];
  const row = await prisma.ventureMember.update({ where: { id: target.id }, data: { role, sharedSections }, include: userSelect });
  if (role !== target.role) {
    await logActivity({ projectId: access.projectId, actorId: access.userId, action: "member.role_changed", summary: `Changed a collaborator's role ${target.role} → ${role}`, entityType: "member", entityId: target.id, metadata: { from: target.role, to: role } });
    await audit({ action: "venture.member_role_changed", actorId: access.userId, targetId: access.projectId, metadata: { memberId: target.id, from: target.role, to: role } });
  } else {
    await logActivity({ projectId: access.projectId, actorId: access.userId, action: "member.sharing_changed", summary: "Updated the sections shared with an advisor", entityType: "member", entityId: target.id });
  }
  return memberDto(row);
};

/** Owners/admins remove others; any member (except the owner) may leave. */
export const removeMember = async (access: ProjectAccess, memberId: string) => {
  const target = await prisma.ventureMember.findFirst({ where: { id: memberId, projectId: access.projectId, status: { in: ["ACTIVE", "INVITED"] } } });
  if (!target) throw AppError.notFound("Member not found");
  if (target.role === "OWNER") throw AppError.badRequest("The owner cannot be removed", "OWNER_CANNOT_LEAVE");
  if (target.userId !== access.userId) assertCanManageRole(access, target.role);
  await prisma.ventureMember.update({ where: { id: target.id }, data: { status: "REMOVED", sharedSections: [] } });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: "member.removed", summary: target.userId === access.userId ? "A collaborator left the venture" : "Removed a collaborator", entityType: "member", entityId: target.id });
  await audit({ action: "venture.member_removed", actorId: access.userId, targetId: access.projectId, metadata: { memberId: target.id, role: target.role } });
};

// ───────────────────────────── Invitations (the invitee's own view) ─────────────────────────────

export const listMyInvitations = async (userId: string) => {
  const rows = await prisma.ventureMember.findMany({ where: { userId, status: "INVITED" }, include: { project: { select: { id: true, name: true, owner: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({ id: r.id, projectId: r.project.id, projectName: r.project.name, invitedBy: r.project.owner.name, role: r.role, sharedSections: r.sharedSections, createdAt: r.createdAt.toISOString() }));
};

export const respondToInvitation = async (userId: string, memberId: string, accept: boolean) => {
  const row = await prisma.ventureMember.findFirst({ where: { id: memberId, userId, status: "INVITED" } });
  if (!row) throw AppError.notFound("Invitation not found");
  await prisma.ventureMember.update({ where: { id: row.id }, data: accept ? { status: "ACTIVE", consentedAt: new Date() } : { status: "DECLINED", sharedSections: [] } });
  await logActivity({ projectId: row.projectId, actorId: userId, action: accept ? "member.joined" : "member.declined", summary: accept ? `A collaborator joined as ${row.role}` : "A collaborator declined the invitation", entityType: "member", entityId: row.id });
  return { accepted: accept, projectId: row.projectId };
};

// ───────────────────────────── Document vault links ─────────────────────────────

const docDto = (l: { id: string; label: string; linkedById: string; createdAt: Date; document: { id: string; kind: string; fileName: string; status: string; version: number; mimeType: string; sizeBytes: number; deletedAt: Date | null } }) => ({
  id: l.id,
  label: l.label,
  linkedById: l.linkedById,
  createdAt: l.createdAt.toISOString(),
  document: { id: l.document.id, kind: l.document.kind, fileName: l.document.fileName, status: l.document.status, version: l.document.version, mimeType: l.document.mimeType, sizeBytes: l.document.sizeBytes, removed: l.document.deletedAt !== null },
});

const docSelect = { select: { id: true, kind: true, fileName: true, status: true, version: true, mimeType: true, sizeBytes: true, deletedAt: true } } as const;

export const listDocumentLinks = async (projectId: string) => {
  const rows = await prisma.ventureDocumentLink.findMany({ where: { projectId }, include: { document: docSelect }, orderBy: { createdAt: "desc" } });
  return rows.map(docDto);
};

/**
 * Only metadata is shared. The file stays encrypted in its owner's vault; other members never receive a
 * download URL, so a venture link cannot widen access to the document itself.
 */
export const linkDocument = async (access: ProjectAccess, input: z.infer<typeof documentLinkSchema>) => {
  const doc = await prisma.applicantDocument.findFirst({ where: { id: input.documentId, userId: access.userId, deletedAt: null }, select: { id: true } });
  if (!doc) throw AppError.notFound("Document not found in your vault", "DOCUMENT_NOT_FOUND");
  const row = await prisma.ventureDocumentLink.upsert({
    where: { projectId_documentId: { projectId: access.projectId, documentId: doc.id } },
    create: { projectId: access.projectId, documentId: doc.id, label: input.label, linkedById: access.userId },
    update: { label: input.label },
    include: { document: docSelect },
  });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: "document.linked", summary: `Linked document "${input.label}"`, entityType: "document", entityId: row.id });
  return docDto(row);
};

export const unlinkDocument = async (access: ProjectAccess, linkId: string) => {
  const link = await prisma.ventureDocumentLink.findFirst({ where: { id: linkId, projectId: access.projectId } });
  if (!link) throw AppError.notFound("Document link not found");
  await prisma.ventureDocumentLink.delete({ where: { id: link.id } });
  await logActivity({ projectId: access.projectId, actorId: access.userId, action: "document.unlinked", summary: `Unlinked document "${link.label}"`, entityType: "document", entityId: link.id });
};
