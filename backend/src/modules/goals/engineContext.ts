// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Loads everything the Pathway Fit engine needs and converts Prisma rows into pure engine inputs.
import { prisma } from "../../lib/prisma";
import { occupationInclude, opportunityInclude, programInclude } from "../../lib/mappers";
import { profileCompleteness } from "../profile/completeness";
import type { OccupationInput, OpportunityInput, ProfileInput, ProgramInput } from "../../engine/types";

export const loadEngineContext = async (userId: string) => {
  const [profile, occupations, programs, opportunities] = await Promise.all([
    prisma.profile.findUnique({ where: { userId }, include: { skills: true, interests: true } }),
    prisma.occupation.findMany({
      include: { ...occupationInclude, skills: { include: { skill: true } } },
      orderBy: { title: "asc" },
    }),
    prisma.program.findMany({
      include: { ...programInclude, occupations: true },
      orderBy: { name: "asc" },
    }),
    prisma.opportunity.findMany({ include: opportunityInclude, orderBy: { title: "asc" } }),
  ]);

  const profileInput: ProfileInput = {
    educationLevel: profile?.educationLevel ?? "NONE",
    districtId: profile?.districtId ?? null,
    skills: profile?.skills.map((s) => ({ skillId: s.skillId, level: s.level })) ?? [],
    sectorIds: profile?.interests.map((i) => i.sectorId) ?? [],
    completeness: profile
      ? profileCompleteness({
          educationLevel: profile.educationLevel,
          districtId: profile.districtId,
          birthYear: profile.birthYear,
          bio: profile.bio,
          targetMonthlyIncomeRwf: profile.targetMonthlyIncomeRwf,
          skillCount: profile.skills.length,
          interestCount: profile.interests.length,
        })
      : 0,
  };

  const occupationInputs: OccupationInput[] = occupations.map((o) => ({
    id: o.id,
    title: o.title,
    sectorId: o.sectorId,
    nst2Priority: o.sector.nst2Priority,
    minEducation: o.minEducation,
    demand: o.demand,
    // Illustrative (isDemo) sources never count as evidence: they cap confidence below HIGH.
    hasDemandSource: o.source !== null && !o.source.isDemo,
    skills: o.skills.map((s) => ({
      skillId: s.skillId,
      name: s.skill.name,
      importance: s.importance,
      requiredLevel: s.requiredLevel,
    })),
  }));

  const programInputs: ProgramInput[] = programs.map((p) => ({
    id: p.id,
    name: p.name,
    level: p.level,
    districtId: p.institution.districtId,
    skillIds: p.skills.map((s) => s.skillId),
    occupationIds: p.occupations.map((o) => o.occupationId),
  }));

  const opportunityInputs: OpportunityInput[] = opportunities.map((o) => ({
    id: o.id,
    type: o.type,
    title: o.title,
    minEducation: o.minEducation,
    deadline: o.deadline,
    isRolling: o.isRolling,
    country: o.country,
  }));

  return {
    profile: profileInput,
    occupations,
    occupationInputs,
    programs,
    programInputs,
    opportunities,
    opportunityInputs,
  };
};

export type EngineContext = Awaited<ReturnType<typeof loadEngineContext>>;
