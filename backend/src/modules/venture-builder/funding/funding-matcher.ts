// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Matches the existing HDOS opportunity catalogue to a venture. A match is a suggestion to investigate, never an
// approval; calls that are expired, unverified or stale are flagged and are never presented as open.
export const VERIFICATION_MAX_AGE_DAYS = 180;

export type CallStatus = "OPEN" | "EXPIRED" | "UNVERIFIED" | "STALE" | "DEADLINE_UNKNOWN";
export type FundingType = "GRANT" | "INCUBATION" | "ACCELERATOR" | "LOAN" | "COMPETITION" | "TRAINING_MENTORSHIP" | "OTHER";

export interface OpportunityRecord {
  id: string;
  type: string;
  title: string;
  provider: string;
  description: string | null;
  eligibility: string | null;
  deadline: Date | null;
  isRolling: boolean;
  country: string | null;
  url: string | null;
  lastVerifiedAt: Date | null;
  source: { name: string; publisher: string; url: string | null; isDemo: boolean };
}

export interface FundingMatch {
  opportunityId: string;
  title: string;
  provider: string;
  fundingType: FundingType;
  callStatus: CallStatus;
  /** True only for OPEN calls. Everything else must be verified with the provider before use. */
  isActive: boolean;
  deadline: string | null;
  isRolling: boolean;
  lastVerifiedAt: string | null;
  country: string | null;
  officialUrl: string | null;
  eligibility: string | null;
  matchScore: number;
  matchReasons: string[];
  source: { name: string; publisher: string; url: string | null; isDemo: boolean };
  disclaimer: string;
}

const RELEVANT = /(start-?up|entrepreneur|incubat|accelerat|innovation|seed|enterprise|business|venture|pitch|competition|challenge|loan|financ|funding|sme|mentor)/i;

export const classifyCallStatus = (o: Pick<OpportunityRecord, "deadline" | "isRolling" | "lastVerifiedAt">, now: Date): CallStatus => {
  if (o.deadline && o.deadline.getTime() < now.getTime()) return "EXPIRED";
  if (!o.lastVerifiedAt) return "UNVERIFIED";
  const ageDays = (now.getTime() - o.lastVerifiedAt.getTime()) / 86_400_000;
  if (ageDays > VERIFICATION_MAX_AGE_DAYS) return "STALE";
  if (o.deadline || o.isRolling) return "OPEN";
  return "DEADLINE_UNKNOWN";
};

const inferType = (o: OpportunityRecord): FundingType => {
  const text = `${o.title} ${o.description ?? ""}`;
  if (/incubat/i.test(text)) return "INCUBATION";
  if (/accelerat/i.test(text)) return "ACCELERATOR";
  if (/loan|credit/i.test(text)) return "LOAN";
  if (/competition|challenge|pitch/i.test(text)) return "COMPETITION";
  if (o.type === "GRANT" || /grant|seed/i.test(text)) return "GRANT";
  if (/training|mentor|coach/i.test(text) || o.type === "TRAINING" || o.type === "FELLOWSHIP") return "TRAINING_MENTORSHIP";
  return "OTHER";
};

export const matchFunding = (
  opportunities: OpportunityRecord[],
  venture: { sectorName: string | null; country: string },
  now: Date = new Date(),
): FundingMatch[] => {
  const matches: FundingMatch[] = [];
  for (const o of opportunities) {
    const text = `${o.title} ${o.description ?? ""} ${o.eligibility ?? ""}`;
    const relevantByText = RELEVANT.test(text);
    if (o.type !== "GRANT" && !relevantByText) continue;
    // Jobs and internships are employment, not venture support, unless the text is explicitly about enterprise.
    if ((o.type === "JOB" || o.type === "INTERNSHIP") && !/(start-?up|entrepreneur|incubat|accelerat|venture)/i.test(text)) continue;

    const reasons: string[] = [];
    let score = 0;
    if (o.type === "GRANT") { score += 40; reasons.push("Grant-type opportunity"); }
    if (relevantByText) { score += 25; reasons.push("Mentions enterprise, startup or funding support"); }
    if (venture.sectorName && text.toLowerCase().includes(venture.sectorName.toLowerCase())) { score += 20; reasons.push(`Mentions your sector (${venture.sectorName})`); }
    const country = (o.country ?? "").toLowerCase();
    if (!country) { score += 5; reasons.push("Country not stated: confirm eligibility"); }
    else if (country === venture.country.toLowerCase() || country === "rwanda" || country === "rw") { score += 15; reasons.push("Available in Rwanda"); }
    else reasons.push(`Based in ${o.country}: confirm Rwandan applicants are eligible`);

    const callStatus = o.source.isDemo ? "UNVERIFIED" : classifyCallStatus(o, now);
    matches.push({
      opportunityId: o.id,
      title: o.title,
      provider: o.provider,
      fundingType: inferType(o),
      callStatus,
      isActive: callStatus === "OPEN",
      deadline: o.deadline ? o.deadline.toISOString() : null,
      isRolling: o.isRolling,
      lastVerifiedAt: o.lastVerifiedAt ? o.lastVerifiedAt.toISOString() : null,
      country: o.country,
      officialUrl: o.url,
      eligibility: o.eligibility,
      matchScore: Math.min(100, score),
      matchReasons: reasons,
      source: o.source,
      disclaimer: "A match is not an approval or a promise of funding. Confirm the call, eligibility and deadline with the official provider.",
    });
  }
  return matches.sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.matchScore - a.matchScore || a.title.localeCompare(b.title));
};

export interface ReadinessCheck {
  key: string;
  label: string;
  met: boolean;
  detail: string;
}

export interface FundingReadinessFacts {
  hasProblemEvidence: boolean;
  hasCustomerEvidence: boolean;
  hasWillingnessToPayEvidence: boolean;
  hasBaseScenario: boolean;
  hasBusinessModel: boolean;
  hasMvpSpec: boolean;
  hasTeam: boolean;
  hasPitchDocument: boolean;
  hasAssessment: boolean;
  openHighRiskAssumptions: number;
}

/** Checklist, not a prediction: reports which commonly requested items exist in the workspace. */
export const fundingReadinessChecks = (f: FundingReadinessFacts): ReadinessCheck[] => [
  { key: "problem-evidence", label: "Problem evidence", met: f.hasProblemEvidence, detail: "At least one source-linked or verified item showing the problem exists." },
  { key: "customer-evidence", label: "Customer evidence", met: f.hasCustomerEvidence, detail: "Consented interviews or surveys with potential customers." },
  { key: "willingness-to-pay", label: "Willingness-to-pay evidence", met: f.hasWillingnessToPayEvidence, detail: "A pricing test, pre-order or test order." },
  { key: "financial-model", label: "Financial scenarios", met: f.hasBaseScenario, detail: "Deterministic break-even, cash-flow and runway figures." },
  { key: "business-model", label: "Business model", met: f.hasBusinessModel, detail: "Customer segments, value proposition, revenue streams and costs." },
  { key: "mvp-spec", label: "MVP specification", met: f.hasMvpSpec, detail: "A reviewed product scope and plan." },
  { key: "team", label: "Team", met: f.hasTeam, detail: "More than one active team member or advisor." },
  { key: "pitch-document", label: "Pitch or plan document", met: f.hasPitchDocument, detail: "A business plan or pitch deck linked from your document vault." },
  { key: "assessment", label: "Readiness assessment run", met: f.hasAssessment, detail: "A saved venture readiness assessment." },
  { key: "high-risk", label: "No untested high-risk assumptions", met: f.openHighRiskAssumptions === 0, detail: `${f.openHighRiskAssumptions} high-risk assumption(s) still untested.` },
];
