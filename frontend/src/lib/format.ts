// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import type { DemandLevel, EducationLevel, GoalCategory, OpportunityType, Role } from "./types";

export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  NONE: "No formal education",
  PRIMARY: "Primary",
  LOWER_SECONDARY: "Lower secondary (O-level)",
  UPPER_SECONDARY: "Upper secondary (A-level)",
  TVET_CERTIFICATE: "TVET certificate",
  DIPLOMA: "Diploma",
  BACHELORS: "Bachelor's degree",
  MASTERS: "Master's degree",
  DOCTORATE: "Doctorate",
};
export const EDUCATION_LEVELS = Object.keys(EDUCATION_LABELS) as EducationLevel[];

export const CATEGORY_LABELS: Record<GoalCategory, string> = {
  EDUCATION: "Education",
  CAREER: "Career",
  ENTREPRENEURSHIP: "Entrepreneurship",
  SKILLS: "Skills",
  INCOME: "Income growth",
  STUDY_ABROAD: "Study abroad",
};

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: "Student",
  GRADUATE: "Graduate",
  JOB_SEEKER: "Job seeker",
  ENTREPRENEUR: "Entrepreneur",
  PROFESSIONAL: "Professional",
  GOVERNMENT_ANALYST: "Government analyst",
  ADMINISTRATOR: "Administrator",
};
export const SELF_ROLES: Role[] = ["STUDENT", "GRADUATE", "JOB_SEEKER", "ENTREPRENEUR", "PROFESSIONAL"];

export const OPPORTUNITY_LABELS: Record<OpportunityType, string> = {
  SCHOLARSHIP: "Scholarship",
  INTERNSHIP: "Internship",
  JOB: "Job",
  TRAINING: "Training",
  FELLOWSHIP: "Fellowship",
  GRANT: "Grant / financing",
};

export const DEMAND_LABELS: Record<DemandLevel, string> = {
  LOW: "Low", MEDIUM: "Medium", HIGH: "High", VERY_HIGH: "Very high", UNKNOWN: "Unknown",
};

export const SKILL_LEVELS = ["Beginner", "Basic", "Working", "Advanced", "Expert"] as const;

const PROVIDER_LABELS: Record<string, string> = { gemini: "Gemini", groq: "Groq", openrouter: "OpenRouter", fallback: "Offline answer" };
/** Human-friendly name of the AI provider that produced a text (`fallback` = built-in template). */
export const providerLabel = (provider: string | null | undefined) =>
  provider ? (PROVIDER_LABELS[provider] ?? titleCase(provider)) : "Offline answer";

export const PATH_TYPE_LABELS = { LEARNING_PATH: "Learning path", CAREER_ROADMAP: "Career roadmap" } as const;
export const PATH_KIND_LABELS = {
  EDUCATION: "Education", SKILL: "Skill", EXPERIENCE: "Experience", APPLY: "Apply", MILESTONE: "Milestone",
} as const;

export const formatNumber = (n: number) => n.toLocaleString("en-US");
export const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
export const titleCase = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
