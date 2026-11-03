// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// HDOS Pathway Fit Index (PFI) — proprietary scoring model. See NOTICE for licensing.

export type EducationLevelName =
  | "NONE"
  | "PRIMARY"
  | "LOWER_SECONDARY"
  | "UPPER_SECONDARY"
  | "TVET_CERTIFICATE"
  | "DIPLOMA"
  | "BACHELORS"
  | "MASTERS"
  | "DOCTORATE";

export type DemandName = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" | "UNKNOWN";
export type GoalCategoryName = "EDUCATION" | "CAREER" | "ENTREPRENEURSHIP" | "SKILLS" | "INCOME" | "STUDY_ABROAD";
export type OpportunityTypeName = "SCHOLARSHIP" | "INTERNSHIP" | "JOB" | "TRAINING" | "FELLOWSHIP" | "GRANT";

export interface ProfileInput {
  educationLevel: EducationLevelName;
  districtId: string | null;
  completeness: number; // 0-100
  skills: { skillId: string; level: number }[];
  sectorIds: string[];
}

export interface OccupationInput {
  id: string;
  title: string;
  sectorId: string;
  nst2Priority: boolean;
  minEducation: EducationLevelName;
  demand: DemandName;
  hasDemandSource: boolean;
  skills: { skillId: string; name: string; importance: number; requiredLevel: number }[];
}

export interface ProgramInput {
  id: string;
  name: string;
  level: EducationLevelName;
  districtId: string | null;
  skillIds: string[];
  occupationIds: string[];
}

export interface OpportunityInput {
  id: string;
  type: OpportunityTypeName;
  title: string;
  minEducation: EducationLevelName | null;
  deadline: Date | null;
  isRolling: boolean;
  country: string | null;
}

export interface FitComponents {
  skillCoverage: number;
  educationReadiness: number;
  marketDemand: number;
  nationalPriority: number;
  interest: number;
}

export type Band = "STRONG" | "PROMISING" | "STRETCH";
export type Confidence = "LOW" | "MEDIUM" | "HIGH";

export interface MissingSkill {
  skillId: string;
  name: string;
  importance: number;
  requiredLevel: number;
  currentLevel: number;
}

export interface OccupationFit {
  occupationId: string;
  fitScore: number;
  band: Band;
  confidence: Confidence;
  components: FitComponents;
  missingSkills: MissingSkill[];
  reasons: string[];
}

export interface ProgramFit {
  programId: string;
  score: number;
  closesGaps: string[];
  eligible: boolean;
  reasons: string[];
}

export interface OpportunityFit {
  opportunityId: string;
  score: number;
  eligibleNow: boolean;
  reasons: string[];
}
