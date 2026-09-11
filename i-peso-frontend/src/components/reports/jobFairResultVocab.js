// Shared RO1-JF Form 3 vocabulary — mirrors the DOLE codes defined in
// App\Services\JobFairReportService (backend). Kept here as plain data so the
// employer encode form, the admin proxy encode form, and the read-only
// EstablishmentReportPreview all render exactly the same labels.

export const AGE_GROUPS = [
  ['A', '15–24'], ['B', '25–34'], ['C', '35–44'], ['D', '45–54'], ['E', '55–64'], ['F', '65+'],
]

// value stored on the entry -> DOLE education code shown on the paper form.
export const EDUCATION_LEVELS = [
  ['elementary', 'Elementary', 'E'],
  ['high_school', 'Old High School', 'HS'],
  ['senior_high', 'K-12 Senior High School', 'K-12'],
  ['vocational', 'Vocational', 'V'],
  ['college', 'College', 'C'],
  ['post_graduate', 'Post Graduate', 'PG'],
]
export const educationCode = (value) => EDUCATION_LEVELS.find(([v]) => v === value)?.[2] ?? null

export const STATUS_OPTIONS = [
  ['qualified', 'Qualified'],
  ['near_hired', 'Near Hired'],
  ['hots', 'Hired-on-the-spot'],
  ['employer_mismatch', 'Mismatch ch. (Employer)'],
  ['seeker_mismatch', 'Mismatch ch. (Job Seeker)'],
]
export const statusLabel = (value) => STATUS_OPTIONS.find(([v]) => v === value)?.[1] ?? value?.replaceAll('_', ' ')

export const EMPLOYER_MISMATCH_CODES = [
  ['1', 'Lack required work experience'],
  ['2', 'Lack needed education/competency/skill'],
  ['3', 'Lack professional license/TESDA certification/skill'],
  ['4', 'Failed to submit documentary requirements'],
]
export const SEEKER_MISMATCH_CODES = [
  ['A', 'Salary expectation is not met'],
  ['B', 'Applicant prefers another position'],
  ['C', 'Place of work/location is not acceptable'],
  ['D', 'Applicant did not push through with the application/Unresponsive'],
]
export const mismatchCodeLabel = (code) => EMPLOYER_MISMATCH_CODES.find(([v]) => v === code)?.[1]
  ?? SEEKER_MISMATCH_CODES.find(([v]) => v === code)?.[1] ?? code

export const CLASSIFICATION_CODES = [
  ['1', 'K-12/Senior High School graduate'],
  ['2', 'Person with disability (PWD)/Senior Citizen (SC)'],
  ['3', 'Displaced OFW'],
  ['4', '4Ps/TUPAD Beneficiary'],
]

export const blankResultEntry = () => ({
  applicant_name: '', seeker_id: null, gender: 'male', city_municipality: '', contact_number: '', age_group: '',
  highest_education: '', classification_codes: [], position_applied_for: '', status: 'qualified',
  mismatch_code: '', remarks: '',
})
