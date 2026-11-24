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
  pending: 'The employer hasn’t opened your application yet. No action needed, check back in a few days.',
  reviewed: 'The employer has viewed your application. If you’re shortlisted, you’ll be invited to an interview.',
  shortlisted: 'You’re on the shortlist. Watch for an interview invitation and keep your phone reachable.',
  interview: 'An interview is scheduled. Bring your resume, certificates, and a valid ID, and arrive early.',
  hired: 'Congratulations, you’ve been hired! The employer will coordinate your start date with you.',
  rejected: 'This application wasn’t successful this time. Keep going, new vacancies are posted often.',
  withdrawn: 'You withdrew this application. You can apply to other vacancies anytime.',
}

// Matches InterviewSchedule::ASSUMED_DURATION_MINUTES on the backend.
const INTERVIEW_ASSUMED_DURATION_MS = 60 * 60 * 1000

// Mirrors MODE_LABELS / formatInterviewMode in i-peso-frontend/src/utils/interview.js.
const INTERVIEW_MODE_LABELS: Record<string, string> = {
  online: 'Online video call',
  phone: 'Phone call',
  face_to_face: 'Face-to-face',
}

export function formatInterviewMode(mode: string | null | undefined) {
  return (mode && INTERVIEW_MODE_LABELS[mode]) || 'Interview'
}

/**
 * Date AND time of an interview, e.g. "Nov 12, 2026, 9:00 AM" — mirrors formatInterviewTime in
 * the web's utils/interview.js. The API sends a UTC ISO string (…Z) and the backend now stores
 * the time the employer picked on the Philippine office clock correctly, so parsing it with
 * Date shows the right local time. Explicit parts rather than dateStyle/timeStyle, which
 * Hermes' Intl does not fully support.
 */
export function formatInterviewTime(value: string | null | undefined) {
  if (!value) return 'Schedule pending'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Schedule pending'
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

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

/**
 * "Call ended" for online/phone, "Interview ended" for face-to-face. Pass `now` from useNow()
 * so a screen left open flips Upcoming → Happening now → Call ended on its own.
 */
export function interviewPhaseText(interview: InterviewLike, now = Date.now()) {
  switch (interviewPhase(interview, now)) {
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

/** Badge colour per phase: green while it is happening, quiet once it has ended. */
export function interviewPhaseVariant(interview: InterviewLike, now = Date.now()): 'success' | 'info' | 'neutral' {
  const phase = interviewPhase(interview, now)
  if (phase === 'in_progress') return 'success'
  return phase === 'upcoming' ? 'info' : 'neutral'
}

/** An online interview whose link can be opened (mirrors isJoinableLink in the web's utils/interview.js). */
export function isJoinableLink(interview: { mode_of_interview?: string | null; venue_or_link?: string | null } | null | undefined) {
  return interview?.mode_of_interview === 'online' && /^https?:\/\//.test(interview?.venue_or_link || '')
}

/**
 * The interview a seeker should see first (mirrors nextInterviewOf in the web's
 * utils/interview.js): one happening right now, else the soonest upcoming. Ended and
 * cancelled interviews are left out.
 */
export function nextInterviewOf<T extends { status?: string | null; interview?: (InterviewLike & { schedule?: string | null }) | null }>(
  applications: T[] = [],
  now = Date.now(),
): T | null {
  const byStart = (a: T, b: T) => new Date(a.interview?.schedule ?? 0).getTime() - new Date(b.interview?.schedule ?? 0).getTime()
  const live = applications.filter((application) => application.status === 'interview' && application.interview?.schedule)
  const withPhase = live.map((application) => ({ application, phase: interviewPhase(application.interview, now) }))
  return withPhase.filter((item) => item.phase === 'in_progress').map((item) => item.application).sort(byStart)[0]
    ?? withPhase.filter((item) => item.phase === 'upcoming').map((item) => item.application).sort(byStart)[0]
    ?? null
}

export function applicationNextStep(status: string, interview?: InterviewLike, now = Date.now()) {
  if (status === 'interview' && interviewPhase(interview, now) === 'ended') {
    return 'Your interview is done. The employer will update this application with their decision, so keep your phone reachable.'
  }
  return APPLICATION_NEXT_STEPS[status] ?? null
}

/** "0.0 km" reads like a bug; anything under 100 m is "under 0.1 km" (mirrors the website's formatKm). */
export function formatKm(km: number | string | null | undefined): string {
  const value = Number(km)
  return value < 0.1 ? 'under 0.1 km' : `${value.toFixed(1)} km`
}

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Applied',
  reviewed: 'Applied · Reviewed',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  hired: 'Hired',
  rejected: 'Not selected',
  withdrawn: 'Withdrawn',
}

/** How the seeker's own application reads on a job (mirrors the website's job map chips). */
export function applicationStatusLabel(status: string | null | undefined): string {
  return APPLICATION_STATUS_LABELS[status ?? 'pending'] ?? 'Applied'
}

/** Not selected or withdrawn: shown quietly, not as an active application. */
export function applicationIsClosed(status: string | null | undefined): boolean {
  return status === 'rejected' || status === 'withdrawn'
}
