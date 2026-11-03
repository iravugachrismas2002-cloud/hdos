// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Idempotent seed: safe to run repeatedly (everything is upserted by a natural key).
//   Verified data:   districts + census 2022, LFS 2024 indicators (NISR); HEC-listed institutions, Rwanda Polytechnic
//                    programmes and opportunities checked against official pages -> DataSource.isDemo = false
//   Editorial data:  occupations, unverified programmes/opportunities, learning paths and roadmaps -> isDemo = true
// Every record carries its own `source` slug (see data/sources.ts and docs/DATA_SOURCES.md).
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { CENSUS_NATIONAL_TOTAL, CENSUS_YEAR, DISTRICT_ROWS, PROVINCES } from "./data/geography";
import { INDICATORS } from "./data/indicators";
import { INSTITUTIONS, LEGACY_REMOVED_PROGRAMS, OCCUPATIONS, OPPORTUNITIES, PROGRAMS, SECTORS, SKILLS } from "./data/catalog";
import { PATHS, stepRows } from "./data/paths";
import { SOURCES } from "./data/sources";
import { OFFICIAL_DOCUMENT_REQUIREMENTS } from "./data/documentRequirements";

const must = <T>(map: Map<string, T>, key: string, what: string): T => {
  const v = map.get(key);
  if (!v) throw new Error(`Seed reference error: unknown ${what} "${key}"`);
  return v;
};

async function seedSources() {
  const now = new Date();
  const ids = new Map<string, string>();
  for (const s of SOURCES) {
    const row = await prisma.dataSource.upsert({
      where: { slug: s.slug },
      create: { ...s, retrievedAt: now },
      update: { ...s, retrievedAt: now },
    });
    ids.set(s.slug, row.id);
  }
  return ids;
}

async function seedGeography(sourceIds: Map<string, string>) {
  // Integrity check against the published national total: catches transcription errors.
  const sum = DISTRICT_ROWS.reduce((a, r) => a + r[2], 0);
  if (sum !== CENSUS_NATIONAL_TOTAL) {
    throw new Error(`District populations sum to ${sum}, expected ${CENSUS_NATIONAL_TOTAL}`);
  }
  const provinceIds = new Map<string, string>();
  for (const name of PROVINCES) {
    provinceIds.set(name, (await prisma.province.upsert({ where: { name }, create: { name }, update: {} })).id);
  }
  const districtIds = new Map<string, string>();
  const sourceId = must(sourceIds, "nisr-rphc5-2022", "source");
  for (const [name, province, total, urban] of DISTRICT_ROWS) {
    const district = await prisma.district.upsert({
      where: { name },
      create: { name, provinceId: must(provinceIds, province, "province") },
      update: { provinceId: must(provinceIds, province, "province") },
    });
    districtIds.set(name, district.id);
    await prisma.districtStat.upsert({
      where: { districtId_year_sourceId: { districtId: district.id, year: CENSUS_YEAR, sourceId } },
      create: { districtId: district.id, year: CENSUS_YEAR, population: total, urbanPopulation: urban, sourceId },
      update: { population: total, urbanPopulation: urban },
    });
  }
  return districtIds;
}

async function seedIndicators(sourceIds: Map<string, string>) {
  for (const i of INDICATORS) {
    const indicator = await prisma.indicator.upsert({
      where: { code: i.code },
      create: { code: i.code, name: i.name, unit: i.unit },
      update: { name: i.name, unit: i.unit },
    });
    const sourceId = must(sourceIds, i.source, "source");
    await prisma.indicatorValue.upsert({
      where: { indicatorId_period_geography: { indicatorId: indicator.id, period: i.period, geography: "Rwanda" } },
      create: { indicatorId: indicator.id, period: i.period, geography: "Rwanda", value: i.value, sourceId },
      update: { value: i.value, sourceId },
    });
  }
}

async function seedCatalog(sourceIds: Map<string, string>, districtIds: Map<string, string>) {
  const sectorIds = new Map<string, string>();
  for (const s of SECTORS) {
    sectorIds.set(s.code, (await prisma.sector.upsert({ where: { code: s.code }, create: s, update: s })).id);
  }

  const skillIds = new Map<string, string>();
  for (const s of SKILLS) {
    skillIds.set(s.name, (await prisma.skill.upsert({ where: { name: s.name }, create: s, update: { category: s.category } })).id);
  }

  const occSource = must(sourceIds, "hdos-editorial-occupations", "source");
  const occupationIds = new Map<string, string>();
  for (const o of OCCUPATIONS) {
    const data = {
      title: o.title,
      description: o.description,
      sectorId: must(sectorIds, o.sector, "sector"),
      minEducation: o.minEducation,
      demand: o.demand,
      salaryMinRwf: null, // salaries are never estimated by the platform
      salaryMaxRwf: null,
      sourceId: occSource,
    };
    const row = await prisma.occupation.upsert({ where: { title: o.title }, create: data, update: data });
    occupationIds.set(o.title, row.id);
    await prisma.occupationSkill.deleteMany({ where: { occupationId: row.id } });
    await prisma.occupationSkill.createMany({
      data: o.skills.map(([skill, importance, requiredLevel]) => ({
        occupationId: row.id,
        skillId: must(skillIds, skill, "skill"),
        importance,
        requiredLevel,
      })),
    });
  }

  const institutionIds = new Map<string, string>();
  for (const i of INSTITUTIONS) {
    const data = {
      name: i.name,
      type: i.type,
      website: i.website,
      districtId: i.district ? must(districtIds, i.district, "district") : null,
      sourceId: must(sourceIds, i.source, "source"),
    };
    institutionIds.set(i.name, (await prisma.institution.upsert({ where: { name: i.name }, create: data, update: data })).id);
  }

  // Drop illustrative programmes that were replaced by verified records (see LEGACY_REMOVED_PROGRAMS).
  for (const legacy of LEGACY_REMOVED_PROGRAMS) {
    const institutionId = institutionIds.get(legacy.institution);
    if (institutionId) await prisma.program.deleteMany({ where: { institutionId, name: legacy.name } });
  }

  for (const p of PROGRAMS) {
    const institutionId = must(institutionIds, p.institution, "institution");
    const data = {
      institutionId,
      name: p.name,
      level: p.level,
      durationMonths: p.durationMonths,
      url: p.url ?? null,
      sectorId: p.sector ? must(sectorIds, p.sector, "sector") : null,
      sourceId: must(sourceIds, p.source, "source"),
    };
    const row = await prisma.program.upsert({
      where: { institutionId_name: { institutionId, name: p.name } },
      create: data,
      update: data,
    });
    await prisma.programSkill.deleteMany({ where: { programId: row.id } });
    await prisma.programSkill.createMany({ data: p.skills.map((s) => ({ programId: row.id, skillId: must(skillIds, s, "skill") })) });
    await prisma.programOccupation.deleteMany({ where: { programId: row.id } });
    await prisma.programOccupation.createMany({
      data: p.occupations.map((o) => ({ programId: row.id, occupationId: must(occupationIds, o, "occupation") })),
    });
  }

  const verifiedAt = new Date(); // seed run date: only for records checked against the provider during authoring
  for (const o of OPPORTUNITIES) {
    const data = {
      type: o.type,
      title: o.title,
      provider: o.provider,
      description: o.description,
      eligibility: o.eligibility,
      minEducation: o.minEducation,
      country: o.country,
      url: o.url,
      isRolling: o.isRolling,
      deadline: null, // deadlines change every cycle and are never stored
      lastVerifiedAt: o.verified ? verifiedAt : null,
      sourceId: must(sourceIds, o.source, "source"),
    };
    await prisma.opportunity.upsert({ where: { provider_title: { provider: o.provider, title: o.title } }, create: data, update: data });
  }

  for (const set of OFFICIAL_DOCUMENT_REQUIREMENTS) {
    const opportunity = await prisma.opportunity.findUnique({ where: { provider_title: { provider: set.provider, title: set.title } } });
    if (!opportunity) throw new Error(`Document requirement seed references missing opportunity: ${set.title}`);
    for (const requirement of set.requirements) {
      const rule = { kind: "document", description: requirement.description, mandatory: requirement.mandatory, minimumCount: requirement.minimumCount ?? 1, acceptedEvidence: requirement.acceptedEvidence, sourceUrl: set.sourceUrl, country: "RW" };
      await prisma.opportunityRequirement.upsert({ where: { opportunityId_version_key: { opportunityId: opportunity.id, version: set.version, key: requirement.key } }, create: { opportunityId: opportunity.id, version: set.version, key: requirement.key, ...rule }, update: rule });
    }
  }

  return { sectorIds, occupationIds };
}

/** Learning paths + career roadmaps: upsert the path by slug, then replace its steps (idempotent). */
async function seedCareerPaths(sourceIds: Map<string, string>, sectorIds: Map<string, string>, occupationIds: Map<string, string>) {
  for (const p of PATHS) {
    const data = {
      type: p.type,
      title: p.title,
      summary: p.summary,
      occupationId: p.occupation ? must(occupationIds, p.occupation, "occupation") : null,
      sectorId: p.sector ? must(sectorIds, p.sector, "sector") : null,
      startLevel: p.startLevel,
      durationMonths: p.durationMonths,
      sourceId: must(sourceIds, p.source, "source"),
    };
    const row = await prisma.careerPath.upsert({ where: { slug: p.slug }, create: { slug: p.slug, ...data }, update: data });
    await prisma.careerPathStep.deleteMany({ where: { pathId: row.id } });
    await prisma.careerPathStep.createMany({ data: stepRows(p).map((r) => ({ pathId: row.id, ...r })) });
  }
}

async function seedAccounts(districtIds: Map<string, string>, skillIds: Map<string, string>) {
  const explicit = process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD;
  if (env.isProd && !explicit) {
    console.log("Production: skipping demo accounts (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create an admin).");
    return;
  }

  const upsertUser = async (email: string, password: string, role: "ADMINISTRATOR" | "GOVERNMENT_ANALYST" | "STUDENT", name: string) =>
    prisma.user.upsert({
      where: { email },
      create: { email, name, role, emailVerified: true, passwordHash: await bcrypt.hash(password, 12) },
      update: { role, emailVerified: true },
    });

  if (explicit) {
    await upsertUser(process.env.SEED_ADMIN_EMAIL as string, process.env.SEED_ADMIN_PASSWORD as string, "ADMINISTRATOR", "Administrator");
    console.log(`Admin account ensured: ${process.env.SEED_ADMIN_EMAIL}`);
    return;
  }

  // Development convenience accounts (never created in production).
  const pw = "DemoPass123";
  await upsertUser("admin@hdos.local", pw, "ADMINISTRATOR", "Demo Admin");
  await upsertUser("analyst@hdos.local", pw, "GOVERNMENT_ANALYST", "Demo Analyst");
  const student = await upsertUser("student@hdos.local", pw, "STUDENT", "Demo Student");

  const profile = await prisma.profile.upsert({
    where: { userId: student.id },
    create: { userId: student.id, educationLevel: "UPPER_SECONDARY", districtId: districtIds.get("Huye") ?? null, bio: "Final-year secondary graduate interested in technology." },
    update: {},
  });
  await prisma.profileSkill.deleteMany({ where: { profileId: profile.id } });
  await prisma.profileSkill.createMany({
    data: [["Programming", 2], ["Problem Solving", 3], ["Communication", 3]].map(([name, level]) => ({
      profileId: profile.id,
      skillId: must(skillIds, name as string, "skill"),
      level: level as number,
    })),
  });
  const ict = await prisma.sector.findUnique({ where: { code: "ICT" } });
  if (ict) {
    await prisma.profileSector.upsert({
      where: { profileId_sectorId: { profileId: profile.id, sectorId: ict.id } },
      create: { profileId: profile.id, sectorId: ict.id },
      update: {},
    });
  }
  console.log("Dev accounts ensured: admin@hdos.local, analyst@hdos.local, student@hdos.local (password: DemoPass123)");
}

async function main() {
  console.log("Seeding HDOS Rwanda reference data...");
  const sourceIds = await seedSources();
  const districtIds = await seedGeography(sourceIds);
  await seedIndicators(sourceIds);
  const { sectorIds, occupationIds } = await seedCatalog(sourceIds, districtIds);
  await seedCareerPaths(sourceIds, sectorIds, occupationIds);
  const skills = await prisma.skill.findMany();
  await seedAccounts(districtIds, new Map(skills.map((s) => [s.name, s.id])));

  const [d, i, sk, inst, o, p, op, lp, cr, st] = await Promise.all([
    prisma.district.count(), prisma.indicatorValue.count(), prisma.skill.count(), prisma.institution.count(),
    prisma.occupation.count(), prisma.program.count(), prisma.opportunity.count(),
    prisma.careerPath.count({ where: { type: "LEARNING_PATH" } }), prisma.careerPath.count({ where: { type: "CAREER_ROADMAP" } }),
    prisma.careerPathStep.count(),
  ]);
  console.log(
    `Done: ${d} districts, ${i} indicator values, ${sk} skills, ${inst} institutions, ${o} occupations, ${p} programmes, ` +
      `${op} opportunities, ${lp} learning paths, ${cr} career roadmaps, ${st} path steps.`,
  );
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
