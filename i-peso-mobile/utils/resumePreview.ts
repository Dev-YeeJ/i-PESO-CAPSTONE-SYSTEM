// Ports of i-peso-frontend's SeekerProfile.jsx resume-formatting helpers (fullName,
// preferredOccupationLabel, educationLabel, resumeDateRange, etc.) so the mobile Resume
// Studio formats the same data the same way as the web ResumeStudioModal.
import type { SeekerProfile } from '@/services/seekerService'

export function fullName(profile?: SeekerProfile | null): string {
  return [profile?.first_name, profile?.middle_name, profile?.last_name, profile?.suffix]
    .filter(Boolean)
    .join(' ')
}

export function initials(profile?: SeekerProfile | null): string {
  return [profile?.first_name, profile?.last_name]
    .filter((part): part is string => Boolean(part))
    .map((name) => name[0])
    .join('')
    .toUpperCase()
}

/** Mirrors hasResumeSourceData() — the backend can build a resume from NSRP data alone when
 * no summary is written, so the UI should not block generation in that case either. */
export function hasResumeSourceData(profile: SeekerProfile | undefined, skills: string[]): boolean {
  return Boolean((profile?.educations?.length ?? 0) || (profile?.work_experiences?.length ?? 0) || skills.length)
}

export function preferredOccupationLabel(profile?: SeekerProfile | null): string {
  const occupation = profile?.occupations?.[0] as Record<string, unknown> | undefined
  return (
    (occupation?.title as string) ||
    (occupation?.general_term as string) ||
    (occupation?.matched_general_term as string) ||
    (occupation?.preferred_occupation as string) ||
    'Job seeker'
  )
}

function skillName(skill: unknown): string {
  if (typeof skill === 'object' && skill) {
    const record = skill as Record<string, unknown>
    return (record.skill_name as string) || (record.name as string) || (record.title as string) || 'Skill'
  }
  return String(skill)
}

/** Mirrors skillListText() — dedupes case-insensitively and caps at 18, joined for a resume line. */
export function skillListText(skills: unknown[]): string {
  return skills
    .map(skillName)
    .filter(Boolean)
    .filter((name, index, list) => list.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index)
    .slice(0, 18)
    .join(', ')
}

const EDUCATION_LABELS: Record<string, string> = {
  elementary: 'Elementary',
  secondary_non_k12: 'Secondary / Junior High School Non-K-12',
  secondary_k12: 'Secondary / Junior High School K-12',
  senior_high: 'Senior High School',
  senior_high_strand: 'Senior High School',
  tertiary: 'Tertiary / College',
  graduate: 'Graduate Studies / Post-graduate',
  graduate_studies: 'Graduate Studies / Post-graduate',
}

export function educationLabel(level: unknown): string {
  return EDUCATION_LABELS[String(level ?? '')] || 'Education level not specified'
}

export function educationStatusLabel(education: Record<string, unknown>): string {
  if (education.completion_status === 'currently_studying') return 'Currently Studying'
  if (education.completion_status === 'undergraduate') return 'Undergraduate / Did Not Finish'
  if (education.completion_status === 'graduated' || education.year_graduated) return 'Graduated'
  return 'Status not specified'
}

export function educationYearRange(education: Record<string, unknown>): string {
  const endYear =
    (education.year_graduated as string | number | undefined) ||
    (education.undergrad_year_last_attended as string | number | undefined) ||
    (education.completion_status === 'currently_studying' ? 'Present' : null)

  return [education.year_started, endYear].filter(Boolean).join(' - ')
}

export function formatMonthYear(value: unknown): string {
  if (!value) return ''
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function resumeDateRange(experience: Record<string, unknown>): string {
  if (experience.start_date) {
    return [
      formatMonthYear(experience.start_date),
      experience.currently_employed ? 'Present' : formatMonthYear(experience.end_date),
    ].filter(Boolean).join(' - ')
  }
  return experience.number_of_months ? `${experience.number_of_months} months` : 'Dates not specified'
}

/** Mirrors resumeSortValue() — most-recent-first ordering for the preview, same as the PDF. */
export function resumeSortValue(experience: Record<string, unknown>): number {
  const date = (experience.end_date ?? experience.start_date ?? experience.created_at) as string | undefined
  if (!date) return 0
  return new Date(date).getTime() || 0
}

export function languageLabel(language: Record<string, unknown>): string {
  const name = language.language === 'others' ? language.language_other : language.language
  const abilities = [
    language.can_speak ? 'speak' : null,
    language.can_read ? 'read' : null,
    language.can_write ? 'write' : null,
    language.can_understand ? 'understand' : null,
  ].filter(Boolean).join('/')

  const titled = String(name ?? '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  return [titled, abilities].filter(Boolean).join(' - ')
}
