// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Rwandan higher-learning and TVET institutions. Each record names its DataSource:
//   hec-hli-register-2025            institution appears in HEC's 2025 list of operating HLIs (verified)
//   rp-programmes-catalogue          Rwanda Polytechnic colleges (verified on rp.ac.rw)
//   institution-official-sites-2026  verified on the institution's own site (Kepler College, Rwanda Coding Academy)
//   rtb-official                     linked from the RTB website
//   hdos-editorial-education         exists publicly, NOT confirmed on an official register by HDOS (illustrative)
// `district` is null whenever the district is uncertain or the institution is multi-campus. District names must
// match geography.ts exactly.
import type { InstitutionSeed } from "./types";

const HEC = "hec-hli-register-2025";
const RP = "rp-programmes-catalogue";
const OFFICIAL = "institution-official-sites-2026";
const EDITORIAL = "hdos-editorial-education";

export const INSTITUTIONS: InstitutionSeed[] = [
  // ── Public ──
  { name: "University of Rwanda", type: "UNIVERSITY", district: null, website: "https://www.ur.ac.rw", source: HEC },
  { name: "Institute of Legal Practice and Development (ILPD)", type: "OTHER", district: "Nyanza", website: "https://www.ilpd.ac.rw", source: HEC },

  // ── Rwanda Polytechnic colleges (names kept as "IPRC ..." for catalogue continuity) ──
  { name: "IPRC Kigali (Rwanda Polytechnic)", type: "POLYTECHNIC", district: "Kicukiro", website: "https://www.rp.ac.rw", source: RP },
  { name: "IPRC Musanze (Rwanda Polytechnic)", type: "POLYTECHNIC", district: "Musanze", website: "https://www.rp.ac.rw", source: RP },
  { name: "IPRC Huye (Rwanda Polytechnic)", type: "POLYTECHNIC", district: "Huye", website: "https://www.rp.ac.rw", source: RP },
  { name: "IPRC Karongi (Rwanda Polytechnic)", type: "POLYTECHNIC", district: "Karongi", website: "https://www.rp.ac.rw", source: RP },
  { name: "IPRC Ngoma (Rwanda Polytechnic)", type: "POLYTECHNIC", district: "Ngoma", website: "https://www.rp.ac.rw", source: RP },
  { name: "IPRC Tumba (Rwanda Polytechnic)", type: "POLYTECHNIC", district: "Rulindo", website: "https://www.rp.ac.rw", source: RP },
  { name: "IPRC Gishari (Rwanda Polytechnic)", type: "POLYTECHNIC", district: "Rwamagana", website: "https://www.rp.ac.rw", source: RP },
  { name: "IPRC Kitabi (Rwanda Polytechnic)", type: "POLYTECHNIC", district: "Nyamagabe", website: "https://www.rp.ac.rw", source: RP },

  // ── TVET / academies ──
  { name: "Rwanda Coding Academy", type: "ACADEMY", district: "Nyabihu", website: "https://rca.ac.rw", source: OFFICIAL },
  { name: "Rwanda School of Creative Arts and Music (Nyundo)", type: "ACADEMY", district: "Rubavu", website: null, source: "rtb-official" },
  { name: "Saint Joseph Integrated Technical College (SJITC)", type: "TVET", district: "Nyarugenge", website: null, source: EDITORIAL },
  { name: "Muhabura Integrated Polytechnic College (MIPC)", type: "POLYTECHNIC", district: "Musanze", website: "https://mipc.ac.rw", source: EDITORIAL },
  { name: "Hanika Anglican Integrated Polytechnic (HAIP)", type: "POLYTECHNIC", district: "Nyanza", website: null, source: EDITORIAL },

  // ── Private universities and institutes listed by HEC ──
  { name: "Independent University of Kigali (ULK)", type: "UNIVERSITY", district: "Gasabo", website: "https://ulk.ac.rw", source: HEC },
  { name: "University of Lay Adventists of Kigali (UNILAK)", type: "UNIVERSITY", district: null, website: "https://unilak.ac.rw", source: HEC },
  { name: "Catholic University of Rwanda (CUR)", type: "UNIVERSITY", district: null, website: "https://cur.ac.rw", source: HEC },
  { name: "Adventist University of Central Africa (AUCA)", type: "UNIVERSITY", district: "Gasabo", website: "https://www.auca.ac.rw", source: HEC },
  { name: "Institut Catholique de Kabgayi (ICK)", type: "UNIVERSITY", district: "Muhanga", website: null, source: HEC },
  { name: "INES-Ruhengeri", type: "UNIVERSITY", district: "Musanze", website: "https://www.ines.ac.rw", source: HEC },
  { name: "Institut Polytechnique de Byumba (IPB)", type: "POLYTECHNIC", district: "Gicumbi", website: "https://utab.ac.rw", source: HEC },
  { name: "University of Tourism, Technology and Business Studies (UTB)", type: "UNIVERSITY", district: null, website: "https://utb.ac.rw", source: HEC },
  { name: "Institut Supérieur Pédagogique de Gitwe (ISPG)", type: "UNIVERSITY", district: "Ruhango", website: null, source: HEC },
  { name: "Protestant Institute of Arts and Social Sciences (PIASS)", type: "UNIVERSITY", district: "Huye", website: "https://piass.ac.rw", source: HEC },
  { name: "Mount Kigali University (MKU)", type: "UNIVERSITY", district: null, website: null, source: HEC },
  { name: "Kibogora Polytechnic", type: "POLYTECHNIC", district: "Nyamasheke", website: null, source: HEC },
  { name: "Carnegie Mellon University Africa", type: "UNIVERSITY", district: "Gasabo", website: "https://www.africa.cmu.edu", source: HEC },
  { name: "University of Kigali (UoK)", type: "UNIVERSITY", district: null, website: "https://uok.ac.rw", source: HEC },
  { name: "East African University Rwanda (EAUR)", type: "UNIVERSITY", district: null, website: "https://eaur.ac.rw", source: HEC },
  { name: "Ruli Higher Institute of Health (RHIH)", type: "UNIVERSITY", district: "Gakenke", website: null, source: HEC },
  { name: "University of Global Health Equity", type: "UNIVERSITY", district: "Burera", website: "https://ughe.org", source: HEC },
  { name: "African Institute for Mathematical Sciences (AIMS Rwanda)", type: "UNIVERSITY", district: "Gasabo", website: "https://aims.ac.rw", source: HEC },
  { name: "African Leadership University (ALU Rwanda)", type: "UNIVERSITY", district: null, website: "https://www.alueducation.com", source: HEC },
  { name: "Kepler College", type: "UNIVERSITY", district: "Gasabo", website: "https://keplercollege.ac.rw", source: OFFICIAL },

  // ── Seen only in a third-party register compiled from HEC data (not confirmed by HDOS) ──
  { name: "Rwanda Institute for Conservation Agriculture (RICA)", type: "UNIVERSITY", district: "Bugesera", website: "https://rica.rw", source: EDITORIAL },
  { name: "VATEL School Rwanda", type: "UNIVERSITY", district: null, website: "https://vatel.rw", source: EDITORIAL },
];
