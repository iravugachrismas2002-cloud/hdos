// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// REAL DATA. Source: NISR, Fifth Population and Housing Census (RPHC5, 2022),
// "TABLE: Resident population by residence, Province, and District (2022)".
// https://statistics.gov.rw/statistical-publications/population-size-and-population-characteristics
// Figures transcribed from the published table: [district, province, total, urban].

export const PROVINCES = [
  "City of Kigali",
  "Southern Province",
  "Western Province",
  "Northern Province",
  "Eastern Province",
] as const;

export const DISTRICT_ROWS: [name: string, province: (typeof PROVINCES)[number], total: number, urban: number][] = [
  // City of Kigali
  ["Nyarugenge", "City of Kigali", 374_319, 315_899],
  ["Gasabo", "City of Kigali", 879_505, 714_069],
  ["Kicukiro", "City of Kigali", 491_731, 487_200],
  // Southern Province
  ["Nyanza", "Southern Province", 365_718, 33_765],
  ["Gisagara", "Southern Province", 397_051, 13_513],
  ["Nyaruguru", "Southern Province", 318_126, 7_641],
  ["Huye", "Southern Province", 381_900, 79_744],
  ["Nyamagabe", "Southern Province", 371_501, 40_592],
  ["Ruhango", "Southern Province", 359_121, 39_079],
  ["Muhanga", "Southern Province", 358_433, 87_252],
  ["Kamonyi", "Southern Province", 450_849, 142_520],
  // Western Province
  ["Karongi", "Western Province", 373_869, 33_542],
  ["Rutsiro", "Western Province", 369_180, 20_606],
  ["Rubavu", "Western Province", 546_683, 294_448],
  ["Nyabihu", "Western Province", 319_047, 78_027],
  ["Ngororero", "Western Province", 367_955, 18_142],
  ["Rusizi", "Western Province", 485_529, 162_165],
  ["Nyamasheke", "Western Province", 434_221, 33_377],
  // Northern Province
  ["Rulindo", "Northern Province", 360_144, 38_110],
  ["Gakenke", "Northern Province", 365_292, 14_788],
  ["Musanze", "Northern Province", 476_522, 234_258],
  ["Burera", "Northern Province", 387_729, 38_442],
  ["Gicumbi", "Northern Province", 448_824, 28_131],
  // Eastern Province
  ["Rwamagana", "Eastern Province", 484_953, 180_056],
  ["Nyagatare", "Eastern Province", 653_861, 157_894],
  ["Gatsibo", "Eastern Province", 551_164, 55_351],
  ["Kayonza", "Eastern Province", 457_156, 65_071],
  ["Kirehe", "Eastern Province", 460_860, 29_039],
  ["Ngoma", "Eastern Province", 404_048, 37_297],
  ["Bugesera", "Eastern Province", 551_103, 221_227],
];

export const CENSUS_YEAR = 2022;
export const CENSUS_NATIONAL_TOTAL = 13_246_394;
