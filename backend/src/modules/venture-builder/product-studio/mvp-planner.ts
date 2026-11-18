// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Deterministic MVP specification skeleton built from the founder's own records (segments, features,
// assumptions). The AI may enrich narrative sections afterwards, but structure and prioritisation stay deterministic.
// Output is an engineering specification for human review: HDOS never changes or deploys code from it.
import type { MvpAiOutput, MvpContent } from "../ai/venture-output-schemas";

export interface MvpPlannerInput {
  name: string;
  idea: string | null;
  problem: string | null;
  segments: { name: string; description: string | null; needs: string[] }[];
  features: { title: string; description: string | null; priority: "MUST" | "SHOULD" | "COULD" | "WONT"; userStory: string | null; acceptanceCriteria: string[] }[];
  supportedAssumptions: string[];
  untestedHighRiskAssumptions: string[];
}

export interface MvpMeta {
  generatedBy: "template" | "ai-assisted";
  evidenceWarnings: string[];
  basedOn: { segments: number; features: number; supportedAssumptions: number };
}

export type StoredMvpContent = MvpContent & { meta: MvpMeta };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";

export const planMvp = (i: MvpPlannerInput): StoredMvpContent => {
  const personas = i.segments.length
    ? i.segments.slice(0, 5).map((s) => ({ name: s.name, description: s.description ?? `Customer segment: ${s.name}`, needs: s.needs.length ? s.needs.slice(0, 6) : ["Needs to be confirmed in customer interviews"] }))
    : [{ name: "Primary customer (define a customer segment)", description: "No customer segment has been recorded yet.", needs: ["Needs to be confirmed in customer interviews"] }];
  const primary = personas[0].name;

  const baseFeatures = i.features.length
    ? i.features
    : [
        { title: "Account creation and secure sign-in", description: null, priority: "MUST" as const, userStory: null, acceptanceCriteria: [] },
        { title: `Core workflow that delivers the value proposition${i.idea ? `: ${i.idea.slice(0, 80)}` : ""}`, description: null, priority: "MUST" as const, userStory: null, acceptanceCriteria: [] },
        { title: "Record and history of each customer interaction", description: null, priority: "SHOULD" as const, userStory: null, acceptanceCriteria: [] },
        { title: "Collect customer feedback inside the product", description: null, priority: "SHOULD" as const, userStory: null, acceptanceCriteria: [] },
        { title: "Usage analytics dashboard", description: null, priority: "COULD" as const, userStory: null, acceptanceCriteria: [] },
      ];

  const must = baseFeatures.filter((f) => f.priority === "MUST");
  const should = baseFeatures.filter((f) => f.priority === "SHOULD");
  const mvpFeatures = [...must, ...should.slice(0, Math.max(0, 6 - must.length))];
  const deferred = baseFeatures.filter((f) => !mvpFeatures.includes(f));
  const coreResource = slug(must[0]?.title ?? "records");

  const userStories = baseFeatures.filter((f) => f.priority !== "WONT").map((f) => f.userStory ?? `As a ${primary}, I want ${f.title.charAt(0).toLowerCase()}${f.title.slice(1)}, so that I can get value from the product without manual work.`);
  const acceptanceCriteria = baseFeatures.filter((f) => f.priority !== "WONT").map((f, idx) => ({
    story: userStories[idx] ?? f.title,
    criteria: f.acceptanceCriteria.length ? f.acceptanceCriteria : [`Given a signed-in ${primary}, when they use "${f.title}", then the result is saved and visible to them.`, "Invalid input is rejected with a clear message.", "The action works on a low-bandwidth mobile connection."],
  }));

  const warnings: string[] = [];
  if (i.supportedAssumptions.length === 0) warnings.push("No assumptions are marked supported by evidence yet. Treat this specification as a plan to test, not a validated product.");
  if (i.untestedHighRiskAssumptions.length) warnings.push(`${i.untestedHighRiskAssumptions.length} high-risk assumption(s) are still untested: ${i.untestedHighRiskAssumptions.slice(0, 3).join("; ")}`);
  if (i.segments.length === 0) warnings.push("No customer segments are recorded, so personas and journeys are placeholders.");

  return {
    productVision: `${i.name}: ${i.idea ?? "a product that solves a validated customer problem"}.`,
    problemStatement: i.problem ?? "The problem statement has not been written yet; define it from customer interview findings.",
    personas,
    userJourneys: personas.slice(0, 3).map((p) => ({ persona: p.name, steps: ["Discovers the product", "Signs up", `Completes the core workflow (${must[0]?.title ?? "core task"})`, "Receives the outcome", "Gives feedback and returns"] })),
    productRequirements: [
      `The product must let ${primary} complete the core workflow end to end.`,
      "Personal data is collected only with consent and kept private.",
      "Every key action is recorded so the venture can measure activation and retention.",
      ...mvpFeatures.map((f) => `Deliver: ${f.title}`),
    ],
    mvpScope: { included: mvpFeatures.map((f) => f.title), excluded: deferred.map((f) => f.title) },
    featurePriorities: baseFeatures.map((f) => ({ feature: f.title, priority: f.priority, rationale: f.priority === "MUST" ? "Required for the smallest version that can test the riskiest assumption." : undefined })),
    userStories,
    acceptanceCriteria,
    functionalRequirements: mvpFeatures.map((f) => `The system shall provide: ${f.title}.`),
    nonFunctionalRequirements: [
      "Security: authenticated access, encrypted transport, least-privilege authorisation.",
      "Privacy: collect the minimum personal data and meet applicable Rwandan data-protection requirements.",
      "Performance: core screens usable on low-bandwidth mobile connections.",
      "Reliability: automated daily backups and a documented restore procedure.",
      "Accessibility: usable with English, Kinyarwanda and French content where customers need it.",
    ],
    technicalArchitecture: {
      overview: "Proposal: a modular monolith (web client, API, relational database). Keep one deployable unit until measured load justifies splitting it. Final technology choices belong to the engineering team.",
      components: ["Web client (responsive, mobile-first)", "REST API with authentication and authorisation", "Relational database with migrations", "Background job runner for notifications", "Monitoring and error tracking"],
      risks: ["Scope growth beyond the MUST features", "Unvalidated assumptions driving design choices", "Dependency on third-party payment or messaging providers"],
    },
    databaseDesign: [
      { entity: "User", purpose: "People who sign in", keyFields: ["id", "email", "name", "role", "createdAt"] },
      { entity: coreResource.replace(/-/g, "_"), purpose: "The central record of the core workflow (rename for your domain)", keyFields: ["id", "ownerId", "status", "createdAt", "updatedAt"] },
      { entity: "feedback", purpose: "Customer feedback tied to a user and record", keyFields: ["id", "userId", "message", "createdAt"] },
      { entity: "audit_event", purpose: "Who changed what, and when", keyFields: ["id", "actorId", "action", "targetId", "createdAt"] },
    ],
    apiCatalogue: [
      { method: "POST", path: "/api/auth/register", purpose: "Create an account" },
      { method: "POST", path: "/api/auth/login", purpose: "Sign in" },
      { method: "GET", path: `/api/${coreResource}`, purpose: "List the signed-in user's records" },
      { method: "POST", path: `/api/${coreResource}`, purpose: "Create a record" },
      { method: "PATCH", path: `/api/${coreResource}/:id`, purpose: "Update a record" },
      { method: "POST", path: "/api/feedback", purpose: "Submit feedback" },
    ],
    developmentRoadmap: [
      { phase: "Foundation", weeks: 2, deliverables: ["Repository, CI and environments", "Authentication", "Database schema"] },
      { phase: "Core MVP", weeks: 4, deliverables: mvpFeatures.map((f) => f.title).slice(0, 6) },
      { phase: "Pilot preparation", weeks: 2, deliverables: ["Test with 5 target users", "Fix critical defects", "Set up analytics"] },
      { phase: "Pilot", weeks: 4, deliverables: ["Onboard first customers", "Record KPIs weekly", "Compare results with assumptions"] },
    ],
    testingStrategy: [
      "Unit tests for business rules and calculations.",
      "API integration tests including authorisation checks (one user must never read another user's data).",
      "Acceptance tests derived from each user story's criteria.",
      "Usability test with at least 5 target customers before the pilot.",
      "Security review of authentication and data access before launch.",
    ],
    prototypeRequirements: ["Clickable prototype of the core workflow", "Test with 5 target customers and record observations as evidence", "Capture whether they would pay or pre-order"],
    meta: {
      generatedBy: "template",
      evidenceWarnings: warnings,
      basedOn: { segments: i.segments.length, features: i.features.length, supportedAssumptions: i.supportedAssumptions.length },
    },
  };
};

/** Merges validated AI narrative into the deterministic spec; structural sections are never replaced. */
export const mergeAiNarrative = (base: StoredMvpContent, ai: MvpAiOutput): StoredMvpContent => ({
  ...base,
  ...(ai.productVision ? { productVision: ai.productVision } : {}),
  ...(ai.problemStatement ? { problemStatement: ai.problemStatement } : {}),
  ...(ai.userJourneys?.length ? { userJourneys: ai.userJourneys } : {}),
  ...(ai.functionalRequirements?.length ? { functionalRequirements: ai.functionalRequirements } : {}),
  ...(ai.nonFunctionalRequirements?.length ? { nonFunctionalRequirements: ai.nonFunctionalRequirements } : {}),
  ...(ai.technicalArchitecture ? { technicalArchitecture: ai.technicalArchitecture } : {}),
  meta: { ...base.meta, generatedBy: "ai-assisted" },
});
