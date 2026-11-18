// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import type { VentureMemberRole } from "@prisma/client";

/** Workspace sections. ADVISOR members can only read the sections the owner explicitly shared with them. */
export const SECTIONS = [
  "overview",
  "discovery",
  "validation",
  "assessment",
  "product",
  "business-model",
  "financial",
  "funding",
  "growth",
  "team",
  "documents",
  "activity",
] as const;
export type Section = (typeof SECTIONS)[number];

export type Action = "read" | "contribute" | "edit" | "manage" | "own";

const ROLE_ACTIONS: Record<VentureMemberRole, readonly Action[]> = {
  OWNER: ["read", "contribute", "edit", "manage", "own"],
  ADMIN: ["read", "contribute", "edit", "manage"],
  EDITOR: ["read", "contribute", "edit"],
  CONTRIBUTOR: ["read", "contribute"],
  VIEWER: ["read"],
  ADVISOR: ["read"],
};

export const roleCan = (role: VentureMemberRole, action: Action): boolean => ROLE_ACTIONS[role].includes(action);

/** Sections an advisor can never be given, because they hold other people's data or administration. */
const ADVISOR_FORBIDDEN: readonly Section[] = ["team", "activity"];

export const canReadSection = (role: VentureMemberRole, sharedSections: readonly string[], section: Section): boolean => {
  if (role !== "ADVISOR") return true;
  if (ADVISOR_FORBIDDEN.includes(section)) return false;
  return section === "overview" || sharedSections.includes(section);
};

export const isSection = (value: string): value is Section => (SECTIONS as readonly string[]).includes(value);

export interface ProjectAccess {
  projectId: string;
  userId: string;
  role: VentureMemberRole;
  sharedSections: string[];
}
