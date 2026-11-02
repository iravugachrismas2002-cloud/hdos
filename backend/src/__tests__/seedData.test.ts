// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Pure data-integrity tests for the seed files: no database, no network.
import { describe, expect, it } from "vitest";
import { CENSUS_NATIONAL_TOTAL, DISTRICT_ROWS, PROVINCES } from "../seed/data/geography";
import { INDICATORS } from "../seed/data/indicators";
import { INSTITUTIONS, OCCUPATIONS, OPPORTUNITIES, PROGRAMS, SECTORS, SKILLS } from "../seed/data/catalog";
import { CAREER_ROADMAPS, LEARNING_PATHS, PATHS, stepRows } from "../seed/data/paths";
import { SOURCES } from "../seed/data/sources";
import { OFFICIAL_DOCUMENT_REQUIREMENTS } from "../seed/data/documentRequirements";

const dupes = (values: string[]) => values.filter((v, i) => values.indexOf(v) !== i);
const sourceBySlug = new Map(SOURCES.map((s) => [s.slug, s]));
const skillNames = new Set(SKILLS.map((s) => s.name));
const sectorCodes = new Set(SECTORS.map((s) => s.code));
const occupationTitles = new Set(OCCUPATIONS.map((o) => o.title));
const institutionNames = new Set(INSTITUTIONS.map((i) => i.name));
const districtNames = new Set(DISTRICT_ROWS.map((d) => d[0]));

const isHttps = (u: string | null | undefined) => typeof u === "string" && /^https:\/\/[^\s]+$/.test(u);

function collectKeys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => collectKeys(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      collectKeys(v, out);
    }
  }
  return out;
}

describe("seed: geography (existing checks)", () => {
  it("district populations sum to the published national total", () => {
    expect(DISTRICT_ROWS.reduce((a, r) => a + r[2], 0)).toBe(CENSUS_NATIONAL_TOTAL);
  });
  it("has 30 unique districts, all in a known province, with urban <= total", () => {
    expect(DISTRICT_ROWS).toHaveLength(30);
    expect(dupes(DISTRICT_ROWS.map((d) => d[0]))).toEqual([]);
    for (const [name, province, total, urban] of DISTRICT_ROWS) {
      expect(PROVINCES, name).toContain(province);
      expect(urban, name).toBeLessThanOrEqual(total);
    }
  });
});

describe("seed: sources", () => {
  it("has unique slugs and honest notes", () => {
    expect(dupes(SOURCES.map((s) => s.slug))).toEqual([]);
    for (const s of SOURCES) {
      expect(s.notes, s.slug).toBeTruthy();
      if (s.url) expect(isHttps(s.url), `${s.slug} url`).toBe(true);
    }
  });
  it("includes every body named by the product owner", () => {
    const text = SOURCES.map((s) => `${s.publisher} ${s.url ?? ""}`).join(" ").toLowerCase();
    for (const needle of ["hec.gov.rw", "mineduc.gov.rw", "rtb.gov.rw", "rp.ac.rw", "mifotra.gov.rw", "statistics.gov.rw", "rdb.rw", "bdf.rw"]) {
      expect(text, needle).toContain(needle);
    }
  });
  it("illustrative editorial sources are flagged isDemo and verified ones are not", () => {
    for (const slug of ["hdos-editorial-education", "hdos-editorial-occupations", "hdos-editorial-opportunities", "hdos-editorial-paths"]) {
      expect(sourceBySlug.get(slug)?.isDemo, slug).toBe(true);
    }
    for (const slug of ["nisr-rphc5-2022", "nisr-lfs-2024-annual", "nisr-lfs-2024-q4", "hec-hli-register-2025", "rp-programmes-catalogue"]) {
      expect(sourceBySlug.get(slug)?.isDemo, slug).toBe(false);
    }
  });
});

describe("seed: official opportunity document checklists", () => {
  it("uses unique, source-backed requirement rows with valid minimum counts", () => {
    expect(OFFICIAL_DOCUMENT_REQUIREMENTS.length).toBeGreaterThan(0);
    for (const opportunity of OFFICIAL_DOCUMENT_REQUIREMENTS) {
      expect(isHttps(opportunity.sourceUrl), opportunity.title).toBe(true);
      expect(OPPORTUNITIES.some((row) => row.provider === opportunity.provider && row.title === opportunity.title), opportunity.title).toBe(true);
      expect(dupes(opportunity.requirements.map((row) => row.key)), opportunity.title).toEqual([]);
      for (const requirement of opportunity.requirements) {
        expect(requirement.description.length, `${opportunity.title}: ${requirement.key}`).toBeGreaterThan(0);
        expect(requirement.acceptedEvidence.length, `${opportunity.title}: ${requirement.key}`).toBeGreaterThan(0);
        expect(requirement.minimumCount ?? 1, `${opportunity.title}: ${requirement.key}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("requires two distinct recommendation letters for Commonwealth applications", () => {
    const commonwealth = OFFICIAL_DOCUMENT_REQUIREMENTS.find((row) => row.title === "Commonwealth Scholarships");
    expect(commonwealth?.requirements.find((row) => row.key === "RECOMMENDATION_LETTER")?.minimumCount).toBe(2);
  });
});

describe("seed: indicators", () => {
  it("has unique codes, finite values and a known source", () => {
    expect(dupes(INDICATORS.map((i) => i.code))).toEqual([]);
    expect(INDICATORS.length).toBeGreaterThanOrEqual(40);
    for (const i of INDICATORS) {
      expect(Number.isFinite(i.value), i.code).toBe(true);
      expect(sourceBySlug.get(i.source)?.isDemo, i.code).toBe(false);
    }
  });
  it("rates are percentages", () => {
    for (const i of INDICATORS.filter((x) => x.unit === "%")) {
      expect(i.value, i.code).toBeGreaterThanOrEqual(0);
      expect(i.value, i.code).toBeLessThanOrEqual(100);
    }
  });
});

describe("seed: catalogue minimum sizes", () => {
  it("meets the agreed minimums", () => {
    expect(INSTITUTIONS.length).toBeGreaterThanOrEqual(30);
    expect(PROGRAMS.length).toBeGreaterThanOrEqual(70);
    expect(OCCUPATIONS.length).toBeGreaterThanOrEqual(40);
    expect(SKILLS.length).toBeGreaterThanOrEqual(100);
    expect(OPPORTUNITIES.length).toBeGreaterThanOrEqual(30);
    expect(LEARNING_PATHS.length).toBeGreaterThanOrEqual(12);
  });
});

describe("seed: uniqueness", () => {
  it("has unique natural keys", () => {
    expect(dupes(SECTORS.map((s) => s.code))).toEqual([]);
    expect(dupes(SKILLS.map((s) => s.name))).toEqual([]);
    expect(dupes(OCCUPATIONS.map((o) => o.title))).toEqual([]);
    expect(dupes(INSTITUTIONS.map((i) => i.name))).toEqual([]);
    expect(dupes(PROGRAMS.map((p) => `${p.institution}::${p.name}`))).toEqual([]);
    expect(dupes(OPPORTUNITIES.map((o) => `${o.provider}::${o.title}`))).toEqual([]);
    expect(dupes(PATHS.map((p) => p.slug))).toEqual([]);
  });
});

describe("seed: references", () => {
  it("occupations reference known sectors and skills with 1-5 ratings", () => {
    for (const o of OCCUPATIONS) {
      expect(sectorCodes.has(o.sector), `${o.title} sector`).toBe(true);
      expect(o.skills.length, o.title).toBeGreaterThanOrEqual(3);
      expect(dupes(o.skills.map((s) => s[0])), `${o.title} duplicate skills`).toEqual([]);
      for (const [skill, importance, level] of o.skills) {
        expect(skillNames.has(skill), `${o.title} -> ${skill}`).toBe(true);
        expect(importance).toBeGreaterThanOrEqual(1);
        expect(importance).toBeLessThanOrEqual(5);
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(5);
      }
    }
  });
  it("institutions reference known districts and sources", () => {
    for (const i of INSTITUTIONS) {
      if (i.district) expect(districtNames.has(i.district), `${i.name} district "${i.district}"`).toBe(true);
      expect(sourceBySlug.has(i.source), `${i.name} source`).toBe(true);
    }
  });
  it("programmes reference known institutions, sectors, skills, occupations and sources", () => {
    for (const p of PROGRAMS) {
      const id = `${p.institution} / ${p.name}`;
      expect(institutionNames.has(p.institution), `${id} institution`).toBe(true);
      if (p.sector) expect(sectorCodes.has(p.sector), `${id} sector`).toBe(true);
      expect(sourceBySlug.has(p.source), `${id} source`).toBe(true);
      expect(p.skills.length, id).toBeGreaterThan(0);
      for (const s of p.skills) expect(skillNames.has(s), `${id} -> skill ${s}`).toBe(true);
      for (const o of p.occupations) expect(occupationTitles.has(o), `${id} -> occupation ${o}`).toBe(true);
    }
  });
  it("opportunities reference known sources", () => {
    for (const o of OPPORTUNITIES) expect(sourceBySlug.has(o.source), `${o.title} source`).toBe(true);
  });
  it("every sector is used by at least one occupation and one programme", () => {
    const usedSectors = new Set<string>([...OCCUPATIONS.map((o) => o.sector), ...PROGRAMS.map((p) => p.sector ?? "")]);
    expect([...sectorCodes].filter((s) => !usedSectors.has(s))).toEqual([]);
  });
});

describe("seed: honesty rules", () => {
  it("has no salary fields anywhere and every occupation demand is UNKNOWN", () => {
    const keys = [...collectKeys([OCCUPATIONS, INSTITUTIONS, PROGRAMS, OPPORTUNITIES, PATHS])];
    expect(keys.filter((k) => /salary|wage|pay/i.test(k))).toEqual([]);
    for (const o of OCCUPATIONS) expect(o.demand, o.title).toBe("UNKNOWN");
  });
  it("opportunities never store deadlines", () => {
    for (const o of OPPORTUNITIES) expect(Object.keys(o), o.title).not.toContain("deadline");
  });
  it("opportunities marked verified use a verified (non-demo) source; others use the illustrative one", () => {
    for (const o of OPPORTUNITIES) {
      const demo = sourceBySlug.get(o.source)?.isDemo;
      expect(demo, `${o.title} (verified=${o.verified})`).toBe(!o.verified);
    }
  });
  it("occupations, learning paths and roadmaps sit on illustrative sources", () => {
    for (const p of PATHS) expect(sourceBySlug.get(p.source)?.isDemo, p.slug).toBe(true);
  });
  it("Rwanda Polytechnic programmes cite the RP source and never invent a Bachelor of Technology duration", () => {
    const rp = PROGRAMS.filter((p) => p.source === "rp-programmes-catalogue");
    expect(rp.length).toBeGreaterThan(70);
    for (const p of rp) {
      expect(p.institution, p.name).toMatch(/Rwanda Polytechnic/);
      if (p.level === "BACHELORS") expect(p.durationMonths, p.name).toBeNull();
    }
  });
  it("URLs are https", () => {
    for (const i of INSTITUTIONS) if (i.website) expect(isHttps(i.website), `${i.name} website`).toBe(true);
    for (const p of PROGRAMS) if (p.url) expect(isHttps(p.url), `${p.name} url`).toBe(true);
    for (const o of OPPORTUNITIES) expect(isHttps(o.url), `${o.title} url`).toBe(true);
    for (const p of PATHS) for (const r of stepRows(p)) if (r.resourceUrl) expect(isHttps(r.resourceUrl), `${p.slug} step ${r.order}`).toBe(true);
  });
});

describe("seed: learning paths and career roadmaps", () => {
  it("every occupation has exactly one CAREER_ROADMAP", () => {
    const byOccupation = new Map<string, number>();
    for (const p of CAREER_ROADMAPS) byOccupation.set(p.occupation ?? "", (byOccupation.get(p.occupation ?? "") ?? 0) + 1);
    for (const o of OCCUPATIONS) expect(byOccupation.get(o.title), o.title).toBe(1);
    expect(CAREER_ROADMAPS).toHaveLength(OCCUPATIONS.length);
    for (const p of CAREER_ROADMAPS) expect(occupationTitles.has(p.occupation ?? ""), p.slug).toBe(true);
  });
  it("learning paths are not tied to an occupation", () => {
    for (const p of LEARNING_PATHS) {
      expect(p.type).toBe("LEARNING_PATH");
      expect(p.occupation).toBeNull();
    }
  });
  it("paths reference known sectors and sources", () => {
    for (const p of PATHS) {
      if (p.sector) expect(sectorCodes.has(p.sector), `${p.slug} sector`).toBe(true);
      expect(sourceBySlug.has(p.source), `${p.slug} source`).toBe(true);
      expect(p.summary.length, p.slug).toBeGreaterThan(20);
      expect(p.durationMonths, p.slug).toBeGreaterThan(0);
    }
  });
  it("each path has 5-8 steps with contiguous order starting at 1 and non-decreasing month offsets", () => {
    for (const p of PATHS) {
      const rows = stepRows(p);
      expect(rows.length, p.slug).toBeGreaterThanOrEqual(5);
      expect(rows.length, p.slug).toBeLessThanOrEqual(8);
      expect(rows.map((r) => r.order), p.slug).toEqual(rows.map((_, i) => i + 1));
      rows.reduce((prev, r) => {
        expect(r.monthOffset, `${p.slug} step ${r.order}`).toBeGreaterThanOrEqual(prev);
        return r.monthOffset;
      }, 0);
      for (const r of rows) {
        expect(["EDUCATION", "SKILL", "EXPERIENCE", "APPLY", "MILESTONE"]).toContain(r.kind);
        expect(r.title.length).toBeGreaterThan(3);
        expect(r.description.length).toBeGreaterThan(10);
        expect(Boolean(r.resourceLabel), `${p.slug} step ${r.order} label/url pairing`).toBe(Boolean(r.resourceUrl));
      }
    }
  });
  it("career roadmaps cover education, skills, experience, applying and a milestone", () => {
    for (const p of CAREER_ROADMAPS) {
      const kinds = new Set(stepRows(p).map((r) => r.kind));
      for (const k of ["EDUCATION", "SKILL", "EXPERIENCE", "APPLY", "MILESTONE"]) expect(kinds.has(k as never), `${p.slug} ${k}`).toBe(true);
    }
  });
});
