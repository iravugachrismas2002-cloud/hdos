// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Sectors and skills taxonomy (editorial vocabulary; see sources.ts for provenance notes).
import type { SectorSeed, SkillSeed } from "./types";

/**
 * `nst2Priority` = the sector has a dedicated section in the NST2 (2024-2029) Economic Transformation pillar:
 * agri-food systems, industrial development, tourism, clean energy, transport connectivity, urbanisation and
 * settlements, digital transformation, financial sector. Health/education sit in NST2's social pillar and are false.
 */
export const SECTORS: SectorSeed[] = [
  { code: "ICT", name: "ICT & Digital", nst2Priority: true },
  { code: "AGRI", name: "Agriculture", nst2Priority: true },
  { code: "MANUF", name: "Manufacturing & Agro-processing", nst2Priority: true },
  { code: "TOUR", name: "Tourism & Hospitality", nst2Priority: true },
  { code: "CONSTR", name: "Construction & Infrastructure", nst2Priority: true },
  { code: "FIN", name: "Financial Services", nst2Priority: true },
  { code: "COMM", name: "Commerce & Entrepreneurship", nst2Priority: false },
  { code: "HEALTH", name: "Health", nst2Priority: false },
  { code: "EDU", name: "Education", nst2Priority: false },
  { code: "ENERGY", name: "Energy & Utilities", nst2Priority: true },
  { code: "TRANS", name: "Transport & Logistics", nst2Priority: true },
  { code: "MINING", name: "Mining & Quarrying", nst2Priority: false },
  { code: "CREATIVE", name: "Creative Arts & Media", nst2Priority: false },
];

const group = (category: string, names: string[]): SkillSeed[] => names.map((name) => ({ name, category }));

export const SKILLS: SkillSeed[] = [
  ...group("Digital", [
    "Programming", "SQL & Databases", "Web Development", "Version Control (Git)", "Data Analysis", "Statistics",
    "Spreadsheets", "Data Visualisation", "Networking", "IT Troubleshooting", "Computer Hardware", "Digital Marketing",
    "Cybersecurity", "Cloud Computing", "Mobile App Development", "UI/UX Design", "Machine Learning", "Software Testing",
    "Systems Administration", "Database Administration", "Embedded Systems", "Digital Literacy", "Content Creation",
    "E-commerce Operations",
  ]),
  ...group("Health", [
    "Patient Care", "Clinical Procedures", "Medication Administration", "Midwifery Care", "Public Health",
    "Health Education", "Laboratory Techniques", "Pharmacy Practice", "Infection Prevention", "First Aid", "Nutrition",
    "Medical Records", "Biomedical Equipment Maintenance", "Clinical Diagnosis",
  ]),
  ...group("Education", [
    "Lesson Planning", "Classroom Management", "Child Development", "Curriculum Development", "Assessment & Evaluation",
    "Early Childhood Education", "Educational Technology", "Mentoring & Coaching", "Technical Instruction",
  ]),
  ...group("Engineering & Trades", [
    "Structural Design", "Surveying", "CAD", "Construction Materials", "Electrical Installation", "Technical Drawing",
    "Welding", "Machine Operation", "Plumbing", "Masonry", "Carpentry", "Automotive Repair", "Electronics",
    "Mechanical Maintenance", "Renewable Energy Systems", "HVAC & Refrigeration", "Quantity Surveying", "GIS & Mapping",
    "Road Construction", "Water Supply & Sanitation", "Mining Operations", "Wood Processing", "Tailoring & Garment Making",
    "Industrial Automation", "Irrigation Systems", "Metal Fabrication", "Solar PV Installation",
  ]),
  ...group("Business & Finance", [
    "Bookkeeping", "Financial Reporting", "Taxation", "Business Planning", "Marketing", "Financial Management", "Auditing",
    "Banking Operations", "Credit Analysis", "Risk Management", "Sales", "Procurement", "Supply Chain Management",
    "Entrepreneurship", "Microfinance", "Human Resource Management", "Public Administration", "Legal Research", "Negotiation",
    "Financial Literacy",
  ]),
  ...group("Agriculture & Food", [
    "Crop Production", "Soil & Water Management", "Farmer Training", "Food Processing", "Quality Control", "Horticulture",
    "Animal Husbandry", "Veterinary Care", "Agribusiness Management", "Post-harvest Handling", "Agricultural Mechanization",
    "Forest Management", "Wildlife Conservation", "Culinary Arts", "Record Keeping (Farm)",
  ]),
  ...group("Hospitality & Service", [
    "Customer Service", "Front Office Operations", "Destination Knowledge", "Foreign Languages", "Food & Beverage Service",
    "Housekeeping", "Tour Operations", "Event Management", "English Language", "French Language", "Kinyarwanda Communication",
    "Kiswahili Language",
  ]),
  ...group("Professional", [
    "Communication", "Problem Solving", "Project Management", "Team Leadership", "Safety Practices", "Time Management",
    "Critical Thinking", "Teamwork", "Report Writing", "Research Methods", "Public Speaking", "Adaptability",
    "Monitoring & Evaluation",
  ]),
  ...group("Transport & Logistics", [
    "Logistics Operations", "Warehouse Management", "Inventory Management", "Aviation Operations", "Customs & Trade Compliance",
    "Fleet Management",
  ]),
  ...group("Creative", ["Graphic Design", "Video Production", "Photography", "Fashion Design", "Animation"]),
];
