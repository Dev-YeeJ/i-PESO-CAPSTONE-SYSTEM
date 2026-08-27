export interface Step1Value {
  first_name: string
  middle_name: string
  last_name: string
  suffix: string
  date_of_birth: string
  sex: string
  civil_status: string
  religion: string
  religion_other: string
  height_ft: string
  tin: string
  address_province: string
  address_municipality_city: string
  address_barangay: string
  address_house_street: string
  disabilities: string[]
  disability_specification: string
}

export interface Step2Value {
  employment_status: string
  employment_type: string
  self_employed_type: string
  self_employed_type_others: string
  unemployment_months: string
  unemployment_reason: string
  unemployment_reason_others: string
  unemployment_terminated_country: string
  is_ofw: boolean
  ofw_country: string
  is_former_ofw: boolean
  former_ofw_country: string
  former_ofw_return_date: string
  is_4ps_beneficiary: boolean
  household_id_4ps: string
}

export interface OccupationPrefEntry {
  raw_job_title: string
  occupation_id: number | null
  general_term: string | null
  source: string
}

export interface Step3Value {
  work_type_preference: string
  preferred_work_location: string
  preferred_locations_details: string[]
  occupation_preferences: OccupationPrefEntry[]
}

export interface LanguageEntry {
  language: string
  language_other: string
  can_read: boolean
  can_write: boolean
  can_speak: boolean
  can_understand: boolean
}

export interface Step4Value {
  languages: LanguageEntry[]
}

export interface EducationEntry {
  level: string
  institution_name: string
  course_strand: string
  completion_status: string
  year_started: string
  year_graduated: string
  undergrad_level_reached: string
  undergrad_year_last_attended: string
  expected_year_graduated: string
  current_level: string
}

export interface SkillEntry {
  name: string
  proficiency: string
  source: string
  is_official: boolean
  is_recommended: boolean
}

export interface Step5Value {
  educations: EducationEntry[]
  hardSkills: SkillEntry[]
  soft_skills: SkillEntry[]
}

export interface TrainingEntry {
  course: string
  hours_of_training: string
  training_institution: string
  skills_acquired: string
  certificates_received: string
}

export interface EligibilityEntry {
  type: string
  name: string
  date_taken: string
  valid_until: string
}

export interface Step6Value {
  trainings: TrainingEntry[]
  eligibilities: EligibilityEntry[]
}

export interface WorkExperienceEntry {
  company_name: string
  company_address: string
  position: string
  responsibilities: string
  number_of_months: string
  start_date: string
  end_date: string
  currently_employed: boolean
  employment_status: string
}

export interface Step7Value {
  work_experiences: WorkExperienceEntry[]
}

export const emptyStep1: Step1Value = {
  first_name: '',
  middle_name: '',
  last_name: '',
  suffix: '',
  date_of_birth: '',
  sex: '',
  civil_status: '',
  religion: '',
  religion_other: '',
  height_ft: '',
  tin: '',
  address_province: '',
  address_municipality_city: '',
  address_barangay: '',
  address_house_street: '',
  disabilities: [],
  disability_specification: '',
}

export const emptyStep2: Step2Value = {
  employment_status: '',
  employment_type: '',
  self_employed_type: '',
  self_employed_type_others: '',
  unemployment_months: '',
  unemployment_reason: '',
  unemployment_reason_others: '',
  unemployment_terminated_country: '',
  is_ofw: false,
  ofw_country: '',
  is_former_ofw: false,
  former_ofw_country: '',
  former_ofw_return_date: '',
  is_4ps_beneficiary: false,
  household_id_4ps: '',
}

export function newOccupationPref(): OccupationPrefEntry {
  return { raw_job_title: '', occupation_id: null, general_term: null, source: 'manual' }
}

export const emptyStep3: Step3Value = {
  work_type_preference: '',
  preferred_work_location: '',
  preferred_locations_details: [''],
  occupation_preferences: [newOccupationPref()],
}

export function newLanguage(language = ''): LanguageEntry {
  return { language, language_other: '', can_read: true, can_write: true, can_speak: true, can_understand: true }
}

export const emptyStep4: Step4Value = {
  languages: [newLanguage('filipino'), newLanguage('english')],
}

export function newEducation(): EducationEntry {
  return {
    level: '',
    institution_name: '',
    course_strand: '',
    completion_status: '',
    year_started: '',
    year_graduated: '',
    undergrad_level_reached: '',
    undergrad_year_last_attended: '',
    expected_year_graduated: '',
    current_level: '',
  }
}

export function newSkill(): SkillEntry {
  return { name: '', proficiency: 'intermediate', source: 'user_added', is_official: false, is_recommended: false }
}

export const emptyStep5: Step5Value = {
  educations: [newEducation()],
  hardSkills: [],
  soft_skills: [],
}

export function newTraining(): TrainingEntry {
  return { course: '', hours_of_training: '', training_institution: '', skills_acquired: '', certificates_received: '' }
}

export function newEligibility(): EligibilityEntry {
  return { type: 'professional_license', name: '', date_taken: '', valid_until: '' }
}

export const emptyStep6: Step6Value = { trainings: [], eligibilities: [] }

export function newWorkExperience(): WorkExperienceEntry {
  return {
    company_name: '',
    company_address: '',
    position: '',
    responsibilities: '',
    number_of_months: '',
    start_date: '',
    end_date: '',
    currently_employed: false,
    employment_status: 'permanent',
  }
}

export const emptyStep7: Step7Value = { work_experiences: [] }

export interface OnboardingFormValue {
  step1: Step1Value
  step2: Step2Value
  step3: Step3Value
  step4: Step4Value
  step5: Step5Value
  step6: Step6Value
  step7: Step7Value
}

export const emptyOnboardingForm: OnboardingFormValue = {
  step1: emptyStep1,
  step2: emptyStep2,
  step3: emptyStep3,
  step4: emptyStep4,
  step5: emptyStep5,
  step6: emptyStep6,
  step7: emptyStep7,
}
