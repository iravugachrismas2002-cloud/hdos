// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Labels, money and small parsing helpers shared by the Venture Builder screens.
import { titleCase } from "@/lib/format";
import type {
  AssumptionCategory, CallStatus, EvidenceType, FeaturePriority, KpiMetric, LineItemKind, RevenueType, VentureRole, VentureSection, VentureStatus,
} from "@/lib/venture-types";

export const MAIN_STAGES: VentureStatus[] = [
  "DRAFT", "DISCOVERY", "VALIDATING", "VALIDATION_REVIEW", "FEASIBILITY_REVIEW", "MVP_PLANNING", "BUILDING", "PILOTING", "LAUNCH_READY", "ACTIVE",
];
export const SIDE_STATUSES: VentureStatus[] = ["PAUSED", "STOPPED", "ARCHIVED"];

export const STATUS_LABELS: Record<VentureStatus, string> = {
  DRAFT: "Draft", DISCOVERY: "Discovery", VALIDATING: "Validating", VALIDATION_REVIEW: "Validation review", FEASIBILITY_REVIEW: "Feasibility review",
  MVP_PLANNING: "MVP planning", BUILDING: "Building", PILOTING: "Piloting", LAUNCH_READY: "Launch ready", ACTIVE: "Active",
  PAUSED: "Paused", STOPPED: "Stopped", ARCHIVED: "Archived",
};

export const ROLE_LABELS: Record<VentureRole, string> = {
  OWNER: "Owner", ADMIN: "Admin", EDITOR: "Editor", CONTRIBUTOR: "Contributor", VIEWER: "Viewer", ADVISOR: "Advisor",
};
export const ROLE_HELP: Record<VentureRole, string> = {
  OWNER: "Full control, including export and settings.",
  ADMIN: "Manages members and settings, and can edit everything.",
  EDITOR: "Can edit the venture and verify evidence.",
  CONTRIBUTOR: "Can add evidence, results and sources, and update milestones.",
  VIEWER: "Read-only access to the whole venture.",
  ADVISOR: "Read-only access to only the sections the owner shares.",
};
export const INVITABLE_ROLES: Exclude<VentureRole, "OWNER">[] = ["ADMIN", "EDITOR", "CONTRIBUTOR", "VIEWER", "ADVISOR"];

/** Sections an advisor can be given. `overview` is always visible and `team`/`activity` are never shareable (enforced by the API). */
export const SHAREABLE_SECTIONS: { id: VentureSection; label: string }[] = [
  { id: "discovery", label: "Discovery" },
  { id: "validation", label: "Validation" },
  { id: "assessment", label: "Assessment" },
  { id: "product", label: "Product Studio" },
  { id: "business-model", label: "Business model" },
  { id: "financial", label: "Financial" },
  { id: "funding", label: "Funding" },
  { id: "growth", label: "Growth" },
  { id: "documents", label: "Documents" },
];
export const sectionLabel = (id: string) => SHAREABLE_SECTIONS.find((s) => s.id === id)?.label ?? titleCase(id.replace(/-/g, "_"));

export const CATEGORY_LABELS: Record<AssumptionCategory, string> = {
  PROBLEM: "Problem", CUSTOMER: "Customer", MARKET: "Market", WILLINGNESS_TO_PAY: "Willingness to pay", TECHNICAL: "Technical",
  FINANCIAL: "Financial", OPERATIONAL: "Operational", DIFFERENTIATION: "Differentiation", TEAM: "Team",
};
export const ASSUMPTION_CATEGORIES = Object.keys(CATEGORY_LABELS) as AssumptionCategory[];

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  INTERVIEW: "Customer interview", SURVEY: "Survey", EXPERIMENT_RESULT: "Experiment result", OFFICIAL_STATISTIC: "Official statistic (needs a source)",
  DOCUMENT: "Document", OBSERVATION: "Observation", COMPETITOR_RESEARCH: "Competitor research", TEST_ORDER: "Test order / pre-order", OTHER: "Other",
};
export const EVIDENCE_TYPES = Object.keys(EVIDENCE_TYPE_LABELS) as EvidenceType[];

export const REVENUE_TYPE_LABELS: Record<RevenueType, string> = {
  SUBSCRIPTION: "Subscription", COMMISSION: "Commission", LICENSING: "Licensing", TRANSACTION_FEE: "Transaction fee",
  SERVICE_DELIVERY: "Service delivery", DIRECT_SALES: "Direct sales", B2B_CONTRACT: "B2B contract",
};
export const REVENUE_TYPES = Object.keys(REVENUE_TYPE_LABELS) as RevenueType[];

export const PRIORITY_LABELS: Record<FeaturePriority, string> = { MUST: "Must have", SHOULD: "Should have", COULD: "Could have", WONT: "Won't have (this time)" };
export const PRIORITIES = Object.keys(PRIORITY_LABELS) as FeaturePriority[];

export const LINE_ITEM_LABELS: Record<LineItemKind, { title: string; unit: string }> = {
  STARTUP_COST: { title: "Start-up cost", unit: "one-off" },
  FIXED_COST: { title: "Fixed cost", unit: "per month" },
  VARIABLE_COST: { title: "Variable cost", unit: "per unit sold" },
};

export const KPI_LABELS: Record<KpiMetric, { label: string; money?: boolean; percent?: boolean }> = {
  LEADS: { label: "Leads" },
  ACTIVE_CUSTOMERS: { label: "Active customers" },
  CUSTOMER_ACQUISITION_COST: { label: "Customer acquisition cost", money: true },
  REVENUE: { label: "Revenue", money: true },
  REPEAT_PURCHASES: { label: "Repeat purchases" },
  RETENTION_RATE: { label: "Retention rate (%)", percent: true },
  GROSS_MARGIN: { label: "Gross margin (%)", percent: true },
  MONTHLY_OPERATING_COSTS: { label: "Monthly operating costs", money: true },
  CASH_RUNWAY_MONTHS: { label: "Cash runway (months)" },
  COMPLAINTS: { label: "Complaints" },
  DELIVERY_TIME_DAYS: { label: "Delivery time (days)" },
};
export const KPI_METRICS = Object.keys(KPI_LABELS) as KpiMetric[];

export const CALL_STATUS_NOTE: Record<Exclude<CallStatus, "OPEN">, string> = {
  EXPIRED: "The deadline has passed.",
  UNVERIFIED: "HDOS has no record of anyone verifying this call.",
  STALE: "This call was last verified more than 180 days ago.",
  DEADLINE_UNKNOWN: "No deadline is recorded and the call is not marked rolling.",
};

export const label = (value: string) => titleCase(value);

// ───────────── Numbers, money, dates ─────────────

const ZERO_DECIMAL_CURRENCIES = new Set(["RWF", "UGX", "BIF"]);

/** Formats a major-unit amount in the venture's currency (RWF has no decimals, like the backend engine). */
export const formatMoney = (amount: number | null | undefined, currency: string): string => {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "—";
  const digits = ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(digits)}`;
  }
};

export const formatPercent = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined || !Number.isFinite(value) ? "—" : `${value.toFixed(digits).replace(/\.0+$/, "")}%`;
export const formatCoverage = (fraction: number) => `${Math.round(fraction * 100)}%`;
export const formatScore = (score: number | null) => (score === null ? "Unknown" : `${score}/100`);
export const formatDateTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** Today as `YYYY-MM-DD` for date inputs. */
export const todayInput = () => new Date().toISOString().slice(0, 10);
export const thisMonthInput = () => new Date().toISOString().slice(0, 7);
export const dateInputToIso = (value: string) => new Date(`${value}T00:00:00Z`).toISOString();

/** Empty or non-numeric text becomes `null` so the caller can decide what that means. */
export const parseNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};

/** One item per line, as used by every list-valued textarea. */
export const toLines = (text: string): string[] => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
export const fromLines = (items: readonly string[] | null | undefined): string => (items ?? []).join("\n");

/** True for http(s) URLs only, so a stored value can never become a `javascript:` link. */
export const isHttpUrl = (value: string | null | undefined): value is string => {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "venture";
