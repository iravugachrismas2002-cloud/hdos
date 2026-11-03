// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { describe, expect, it } from "vitest";
import {
  WEIGHTS,
  bandFor,
  pickTarget,
  rankOccupations,
  scoreOccupation,
  scoreOpportunity,
  scoreProgram,
} from "../engine/pathwayFit";
import { planRoadmap, progressOf } from "../engine/roadmapPlanner";
import type { OccupationInput, ProfileInput, ProgramInput } from "../engine/types";

const dev: OccupationInput = {
  id: "occ-dev",
  title: "Software Developer",
  sectorId: "ict",
  nst2Priority: true,
  minEducation: "BACHELORS",
  demand: "HIGH",
  hasDemandSource: true,
  skills: [
    { skillId: "py", name: "Python", importance: 5, requiredLevel: 4 },
    { skillId: "sql", name: "SQL", importance: 4, requiredLevel: 3 },
    { skillId: "git", name: "Git", importance: 3, requiredLevel: 3 },
  ],
};

const nurse: OccupationInput = {
  id: "occ-nurse",
  title: "Nurse",
  sectorId: "health",
  nst2Priority: true,
  minEducation: "DIPLOMA",
  demand: "UNKNOWN",
  hasDemandSource: false,
  skills: [{ skillId: "care", name: "Patient care", importance: 5, requiredLevel: 4 }],
};

const base: ProfileInput = {
  educationLevel: "UPPER_SECONDARY",
  districtId: "d-huye",
  completeness: 80,
  skills: [{ skillId: "py", level: 2 }],
  sectorIds: ["ict"],
};

describe("pathway fit index", () => {
  it("weights sum to exactly 1", () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("is deterministic", () => {
    expect(scoreOccupation(base, dev)).toEqual(scoreOccupation(base, dev));
  });

  it("scores a fully qualified, interested user as STRONG with no gaps", () => {
    const expert: ProfileInput = {
      ...base,
      educationLevel: "BACHELORS",
      skills: [
        { skillId: "py", level: 5 },
        { skillId: "sql", level: 4 },
        { skillId: "git", level: 4 },
      ],
    };
    const fit = scoreOccupation(expert, dev);
    expect(fit.missingSkills).toHaveLength(0);
    expect(fit.band).toBe("STRONG");
    expect(fit.fitScore).toBeGreaterThanOrEqual(90);
  });

  it("ranks missing skills by importance x gap size", () => {
    const fit = scoreOccupation(base, dev);
    // sql: 4x3=12, py: 5x2=10, git: 3x3=9
    expect(fit.missingSkills.map((s) => s.skillId)).toEqual(["sql", "py", "git"]);
    expect(fit.missingSkills[1]).toMatchObject({ skillId: "py", currentLevel: 2, requiredLevel: 4 });
  });

  it("scores more skills higher (monotonic)", () => {
    const more: ProfileInput = { ...base, skills: [...base.skills, { skillId: "sql", level: 3 }] };
    expect(scoreOccupation(more, dev).fitScore).toBeGreaterThan(scoreOccupation(base, dev).fitScore);
  });

  it("penalises an education gap", () => {
    const low = scoreOccupation({ ...base, educationLevel: "PRIMARY" }, dev);
    const high = scoreOccupation({ ...base, educationLevel: "BACHELORS" }, dev);
    expect(low.components.educationReadiness).toBeLessThan(high.components.educationReadiness);
  });

  it("never treats unknown demand as good news and lowers confidence", () => {
    const fit = scoreOccupation(base, nurse);
    expect(fit.components.marketDemand).toBeLessThan(0.5);
    expect(fit.confidence).not.toBe("HIGH");
    expect(fit.reasons.join(" ")).toMatch(/No verified labour-demand signal/);
  });

  it("gives low confidence for a thin profile", () => {
    expect(scoreOccupation({ ...base, completeness: 10 }, dev).confidence).toBe("LOW");
  });

  it("ranks by score and breaks ties by id", () => {
    const a = { ...dev, id: "a" };
    const b = { ...dev, id: "b" };
    const ranked = rankOccupations(base, [b, a, nurse]);
    expect(ranked[0].occupationId).toBe("a");
    expect(ranked[1].occupationId).toBe("b");
  });

  it("maps scores to bands", () => {
    expect(bandFor(70)).toBe("STRONG");
    expect(bandFor(50)).toBe("PROMISING");
    expect(bandFor(49)).toBe("STRETCH");
  });

  it("picks explicit target, then title match, then best fit", () => {
    const fits = rankOccupations(base, [dev, nurse]);
    expect(pickTarget(fits, [dev, nurse], "anything", "occ-nurse")?.occupationId).toBe("occ-nurse");
    expect(pickTarget(fits, [dev, nurse], "Become a nurse", null)?.occupationId).toBe("occ-nurse");
    expect(pickTarget(fits, [dev, nurse], "xx", null)?.occupationId).toBe(fits[0].occupationId);
  });
});

describe("programme and opportunity matching", () => {
  const fit = scoreOccupation(base, dev);
  const names = new Map([["py", "Python"], ["sql", "SQL"], ["git", "Git"]]);
  const prog: ProgramInput = {
    id: "p1", name: "BSc IT", level: "BACHELORS", districtId: "d-huye",
    skillIds: ["py", "sql"], occupationIds: ["occ-dev"],
  };

  it("rewards programmes that close gaps and are local", () => {
    const m = scoreProgram(base, prog, fit.missingSkills, "occ-dev", names);
    expect(m.closesGaps).toEqual(["SQL", "Python"]);
    expect(m.eligible).toBe(true);
    expect(m.score).toBeGreaterThan(60);
  });

  it("heavily discounts programmes the user is not yet eligible for", () => {
    const masters = { ...prog, level: "MASTERS" as const };
    const eligible = scoreProgram(base, prog, fit.missingSkills, "occ-dev", names);
    const blocked = scoreProgram(base, masters, fit.missingSkills, "occ-dev", names);
    expect(blocked.eligible).toBe(false);
    expect(blocked.score).toBeLessThan(eligible.score / 2);
  });

  it("never recommends an expired opportunity", () => {
    const now = new Date("2026-06-01");
    const expired = { id: "o", type: "SCHOLARSHIP" as const, title: "S", minEducation: null, deadline: new Date("2026-05-01"), isRolling: false, country: "UK" };
    expect(scoreOpportunity(base, expired, "STUDY_ABROAD", now)).toBeNull();
  });

  it("matches opportunity type and geography to the goal category", () => {
    const now = new Date("2026-06-01");
    const scholarship = { id: "s", type: "SCHOLARSHIP" as const, title: "S", minEducation: null, deadline: null, isRolling: true, country: "United Kingdom" };
    const abroad = scoreOpportunity(base, scholarship, "STUDY_ABROAD", now);
    const career = scoreOpportunity(base, scholarship, "CAREER", now);
    expect(abroad!.score).toBeGreaterThan(career!.score);
  });

  it("flags opportunities the user is not eligible for", () => {
    const o = { id: "m", type: "SCHOLARSHIP" as const, title: "M", minEducation: "BACHELORS" as const, deadline: null, isRolling: true, country: "Rwanda" };
    expect(scoreOpportunity(base, o, "EDUCATION")!.eligibleNow).toBe(false);
  });
});

describe("roadmap planner", () => {
  const fit = scoreOccupation(base, dev);
  const plan = planRoadmap({
    profile: base,
    target: { id: dev.id, title: dev.title, minEducation: dev.minEducation },
    fit,
    programs: [{ fit: { programId: "p1", score: 80, closesGaps: ["Python"], eligible: true, reasons: [] }, name: "BSc IT", institution: "University of Rwanda" }],
    opportunities: [{ fit: { opportunityId: "o1", score: 70, eligibleNow: true, reasons: ["Deadline soon."] }, title: "Internship", provider: "Acme", type: "INTERNSHIP" }],
    horizonMonths: 12,
  });

  it("produces ordered, unique steps within the horizon", () => {
    expect(plan.steps.map((s) => s.order)).toEqual(plan.steps.map((_, i) => i + 1));
    expect(Math.max(...plan.steps.map((s) => s.monthOffset))).toBeLessThanOrEqual(12);
  });

  it("starts with the education gap and links the programme", () => {
    expect(plan.steps[0]).toMatchObject({ kind: "EDUCATION", ref: { type: "PROGRAM", id: "p1" } });
  });

  it("creates skill steps for the largest gaps and ends with a review milestone", () => {
    expect(plan.steps.filter((s) => s.kind === "SKILL").length).toBeGreaterThan(0);
    expect(plan.steps.at(-1)?.kind).toBe("MILESTONE");
    expect(plan.summary).toContain("Software Developer");
  });

  it("computes progress ignoring skipped steps", () => {
    expect(progressOf(["DONE", "TODO", "SKIPPED", "DONE"])).toBe(67);
    expect(progressOf([])).toBe(0);
  });
});
