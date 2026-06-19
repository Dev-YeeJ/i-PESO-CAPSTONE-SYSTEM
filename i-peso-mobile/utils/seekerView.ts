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
