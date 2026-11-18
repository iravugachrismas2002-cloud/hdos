// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// HDOS AI operating modes. They are modes of ONE assistant sharing one conversation, not separate chatbots.
// Intent detection is deterministic and transparent (keyword rules), so a mode can always be explained.

export const AI_MODES = [
  "GENERAL_ASSISTANT",
  "GOAL_INTELLIGENCE",
  "EDUCATION_INTELLIGENCE",
  "CAREER_INTELLIGENCE",
  "OPPORTUNITY_INTELLIGENCE",
  "VENTURE_BUILDER",
  "FINANCIAL_INTELLIGENCE",
  "APPLICATION_ASSISTANT",
] as const;
export type AiMode = (typeof AI_MODES)[number];

const rules: { mode: AiMode; pattern: RegExp }[] = [
  { mode: "FINANCIAL_INTELLIGENCE", pattern: /\b(break-?even|cash ?flow|runway|unit economics|profit margin|gross margin|startup costs?|start-?up capital|financial (plan|model|projection)s?|pricing (model|strategy))\b/i },
  {
    mode: "VENTURE_BUILDER",
    pattern: /\b(start(ing)? (a |my |an )?(own )?(business|company|startup|start-up|agribusiness)|business idea|startup|start-up|my venture|venture|agribusiness|validate (my|the|this) idea|customer discovery|customer interviews?|\bmvp\b|pitch deck|business model|business plan|market validation|co-?founder|find (investors?|funding) for my)/i,
  },
  { mode: "APPLICATION_ASSISTANT", pattern: /\b(apply|application|cover letter|motivation letter|required documents?|submit)\b/i },
  { mode: "OPPORTUNITY_INTELLIGENCE", pattern: /\b(scholarships?|internships?|jobs?|vacanc(y|ies)|opportunit(y|ies)|grants?|fellowships?)\b/i },
  { mode: "EDUCATION_INTELLIGENCE", pattern: /\b(study|studying|course|programmes?|programs?|university|college|tvet|degree|diploma|admission)\b/i },
  { mode: "CAREER_INTELLIGENCE", pattern: /\b(career|occupation|employab\w*|profession|cv|resume)\b/i },
  { mode: "GOAL_INTELLIGENCE", pattern: /\b(goals?|roadmap|milestones?|my plan)\b/i },
];

export const detectMode = (message: string): AiMode => rules.find((r) => r.pattern.test(message))?.mode ?? "GENERAL_ASSISTANT";

export const isVentureMode = (mode: AiMode): boolean => mode === "VENTURE_BUILDER" || mode === "FINANCIAL_INTELLIGENCE";
