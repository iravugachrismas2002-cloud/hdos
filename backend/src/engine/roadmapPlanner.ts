// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// HDOS Pathway Fit Index (PFI) — proprietary roadmap planner. See NOTICE for licensing.

import { EDUCATION_LABEL, educationRank } from "./pathwayFit";
import type {
  EducationLevelName,
  OccupationFit,
  OpportunityFit,
  ProfileInput,
  ProgramFit,
} from "./types";

export type StepKindName = "EDUCATION" | "SKILL" | "EXPERIENCE" | "APPLY" | "MILESTONE";
export type RefTypeName = "PROGRAM" | "OPPORTUNITY" | "SKILL" | "OCCUPATION";

export interface PlannedStep {
  order: number;
  phase: string;
  title: string;
  description: string;
  kind: StepKindName;
  monthOffset: number;
  ref: { type: RefTypeName; id: string; label: string } | null;
}

export interface PlanInput {
  profile: ProfileInput;
  target: { id: string; title: string; minEducation: EducationLevelName };
  fit: OccupationFit;
  programs: { fit: ProgramFit; name: string; institution: string }[];
  opportunities: { fit: OpportunityFit; title: string; provider: string; type: string }[];
  horizonMonths: number;
}

export interface Plan {
  summary: string;
  steps: PlannedStep[];
}

const MAX_SKILL_STEPS = 4;

export const planRoadmap = (input: PlanInput): Plan => {
  const { profile, target, fit, horizonMonths } = input;
  const horizon = Math.max(3, Math.min(60, Math.round(horizonMonths)));
  const at = (fraction: number) => Math.round(horizon * fraction);
  const steps: PlannedStep[] = [];
  const add = (s: Omit<PlannedStep, "order">) => steps.push({ ...s, order: steps.length + 1 });

  const foundation = `Foundation (months 0-${at(0.3)})`;
  const build = `Build experience (months ${at(0.3)}-${at(0.75)})`;
  const launch = `Launch (months ${at(0.75)}-${horizon})`;

  // 1. Close the education gap first: it gates programmes and many employers.
  const gap = educationRank(target.minEducation) - educationRank(profile.educationLevel);
  if (gap > 0) {
    const bestProgram = input.programs.find((p) => p.fit.eligible && p.fit.score > 0);
    add({
      phase: foundation,
      kind: "EDUCATION",
      title: `Reach ${EDUCATION_LABEL[target.minEducation]}`,
      description: bestProgram
        ? `${target.title} typically requires ${EDUCATION_LABEL[target.minEducation]}. Consider "${bestProgram.name}" at ${bestProgram.institution}. Confirm admission requirements and fees with the institution.`
        : `${target.title} typically requires ${EDUCATION_LABEL[target.minEducation]}. Check HEC or Rwanda TVET Board accredited programmes that fit your situation.`,
      monthOffset: 0,
      ref: bestProgram ? { type: "PROGRAM", id: bestProgram.fit.programId, label: bestProgram.name } : null,
    });
  }

  // 2. Skill steps, ordered by importance x gap size (already sorted by the engine).
  const gaps = fit.missingSkills.slice(0, MAX_SKILL_STEPS);
  gaps.forEach((skill, i) => {
    const supporting = input.programs.find((p) => p.fit.eligible && p.fit.closesGaps.includes(skill.name));
    add({
      phase: foundation,
      kind: "SKILL",
      title: `Build skill: ${skill.name}`,
      description: `Raise ${skill.name} from level ${skill.currentLevel} to ${skill.requiredLevel} of 5 (importance ${skill.importance}/5 for ${target.title}).${
        supporting ? ` "${supporting.name}" at ${supporting.institution} covers this skill.` : ""
      }`,
      monthOffset: at(0.3 * (i / Math.max(1, gaps.length))),
      ref: { type: "SKILL", id: skill.skillId, label: skill.name },
    });
  });

  // 3. Practical experience.
  add({
    phase: build,
    kind: "EXPERIENCE",
    title: `Apply your skills in a real ${target.title.toLowerCase()} project`,
    description:
      "Complete one concrete piece of work (a portfolio project, volunteering, or a supervised task) that demonstrates your skills to an employer. Document what you did and the result.",
    monthOffset: at(0.4),
    ref: { type: "OCCUPATION", id: target.id, label: target.title },
  });

  const topOpps = input.opportunities.filter((o) => o.fit.eligibleNow).slice(0, 2);
  topOpps.forEach((o, i) => {
    add({
      phase: build,
      kind: "APPLY",
      title: `Apply: ${o.title}`,
      description: `${o.provider} offers this ${o.type.toLowerCase()}. ${o.fit.reasons.join(" ")} Verify the current requirements on the provider's official site before applying.`,
      monthOffset: at(0.5 + i * 0.1),
      ref: { type: "OPPORTUNITY", id: o.fit.opportunityId, label: o.title },
    });
  });

  // 4. Launch + review loop.
  add({
    phase: launch,
    kind: "APPLY",
    title: `Apply for entry-level ${target.title} roles`,
    description:
      "Prepare a CV that leads with the skills above, then apply to employers and public vacancy portals. Ask for feedback after each application.",
    monthOffset: at(0.8),
    ref: { type: "OCCUPATION", id: target.id, label: target.title },
  });
  add({
    phase: launch,
    kind: "MILESTONE",
    title: "Review progress and update your profile",
    description:
      "Update your skill levels in HDOS and regenerate this roadmap. Your fit score and next steps will be recalculated from your new profile.",
    monthOffset: horizon,
    ref: null,
  });

  const priorities = gaps.slice(0, 2).map((g) => g.name);
  const summary =
    `Pathway to ${target.title}: current fit ${fit.fitScore}/100 (${fit.band.toLowerCase()}, ${fit.confidence.toLowerCase()} confidence). ` +
    (gaps.length > 0
      ? `${fit.missingSkills.length} skill gap${fit.missingSkills.length > 1 ? "s" : ""} to close; start with ${priorities.join(" and ")}.`
      : "No skill gaps detected against the recorded requirements; focus on experience and applications.") +
    (gap > 0 ? ` An education step (${EDUCATION_LABEL[target.minEducation]}) comes first.` : "");

  return { summary, steps };
};

export const progressOf = (statuses: string[]): number => {
  const counted = statuses.filter((s) => s !== "SKIPPED");
  if (counted.length === 0) return 0;
  return Math.round((counted.filter((s) => s === "DONE").length / counted.length) * 100);
};
