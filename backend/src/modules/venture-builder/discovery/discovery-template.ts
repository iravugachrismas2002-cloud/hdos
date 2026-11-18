// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Deterministic discovery output used when AI is off, unavailable or returns an invalid structure. It contains
// only questions and hypotheses derived from the founder's own words, no external facts.
import type { DiscoveryAiOutput } from "../ai/venture-output-schemas";

export interface DiscoveryTemplateInput {
  name: string;
  idea: string | null;
  problem: string | null;
  sectorName: string | null;
  segmentNames: string[];
  competitorNames: string[];
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export const discoveryTemplate = (i: DiscoveryTemplateInput): DiscoveryAiOutput => {
  const subject = clip((i.problem ?? i.idea ?? i.name).trim(), 160);
  const customers = i.segmentNames.length ? i.segmentNames.join(", ") : "the people or organisations you want to serve";
  const hasIdea = Boolean(i.idea || i.problem);

  return {
    summary: hasIdea
      ? `A starting point for exploring "${clip(i.name, 80)}". Nothing below is validated: each item is a question or hypothesis to test with real customers and sourced data.`
      : `No idea has been described yet. Use the sector leads from your profile to choose a problem area, then describe the problem in your own words.`,
    opportunityBrief: {
      problem: hasIdea ? subject : "Not defined yet. Describe a problem you have seen people or organisations struggle with.",
      affectedCustomerGroups: i.segmentNames.length ? i.segmentNames : ["To be defined: who experiences this problem most often?"],
      currentAlternatives: i.competitorNames.length ? i.competitorNames : ["To be researched: how do people solve this today (including doing nothing)?"],
      potentialSolutions: hasIdea && i.idea ? [clip(i.idea, 280)] : ["To be defined after the problem is confirmed with customers."],
      unansweredQuestions: [
        `How many of ${customers} actually have this problem, and how often?`,
        "What do they currently do about it, and what does that cost them?",
        "What would make them switch to a new solution?",
        "How many would place a real test order or pre-order?",
        "Can you deliver the required quality and quantity?",
      ],
    },
    draftAssumptions: [
      { statement: `${customers.charAt(0).toUpperCase()}${customers.slice(1)} regularly experience this problem: ${subject}`, category: "PROBLEM", riskLevel: "HIGH", testMethod: "Interview at least 10 people from the target group" },
      { statement: "The target customers can be identified and reached through a channel you can afford", category: "CUSTOMER", riskLevel: "MEDIUM", testMethod: "Contact 20 people through the planned channel and record response rate" },
      { statement: "Customers will pay a price that covers the cost of delivering the solution", category: "WILLINGNESS_TO_PAY", riskLevel: "HIGH", testMethod: "Offer a pre-order or test order at the planned price" },
      { statement: "The market is large enough to reach the first 100 paying customers", category: "MARKET", riskLevel: "MEDIUM", testMethod: "Source official statistics and count reachable customers in one district" },
      { statement: "The product can be delivered with the people, technology and budget available", category: "TECHNICAL", riskLevel: "MEDIUM", testMethod: "Build and test a small prototype or manual service" },
      { statement: "The business can operate within the licences and regulations that apply", category: "OPERATIONAL", riskLevel: "MEDIUM", testMethod: "Check requirements with RDB and the relevant regulator" },
      { statement: "Customers see a clear reason to choose this solution over current alternatives", category: "DIFFERENTIATION", riskLevel: "MEDIUM", testMethod: "Ask customers to compare your offer with their current option" },
    ],
    interviewQuestions: [
      "Tell me about the last time you faced this problem. What happened?",
      "How do you handle it today? What do you use and what does it cost?",
      "What is the most frustrating part of the current approach?",
      "Have you tried anything else? Why did you stop?",
      "If a solution existed, what would it need to do for you to switch?",
      "How much would you expect to pay, and how would you pay?",
      "Who else is involved in the decision to buy?",
      "Would you be willing to try a first version and give feedback?",
    ],
    recommendations: [
      "Write down your riskiest assumptions and test those first.",
      "Complete at least 10 customer interviews with recorded consent before building anything.",
      "Define one customer segment precisely rather than serving everyone.",
      "Record every source you rely on, with its publisher and retrieval date.",
    ],
  };
};
