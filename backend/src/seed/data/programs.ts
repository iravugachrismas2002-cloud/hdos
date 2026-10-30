// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Programmes, grouped by how well they were verified:
//   rp-programmes-catalogue          Rwanda Polytechnic programmes: names, award levels and offering colleges were
//                                    transcribed from rp.ac.rw/programmes (verified). Skill/occupation links are
//                                    HDOS editorial mappings. Advanced Diploma = 36 months (RP's LMS lists Y1-Y3);
//                                    Bachelor of Technology duration is not stated by RP, so it is NULL.
//   institution-official-sites-2026  Kepler College, Rwanda Coding Academy, CMU-Africa (verified on provider pages)
//   hdos-editorial-education         plausible programmes at real institutions, NOT verified (illustrative)
import type { Edu, ProgramSeed } from "./types";

const RP_SOURCE = "rp-programmes-catalogue";
const RP_URL = "https://new.rp.ac.rw/programmes/";
const OFFICIAL = "institution-official-sites-2026";
const EDITORIAL = "hdos-editorial-education";

/** RP college code -> institution name in institutions.ts. */
const COLLEGE: Record<string, string> = {
  K: "IPRC Kigali (Rwanda Polytechnic)",
  H: "IPRC Huye (Rwanda Polytechnic)",
  Ka: "IPRC Karongi (Rwanda Polytechnic)",
  M: "IPRC Musanze (Rwanda Polytechnic)",
  N: "IPRC Ngoma (Rwanda Polytechnic)",
  T: "IPRC Tumba (Rwanda Polytechnic)",
  G: "IPRC Gishari (Rwanda Polytechnic)",
  Ki: "IPRC Kitabi (Rwanda Polytechnic)",
};

interface RpRow {
  /** Advanced Diploma programme name + offering colleges. */
  ad?: [name: string, colleges: string[]];
  /** Bachelor of Technology programme name + offering colleges. */
  bt?: [name: string, colleges: string[]];
  sector: string;
  skills: string[];
  occupations: string[];
}

const SIX = ["K", "H", "Ka", "M", "N", "T"];

// Transcribed from https://new.rp.ac.rw/programmes/ (college lists as published).
const RP_ROWS: RpRow[] = [
  { ad: ["Information Technology", SIX], bt: ["Information Technology", SIX], sector: "ICT",
    skills: ["Programming", "Networking", "SQL & Databases", "IT Troubleshooting", "Web Development"],
    occupations: ["IT Support Technician", "Software Developer", "Network Administrator"] },
  { ad: ["Construction Technology", ["K", "H", "G", "M", "N"]], bt: ["Construction Technology", ["K", "H", "G", "M", "N"]], sector: "CONSTR",
    skills: ["Construction Materials", "Technical Drawing", "CAD", "Safety Practices", "Structural Design"],
    occupations: ["Civil Engineer", "Road Construction Technician"] },
  { ad: ["Quantity Surveying", ["K", "H", "M"]], bt: ["Quantity Surveying", ["K", "H"]], sector: "CONSTR",
    skills: ["Quantity Surveying", "Construction Materials", "Spreadsheets", "Technical Drawing"], occupations: ["Quantity Surveyor"] },
  { ad: ["Water and Sanitation Technology", ["K", "M"]], bt: ["Water and Sanitation Technology", ["K", "M"]], sector: "CONSTR",
    skills: ["Water Supply & Sanitation", "Plumbing", "Technical Drawing", "Surveying"], occupations: ["Plumber"] },
  { ad: ["Geomatics", ["K", "H", "N"]], bt: ["Geomatics", ["K", "H", "N"]], sector: "CONSTR",
    skills: ["Surveying", "GIS & Mapping", "CAD", "Technical Drawing"], occupations: ["Land Surveyor"] },
  { ad: ["Highway Technology", ["K", "H", "M"]], bt: ["Highway Technology", ["K", "H", "M"]], sector: "CONSTR",
    skills: ["Road Construction", "Surveying", "Construction Materials", "Quality Control"], occupations: ["Road Construction Technician"] },
  { ad: ["Mining Technology", ["K"]], bt: ["Mining Technology", ["K"]], sector: "MINING",
    skills: ["Mining Operations", "Surveying", "Safety Practices", "GIS & Mapping"], occupations: ["Mining Technician"] },
  { ad: ["Crop Production", ["H", "M"]], bt: ["Crop Production", ["H", "M"]], sector: "AGRI",
    skills: ["Crop Production", "Soil & Water Management", "Farmer Training", "Agribusiness Management"],
    occupations: ["Agricultural Extension Officer", "Commercial Farmer"] },
  { ad: ["Animal Health", ["H"]], bt: ["Animal Health", ["H"]], sector: "AGRI",
    skills: ["Veterinary Care", "Animal Husbandry", "Record Keeping (Farm)", "Farmer Training"], occupations: ["Animal Health Technician"] },
  { ad: ["Irrigation and Drainage Technology", ["H", "M", "G"]], bt: ["Irrigation and Drainage Technology", ["H", "M", "G"]], sector: "AGRI",
    skills: ["Irrigation Systems", "Soil & Water Management", "Surveying", "Technical Drawing"], occupations: ["Irrigation Technician"] },
  { ad: ["Mechatronics Technology", ["T", "K"]], bt: ["Mechatronics Technology", ["T", "K"]], sector: "MANUF",
    skills: ["Industrial Automation", "Electronics", "Mechanical Maintenance", "Embedded Systems"], occupations: ["Mechatronics Technician"] },
  { ad: ["Agricultural Mechanization Technology", ["G"]], bt: ["Agricultural Mechanization Technology", ["G"]], sector: "AGRI",
    skills: ["Agricultural Mechanization", "Mechanical Maintenance", "Machine Operation", "Crop Production"], occupations: [] },
  { ad: ["Electronics and Telecommunication Technology", ["H", "K", "G", "T"]], bt: ["Electronics and Telecommunication Technology", ["H", "K", "G", "T"]], sector: "ICT",
    skills: ["Electronics", "Networking", "Embedded Systems", "IT Troubleshooting"], occupations: ["IT Support Technician", "Network Administrator"] },
  { ad: ["Automobile Technology", ["K", "N", "G", "Ka"]], bt: ["Automobile Technology", ["K"]], sector: "MANUF",
    skills: ["Automotive Repair", "Mechanical Maintenance", "Safety Practices", "Electronics"], occupations: ["Automotive Mechanic"] },
  { ad: ["Electrical Technology", ["K", "H", "M", "G"]], bt: ["Electrical Technology", ["K", "H", "M"]], sector: "CONSTR",
    skills: ["Electrical Installation", "Technical Drawing", "Safety Practices", "Electronics"], occupations: ["Electrician"] },
  { ad: ["Forest Engineering and Wood Technology", ["Ki"]], bt: ["Wood Technology", ["Ki"]], sector: "MANUF",
    skills: ["Wood Processing", "Carpentry", "Forest Management", "Machine Operation"], occupations: [] },
  { ad: ["Forest Resources Management", ["Ki"]], bt: ["Applied Forestry", ["Ki"]], sector: "AGRI",
    skills: ["Forest Management", "GIS & Mapping", "Soil & Water Management", "Report Writing"], occupations: [] },
  { ad: ["Tourism Destination Management", ["Ki"]], bt: ["Tourism Management", ["Ki"]], sector: "TOUR",
    skills: ["Destination Knowledge", "Tour Operations", "Customer Service", "Foreign Languages"], occupations: ["Tour Guide", "Tour Operations Officer"] },
  { ad: ["Tours and Travel Management", ["Ki"]], sector: "TOUR",
    skills: ["Tour Operations", "Destination Knowledge", "Customer Service", "English Language"], occupations: ["Tour Operations Officer"] },
  { ad: ["Wildlife and Conservation Technologies", ["Ki"]], bt: ["Wildlife and Landscape Management Technology", ["Ki"]], sector: "TOUR",
    skills: ["Wildlife Conservation", "Forest Management", "GIS & Mapping", "Destination Knowledge"], occupations: ["Wildlife Conservation Technician"] },
  { ad: ["Manufacturing Technology", ["K", "H", "N"]], bt: ["Manufacturing Technology", ["K", "H", "N"]], sector: "MANUF",
    skills: ["Machine Operation", "Mechanical Maintenance", "Technical Drawing", "Metal Fabrication"], occupations: ["Welder & Fabricator"] },
  { ad: ["Food Processing", ["M"]], bt: ["Food Technology", ["M"]], sector: "MANUF",
    skills: ["Food Processing", "Quality Control", "Safety Practices", "Post-harvest Handling"], occupations: ["Agro-processing Technician"] },
  { ad: ["Renewable Energy Technology", ["T"]], bt: ["Renewable Energy Technology", ["T"]], sector: "ENERGY",
    skills: ["Renewable Energy Systems", "Solar PV Installation", "Electrical Installation", "Safety Practices"],
    occupations: ["Renewable Energy Technician", "Solar PV Technician"] },
  { ad: ["Airline and Airport Management", ["K"]], sector: "TRANS",
    skills: ["Aviation Operations", "Customer Service", "English Language", "Safety Practices"], occupations: ["Airport Operations Officer"] },
  { ad: ["Logistics and Supply Chain Management", ["K"]], sector: "TRANS",
    skills: ["Logistics Operations", "Supply Chain Management", "Inventory Management", "Customs & Trade Compliance"], occupations: ["Logistics Coordinator"] },
  { ad: ["Graphic Design and Animation", ["K"]], sector: "CREATIVE",
    skills: ["Graphic Design", "Animation", "Content Creation", "UI/UX Design"], occupations: ["Graphic Designer"] },
  { ad: ["Film Making and TV Production", ["K"]], sector: "CREATIVE",
    skills: ["Video Production", "Photography", "Content Creation", "Project Management"], occupations: ["Film & Video Producer"] },
  { ad: ["Air Conditioning and Refrigeration Technology", ["K"]], sector: "MANUF",
    skills: ["HVAC & Refrigeration", "Electrical Installation", "Safety Practices", "Mechanical Maintenance"], occupations: ["HVAC & Refrigeration Technician"] },
  { ad: ["Fashion Design", ["K"]], sector: "CREATIVE",
    skills: ["Fashion Design", "Tailoring & Garment Making", "Marketing"], occupations: ["Fashion Designer"] },
  { ad: ["Biomedical Equipment Technology", ["K"]], sector: "HEALTH",
    skills: ["Biomedical Equipment Maintenance", "Electronics", "Safety Practices"], occupations: ["Biomedical Equipment Technician"] },
  { ad: ["Horticulture", ["H"]], sector: "AGRI",
    skills: ["Horticulture", "Crop Production", "Post-harvest Handling", "Soil & Water Management"], occupations: ["Agricultural Extension Officer"] },
  { ad: ["Hospitality with Room Division Management", ["N", "Ka", "M"]], sector: "TOUR",
    skills: ["Front Office Operations", "Housekeeping", "Customer Service", "Team Leadership"], occupations: ["Front Office Supervisor"] },
  { ad: ["Hospitality with Food and Beverage Operations", ["K", "M"]], sector: "TOUR",
    skills: ["Food & Beverage Service", "Customer Service", "Culinary Arts", "Team Leadership"], occupations: ["Chef", "Front Office Supervisor"] },
  { ad: ["Culinary Arts", ["N", "Ka", "M"]], sector: "TOUR",
    skills: ["Culinary Arts", "Food & Beverage Service", "Safety Practices", "Quality Control"], occupations: ["Chef"] },
  { ad: ["Electrical Automation Technology", ["M"]], sector: "MANUF",
    skills: ["Industrial Automation", "Electrical Installation", "Electronics"], occupations: ["Mechatronics Technician", "Electrician"] },
  { ad: ["E-commerce", ["M"]], sector: "COMM",
    skills: ["E-commerce Operations", "Digital Marketing", "Customer Service"], occupations: ["E-commerce Specialist", "Digital Marketing Specialist"] },
];

function rpPrograms(): ProgramSeed[] {
  const out: ProgramSeed[] = [];
  const emit = (kind: "ad" | "bt", name: string, colleges: string[], row: RpRow) => {
    const level: Edu = kind === "ad" ? "DIPLOMA" : "BACHELORS";
    for (const c of colleges) {
      out.push({
        institution: COLLEGE[c],
        name: `${kind === "ad" ? "Advanced Diploma in" : "Bachelor of Technology in"} ${name}`,
        level,
        durationMonths: kind === "ad" ? 36 : null,
        sector: row.sector,
        skills: row.skills,
        occupations: row.occupations,
        url: RP_URL,
        source: RP_SOURCE,
      });
    }
  };
  for (const row of RP_ROWS) {
    if (row.ad) emit("ad", row.ad[0], row.ad[1], row);
    if (row.bt) emit("bt", row.bt[0], row.bt[1], row);
  }
  return out;
}

const UR = "University of Rwanda";

const OTHER_PROGRAMS: ProgramSeed[] = [
  // ── Verified on provider pages ──
  { institution: "Kepler College", name: "Bachelor of Arts in Project Management", level: "BACHELORS", durationMonths: 36, sector: "COMM",
    skills: ["Project Management", "Team Leadership", "Monitoring & Evaluation", "Communication"], occupations: [],
    url: "https://keplercollege.ac.rw/undergraduate-programs/", source: OFFICIAL },
  { institution: "Kepler College", name: "Bachelor of Science in Business Analytics", level: "BACHELORS", durationMonths: 36, sector: "ICT",
    skills: ["Data Analysis", "Statistics", "SQL & Databases", "Data Visualisation"], occupations: ["Data Analyst"],
    url: "https://keplercollege.ac.rw/undergraduate-programs/", source: OFFICIAL },
  { institution: "Kepler College", name: "Bachelor of Arts in Management (SNHU online)", level: "BACHELORS", durationMonths: null, sector: "COMM",
    skills: ["Team Leadership", "Business Planning", "Financial Management", "Communication"], occupations: [],
    url: "https://keplercollege.ac.rw/undergraduate-programs/", source: OFFICIAL },
  { institution: "Kepler College", name: "Bachelor of Arts in Communications (SNHU online)", level: "BACHELORS", durationMonths: null, sector: "COMM",
    skills: ["Communication", "Content Creation", "Public Speaking", "Report Writing"], occupations: ["Digital Marketing Specialist"],
    url: "https://keplercollege.ac.rw/undergraduate-programs/", source: OFFICIAL },
  { institution: "Kepler College", name: "Master of Science in Business Analytics", level: "MASTERS", durationMonths: null, sector: "ICT",
    skills: ["Data Analysis", "Statistics", "Machine Learning", "Data Visualisation"], occupations: ["Data Analyst"],
    url: "https://keplercollege.ac.rw/", source: OFFICIAL },
  { institution: "Kepler College", name: "Master of Science in Information Technology", level: "MASTERS", durationMonths: null, sector: "ICT",
    skills: ["Programming", "Cloud Computing", "Cybersecurity", "Project Management"], occupations: ["Software Developer"],
    url: "https://keplercollege.ac.rw/", source: OFFICIAL },
  { institution: "Kepler College", name: "Master of Education in Learning Design and Technologies", level: "MASTERS", durationMonths: null, sector: "EDU",
    skills: ["Educational Technology", "Curriculum Development", "Lesson Planning"], occupations: [],
    url: "https://keplercollege.ac.rw/", source: OFFICIAL },
  { institution: "Rwanda Coding Academy", name: "Three-year Software Engineering programme", level: "TVET_CERTIFICATE", durationMonths: 36, sector: "ICT",
    skills: ["Programming", "Cybersecurity", "Machine Learning", "Embedded Systems", "Version Control (Git)"],
    occupations: ["Software Developer", "Cybersecurity Analyst"], url: "https://rca.ac.rw/admissions", source: OFFICIAL },
  { institution: "Carnegie Mellon University Africa", name: "MS in Information Technology", level: "MASTERS", durationMonths: null, sector: "ICT",
    skills: ["Programming", "Data Analysis", "Networking", "Project Management"], occupations: ["Software Developer", "Data Analyst"],
    url: "https://mastercardfdn.org/en/what-we-do/our-programs/mastercard-foundation-scholars-program/where-to-apply/carnegie-mellon-university-africa-cmu-africa/", source: OFFICIAL },
  { institution: "Carnegie Mellon University Africa", name: "MS in Electrical and Computer Engineering", level: "MASTERS", durationMonths: null, sector: "ICT",
    skills: ["Electronics", "Embedded Systems", "Networking", "Problem Solving"], occupations: [],
    url: "https://mastercardfdn.org/en/what-we-do/our-programs/mastercard-foundation-scholars-program/where-to-apply/carnegie-mellon-university-africa-cmu-africa/", source: OFFICIAL },
  { institution: "Carnegie Mellon University Africa", name: "MS in Engineering Artificial Intelligence", level: "MASTERS", durationMonths: null, sector: "ICT",
    skills: ["Machine Learning", "Programming", "Statistics", "Problem Solving"], occupations: ["Software Developer"],
    url: "https://mastercardfdn.org/en/what-we-do/our-programs/mastercard-foundation-scholars-program/where-to-apply/carnegie-mellon-university-africa-cmu-africa/", source: OFFICIAL },

  // ── Illustrative: plausible programmes at real institutions, NOT verified by HDOS ──
  { institution: UR, name: "BSc in Computer Science", level: "BACHELORS", durationMonths: 48, sector: "ICT",
    skills: ["Programming", "SQL & Databases", "Web Development", "Version Control (Git)", "Problem Solving"], occupations: ["Software Developer", "Data Analyst"], source: EDITORIAL },
  { institution: UR, name: "BSc in Civil Engineering", level: "BACHELORS", durationMonths: 48, sector: "CONSTR",
    skills: ["Structural Design", "Surveying", "CAD", "Construction Materials", "Project Management"], occupations: ["Civil Engineer"], source: EDITORIAL },
  { institution: UR, name: "Bachelor of Science in Nursing", level: "BACHELORS", durationMonths: 48, sector: "HEALTH",
    skills: ["Patient Care", "Clinical Procedures", "Medication Administration"], occupations: ["Registered Nurse"], source: EDITORIAL },
  { institution: UR, name: "Bachelor of Education", level: "BACHELORS", durationMonths: 48, sector: "EDU",
    skills: ["Lesson Planning", "Classroom Management", "Child Development", "Assessment & Evaluation"],
    occupations: ["Primary School Teacher", "Secondary School Teacher"], source: EDITORIAL },
  { institution: UR, name: "BSc in Information Technology", level: "BACHELORS", durationMonths: 48, sector: "ICT",
    skills: ["Networking", "SQL & Databases", "Systems Administration", "Cybersecurity"], occupations: ["Network Administrator", "Cybersecurity Analyst"], source: EDITORIAL },
  { institution: UR, name: "BSc in Electrical Engineering", level: "BACHELORS", durationMonths: 48, sector: "ENERGY",
    skills: ["Electrical Installation", "Electronics", "Renewable Energy Systems", "CAD"], occupations: [], source: EDITORIAL },
  { institution: UR, name: "BSc in Mechanical Engineering", level: "BACHELORS", durationMonths: 48, sector: "MANUF",
    skills: ["Mechanical Maintenance", "CAD", "Technical Drawing", "Problem Solving"], occupations: [], source: EDITORIAL },
  { institution: UR, name: "Bachelor of Medicine and Surgery (MBChB)", level: "BACHELORS", durationMonths: null, sector: "HEALTH",
    skills: ["Clinical Diagnosis", "Clinical Procedures", "Patient Care", "Medical Records"], occupations: ["Medical Doctor"], source: EDITORIAL },
  { institution: UR, name: "Bachelor of Pharmacy", level: "BACHELORS", durationMonths: null, sector: "HEALTH",
    skills: ["Pharmacy Practice", "Medication Administration", "Patient Care"], occupations: ["Pharmacist"], source: EDITORIAL },
  { institution: UR, name: "Bachelor of Science in Midwifery", level: "BACHELORS", durationMonths: 48, sector: "HEALTH",
    skills: ["Midwifery Care", "Patient Care", "Clinical Procedures", "Health Education"], occupations: ["Midwife"], source: EDITORIAL },
  { institution: UR, name: "Bachelor of Science in Biomedical Laboratory Sciences", level: "BACHELORS", durationMonths: 48, sector: "HEALTH",
    skills: ["Laboratory Techniques", "Quality Control", "Infection Prevention"], occupations: ["Laboratory Technician"], source: EDITORIAL },
  { institution: UR, name: "Bachelor of Science in Public Health", level: "BACHELORS", durationMonths: 48, sector: "HEALTH",
    skills: ["Public Health", "Health Education", "Research Methods", "Monitoring & Evaluation"], occupations: [], source: EDITORIAL },
  { institution: UR, name: "Bachelor of Business Administration", level: "BACHELORS", durationMonths: 48, sector: "COMM",
    skills: ["Business Planning", "Marketing", "Financial Management", "Team Leadership"], occupations: ["Small Business Owner"], source: EDITORIAL },
  { institution: UR, name: "Doctor of Veterinary Medicine", level: "BACHELORS", durationMonths: null, sector: "AGRI",
    skills: ["Veterinary Care", "Animal Husbandry", "Laboratory Techniques"], occupations: [], source: EDITORIAL },
  { institution: UR, name: "Bachelor of Laws (LLB)", level: "BACHELORS", durationMonths: 48, sector: null,
    skills: ["Legal Research", "Critical Thinking", "Public Speaking"], occupations: [], source: EDITORIAL },
  { institution: UR, name: "MSc in Data Science", level: "MASTERS", durationMonths: null, sector: "ICT",
    skills: ["Data Analysis", "Machine Learning", "Statistics", "Programming"], occupations: ["Data Analyst"], source: EDITORIAL },
  { institution: "Independent University of Kigali (ULK)", name: "Bachelor of Laws (LLB)", level: "BACHELORS", durationMonths: 48, sector: null,
    skills: ["Legal Research", "Critical Thinking", "Public Speaking"], occupations: [], source: EDITORIAL },
  { institution: "INES-Ruhengeri", name: "BSc in Information Technology", level: "BACHELORS", durationMonths: 48, sector: "ICT",
    skills: ["Programming", "Networking", "SQL & Databases", "IT Troubleshooting"], occupations: ["Software Developer", "IT Support Technician"], source: EDITORIAL },
  { institution: "University of Global Health Equity", name: "Master of Science in Global Health Delivery", level: "MASTERS", durationMonths: null, sector: "HEALTH",
    skills: ["Project Management", "Data Analysis", "Communication", "Public Health"], occupations: [], source: EDITORIAL },
  { institution: "Kibogora Polytechnic", name: "Bachelor in Nursing", level: "BACHELORS", durationMonths: 48, sector: "HEALTH",
    skills: ["Patient Care", "Clinical Procedures", "Medication Administration"], occupations: ["Registered Nurse"], source: EDITORIAL },
  { institution: "Adventist University of Central Africa (AUCA)", name: "Bachelor of Business Administration (Accounting)", level: "BACHELORS", durationMonths: 48, sector: "FIN",
    skills: ["Bookkeeping", "Financial Reporting", "Taxation", "Spreadsheets", "Auditing"], occupations: ["Accountant", "Auditor"], source: EDITORIAL },
  { institution: "Adventist University of Central Africa (AUCA)", name: "Bachelor of Science in Information Technology", level: "BACHELORS", durationMonths: 48, sector: "ICT",
    skills: ["Programming", "Networking", "SQL & Databases", "Cybersecurity"], occupations: ["Software Developer", "Network Administrator"], source: EDITORIAL },
  { institution: "Protestant Institute of Arts and Social Sciences (PIASS)", name: "Bachelor in Business Management", level: "BACHELORS", durationMonths: 48, sector: "COMM",
    skills: ["Business Planning", "Marketing", "Financial Management"], occupations: ["Small Business Owner"], source: EDITORIAL },
  { institution: "University of Tourism, Technology and Business Studies (UTB)", name: "Bachelor of Tourism and Hospitality Management", level: "BACHELORS", durationMonths: 48, sector: "TOUR",
    skills: ["Tour Operations", "Customer Service", "Front Office Operations", "Destination Knowledge"],
    occupations: ["Tour Operations Officer", "Front Office Supervisor"], source: EDITORIAL },
  { institution: "African Institute for Mathematical Sciences (AIMS Rwanda)", name: "MSc in Machine Intelligence", level: "MASTERS", durationMonths: null, sector: "ICT",
    skills: ["Machine Learning", "Programming", "Statistics"], occupations: ["Data Analyst"], source: EDITORIAL },
  { institution: "VATEL School Rwanda", name: "Bachelor in International Hotel Management", level: "BACHELORS", durationMonths: null, sector: "TOUR",
    skills: ["Front Office Operations", "Food & Beverage Service", "Customer Service", "Team Leadership"], occupations: ["Front Office Supervisor"], source: EDITORIAL },
  { institution: "Institut Supérieur Pédagogique de Gitwe (ISPG)", name: "Bachelor of Education", level: "BACHELORS", durationMonths: 48, sector: "EDU",
    skills: ["Lesson Planning", "Classroom Management", "Assessment & Evaluation"], occupations: ["Secondary School Teacher", "Primary School Teacher"], source: EDITORIAL },
];

export const PROGRAMS: ProgramSeed[] = [...rpPrograms(), ...OTHER_PROGRAMS];

/**
 * Programmes from earlier seed versions that were replaced by verified Rwanda Polytechnic / RCA records.
 * seedCatalog deletes exactly these (institution, name) pairs so stale illustrative rows do not linger.
 */
export const LEGACY_REMOVED_PROGRAMS: { institution: string; name: string }[] = [
  { institution: "IPRC Kigali (Rwanda Polytechnic)", name: "Diploma in Electrical Engineering" },
  { institution: "IPRC Kigali (Rwanda Polytechnic)", name: "Diploma in Information and Communication Technology" },
  { institution: "IPRC Huye (Rwanda Polytechnic)", name: "Diploma in Civil Engineering" },
  { institution: "IPRC Musanze (Rwanda Polytechnic)", name: "TVET Certificate in Welding and Fabrication" },
  { institution: "IPRC Karongi (Rwanda Polytechnic)", name: "TVET Certificate in Food Processing" },
  { institution: "IPRC Ngoma (Rwanda Polytechnic)", name: "Diploma in Agriculture" },
  { institution: "Rwanda Coding Academy", name: "TVET in Software Development" },
];
