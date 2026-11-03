// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Shared types for the seed data files. Pure types: no runtime code, no database access.

export type Edu =
  | "NONE" | "PRIMARY" | "LOWER_SECONDARY" | "UPPER_SECONDARY" | "TVET_CERTIFICATE"
  | "DIPLOMA" | "BACHELORS" | "MASTERS" | "DOCTORATE";

export type InstitutionKind = "UNIVERSITY" | "POLYTECHNIC" | "TVET" | "ACADEMY" | "OTHER";
export type OpportunityKind = "SCHOLARSHIP" | "INTERNSHIP" | "JOB" | "TRAINING" | "FELLOWSHIP" | "GRANT";
export type StepKindSeed = "EDUCATION" | "SKILL" | "EXPERIENCE" | "APPLY" | "MILESTONE";
export type PathKind = "LEARNING_PATH" | "CAREER_ROADMAP";

/** `UNKNOWN` unless an official source supports a rating. */
export type DemandSeed = "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export interface SectorSeed { code: string; name: string; nst2Priority: boolean }
export interface SkillSeed { name: string; category: string }
export type SkillReq = [skill: string, importance: number, requiredLevel: number];

export interface OccupationSeed {
  title: string;
  sector: string;
  minEducation: Edu;
  demand: DemandSeed;
  description: string;
  skills: SkillReq[];
}

export interface InstitutionSeed {
  name: string;
  type: InstitutionKind;
  /** Must match a district name in geography.ts exactly, or null when unsure / multi-campus. */
  district: string | null;
  website: string | null;
  /** DataSource slug. */
  source: string;
}

export interface ProgramSeed {
  institution: string;
  name: string;
  level: Edu;
  durationMonths: number | null;
  sector: string | null;
  skills: string[];
  occupations: string[];
  url?: string | null;
  source: string;
}

export interface OpportunitySeed {
  type: OpportunityKind;
  title: string;
  provider: string;
  description: string;
  eligibility: string;
  minEducation: Edu | null;
  country: string | null;
  url: string;
  isRolling: boolean;
  /** true only when the record was checked against the provider's official page during the seed authoring. */
  verified: boolean;
  /** DataSource slug. */
  source: string;
}

export type PathStepTuple = [
  phase: string,
  title: string,
  description: string,
  kind: StepKindSeed,
  monthOffset: number,
  resourceLabel?: string,
  resourceUrl?: string,
];

export interface PathSeed {
  slug: string;
  type: PathKind;
  title: string;
  summary: string;
  occupation: string | null;
  sector: string | null;
  startLevel: Edu | null;
  durationMonths: number;
  source: string;
  steps: PathStepTuple[];
}
