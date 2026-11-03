// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// EDITORIAL occupation model (source: hdos-editorial-occupations, isDemo = true).
// - `demand` is UNKNOWN for every occupation: no official occupation-level demand rating was found, and the
//   platform must not present guessed demand as official.
// - Skill importance / requiredLevel (1-5) and minEducation are editorial estimates.
// - No salary figures anywhere.
import type { Edu, OccupationSeed, SkillReq } from "./types";

const occ = (title: string, sector: string, minEducation: Edu, description: string, skills: SkillReq[]): OccupationSeed => ({
  title,
  sector,
  minEducation,
  demand: "UNKNOWN",
  description,
  skills,
});

export const OCCUPATIONS: OccupationSeed[] = [
  // ───────── ICT ─────────
  occ("Software Developer", "ICT", "BACHELORS", "Designs, builds and maintains software applications.",
    [["Programming", 5, 4], ["SQL & Databases", 4, 3], ["Web Development", 4, 3], ["Version Control (Git)", 3, 3], ["Problem Solving", 4, 3], ["Communication", 3, 3]]),
  occ("Data Analyst", "ICT", "BACHELORS", "Turns data into insight to support decisions.",
    [["Data Analysis", 5, 4], ["SQL & Databases", 4, 3], ["Statistics", 4, 3], ["Spreadsheets", 3, 4], ["Data Visualisation", 4, 3], ["Communication", 3, 3]]),
  occ("IT Support Technician", "ICT", "DIPLOMA", "Installs, maintains and troubleshoots computers and networks.",
    [["Networking", 5, 3], ["IT Troubleshooting", 5, 3], ["Computer Hardware", 4, 3], ["Customer Service", 3, 3]]),
  occ("Digital Marketing Specialist", "ICT", "DIPLOMA", "Plans and runs online marketing campaigns.",
    [["Digital Marketing", 5, 4], ["Marketing", 4, 3], ["Data Analysis", 3, 3], ["Communication", 4, 3], ["Content Creation", 3, 3]]),
  occ("Network Administrator", "ICT", "DIPLOMA", "Plans, configures and monitors computer networks and servers for an organisation.",
    [["Networking", 5, 4], ["Systems Administration", 4, 3], ["Cybersecurity", 4, 3], ["IT Troubleshooting", 4, 3], ["Report Writing", 2, 3]]),
  occ("Cybersecurity Analyst", "ICT", "BACHELORS", "Monitors systems for threats, responds to incidents and hardens infrastructure.",
    [["Cybersecurity", 5, 4], ["Networking", 4, 3], ["Systems Administration", 3, 3], ["Risk Management", 3, 3], ["Report Writing", 3, 3]]),
  occ("UI/UX Designer", "ICT", "DIPLOMA", "Designs usable, accessible interfaces for web and mobile products.",
    [["UI/UX Design", 5, 4], ["Graphic Design", 3, 3], ["Research Methods", 3, 3], ["Communication", 4, 3], ["Web Development", 2, 2]]),

  // ───────── Health ─────────
  occ("Registered Nurse", "HEALTH", "DIPLOMA", "Provides and coordinates patient care in health facilities.",
    [["Patient Care", 5, 4], ["Clinical Procedures", 5, 4], ["Medication Administration", 4, 3], ["Communication", 4, 3], ["Infection Prevention", 3, 3]]),
  occ("Midwife", "HEALTH", "DIPLOMA", "Supports women through pregnancy, labour and the postnatal period.",
    [["Midwifery Care", 5, 4], ["Patient Care", 4, 4], ["Clinical Procedures", 4, 3], ["Health Education", 3, 3], ["Infection Prevention", 3, 3]]),
  occ("Medical Doctor", "HEALTH", "BACHELORS", "Diagnoses and treats illness and leads clinical teams.",
    [["Clinical Diagnosis", 5, 4], ["Clinical Procedures", 5, 4], ["Patient Care", 4, 4], ["Communication", 4, 4], ["Medical Records", 3, 3]]),
  occ("Pharmacist", "HEALTH", "BACHELORS", "Dispenses medicines and advises patients and clinicians on their safe use.",
    [["Pharmacy Practice", 5, 4], ["Medication Administration", 4, 3], ["Patient Care", 3, 3], ["Quality Control", 3, 3], ["Communication", 3, 3]]),
  occ("Laboratory Technician", "HEALTH", "DIPLOMA", "Collects, tests and records clinical and public-health laboratory samples.",
    [["Laboratory Techniques", 5, 4], ["Quality Control", 4, 3], ["Infection Prevention", 3, 3], ["Medical Records", 3, 3], ["Safety Practices", 3, 3]]),
  occ("Biomedical Equipment Technician", "HEALTH", "DIPLOMA", "Installs, calibrates and repairs medical equipment in health facilities.",
    [["Biomedical Equipment Maintenance", 5, 4], ["Electronics", 4, 3], ["Mechanical Maintenance", 3, 3], ["Safety Practices", 3, 3], ["Problem Solving", 3, 3]]),

  // ───────── Education ─────────
  occ("Primary School Teacher", "EDU", "UPPER_SECONDARY", "Teaches and supports learners in primary education.",
    [["Lesson Planning", 5, 3], ["Classroom Management", 5, 3], ["Communication", 4, 3], ["Child Development", 3, 3]]),
  occ("Secondary School Teacher", "EDU", "BACHELORS", "Teaches one or more subjects at secondary level and assesses learner progress.",
    [["Lesson Planning", 5, 4], ["Classroom Management", 4, 3], ["Assessment & Evaluation", 4, 3], ["Curriculum Development", 3, 3], ["Educational Technology", 3, 3]]),
  occ("TVET Trainer", "EDU", "DIPLOMA", "Trains learners in technical and vocational trades using competence-based methods.",
    [["Technical Instruction", 5, 4], ["Lesson Planning", 4, 3], ["Assessment & Evaluation", 4, 3], ["Safety Practices", 3, 3], ["Mentoring & Coaching", 3, 3]]),

  // ───────── Construction & infrastructure ─────────
  occ("Civil Engineer", "CONSTR", "BACHELORS", "Plans and supervises construction of infrastructure.",
    [["Structural Design", 5, 4], ["Surveying", 3, 3], ["Project Management", 4, 3], ["CAD", 4, 3], ["Construction Materials", 3, 3]]),
  occ("Electrician", "CONSTR", "TVET_CERTIFICATE", "Installs and maintains electrical systems.",
    [["Electrical Installation", 5, 4], ["Safety Practices", 4, 3], ["Technical Drawing", 3, 3], ["Customer Service", 2, 3]]),
  occ("Quantity Surveyor", "CONSTR", "DIPLOMA", "Measures, estimates and tracks construction quantities and costs.",
    [["Quantity Surveying", 5, 4], ["Construction Materials", 3, 3], ["Spreadsheets", 4, 3], ["Technical Drawing", 3, 3], ["Report Writing", 3, 3]]),
  occ("Land Surveyor", "CONSTR", "DIPLOMA", "Measures and maps land and construction sites using survey and GIS tools.",
    [["Surveying", 5, 4], ["GIS & Mapping", 4, 3], ["CAD", 3, 3], ["Technical Drawing", 3, 3], ["Report Writing", 2, 3]]),
  occ("Plumber", "CONSTR", "TVET_CERTIFICATE", "Installs and repairs water supply, drainage and sanitation systems.",
    [["Plumbing", 5, 4], ["Water Supply & Sanitation", 4, 3], ["Safety Practices", 3, 3], ["Technical Drawing", 2, 3], ["Customer Service", 2, 3]]),
  occ("Mason", "CONSTR", "TVET_CERTIFICATE", "Builds walls, foundations and finishes using bricks, blocks and concrete.",
    [["Masonry", 5, 4], ["Construction Materials", 4, 3], ["Safety Practices", 3, 3], ["Technical Drawing", 2, 2], ["Teamwork", 3, 3]]),
  occ("Road Construction Technician", "CONSTR", "DIPLOMA", "Supervises road and drainage works and quality of materials on site.",
    [["Road Construction", 5, 4], ["Surveying", 3, 3], ["Construction Materials", 4, 3], ["Quality Control", 3, 3], ["Safety Practices", 3, 3]]),

  // ───────── Manufacturing ─────────
  occ("Welder & Fabricator", "MANUF", "TVET_CERTIFICATE", "Joins and fabricates metal structures and products.",
    [["Welding", 5, 4], ["Safety Practices", 4, 3], ["Technical Drawing", 4, 3], ["Machine Operation", 3, 3], ["Metal Fabrication", 4, 3]]),
  occ("Agro-processing Technician", "MANUF", "TVET_CERTIFICATE", "Operates and monitors food and crop processing lines.",
    [["Food Processing", 5, 3], ["Quality Control", 4, 3], ["Safety Practices", 4, 3], ["Machine Operation", 3, 3]]),
  occ("Mechatronics Technician", "MANUF", "DIPLOMA", "Installs, programs and maintains automated mechanical-electronic systems.",
    [["Industrial Automation", 5, 4], ["Electronics", 4, 3], ["Mechanical Maintenance", 4, 3], ["Embedded Systems", 3, 3], ["Safety Practices", 3, 3]]),
  occ("Automotive Mechanic", "MANUF", "TVET_CERTIFICATE", "Diagnoses, services and repairs vehicles.",
    [["Automotive Repair", 5, 4], ["Mechanical Maintenance", 4, 3], ["Safety Practices", 3, 3], ["Customer Service", 3, 3], ["Problem Solving", 3, 3]]),
  occ("HVAC & Refrigeration Technician", "MANUF", "DIPLOMA", "Installs and services air-conditioning and cold-chain refrigeration equipment.",
    [["HVAC & Refrigeration", 5, 4], ["Electrical Installation", 3, 3], ["Safety Practices", 4, 3], ["Mechanical Maintenance", 3, 3], ["Customer Service", 2, 3]]),

  // ───────── Financial services ─────────
  occ("Accountant", "FIN", "BACHELORS", "Maintains financial records and prepares reports.",
    [["Bookkeeping", 5, 4], ["Financial Reporting", 4, 3], ["Spreadsheets", 4, 3], ["Taxation", 3, 3]]),
  occ("Bank Officer", "FIN", "DIPLOMA", "Serves customers and processes transactions, accounts and loan queries in a bank branch.",
    [["Banking Operations", 5, 3], ["Customer Service", 5, 4], ["Financial Literacy", 3, 3], ["Communication", 4, 3], ["Risk Management", 2, 2]]),
  occ("Auditor", "FIN", "BACHELORS", "Examines financial records and controls and reports on accuracy and compliance.",
    [["Auditing", 5, 4], ["Financial Reporting", 4, 4], ["Taxation", 3, 3], ["Risk Management", 3, 3], ["Report Writing", 4, 3]]),
  occ("Microfinance Officer", "FIN", "DIPLOMA", "Assesses small loans and supports savings groups, SACCOs and micro-entrepreneurs.",
    [["Microfinance", 5, 3], ["Credit Analysis", 4, 3], ["Financial Literacy", 4, 3], ["Customer Service", 3, 3], ["Kinyarwanda Communication", 3, 4]]),

  // ───────── Agriculture ─────────
  occ("Agricultural Extension Officer", "AGRI", "DIPLOMA", "Advises farmers on improved production practices.",
    [["Crop Production", 5, 4], ["Soil & Water Management", 4, 3], ["Farmer Training", 4, 3], ["Communication", 3, 3]]),
  occ("Commercial Farmer", "AGRI", "UPPER_SECONDARY", "Runs a market-oriented crop or livestock enterprise.",
    [["Crop Production", 4, 3], ["Agribusiness Management", 4, 3], ["Record Keeping (Farm)", 3, 3], ["Post-harvest Handling", 3, 3], ["Marketing", 3, 3]]),
  occ("Animal Health Technician", "AGRI", "DIPLOMA", "Supports livestock health, vaccination and disease surveillance under veterinary supervision.",
    [["Veterinary Care", 5, 4], ["Animal Husbandry", 4, 3], ["Farmer Training", 3, 3], ["Record Keeping (Farm)", 3, 3], ["Safety Practices", 2, 3]]),
  occ("Irrigation Technician", "AGRI", "DIPLOMA", "Designs, installs and maintains irrigation and drainage systems on farms and schemes.",
    [["Irrigation Systems", 5, 4], ["Soil & Water Management", 4, 3], ["Surveying", 3, 3], ["Technical Drawing", 3, 3], ["Farmer Training", 2, 3]]),

  // ───────── Tourism & hospitality ─────────
  occ("Tour Guide", "TOUR", "UPPER_SECONDARY", "Guides visitors and interprets destinations.",
    [["Customer Service", 4, 4], ["Communication", 5, 4], ["Foreign Languages", 4, 3], ["Destination Knowledge", 4, 3]]),
  occ("Front Office Supervisor", "TOUR", "DIPLOMA", "Leads reception and guest-service teams in hotels.",
    [["Customer Service", 5, 4], ["Front Office Operations", 4, 3], ["Team Leadership", 4, 3], ["Communication", 3, 3]]),
  occ("Chef", "TOUR", "TVET_CERTIFICATE", "Plans menus and prepares food to hygiene and quality standards in hotels and restaurants.",
    [["Culinary Arts", 5, 4], ["Food & Beverage Service", 3, 3], ["Quality Control", 3, 3], ["Safety Practices", 4, 3], ["Teamwork", 3, 3]]),
  occ("Tour Operations Officer", "TOUR", "DIPLOMA", "Plans itineraries, bookings and logistics for tour operators and travel agencies.",
    [["Tour Operations", 5, 4], ["Destination Knowledge", 4, 3], ["Customer Service", 4, 3], ["English Language", 3, 4], ["Event Management", 2, 3]]),
  occ("Wildlife Conservation Technician", "TOUR", "DIPLOMA", "Supports monitoring, patrol and community work in protected areas and conservation projects.",
    [["Wildlife Conservation", 5, 4], ["Forest Management", 3, 3], ["GIS & Mapping", 3, 3], ["Report Writing", 3, 3], ["Destination Knowledge", 2, 3]]),

  // ───────── Commerce & entrepreneurship ─────────
  occ("Small Business Owner", "COMM", "UPPER_SECONDARY", "Starts and runs a small enterprise.",
    [["Business Planning", 5, 3], ["Bookkeeping", 4, 3], ["Marketing", 4, 3], ["Financial Management", 4, 3], ["Customer Service", 3, 3]]),
  occ("Sales Representative", "COMM", "UPPER_SECONDARY", "Sells products or services to businesses or households and builds customer relationships.",
    [["Sales", 5, 3], ["Customer Service", 4, 3], ["Communication", 4, 3], ["Negotiation", 3, 3], ["Kinyarwanda Communication", 3, 4]]),
  occ("E-commerce Specialist", "COMM", "DIPLOMA", "Manages online product listings, orders, payments and customer communication for a shop.",
    [["E-commerce Operations", 5, 4], ["Digital Marketing", 4, 3], ["Customer Service", 3, 3], ["Spreadsheets", 3, 3], ["Content Creation", 3, 3]]),

  // ───────── Energy ─────────
  occ("Solar PV Technician", "ENERGY", "TVET_CERTIFICATE", "Installs and maintains solar photovoltaic systems for homes, businesses and institutions.",
    [["Solar PV Installation", 5, 4], ["Electrical Installation", 4, 3], ["Safety Practices", 4, 3], ["Customer Service", 3, 3], ["Technical Drawing", 2, 3]]),
  occ("Renewable Energy Technician", "ENERGY", "DIPLOMA", "Installs, tests and maintains renewable energy systems (solar, hydro, biogas).",
    [["Renewable Energy Systems", 5, 4], ["Electrical Installation", 4, 3], ["Electronics", 3, 3], ["Safety Practices", 4, 3], ["Report Writing", 2, 3]]),

  // ───────── Transport & logistics ─────────
  occ("Logistics Coordinator", "TRANS", "DIPLOMA", "Plans and tracks movement and storage of goods through the supply chain.",
    [["Logistics Operations", 5, 4], ["Supply Chain Management", 4, 3], ["Inventory Management", 4, 3], ["Spreadsheets", 3, 3], ["Customs & Trade Compliance", 3, 3]]),
  occ("Airport Operations Officer", "TRANS", "DIPLOMA", "Supports passenger, ramp and airline coordination at an airport.",
    [["Aviation Operations", 5, 4], ["Customer Service", 4, 4], ["Safety Practices", 4, 3], ["English Language", 4, 4], ["Team Leadership", 2, 3]]),

  // ───────── Mining ─────────
  occ("Mining Technician", "MINING", "DIPLOMA", "Supports surveying, extraction planning and safe operation on mine and quarry sites.",
    [["Mining Operations", 5, 4], ["Surveying", 3, 3], ["Safety Practices", 5, 4], ["GIS & Mapping", 2, 3], ["Report Writing", 3, 3]]),

  // ───────── Creative ─────────
  occ("Graphic Designer", "CREATIVE", "DIPLOMA", "Creates visual identities, layouts and social content for brands and publications.",
    [["Graphic Design", 5, 4], ["Content Creation", 3, 3], ["Communication", 3, 3], ["UI/UX Design", 2, 2], ["Time Management", 3, 3]]),
  occ("Film & Video Producer", "CREATIVE", "DIPLOMA", "Plans, shoots and edits video content for broadcast, advertising and online channels.",
    [["Video Production", 5, 4], ["Photography", 3, 3], ["Project Management", 3, 3], ["Teamwork", 3, 3], ["Content Creation", 3, 3]]),
  occ("Fashion Designer", "CREATIVE", "DIPLOMA", "Designs and produces garments and accessories for local and export markets.",
    [["Fashion Design", 5, 4], ["Tailoring & Garment Making", 4, 3], ["Marketing", 3, 3], ["Business Planning", 2, 3], ["Customer Service", 2, 3]]),
];
