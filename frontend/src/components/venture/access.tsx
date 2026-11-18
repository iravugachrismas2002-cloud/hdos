// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Client-side mirror of the backend role matrix (venture-builder.types.ts). It only decides what to show or disable;
// the API remains the real enforcement and its error messages are shown when a request is refused.
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { VentureProject, VentureRole } from "@/lib/venture-types";

export type Action = "read" | "contribute" | "edit" | "manage" | "own";

const ROLE_ACTIONS: Record<VentureRole, readonly Action[]> = {
  OWNER: ["read", "contribute", "edit", "manage", "own"],
  ADMIN: ["read", "contribute", "edit", "manage"],
  EDITOR: ["read", "contribute", "edit"],
  CONTRIBUTOR: ["read", "contribute"],
  VIEWER: ["read"],
  ADVISOR: ["read"],
};

export const roleCan = (role: VentureRole, action: Action) => ROLE_ACTIONS[role].includes(action);

interface VentureContextValue {
  id: string;
  project: VentureProject;
  role: VentureRole;
  currency: string;
  can: (action: Action) => boolean;
}

const VentureContext = createContext<VentureContextValue | null>(null);

export function VentureProvider({ project, children }: { project: VentureProject; children: ReactNode }) {
  const value: VentureContextValue = {
    id: project.id,
    project,
    role: project.myRole,
    currency: project.currency,
    can: (action) => roleCan(project.myRole, action),
  };
  return <VentureContext.Provider value={value}>{children}</VentureContext.Provider>;
}

export function useVenture() {
  const value = useContext(VentureContext);
  if (!value) throw new Error("useVenture must be used within VentureProvider");
  return value;
}
