// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Every AI answer used by Venture Builder must parse against one of these schemas. Anything else is discarded
// in favour of the deterministic template, so malformed model output can never reach the workspace.
import { z } from "zod";

export const ASSUMPTION_CATEGORIES = ["PROBLEM", "CUSTOMER", "MARKET", "WILLINGNESS_TO_PAY", "TECHNICAL", "FINANCIAL", "OPERATIONAL", "DIFFERENTIATION", "TEAM"] as const;

const text = (max: number) => z.string().trim().min(1).max(max);
const list = (max: number, itemMax: number) => z.array(text(itemMax)).max(max);

export const draftAssumptionSchema = z.object({
  statement: text(400),
  category: z.enum(ASSUMPTION_CATEGORIES),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  testMethod: text(300).optional(),
});
export type DraftAssumption = z.infer<typeof draftAssumptionSchema>;

/** What the model is allowed to contribute to discovery: hypotheses and questions, never facts or statistics. */
export const discoveryAiSchema = z.object({
  summary: text(1500),
  opportunityBrief: z.object({
    problem: text(800),
    affectedCustomerGroups: list(8, 200),
    currentAlternatives: list(8, 200),
    potentialSolutions: list(8, 300),
    unansweredQuestions: list(10, 300),
  }),
  draftAssumptions: z.array(draftAssumptionSchema).max(10),
  interviewQuestions: list(12, 300),
  recommendations: list(8, 300),
});
export type DiscoveryAiOutput = z.infer<typeof discoveryAiSchema>;

export const MVP_CONTENT_KEYS = [
  "productVision",
  "problemStatement",
  "personas",
  "userJourneys",
  "productRequirements",
  "mvpScope",
  "featurePriorities",
  "userStories",
  "acceptanceCriteria",
  "functionalRequirements",
  "nonFunctionalRequirements",
  "technicalArchitecture",
  "databaseDesign",
  "apiCatalogue",
  "developmentRoadmap",
  "testingStrategy",
  "prototypeRequirements",
] as const;
export type MvpContentKey = (typeof MVP_CONTENT_KEYS)[number];

export const mvpContentSchema = z.object({
  productVision: text(1000),
  problemStatement: text(1000),
  personas: z.array(z.object({ name: text(120), description: text(600), needs: list(8, 200) })).max(8),
  userJourneys: z.array(z.object({ persona: text(120), steps: list(12, 300) })).max(8),
  productRequirements: list(20, 400),
  mvpScope: z.object({ included: list(20, 300), excluded: list(20, 300) }),
  featurePriorities: z.array(z.object({ feature: text(200), priority: z.enum(["MUST", "SHOULD", "COULD", "WONT"]), rationale: text(300).optional() })).max(30),
  userStories: list(30, 400),
  acceptanceCriteria: z.array(z.object({ story: text(400), criteria: list(8, 300) })).max(30),
  functionalRequirements: list(30, 400),
  nonFunctionalRequirements: list(20, 300),
  technicalArchitecture: z.object({ overview: text(1200), components: list(12, 300), risks: list(10, 300) }),
  databaseDesign: z.array(z.object({ entity: text(100), purpose: text(300), keyFields: list(15, 100) })).max(20),
  apiCatalogue: z.array(z.object({ method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]), path: text(200), purpose: text(300) })).max(40),
  developmentRoadmap: z.array(z.object({ phase: text(120), weeks: z.number().int().min(1).max(52), deliverables: list(10, 300) })).max(10),
  testingStrategy: list(15, 300),
  prototypeRequirements: list(15, 300),
});
export type MvpContent = z.infer<typeof mvpContentSchema>;

/** The model may only enrich narrative sections; structural sections stay deterministic. */
export const mvpAiSchema = mvpContentSchema
  .pick({ productVision: true, problemStatement: true, userJourneys: true, functionalRequirements: true, nonFunctionalRequirements: true, technicalArchitecture: true })
  .partial();
export type MvpAiOutput = z.infer<typeof mvpAiSchema>;

export const explanationSchema = z.object({
  explanation: text(2000),
  nextSteps: list(8, 300),
});
export type ExplanationOutput = z.infer<typeof explanationSchema>;
