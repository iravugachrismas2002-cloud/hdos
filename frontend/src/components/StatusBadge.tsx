// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ServiceState } from "@/lib/types";

const STATES = {
  online: { label: "Online", variant: "success", Icon: CheckCircle2 },
  degraded: { label: "Degraded", variant: "warning", Icon: AlertTriangle },
  offline: { label: "Offline", variant: "danger", Icon: XCircle },
} as const;

/** Colour is never the only signal: every state has its own text label and icon. */
export function StatusBadge({ status }: { status: ServiceState }) {
  const { label, variant, Icon } = STATES[status] ?? STATES.offline;
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}
