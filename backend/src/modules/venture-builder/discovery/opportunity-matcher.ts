// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// "Discover an opportunity" without a starting idea: ranks sectors from the founder's own profile and the
// national sector reference data. Deterministic, explainable, and a lead to investigate, not a prediction.
export interface SectorCandidate {
  id: string;
  code: string;
  name: string;
  nst2Priority: boolean;
  /** Skill names required by occupations in the sector, with how many occupations need each. */
  skillDemand: Map<string, number>;
  highDemandOccupations: number;
}

export interface FounderCapability {
  skills: { name: string; level: number }[];
  interestSectorIds: string[];
}

export interface SectorLead {
  sectorId: string;
  code: string;
  name: string;
  score: number;
  reasons: string[];
}

export const rankSectors = (candidates: SectorCandidate[], founder: FounderCapability, limit = 5): SectorLead[] => {
  const skillLevel = new Map(founder.skills.map((s) => [s.name, s.level]));
  const leads = candidates.map((c) => {
    const reasons: string[] = [];
    let score = 0;
    if (founder.interestSectorIds.includes(c.id)) {
      score += 40;
      reasons.push("You listed this sector as an interest");
    }
    const overlap = [...c.skillDemand.keys()].filter((skill) => (skillLevel.get(skill) ?? 0) >= 2);
    if (overlap.length > 0) {
      score += Math.min(35, overlap.length * 7);
      reasons.push(`Your skills match this sector's needs: ${overlap.slice(0, 4).join(", ")}`);
    }
    if (c.nst2Priority) {
      score += 15;
      reasons.push("National priority sector (NST2)");
    }
    if (c.highDemandOccupations > 0) {
      score += Math.min(10, c.highDemandOccupations * 2);
      reasons.push("Occupations in this sector are rated in demand in HDOS reference data (editorial rating)");
    }
    return { sectorId: c.id, code: c.code, name: c.name, score: Math.min(100, score), reasons };
  });
  return leads.filter((l) => l.score > 0).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, limit);
};
