// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Facade: the catalogue is split by entity under ./ so each file stays reviewable. Provenance (verified-official vs
// illustrative) is recorded per record via its `source` slug; see sources.ts and docs/DATA_SOURCES.md.
export type { Edu } from "./types";
export { SECTORS, SKILLS } from "./skills";
export { OCCUPATIONS } from "./occupations";
export { INSTITUTIONS } from "./institutions";
export { PROGRAMS, LEGACY_REMOVED_PROGRAMS } from "./programs";
export { OPPORTUNITIES } from "./opportunities";
