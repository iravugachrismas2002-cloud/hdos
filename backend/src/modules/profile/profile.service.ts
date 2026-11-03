// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import { z } from "zod";
import type { EducationLevel } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { profileCompleteness } from "./completeness";

const EDUCATION_LEVELS = [
  "NONE",
  "PRIMARY",
  "LOWER_SECONDARY",
  "UPPER_SECONDARY",
  "TVET_CERTIFICATE",
  "DIPLOMA",
  "BACHELORS",
  "MASTERS",
  "DOCTORATE",
] as const;

export const profileSchema = z.object({
  educationLevel: z.enum(EDUCATION_LEVELS),
  districtId: z.string().min(1).nullish(),
  birthYear: z.number().int().min(1930).max(new Date().getFullYear() - 10).nullish(),
  bio: z.string().trim().max(500).nullish(),
  avatarData: z
    .string()
    .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, "Profile image must be a JPEG, PNG, or WebP")
    .max(400_000)
    .nullish(),
  targetMonthlyIncomeRwf: z.number().int().min(0).max(100_000_000).nullish(),
  skills: z
    .array(z.object({ skillId: z.string().min(1), level: z.number().int().min(1).max(5) }))
    .max(40)
    .default([]),
  sectorIds: z.array(z.string().min(1)).max(10).default([]),
});

export type ProfileInputDto = z.infer<typeof profileSchema>;

const profileInclude = {
  district: true,
  skills: { include: { skill: true }, orderBy: { skill: { name: "asc" as const } } },
  interests: { include: { sector: true } },
};

const toDto = (p: NonNullable<Awaited<ReturnType<typeof loadProfile>>>) => ({
  educationLevel: p.educationLevel,
  districtId: p.districtId,
  districtName: p.district?.name ?? null,
  birthYear: p.birthYear,
  bio: p.bio,
  avatarData: p.avatarData,
  targetMonthlyIncomeRwf: p.targetMonthlyIncomeRwf,
  skills: p.skills.map((s) => ({ skillId: s.skillId, name: s.skill.name, level: s.level })),
  sectorInterests: p.interests.map((i) => ({ sectorId: i.sectorId, name: i.sector.name })),
  completeness: profileCompleteness({
    educationLevel: p.educationLevel,
    districtId: p.districtId,
    birthYear: p.birthYear,
    bio: p.bio,
    targetMonthlyIncomeRwf: p.targetMonthlyIncomeRwf,
    skillCount: p.skills.length,
    interestCount: p.interests.length,
  }),
  updatedAt: p.updatedAt.toISOString(),
});

const loadProfile = (userId: string) => prisma.profile.findUnique({ where: { userId }, include: profileInclude });

export const getProfile = async (userId: string) => {
  const profile = await loadProfile(userId);
  return profile ? toDto(profile) : null;
};

/** Replaces skills and interests atomically so a half-saved profile can never be observed. */
export const saveProfile = async (userId: string, input: ProfileInputDto) => {
  const skillIds = [...new Set(input.skills.map((s) => s.skillId))];
  const sectorIds = [...new Set(input.sectorIds)];
  if (skillIds.length !== input.skills.length) throw AppError.badRequest("Duplicate skills", "VALIDATION_ERROR");
  if (sectorIds.length !== input.sectorIds.length) throw AppError.badRequest("Duplicate sectors", "VALIDATION_ERROR");

  const [skillCount, sectorCount, district] = await Promise.all([
    prisma.skill.count({ where: { id: { in: skillIds } } }),
    prisma.sector.count({ where: { id: { in: sectorIds } } }),
    input.districtId ? prisma.district.findUnique({ where: { id: input.districtId }, select: { id: true } }) : null,
  ]);
  if (skillCount !== skillIds.length) throw AppError.badRequest("Unknown skill id", "VALIDATION_ERROR");
  if (sectorCount !== sectorIds.length) throw AppError.badRequest("Unknown sector id", "VALIDATION_ERROR");
  if (input.districtId && !district) throw AppError.badRequest("Unknown district id", "VALIDATION_ERROR");

  const scalars = {
    educationLevel: input.educationLevel as EducationLevel,
    districtId: input.districtId ?? null,
    birthYear: input.birthYear ?? null,
    bio: input.bio?.trim() || null,
    avatarData: input.avatarData ?? null,
    targetMonthlyIncomeRwf: input.targetMonthlyIncomeRwf ?? null,
  };

  await prisma.$transaction(async (tx) => {
    const profile = await tx.profile.upsert({
      where: { userId },
      create: { userId, ...scalars },
      update: scalars,
    });
    await tx.profileSkill.deleteMany({ where: { profileId: profile.id } });
    await tx.profileSector.deleteMany({ where: { profileId: profile.id } });
    if (input.skills.length) {
      await tx.profileSkill.createMany({
        data: input.skills.map((s) => ({ profileId: profile.id, skillId: s.skillId, level: s.level })),
      });
    }
    if (sectorIds.length) {
      await tx.profileSector.createMany({
        data: sectorIds.map((sectorId) => ({ profileId: profile.id, sectorId })),
      });
    }
  }, { maxWait: 15_000, timeout: 30_000 });

  const saved = await loadProfile(userId);
  if (!saved) throw AppError.notFound("Profile not found");
  return toDto(saved);
};
