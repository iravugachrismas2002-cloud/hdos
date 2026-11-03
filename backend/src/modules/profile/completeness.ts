// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import type { EducationLevel } from "@prisma/client";

export interface CompletenessInput {
  educationLevel: EducationLevel;
  districtId: string | null;
  birthYear: number | null;
  bio: string | null;
  targetMonthlyIncomeRwf: number | null;
  skillCount: number;
  interestCount: number;
}

/**
 * Transparent 0-100 score shown to the user. Weights favour the inputs the recommendation engine
 * actually uses (skills, education, sector interests) so "complete" means "better matches".
 */
export const profileCompleteness = (p: CompletenessInput): number => {
  let score = 0;
  if (p.educationLevel !== "NONE") score += 25;
  if (p.skillCount >= 3) score += 30;
  else if (p.skillCount >= 1) score += 15;
  if (p.interestCount >= 1) score += 20;
  if (p.districtId) score += 10;
  if (p.targetMonthlyIncomeRwf) score += 5;
  if (p.birthYear) score += 5;
  if (p.bio && p.bio.trim().length >= 20) score += 5;
  return Math.min(100, score);
};
