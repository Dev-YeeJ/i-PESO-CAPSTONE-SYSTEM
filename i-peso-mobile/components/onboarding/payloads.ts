import type { SeekerProfile } from '@/services/seekerService'
import {
  emptyOnboardingForm,
  newEducation,
  newEligibility,
  newLanguage,
  newOccupationPref,
  newSkill,
  newTraining,
  newWorkExperience,
  type EducationEntry,
  type EligibilityEntry,
  type LanguageEntry,
  type OccupationPrefEntry,
  type OnboardingFormValue,
  type SkillEntry,
  type Step1Value,
  type Step2Value,
  type Step3Value,
  type Step4Value,
  type Step5Value,
  type Step6Value,
  type Step7Value,
  type TrainingEntry,
  type WorkExperienceEntry,
} from './types'

function numOrNull(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function textOrNull(value: string) {
  const trimmed = value.trim()
  return trimmed || null
}

// Mirrors SeekerController::educationDuplicateKey exactly, so the client rejects
// the same duplicate combinations the backend would.
function educationDuplicateKey(e: EducationEntry): string {
  const endYear = e.completion_status === 'graduated'
    ? e.year_graduated
    : e.completion_status === 'undergraduate'
      ? e.undergrad_year_last_attended
      : e.completion_status === 'currently_studying'
        ? 'present'
        : ''

  return [e.institution_name, e.level, e.course_strand, e.year_started, endYear]
    .map((part) => String(part ?? '').trim().toLowerCase().replace(/\s+/g, ' '))
    .join('|')
}

// ── Payload builders (form value -> API request body) ─────────────────────

export function buildStep1Payload(v: Step1Value) {
  return {
    first_name: v.first_name.trim(),
    middle_name: textOrNull(v.middle_name),
    last_name: v.last_name.trim(),
    suffix: v.suffix || null,
    date_of_birth: v.date_of_birth.trim(),
    sex: v.sex,
    civil_status: v.civil_status,
    religion: v.religion,
    religion_other: v.religion === 'other' ? textOrNull(v.religion_other) : null,
    height_ft: numOrNull(v.height_ft),
    tin: textOrNull(v.tin),
    address_province: v.address_province.trim(),
    address_municipality_city: v.address_municipality_city.trim(),
    address_barangay: v.address_barangay.trim(),
    address_house_street: v.address_house_street.trim(),
    disabilities: v.disabilities.length ? v.disabilities : ['none'],
    disability_specification: v.disabilities.includes('others') ? textOrNull(v.disability_specification) : null,
  }
}

export function buildStep2Payload(v: Step2Value) {
  const employed = v.employment_status === 'employed'
  const unemployed = v.employment_status === 'unemployed'
  const selfEmployed = employed && v.employment_type === 'self_employed'

  return {
    employment_status: v.employment_status,
    employment_type: employed ? v.employment_type : null,
    self_employed_type: selfEmployed ? v.self_employed_type : null,
    self_employed_type_others: selfEmployed && v.self_employed_type === 'others' ? textOrNull(v.self_employed_type_others) : null,
    unemployment_months: unemployed ? numOrNull(v.unemployment_months) : null,
    unemployment_reason: unemployed ? v.unemployment_reason : null,
    unemployment_reason_others: unemployed && v.unemployment_reason === 'others' ? textOrNull(v.unemployment_reason_others) : null,
    unemployment_terminated_country: unemployed && v.unemployment_reason === 'terminated_abroad' ? textOrNull(v.unemployment_terminated_country) : null,
    is_ofw: v.is_ofw,
    ofw_country: v.is_ofw ? textOrNull(v.ofw_country) : null,
    is_former_ofw: v.is_former_ofw,
    former_ofw_country: v.is_former_ofw ? textOrNull(v.former_ofw_country) : null,
    former_ofw_return_date: v.is_former_ofw ? textOrNull(v.former_ofw_return_date) : null,
    is_4ps_beneficiary: v.is_4ps_beneficiary,
    household_id_4ps: v.is_4ps_beneficiary ? textOrNull(v.household_id_4ps) : null,
  }
}

export function buildStep3Payload(v: Step3Value) {
  const preferences = v.occupation_preferences
    .filter((p) => p.raw_job_title.trim() || p.occupation_id || p.general_term)
    .slice(0, 3)
    .map((p) => ({
      occupation_id: p.occupation_id,
      general_term: p.occupation_id ? null : p.general_term,
      raw_job_title: p.occupation_id ? null : textOrNull(p.raw_job_title),
      source: p.occupation_id ? 'catalog' : (p.source || 'manual'),
    }))

  return {
    work_type_preference: v.work_type_preference,
    preferred_work_location: v.preferred_work_location,
    preferred_locations_details: v.preferred_locations_details.map((l) => l.trim()).filter(Boolean).slice(0, 3),
    occupation_preferences: preferences,
  }
}

export function buildStep4Payload(v: Step4Value) {
  return {
    languages: v.languages
      .filter((l) => l.language && (l.can_read || l.can_write || l.can_speak || l.can_understand))
      .map((l) => ({
        language: l.language,
        language_other: l.language === 'others' ? textOrNull(l.language_other) : null,
        can_read: l.can_read,
        can_write: l.can_write,
        can_speak: l.can_speak,
        can_understand: l.can_understand,
      })),
  }
}

function buildEducationPayload(e: EducationEntry) {
  const base = {
    level: e.level,
    institution_name: e.institution_name.trim(),
    course_strand: textOrNull(e.course_strand),
    completion_status: e.completion_status,
    year_started: numOrNull(e.year_started),
  }

  if (e.completion_status === 'graduated') {
    return { ...base, year_graduated: numOrNull(e.year_graduated) }
  }
  if (e.completion_status === 'undergraduate') {
    return {
      ...base,
      undergrad_level_reached: textOrNull(e.undergrad_level_reached),
      undergrad_year_last_attended: numOrNull(e.undergrad_year_last_attended),
    }
  }
  return {
    ...base,
    expected_year_graduated: numOrNull(e.expected_year_graduated),
    current_level: textOrNull(e.current_level),
  }
}

function buildSkillPayload(s: SkillEntry) {
  return {
    name: s.name.trim(),
    proficiency: s.proficiency,
    source: s.source,
    is_official: s.is_official,
    is_recommended: s.is_recommended,
  }
}

export function buildStep5Payload(v: Step5Value) {
  const validHardSkills = v.hardSkills.filter((s) => s.name.trim())
  const doleSkills = validHardSkills.filter((s) => s.source === 'dole').map(buildSkillPayload)
  const technicalSkills = validHardSkills.filter((s) => s.source !== 'dole').map(buildSkillPayload)

  return {
    educations: v.educations.filter((e) => e.institution_name.trim()).map(buildEducationPayload),
    dole_skills: doleSkills,
    technical_skills: technicalSkills,
    soft_skills: v.soft_skills.filter((s) => s.name.trim()).map(buildSkillPayload),
  }
}

export function buildStep6Payload(v: Step6Value) {
  return {
    trainings: v.trainings
      .filter((t) => t.course.trim())
      .map((t) => ({
        course: t.course.trim(),
        hours_of_training: numOrNull(t.hours_of_training),
        training_institution: textOrNull(t.training_institution),
        skills_acquired: textOrNull(t.skills_acquired),
        certificates_received: textOrNull(t.certificates_received),
      })),
    eligibilities: v.eligibilities
      .filter((e) => e.name.trim())
      .map((e) => ({
        type: e.type,
        name: e.name.trim(),
        date_taken: textOrNull(e.date_taken),
        valid_until: textOrNull(e.valid_until),
      })),
  }
}

export function buildStep7Payload(v: Step7Value) {
  return {
    work_experiences: v.work_experiences
      .filter((w) => w.company_name.trim() && w.position.trim())
      .map((w) => ({
        company_name: w.company_name.trim(),
        company_address: textOrNull(w.company_address),
        position: w.position.trim(),
        responsibilities: textOrNull(w.responsibilities),
        number_of_months: numOrNull(w.number_of_months),
        start_date: textOrNull(w.start_date),
        end_date: w.currently_employed ? null : textOrNull(w.end_date),
        currently_employed: w.currently_employed,
        employment_status: w.employment_status || null,
      })),
  }
}

export function buildAddressString(step1: Step1Value) {
  return [step1.address_house_street, step1.address_barangay, step1.address_municipality_city, step1.address_province]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
}

export function buildStepPayload(step: number, form: OnboardingFormValue) {
  switch (step) {
    case 1: return buildStep1Payload(form.step1)
    case 2: return buildStep2Payload(form.step2)
    case 3: return buildStep3Payload(form.step3)
    case 4: return buildStep4Payload(form.step4)
    case 5: return buildStep5Payload(form.step5)
    case 6: return buildStep6Payload(form.step6)
    case 7: return buildStep7Payload(form.step7)
    default: return {}
  }
}

// ── Quick client-side "required field" checks (server is source of truth for the rest) ──

export function validateStep(step: number, form: OnboardingFormValue): string {
  if (step === 1) {
    const v = form.step1
    if (!v.first_name.trim() || !v.last_name.trim() || !v.date_of_birth.trim() || !v.height_ft.trim()
      || !v.address_province.trim() || !v.address_municipality_city.trim() || !v.address_barangay.trim() || !v.address_house_street.trim()) {
      return 'Please complete the required personal information and address fields.'
    }
    if (!v.sex) return 'Select your sex.'
    if (!v.civil_status) return 'Select your civil status.'
    if (!v.religion) return 'Select your religion.'
    if (!v.disabilities.length) return 'Select a disability disclosure option.'
    if (v.religion === 'other' && !v.religion_other.trim()) return 'Please specify your religion.'
    if (v.disabilities.includes('others') && !v.disability_specification.trim()) return 'Please specify your disability.'
    return ''
  }
  if (step === 2) {
    const v = form.step2
    if (!v.employment_status) return 'Select your current employment status.'
    if (v.employment_status === 'employed' && !v.employment_type) return 'Select your employment type.'
    if (v.employment_status === 'unemployed' && !v.unemployment_reason) return 'Select a reason for unemployment.'
    if (v.is_ofw && !v.ofw_country.trim()) return 'Specify the country where you work as an OFW.'
    if (v.is_4ps_beneficiary && !/^\d{2}-\d{2}-\d{2}-\d{3}-\d{5}$/.test(v.household_id_4ps.trim())) {
      return 'Enter a valid 4Ps Household ID (00-00-00-000-00000).'
    }
    return ''
  }
  if (step === 3) {
    const v = form.step3
    if (!v.occupation_preferences.some((p) => p.raw_job_title.trim() || p.occupation_id || p.general_term)) return 'Add at least one preferred occupation.'
    if (!v.work_type_preference) return 'Select your preferred type of work.'
    if (!v.preferred_work_location) return 'Select your preferred work location.'
    if (!v.preferred_locations_details.some((l) => l.trim())) return 'Add at least one preferred location.'
    return ''
  }
  if (step === 4) {
    const v = form.step4
    if (!v.languages.some((l) => l.language)) return 'Add at least one language.'
    return ''
  }
  if (step === 5) {
    const v = form.step5
    const validEducations = v.educations.filter((e) => e.institution_name.trim())
    if (!validEducations.length) return 'Add at least one education record.'
    const seenEducationKeys = new Set<string>()
    for (const e of validEducations) {
      if (!e.level) return 'Select an education level.'
      if (!e.completion_status) return 'Select a completion status.'
      if (!e.year_started.trim()) return 'Year started is required.'
      if (['tertiary', 'senior_high_strand', 'vocational', 'graduate_studies'].includes(e.level) && !e.course_strand.trim()) {
        return 'Course, strand, or program is required for this education level.'
      }
      if (e.completion_status === 'graduated' && !e.year_graduated.trim()) return 'Year graduated is required.'
      if (e.completion_status === 'undergraduate' && (!e.undergrad_level_reached.trim() || !e.undergrad_year_last_attended.trim())) {
        return 'Level reached and year last attended are required for undergraduate entries.'
      }
      const key = educationDuplicateKey(e)
      if (seenEducationKeys.has(key)) return 'You have duplicate education records — remove or edit the repeated entry.'
      seenEducationKeys.add(key)
    }
    // Mirrors web's SeekerOnboarding.jsx: allSkillsCount = hard (dole + technical) + soft,
    // must be > 0 — "Select at least one skill to continue."
    const hardSkillsCount = v.hardSkills.filter((s) => s.name.trim()).length
    const softSkillsCount = v.soft_skills.filter((s) => s.name.trim()).length
    if (hardSkillsCount + softSkillsCount === 0) return 'Select at least one skill to continue.'
    return ''
  }
  return ''
}

// ── Prefill mapper (server profile -> local editable form) ────────────────

export function mapProfileToForm(profile: SeekerProfile): OnboardingFormValue {
  const disabilityList = Array.isArray(profile.disabilities) && profile.disabilities.length
    ? profile.disabilities.map((d) => String(d.disability_type))
    : []

  const step1: OnboardingFormValue['step1'] = {
    ...emptyOnboardingForm.step1,
    first_name: profile.first_name ?? '',
    middle_name: profile.middle_name ?? '',
    last_name: profile.last_name ?? '',
    suffix: profile.suffix ?? '',
    date_of_birth: profile.date_of_birth ?? '',
    sex: profile.sex ?? '',
    civil_status: profile.civil_status ?? '',
    religion: profile.religion ?? '',
    height_ft: profile.height_ft != null ? String(profile.height_ft) : '',
    tin: profile.tin ?? '',
    address_province: profile.address_province ?? '',
    address_municipality_city: profile.address_municipality_city ?? '',
    address_barangay: profile.address_barangay ?? '',
    address_house_street: profile.address_house_street ?? '',
    disabilities: disabilityList,
    disability_specification: (profile.disabilities ?? []).find((d) => d.disability_type === 'others')?.disability_specification ?? '',
  }

  const step2: OnboardingFormValue['step2'] = {
    ...emptyOnboardingForm.step2,
    employment_status: profile.employment_status ?? '',
    employment_type: profile.employment_type ?? '',
    self_employed_type: profile.self_employed_type ?? '',
    self_employed_type_others: profile.self_employed_type_others ?? '',
    unemployment_months: profile.unemployment_months != null ? String(profile.unemployment_months) : '',
    unemployment_reason: profile.unemployment_reason ?? '',
    unemployment_reason_others: profile.unemployment_reason_others ?? '',
    unemployment_terminated_country: profile.unemployment_terminated_country ?? '',
    is_ofw: Boolean(profile.is_ofw),
    ofw_country: profile.ofw_country ?? '',
    is_former_ofw: Boolean(profile.is_former_ofw),
    former_ofw_country: profile.former_ofw_country ?? '',
    former_ofw_return_date: profile.former_ofw_return_date ?? '',
    is_4ps_beneficiary: Boolean(profile.is_4ps_beneficiary),
    household_id_4ps: profile.household_id_4ps ?? '',
  }

  const occupations = Array.isArray(profile.occupations) ? profile.occupations : []
  const step3: OnboardingFormValue['step3'] = {
    work_type_preference: profile.work_type_preference ?? '',
    preferred_work_location: profile.preferred_work_location ?? '',
    preferred_locations_details: Array.isArray(profile.preferred_locations_details) && profile.preferred_locations_details.length
      ? profile.preferred_locations_details
      : emptyOnboardingForm.step3.preferred_locations_details,
    occupation_preferences: occupations.length
      ? occupations.map((o): OccupationPrefEntry => ({
          raw_job_title: String(o.raw_job_title ?? o.occupation_title ?? ''),
          occupation_id: (o.occupation_id as number) ?? null,
          general_term: (o.general_term as string) ?? null,
          source: (o.source as string) ?? 'manual',
        }))
      : [newOccupationPref()],
  }

  const languages = Array.isArray(profile.languages) ? profile.languages : []
  const step4: OnboardingFormValue['step4'] = {
    languages: languages.length
      ? languages.map((l): LanguageEntry => ({
          language: String(l.language ?? ''),
          language_other: String(l.language_other ?? ''),
          can_read: Boolean(l.can_read),
          can_write: Boolean(l.can_write),
          can_speak: Boolean(l.can_speak),
          can_understand: Boolean(l.can_understand),
        }))
      : emptyOnboardingForm.step4.languages,
  }

  const educations = Array.isArray(profile.educations) ? profile.educations : []
  const doleSkills = (profile.dole_skills ?? []).map((name): SkillEntry => ({ name, proficiency: 'intermediate', source: 'dole', is_official: true, is_recommended: false }))
  const technicalSkills = (profile.technical_skills ?? []).map((name): SkillEntry => ({ name, proficiency: 'intermediate', source: 'user_added', is_official: false, is_recommended: false }))
  const step5: OnboardingFormValue['step5'] = {
    educations: educations.length
      ? educations.map((e): EducationEntry => ({
          level: String(e.level ?? ''),
          institution_name: String(e.institution_name ?? ''),
          course_strand: String(e.course_strand ?? ''),
          completion_status: String(e.completion_status ?? ''),
          year_started: e.year_started != null ? String(e.year_started) : '',
          year_graduated: e.year_graduated != null ? String(e.year_graduated) : '',
          undergrad_level_reached: String(e.undergrad_level_reached ?? ''),
          undergrad_year_last_attended: e.undergrad_year_last_attended != null ? String(e.undergrad_year_last_attended) : '',
          expected_year_graduated: e.expected_year_graduated != null ? String(e.expected_year_graduated) : '',
          current_level: String(e.current_level ?? ''),
        }))
      : [newEducation()],
    hardSkills: [...doleSkills, ...technicalSkills],
    soft_skills: (profile.soft_skills ?? []).map((name): SkillEntry => ({ name, proficiency: 'intermediate', source: 'user_added', is_official: false, is_recommended: false })),
  }

  const trainings = Array.isArray(profile.trainings) ? profile.trainings : []
  const eligibilities = Array.isArray(profile.eligibilities) ? profile.eligibilities : []
  const step6: OnboardingFormValue['step6'] = {
    trainings: trainings.map((t): TrainingEntry => ({
      course: String(t.course ?? ''),
      hours_of_training: t.hours_of_training != null ? String(t.hours_of_training) : '',
      training_institution: String(t.training_institution ?? ''),
      skills_acquired: String(t.skills_acquired ?? ''),
      certificates_received: String(t.certificates_received ?? ''),
    })),
    eligibilities: eligibilities.map((e): EligibilityEntry => ({
      type: String(e.type ?? 'professional_license'),
      name: String(e.name ?? ''),
      date_taken: String(e.date_taken ?? ''),
      valid_until: String(e.valid_until ?? ''),
    })),
  }

  const workExperiences = Array.isArray(profile.work_experiences) ? profile.work_experiences : []
  const step7: OnboardingFormValue['step7'] = {
    work_experiences: workExperiences.map((w): WorkExperienceEntry => ({
      company_name: String(w.company_name ?? ''),
      company_address: String(w.company_address ?? ''),
      position: String(w.position ?? ''),
      responsibilities: String(w.responsibilities ?? ''),
      number_of_months: w.number_of_months != null ? String(w.number_of_months) : '',
      start_date: String(w.start_date ?? ''),
      end_date: String(w.end_date ?? ''),
      currently_employed: Boolean(w.currently_employed),
      employment_status: String(w.employment_status ?? 'permanent'),
    })),
  }

  return { step1, step2, step3, step4, step5, step6, step7 }
}

export { newTraining, newEligibility, newWorkExperience, newEducation, newSkill, newLanguage, newOccupationPref }
