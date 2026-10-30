// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// REAL DATA — NISR Labour Force Survey 2024 and RPHC5 2022 indicators.
// Each figure below was read from the NISR pages cited in `sources.ts` (re-read 2026-10-30).

export interface IndicatorSeed {
  code: string;
  name: string;
  unit: string;
  period: string;
  value: number;
  source: "nisr-lfs-2024-annual" | "nisr-lfs-2024-q4" | "nisr-rphc5-2022";
}

export const INDICATORS: IndicatorSeed[] = [
  // ── LFS 2024 (annual) ──
  { code: "LFS_WORKING_AGE_POP_2024", name: "Working-age population (16+)", unit: "persons (approx.)", period: "2024", value: 8_300_000, source: "nisr-lfs-2024-annual" },
  { code: "LFS_EMPLOYED_2024", name: "Employed population", unit: "persons (approx.)", period: "2024", value: 4_400_000, source: "nisr-lfs-2024-annual" },
  { code: "LFS_UNEMPLOYED_2024", name: "Unemployed population", unit: "persons (approx.)", period: "2024", value: 780_000, source: "nisr-lfs-2024-annual" },
  { code: "LFS_OUTSIDE_LABOUR_FORCE_2024", name: "Population outside the labour force", unit: "persons (approx.)", period: "2024", value: 3_100_000, source: "nisr-lfs-2024-annual" },
  { code: "LFS_LABOUR_FORCE_2024", name: "Labour force (employed + unemployed)", unit: "persons (approx.)", period: "2024", value: 5_200_000, source: "nisr-lfs-2024-annual" },
  { code: "LFS_LFPR_2024", name: "Labour force participation rate", unit: "%", period: "2024", value: 62.9, source: "nisr-lfs-2024-annual" },
  { code: "LFS_OUTSIDE_LF_RATE_2024", name: "Share of working-age population outside the labour force", unit: "%", period: "2024", value: 37.1, source: "nisr-lfs-2024-annual" },
  { code: "LFS_EPR_Q1_2024", name: "Employment-to-population ratio (February 2024)", unit: "%", period: "2024-Q1", value: 53.1, source: "nisr-lfs-2024-annual" },
  { code: "LFS_EPR_Q1_2023", name: "Employment-to-population ratio (February 2023)", unit: "%", period: "2023-Q1", value: 47.7, source: "nisr-lfs-2024-annual" },
  { code: "LFS_UNEMPLOYED_Q2_2024", name: "Unemployed population (May 2024)", unit: "persons (approx.)", period: "2024-Q2", value: 869_000, source: "nisr-lfs-2024-annual" },
  { code: "LFS_UNEMPLOYED_Q3_2024", name: "Unemployed population (August 2024)", unit: "persons (approx.)", period: "2024-Q3", value: 815_000, source: "nisr-lfs-2024-annual" },

  // ── LFS Q4 2024 (November 2024) ──
  { code: "LFS_WORKING_AGE_POP_Q4_2024", name: "Working-age population (16+)", unit: "persons (approx.)", period: "2024-Q4", value: 8_400_000, source: "nisr-lfs-2024-q4" },
  { code: "LFS_EMPLOYED_Q4_2024", name: "Employed population", unit: "persons (approx.)", period: "2024-Q4", value: 4_600_000, source: "nisr-lfs-2024-q4" },
  { code: "LFS_UNEMPLOYED_Q4_2024", name: "Unemployed population", unit: "persons (approx.)", period: "2024-Q4", value: 789_000, source: "nisr-lfs-2024-q4" },
  { code: "LFS_LABOUR_FORCE_Q4_2024", name: "Labour force (employed + unemployed)", unit: "persons (approx.)", period: "2024-Q4", value: 5_400_000, source: "nisr-lfs-2024-q4" },
  { code: "LFS_LFPR_Q4_2024", name: "Labour force participation rate", unit: "%", period: "2024-Q4", value: 64.0, source: "nisr-lfs-2024-q4" },
  { code: "LFS_EPR_Q4_2024", name: "Employment-to-population ratio", unit: "%", period: "2024-Q4", value: 54.6, source: "nisr-lfs-2024-q4" },
  { code: "LFS_EPR_Q4_2023", name: "Employment-to-population ratio", unit: "%", period: "2023-Q4", value: 49.9, source: "nisr-lfs-2024-q4" },
  { code: "LFS_UNEMPLOYMENT_RATE_Q4_2024", name: "Unemployment rate", unit: "%", period: "2024-Q4", value: 14.7, source: "nisr-lfs-2024-q4" },
  { code: "LFS_UNEMPLOYMENT_RATE_Q4_2019", name: "Unemployment rate (pre-COVID reference)", unit: "%", period: "2019-Q4", value: 15.4, source: "nisr-lfs-2024-q4" },
  { code: "LFS_UNEMPLOYMENT_RATE_MALE_Q4_2024", name: "Unemployment rate: male", unit: "%", period: "2024-Q4", value: 12.2, source: "nisr-lfs-2024-q4" },
  { code: "LFS_UNEMPLOYMENT_RATE_FEMALE_Q4_2024", name: "Unemployment rate: female", unit: "%", period: "2024-Q4", value: 17.5, source: "nisr-lfs-2024-q4" },
  { code: "LFS_UNEMPLOYMENT_RATE_YOUTH_Q4_2024", name: "Unemployment rate: youth (16-30)", unit: "%", period: "2024-Q4", value: 18.0, source: "nisr-lfs-2024-q4" },
  { code: "LFS_UNEMPLOYMENT_RATE_ADULT_Q4_2024", name: "Unemployment rate: adults (31+)", unit: "%", period: "2024-Q4", value: 12.3, source: "nisr-lfs-2024-q4" },
  { code: "LFS_UNEMPLOYMENT_RATE_RURAL_Q4_2024", name: "Unemployment rate: rural areas", unit: "%", period: "2024-Q4", value: 15.2, source: "nisr-lfs-2024-q4" },
  { code: "LFS_UNEMPLOYMENT_RATE_URBAN_Q4_2024", name: "Unemployment rate: urban areas", unit: "%", period: "2024-Q4", value: 13.6, source: "nisr-lfs-2024-q4" },
  { code: "LFS_UNDERUTILIZATION_Q4_2024", name: "Labour underutilisation rate", unit: "%", period: "2024-Q4", value: 55.0, source: "nisr-lfs-2024-q4" },
  { code: "LFS_UNDERUTILIZATION_FEMALE_Q4_2024", name: "Labour underutilisation rate: female", unit: "%", period: "2024-Q4", value: 62.0, source: "nisr-lfs-2024-q4" },
  { code: "LFS_UNDERUTILIZATION_MALE_Q4_2024", name: "Labour underutilisation rate: male", unit: "%", period: "2024-Q4", value: 47.8, source: "nisr-lfs-2024-q4" },
  { code: "LFS_UNDERUTILIZATION_YOUTH_Q4_2024", name: "Labour underutilisation rate: youth (16-30)", unit: "%", period: "2024-Q4", value: 56.6, source: "nisr-lfs-2024-q4" },
  { code: "LFS_UNDERUTILIZATION_ADULT_Q4_2024", name: "Labour underutilisation rate: adults (31+)", unit: "%", period: "2024-Q4", value: 53.8, source: "nisr-lfs-2024-q4" },
  { code: "LFS_SHARE_AGRICULTURE_Q4_2024", name: "Employment share: agriculture", unit: "%", period: "2024-Q4", value: 41.1, source: "nisr-lfs-2024-q4" },
  { code: "LFS_SHARE_INDUSTRY_Q4_2024", name: "Employment share: industry", unit: "%", period: "2024-Q4", value: 16.3, source: "nisr-lfs-2024-q4" },
  { code: "LFS_SHARE_SERVICES_Q4_2024", name: "Employment share: services", unit: "%", period: "2024-Q4", value: 42.6, source: "nisr-lfs-2024-q4" },
  { code: "LFS_SHARE_AGRICULTURE_Q4_2023", name: "Employment share: agriculture", unit: "%", period: "2023-Q4", value: 46.2, source: "nisr-lfs-2024-q4" },
  { code: "LFS_SHARE_INDUSTRY_Q4_2023", name: "Employment share: industry", unit: "%", period: "2023-Q4", value: 14.3, source: "nisr-lfs-2024-q4" },
  { code: "LFS_SHARE_SERVICES_Q4_2023", name: "Employment share: services", unit: "%", period: "2023-Q4", value: 39.4, source: "nisr-lfs-2024-q4" },
  { code: "LFS_EPR_YOUTH_Q4_2024", name: "Employment-to-population ratio: youth (16-30)", unit: "%", period: "2024-Q4", value: 49.9, source: "nisr-lfs-2024-q4" },
  { code: "LFS_EPR_ADULT_Q4_2024", name: "Employment-to-population ratio: adults (31+)", unit: "%", period: "2024-Q4", value: 58.4, source: "nisr-lfs-2024-q4" },
  { code: "LFS_EPR_MALE_Q4_2024", name: "Employment-to-population ratio: male", unit: "%", period: "2024-Q4", value: 63.1, source: "nisr-lfs-2024-q4" },
  { code: "LFS_EPR_FEMALE_Q4_2024", name: "Employment-to-population ratio: female", unit: "%", period: "2024-Q4", value: 47.1, source: "nisr-lfs-2024-q4" },

  // ── Census 2022 (RPHC5) ──
  { code: "CENSUS_POPULATION_2022", name: "Resident population", unit: "persons", period: "2022", value: 13_246_394, source: "nisr-rphc5-2022" },
  { code: "CENSUS_POPULATION_MALE_2022", name: "Resident population: male", unit: "persons", period: "2022", value: 6_429_326, source: "nisr-rphc5-2022" },
  { code: "CENSUS_POPULATION_FEMALE_2022", name: "Resident population: female", unit: "persons", period: "2022", value: 6_817_068, source: "nisr-rphc5-2022" },
  { code: "CENSUS_FEMALE_SHARE_2022", name: "Female share of population", unit: "%", period: "2022", value: 51.5, source: "nisr-rphc5-2022" },
  { code: "CENSUS_MEDIAN_AGE_2022", name: "Median age", unit: "years", period: "2022", value: 20, source: "nisr-rphc5-2022" },
  { code: "CENSUS_MEAN_AGE_2022", name: "Mean age", unit: "years", period: "2022", value: 24.6, source: "nisr-rphc5-2022" },
  { code: "CENSUS_SHARE_65PLUS_2022", name: "Share of population aged 65+", unit: "%", period: "2022", value: 4.2, source: "nisr-rphc5-2022" },
  { code: "CENSUS_URBAN_SHARE_2022", name: "Urban share of population", unit: "%", period: "2022", value: 27.9, source: "nisr-rphc5-2022" },
  { code: "CENSUS_URBAN_SHARE_2012", name: "Urban share of population", unit: "%", period: "2012", value: 16.5, source: "nisr-rphc5-2022" },
  { code: "CENSUS_POP_DENSITY_2022", name: "Population density", unit: "persons per km2", period: "2022", value: 503, source: "nisr-rphc5-2022" },
  { code: "CENSUS_GROWTH_RATE_2012_2022", name: "Average annual population growth rate (2012-2022)", unit: "%", period: "2012-2022", value: 2.3, source: "nisr-rphc5-2022" },
  { code: "CENSUS_POPULATION_2012", name: "Resident population", unit: "persons", period: "2012", value: 10_515_973, source: "nisr-rphc5-2022" },
];
