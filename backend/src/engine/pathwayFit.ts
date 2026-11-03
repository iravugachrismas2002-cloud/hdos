// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// HDOS Pathway Fit Index (PFI) — proprietary scoring model. See NOTICE for licensing.
//
// Design principles (these are what make the model defensible and auditable):
//  1. Deterministic: same inputs -> same score. No LLM is involved in ranking.
//  2. Decomposable: the score is a weighted sum of five named components the user can inspect.
//  3. Honest about uncertainty: every result carries a confidence level derived from profile
//     completeness and data provenance; unknown data is never silently treated as good news.
//  4. Gap-oriented: the output is not only "how well do I fit" but "what exactly is missing".

import type {
  Band,
  Confidence,
  DemandName,
  EducationLevelName,
  FitComponents,
  GoalCategoryName,
  MissingSkill,
  OccupationFit,
  OccupationInput,
  OpportunityFit,
  OpportunityInput,
  OpportunityTypeName,
  ProfileInput,
  ProgramFit,
  ProgramInput,
} from "./types";

export const ENGINE_VERSION = "pfi-1.0.0";

/** Component weights. They sum to 1 and are exposed so the UI/docs can show them. */
export const WEIGHTS = {
  skillCoverage: 0.4,
  educationReadiness: 0.2,
  marketDemand: 0.2,
  interest: 0.12,
  nationalPriority: 0.08,
} as const;

const EDUCATION_ORDER: EducationLevelName[] = [
  "NONE",
  "PRIMARY",
  "LOWER_SECONDARY",
  "UPPER_SECONDARY",
  "TVET_CERTIFICATE",
  "DIPLOMA",
  "BACHELORS",
  "MASTERS",
  "DOCTORATE",
];

export const educationRank = (level: EducationLevelName): number => EDUCATION_ORDER.indexOf(level);

export const EDUCATION_LABEL: Record<EducationLevelName, string> = {
  NONE: "No formal education",
  PRIMARY: "Primary",
  LOWER_SECONDARY: "Lower secondary",
  UPPER_SECONDARY: "Upper secondary",
  TVET_CERTIFICATE: "TVET certificate",
  DIPLOMA: "Diploma",
  BACHELORS: "Bachelor's degree",
  MASTERS: "Master's degree",
  DOCTORATE: "Doctorate",
};

/** What a learner must already hold to enter a programme of the given level. */
const ENTRY_REQUIREMENT: Record<EducationLevelName, EducationLevelName> = {
  NONE: "NONE",
  PRIMARY: "NONE",
  LOWER_SECONDARY: "PRIMARY",
  UPPER_SECONDARY: "LOWER_SECONDARY",
  TVET_CERTIFICATE: "LOWER_SECONDARY",
  DIPLOMA: "UPPER_SECONDARY",
  BACHELORS: "UPPER_SECONDARY",
  MASTERS: "BACHELORS",
  DOCTORATE: "MASTERS",
};

const DEMAND_SCORE: Record<DemandName, number> = { LOW: 0.25, MEDIUM: 0.5, HIGH: 0.75, VERY_HIGH: 1, UNKNOWN: 0.4 };

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const pct = (n: number) => Math.round(n * 100);

const educationReadiness = (have: EducationLevelName, need: EducationLevelName): number => {
  const gap = educationRank(need) - educationRank(have);
  if (gap <= 0) return 1;
  return [1, 0.7, 0.4, 0.2][gap] ?? 0.05;
};

export const bandFor = (score: number): Band => (score >= 70 ? "STRONG" : score >= 50 ? "PROMISING" : "STRETCH");

const confidenceFor = (profile: ProfileInput, occ: OccupationInput): Confidence => {
  let level = profile.completeness >= 75 ? 2 : profile.completeness >= 45 ? 1 : 0;
  // Thin occupation data lowers trust in the score, whatever the profile looks like.
  if (occ.demand === "UNKNOWN" || !occ.hasDemandSource || occ.skills.length < 3) level -= 1;
  return (["LOW", "MEDIUM", "HIGH"] as const)[Math.max(0, level)];
};

export const scoreOccupation = (profile: ProfileInput, occ: OccupationInput): OccupationFit => {
  const levels = new Map(profile.skills.map((s) => [s.skillId, s.level]));

  // Skill coverage: importance-weighted fraction of the required level the user already has.
  const totalImportance = occ.skills.reduce((sum, s) => sum + s.importance, 0);
  const covered = occ.skills.reduce(
    (sum, s) => sum + s.importance * clamp01((levels.get(s.skillId) ?? 0) / s.requiredLevel),
    0,
  );
  const skillCoverage = totalImportance > 0 ? covered / totalImportance : 0.5; // neutral when unknown

  const missingSkills: MissingSkill[] = occ.skills
    .map((s) => ({
      skillId: s.skillId,
      name: s.name,
      importance: s.importance,
      requiredLevel: s.requiredLevel,
      currentLevel: levels.get(s.skillId) ?? 0,
    }))
    .filter((s) => s.currentLevel < s.requiredLevel)
    .sort((a, b) => b.importance * (b.requiredLevel - b.currentLevel) - a.importance * (a.requiredLevel - a.currentLevel));

  const components: FitComponents = {
    skillCoverage,
    educationReadiness: educationReadiness(profile.educationLevel, occ.minEducation),
    marketDemand: DEMAND_SCORE[occ.demand],
    nationalPriority: occ.nst2Priority ? 1 : 0.4,
    interest: profile.sectorIds.length === 0 ? 0.5 : profile.sectorIds.includes(occ.sectorId) ? 1 : 0,
  };

  const raw =
    components.skillCoverage * WEIGHTS.skillCoverage +
    components.educationReadiness * WEIGHTS.educationReadiness +
    components.marketDemand * WEIGHTS.marketDemand +
    components.interest * WEIGHTS.interest +
    components.nationalPriority * WEIGHTS.nationalPriority;
  const fitScore = Math.round(clamp01(raw) * 100);

  const reasons: string[] = [];
  const have = occ.skills.length - missingSkills.length;
  reasons.push(
    occ.skills.length === 0
      ? "No skill requirements are recorded for this occupation yet, so skill fit is neutral."
      : `You already meet ${have} of ${occ.skills.length} key skill requirements (${pct(skillCoverage)}% importance-weighted coverage).`,
  );
  const gap = educationRank(occ.minEducation) - educationRank(profile.educationLevel);
  reasons.push(
    gap <= 0
      ? `Your education (${EDUCATION_LABEL[profile.educationLevel]}) meets the typical entry level (${EDUCATION_LABEL[occ.minEducation]}).`
      : `Typical entry level is ${EDUCATION_LABEL[occ.minEducation]}; you are ${gap} step${gap > 1 ? "s" : ""} away.`,
  );
  reasons.push(
    occ.demand === "UNKNOWN"
      ? "No verified labour-demand signal is available for this occupation, so demand is scored conservatively."
      : `Labour demand is rated ${occ.demand.replace("_", " ").toLowerCase()}.`,
  );
  if (profile.sectorIds.includes(occ.sectorId)) reasons.push("It is in a sector you told us you are interested in.");
  if (occ.nst2Priority) reasons.push("It sits in a sector flagged as a national development priority.");

  return {
    occupationId: occ.id,
    fitScore,
    band: bandFor(fitScore),
    confidence: confidenceFor(profile, occ),
    components,
    missingSkills,
    reasons,
  };
};

export const rankOccupations = (profile: ProfileInput, occupations: OccupationInput[]): OccupationFit[] =>
  occupations
    .map((o) => scoreOccupation(profile, o))
    // Ties are broken by id so results are reproducible across runs.
    .sort((a, b) => b.fitScore - a.fitScore || a.occupationId.localeCompare(b.occupationId));

/** Picks the occupation a roadmap should aim at: the explicit target, else a title match, else the best fit. */
export const pickTarget = (
  fits: OccupationFit[],
  occupations: OccupationInput[],
  goalTitle: string,
  targetOccupationId: string | null,
): OccupationFit | undefined => {
  if (targetOccupationId) {
    const explicit = fits.find((f) => f.occupationId === targetOccupationId);
    if (explicit) return explicit;
  }
  const words = goalTitle.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const titleOf = new Map(occupations.map((o) => [o.id, o.title.toLowerCase()]));
  const matched = fits.find((f) => words.some((w) => titleOf.get(f.occupationId)?.includes(w)));
  return matched ?? fits[0];
};

export const scoreProgram = (
  profile: ProfileInput,
  program: ProgramInput,
  gapSkills: MissingSkill[],
  targetOccupationId: string | null,
  skillNames: Map<string, string>,
): ProgramFit => {
  const totalGap = gapSkills.reduce((s, g) => s + g.importance * (g.requiredLevel - g.currentLevel), 0);
  const closing = gapSkills.filter((g) => program.skillIds.includes(g.skillId));
  const closedGap = closing.reduce((s, g) => s + g.importance * (g.requiredLevel - g.currentLevel), 0);
  const gapCoverage = totalGap > 0 ? closedGap / totalGap : 0;

  const eligible = educationRank(profile.educationLevel) >= educationRank(ENTRY_REQUIREMENT[program.level]);
  const linkedToTarget = targetOccupationId !== null && program.occupationIds.includes(targetOccupationId);
  const local = profile.districtId !== null && profile.districtId === program.districtId;

  let score = gapCoverage * 0.7 + (linkedToTarget ? 0.2 : 0) + (local ? 0.1 : 0);
  if (!eligible) score *= 0.3;

  const reasons: string[] = [];
  if (closing.length) reasons.push(`Teaches ${closing.length} of your ${gapSkills.length} skill gaps.`);
  if (linkedToTarget) reasons.push("Directly prepares for your target occupation.");
  if (local) reasons.push("Located in your district.");
  if (!eligible) reasons.push(`Requires ${EDUCATION_LABEL[ENTRY_REQUIREMENT[program.level]]} first.`);

  return {
    programId: program.id,
    score: pct(clamp01(score)),
    closesGaps: closing.map((g) => skillNames.get(g.skillId) ?? g.name),
    eligible,
    reasons,
  };
};

const TYPE_FIT: Record<GoalCategoryName, OpportunityTypeName[]> = {
  STUDY_ABROAD: ["SCHOLARSHIP", "FELLOWSHIP"],
  EDUCATION: ["SCHOLARSHIP", "TRAINING"],
  CAREER: ["INTERNSHIP", "JOB", "TRAINING"],
  ENTREPRENEURSHIP: ["GRANT", "TRAINING", "FELLOWSHIP"],
  SKILLS: ["TRAINING", "INTERNSHIP"],
  INCOME: ["JOB", "TRAINING", "GRANT"],
};

export const scoreOpportunity = (
  profile: ProfileInput,
  opp: OpportunityInput,
  category: GoalCategoryName,
  now: Date = new Date(),
): OpportunityFit | null => {
  if (opp.deadline && opp.deadline < now) return null; // expired: never recommend

  const eligibleNow = !opp.minEducation || educationRank(profile.educationLevel) >= educationRank(opp.minEducation);
  const typeFits = TYPE_FIT[category].includes(opp.type);
  const abroad = opp.country !== null && opp.country.toLowerCase() !== "rwanda";
  const placeFits = category === "STUDY_ABROAD" ? abroad : !abroad;

  let urgency = 0.5;
  if (opp.isRolling) urgency = 0.7;
  else if (opp.deadline) {
    const days = (opp.deadline.getTime() - now.getTime()) / 86_400_000;
    urgency = days < 7 ? 0.3 : days < 90 ? 1 : 0.6; // too close to prepare vs. actionable window
  }

  const score = (eligibleNow ? 0.4 : 0.1) + (typeFits ? 0.3 : 0.05) + (placeFits ? 0.15 : 0) + urgency * 0.15;

  const reasons: string[] = [];
  reasons.push(eligibleNow ? "You meet the minimum education requirement." : "You do not yet meet the education requirement.");
  if (typeFits) reasons.push(`A ${opp.type.toLowerCase()} fits a ${category.toLowerCase().replace("_", " ")} goal.`);
  if (opp.isRolling) reasons.push("Applications are accepted on a rolling basis.");
  else if (opp.deadline) reasons.push(`Deadline: ${opp.deadline.toISOString().slice(0, 10)}.`);

  return { opportunityId: opp.id, score: pct(clamp01(score)), eligibleNow, reasons };
};
