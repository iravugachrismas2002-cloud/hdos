// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { CALL_STATUS_NOTE, label, ROLE_LABELS, STATUS_LABELS } from "./format";
import type {
  AiRunStatus, AssumptionOrigin, AssumptionStatus, CallStatus, EvidenceDirection, FeasibilityCard, FeaturePriority, RiskLevel, VentureRole, VentureStatus,
  VerificationStatus, WorkStatus,
} from "@/lib/venture-types";

type Variant = NonNullable<BadgeProps["variant"]>;

const STATUS_VARIANT: Record<VentureStatus, Variant> = {
  DRAFT: "secondary", DISCOVERY: "default", VALIDATING: "default", VALIDATION_REVIEW: "default", FEASIBILITY_REVIEW: "default", MVP_PLANNING: "default",
  BUILDING: "default", PILOTING: "default", LAUNCH_READY: "success", ACTIVE: "success", PAUSED: "warning", STOPPED: "danger", ARCHIVED: "outline",
};
export const VentureStatusBadge = ({ status }: { status: VentureStatus }) => <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;

export const RoleBadge = ({ role }: { role: VentureRole }) => <Badge variant={role === "OWNER" ? "default" : "outline"}>Your role: {ROLE_LABELS[role]}</Badge>;

const ASSUMPTION_VARIANT: Record<AssumptionStatus, Variant> = { UNTESTED: "secondary", TESTING: "default", SUPPORTED: "success", REFUTED: "danger", INCONCLUSIVE: "warning" };
export const AssumptionStatusBadge = ({ status }: { status: AssumptionStatus }) => <Badge variant={ASSUMPTION_VARIANT[status]}>{label(status)}</Badge>;

export const OriginBadge = ({ origin }: { origin: AssumptionOrigin }) =>
  origin === "AI_DRAFT" ? (
    <Badge variant="warning" title="Drafted by AI. It is a hypothesis, not validated evidence.">AI draft</Badge>
  ) : (
    <Badge variant="secondary" title="Written by a member of this venture">You</Badge>
  );

const RISK_VARIANT: Record<RiskLevel, Variant> = { LOW: "secondary", MEDIUM: "warning", HIGH: "danger" };
export const RiskBadge = ({ risk }: { risk: RiskLevel }) => <Badge variant={RISK_VARIANT[risk]}>{label(risk)} risk</Badge>;

const VERIFICATION_VARIANT: Record<VerificationStatus, Variant> = { USER_REPORTED: "secondary", SOURCE_LINKED: "default", VERIFIED: "success", DISPUTED: "danger" };
export const VerificationBadge = ({ status }: { status: VerificationStatus }) => <Badge variant={VERIFICATION_VARIANT[status]}>{label(status)}</Badge>;

const DIRECTION_VARIANT: Record<EvidenceDirection, Variant> = { SUPPORTS: "success", CONTRADICTS: "danger", NEUTRAL: "secondary" };
export const DirectionBadge = ({ direction }: { direction: EvidenceDirection }) => <Badge variant={DIRECTION_VARIANT[direction]}>{label(direction)}</Badge>;

const WORK_VARIANT: Record<WorkStatus, Variant> = { TODO: "secondary", IN_PROGRESS: "default", DONE: "success", BLOCKED: "danger" };
export const WorkStatusBadge = ({ status }: { status: WorkStatus }) => <Badge variant={WORK_VARIANT[status]}>{label(status)}</Badge>;

const PRIORITY_VARIANT: Record<FeaturePriority, Variant> = { MUST: "danger", SHOULD: "warning", COULD: "default", WONT: "outline" };
export const PriorityBadge = ({ priority }: { priority: FeaturePriority }) => <Badge variant={PRIORITY_VARIANT[priority]}>{priority === "WONT" ? "Won't" : label(priority)}</Badge>;

const FEASIBILITY_VARIANT: Record<FeasibilityCard["status"], Variant> = { UNKNOWN: "secondary", WEAK: "warning", MODERATE: "default", STRONG: "success" };
export const FeasibilityBadge = ({ status }: { status: FeasibilityCard["status"] }) => <Badge variant={FEASIBILITY_VARIANT[status]}>{label(status)}</Badge>;

const AI_LABEL: Record<AiRunStatus, { text: string; variant: Variant }> = {
  AI_GENERATED: { text: "AI-generated", variant: "warning" },
  TEMPLATE_FALLBACK: { text: "Built-in template", variant: "secondary" },
  AI_SKIPPED: { text: "AI off — built-in template", variant: "secondary" },
};
export const AiStatusBadge = ({ status }: { status: AiRunStatus }) => <Badge variant={AI_LABEL[status].variant}>{AI_LABEL[status].text}</Badge>;

export const DemoBadge = () => <Badge variant="warning" title="Illustrative data, not a verified figure">Demo data</Badge>;

/** Only OPEN is styled as open. Everything else says to verify with the provider (or that it expired). */
export function CallStatusBadge({ status }: { status: CallStatus }) {
  if (status === "OPEN") return <Badge variant="success">Open</Badge>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge variant={status === "EXPIRED" ? "danger" : "warning"}>{status === "EXPIRED" ? "Expired" : "Verify with provider"}</Badge>
      <span className="text-xs text-muted-foreground">{CALL_STATUS_NOTE[status]}</span>
    </span>
  );
}

/** Label required wherever AI-drafted text is shown. */
export const AI_HYPOTHESIS_LABEL = "AI-drafted hypothesis — not validated evidence";
export const AiHypothesisLabel = () => <Badge variant="warning">{AI_HYPOTHESIS_LABEL}</Badge>;
