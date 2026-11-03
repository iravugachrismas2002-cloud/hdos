// Requirement rows restate the linked official announcements. Expired cycles remain visible for reference.
export const OFFICIAL_DOCUMENT_REQUIREMENTS = [
  {
    provider: "Higher Education Council (HEC), Rwanda",
    title: "China-Rwanda Government Scholarships",
    version: 2026,
    sourceUrl: "https://www.hec.gov.rw/fileadmin/user_upload/HEC/Scholarships/China-Rwanda_Scholarships_2026_2027_Inner_Mongolia_FR_Medical_UniversityS.pdf",
    requirements: [
      { key: "COVER_LETTER", description: "Application letter addressed to the Director General of HEC", mandatory: true, acceptedEvidence: ["COVER_LETTER"] },
      { key: "NATIONAL_ID", description: "Copy of National ID", mandatory: true, acceptedEvidence: ["NATIONAL_ID"] },
      { key: "CV", description: "Curriculum Vitae", mandatory: true, acceptedEvidence: ["CV"] },
      { key: "DIPLOMA", description: "High School Diploma, Results Slip, or equivalent qualification", mandatory: true, acceptedEvidence: ["DIPLOMA"] },
    ],
  },
  {
    provider: "Commonwealth Scholarship Commission (UK)",
    title: "Commonwealth Scholarships",
    version: 2026,
    sourceUrl: "https://www.hec.gov.rw/fileadmin/user_upload/HEC/Scholarships/2026_COMMONWEALTH_SCHOLARSHIPS.pdf",
    requirements: [
      { key: "COVER_LETTER", description: "HEC application letter addressed to the Director General", mandatory: true, acceptedEvidence: ["COVER_LETTER"] },
      { key: "NATIONAL_ID", description: "Valid passport or national identity card showing photo, date of birth, and nationality", mandatory: true, acceptedEvidence: ["NATIONAL_ID", "PASSPORT"] },
      { key: "CV", description: "Up-to-date CV covering education, employment, research, publications, awards, leadership, service, and relevant achievements", mandatory: true, acceptedEvidence: ["CV"] },
      { key: "DIPLOMA", description: "Degree certificates for higher education qualifications", mandatory: true, acceptedEvidence: ["DIPLOMA"] },
      { key: "ACADEMIC_TRANSCRIPT", description: "Complete transcripts for each higher education qualification; certified English translations where required", mandatory: true, acceptedEvidence: ["ACADEMIC_TRANSCRIPT"] },
      { key: "RECOMMENDATION_LETTER", description: "Signed detailed references; at least one academic and current employer where applicable", mandatory: true, minimumCount: 2, acceptedEvidence: ["RECOMMENDATION_LETTER"] },
      { key: "STUDY_PLAN", description: "Detailed study plan for Master's applicants or research proposal for PhD applicants", mandatory: true, acceptedEvidence: ["STUDY_PLAN"] },
      { key: "UNIVERSITY_EVIDENCE", description: "University offer letters where available, or evidence that admission applications were submitted", mandatory: true, acceptedEvidence: ["UNIVERSITY_EVIDENCE"] },
      { key: "SUBMITTED_APPLICATION", description: "PDF copy of the final CSC Central application and its reference number", mandatory: true, acceptedEvidence: ["SUBMITTED_APPLICATION"] },
      { key: "SUPERVISOR_STATEMENT", description: "Required supporting statement from a proposed UK supervisor for PhD applicants", mandatory: false, acceptedEvidence: ["SUPERVISOR_STATEMENT"] },
    ],
  },
];
