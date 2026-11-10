import type { NearbyJob, SeekerProfile } from '@/services/seekerService'

export function arrayFrom<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

export function textFrom(value: unknown, fallback = 'Not set') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text || fallback
}

export function titleCase(value: unknown, fallback = 'Not set') {
  return textFrom(value, fallback)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function applicationStatusVariant(status: string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'hired') return 'success'
  if (status === 'rejected' || status === 'withdrawn') return 'danger'
  if (status === 'interview' || status === 'shortlisted') return 'warning'
  if (status === 'pending' || status === 'reviewed') return 'info'
  return 'neutral'
}

export function seekerName(profile?: SeekerProfile | null, fallback = 'Job Seeker') {
  const fromName = textFrom(profile?.name, '')
  if (fromName) return fromName

  const fullName = [profile?.first_name, profile?.last_name]
    .map((part) => textFrom(part, ''))
    .filter(Boolean)
    .join(' ')

  return fullName || fallback
}

export function firstName(profile?: SeekerProfile | null, fallback = 'Seeker') {
  return seekerName(profile, fallback).split(' ')[0] || fallback
}

export function addressLine(profile?: SeekerProfile | null) {
  return [
    profile?.address_barangay,
    profile?.address_municipality_city,
    profile?.address_province,
  ]
    .map((part) => textFrom(part, ''))
    .filter(Boolean)
    .join(', ') || 'Complete your address to improve nearby job matches.'
}

export function jobLocation(job: NearbyJob) {
  return [
    job.barangay,
    job.city_municipality,
    job.province,
  ]
    .map((part) => textFrom(part, ''))
    .filter(Boolean)
    .join(', ') || textFrom(job.location, 'Location not listed')
}

export function jobCompany(job: NearbyJob) {
  return textFrom(job.employer?.company_name, 'Employer not listed')
}

export function formatSalary(job: NearbyJob) {
  if (job.hide_salary) return 'Salary hidden'

  const min = Number(job.salary_min)
  const max = Number(job.salary_max)
  const salaryType = textFrom(job.salary_type, '').toLowerCase()
  const suffix = salaryType ? ` / ${salaryType}` : ''

  if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > 0) {
    return `PHP ${min.toLocaleString()} - ${max.toLocaleString()}${suffix}`
  }

  if (Number.isFinite(min) && min > 0) {
    return `PHP ${min.toLocaleString()}${suffix}`
  }

  if (Number.isFinite(max) && max > 0) {
    return `Up to PHP ${max.toLocaleString()}${suffix}`
  }

  return 'Salary not listed'
}

export function listFrom(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => textFrom(item, '')).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

export function formatDate(value: unknown) {
  const text = textFrom(value, '')
  if (!text) return 'No deadline'

  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return text

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function allSkills(profile?: SeekerProfile | null) {
  return [
    ...arrayFrom<string>(profile?.dole_skills),
    ...arrayFrom<string>(profile?.technical_skills),
    ...arrayFrom<string>(profile?.soft_skills),
  ].filter(Boolean)
}

export function recordText(record: Record<string, unknown>, keys: string[], fallback = 'Not set') {
  for (const key of keys) {
    const value = textFrom(record[key], '')
    if (value) return value
  }

  return fallback
}

type InterviewLike = {
  mode_of_interview?: string | null
  schedule?: string | null
  status?: string | null
  ends_at?: string | null
  phase?: string | null
} | null | undefined

const APPLICATION_NEXT_STEPS: Record<string, string> = {
  pending: 'The employer hasn’t opened your application yet. No action needed — check back in a few days.',
  reviewed: 'The employer has viewed your application. If you’re shortlisted, you’ll be invited to an interview.',
  shortlisted: 'You’re on the shortlist. Watch for an interview invitation and keep your phone reachable.',
  interview: 'An interview is scheduled. Bring your resume, certificates, and a valid ID, and arrive early.',
  hired: 'Congratulations — you’ve been hired! The employer will coordinate your start date with you.',
  rejected: 'This application wasn’t successful this time. Keep going — new vacancies are posted often.',
  withdrawn: 'You withdrew this application. You can apply to other vacancies anytime.',
}

// Matches InterviewSchedule::ASSUMED_DURATION_MINUTES on the backend.
const INTERVIEW_ASSUMED_DURATION_MS = 60 * 60 * 1000

/** upcoming | in_progress | ended | cancelled — re-checked against the clock. */
export function interviewPhase(interview: InterviewLike, now = Date.now()) {
  if (!interview) return null
  if (interview.phase === 'ended' || interview.phase === 'cancelled') return interview.phase
  if (!interview.phase && interview.status === 'cancelled') return 'cancelled'
  if (!interview.phase && interview.status === 'completed') return 'ended'
  if (!interview.schedule) return 'upcoming'

  const start = new Date(interview.schedule).getTime()
  const end = interview.ends_at ? new Date(interview.ends_at).getTime() : start + INTERVIEW_ASSUMED_DURATION_MS
  if (now >= end) return 'ended'
  return now >= start ? 'in_progress' : 'upcoming'
}

/** "Call ended" for online/phone, "Interview ended" for face-to-face. */
export function interviewPhaseText(interview: InterviewLike) {
  switch (interviewPhase(interview)) {
    case 'ended':
      return interview?.mode_of_interview === 'face_to_face' ? 'Interview ended' : 'Call ended'
    case 'in_progress':
      return 'Happening now'
    case 'cancelled':
      return 'Interview cancelled'
    default:
      return 'Upcoming'
  }
}

export function applicationNextStep(status: string, interview?: InterviewLike) {
  if (status === 'interview' && interviewPhase(interview) === 'ended') {
    return 'Your interview is done. The employer will update this application with their decision — keep your phone reachable.'
  }
  return APPLICATION_NEXT_STEPS[status] ?? null
}
