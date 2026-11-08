/**
 * Display rules for an employer's public profile, shared by the seeker panel,
 * the seeker full page and the admin profile so a company reads the same
 * everywhere. Each formatter returns null when there is nothing to show, so
 * callers decide how to present a missing value.
 */

// Shared by the panel and the full page, so "Open full company page" renders
// instantly from the panel's cached response. String() because the route
// param is a string while job cards pass a number.
export const publicEmployerQueryKey = (employerId) => ['publicEmployer', String(employerId)]

// Mirrors COMPANY_SIZE_OPTIONS in pages/employer/steps/Step2CompanyProfile.jsx —
// the API stores the bare code, which means nothing to a job seeker.
const COMPANY_SIZE_LABELS = {
  micro: 'Micro (1–9 employees)',
  small: 'Small (10–99 employees)',
  medium: 'Medium (100–199 employees)',
  large: 'Large (200+ employees)',
}

const humanize = (value) => String(value).replaceAll('_', ' ').replace(/\s+/g, ' ').trim()
const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1)

export function formatCompanySize(value) {
  if (!value) return null
  return COMPANY_SIZE_LABELS[value] ?? capitalize(humanize(value))
}

// `industry` is cast to an array on the Employer model, but older rows hold a plain string.
export function formatIndustry(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || null
  return value || null
}

// Seekers recognise the brand they'd walk into (trade name); the registered
// business name is secondary and only worth showing when it differs.
export function employerDisplayName(employer) {
  return employer?.trade_name || employer?.company_name || 'This employer'
}

export function employerRegisteredName(employer) {
  const { trade_name: trade, company_name: legal } = employer ?? {}
  return trade && legal && trade !== legal ? legal : null
}

export function formatEmploymentType(value) {
  if (!value) return null
  return capitalize(humanize(value).toLowerCase())
}

export function formatSalary(job) {
  if (!job || job.hide_salary) return null
  const min = Number(job.salary_min) || null
  const max = Number(job.salary_max) || null
  if (!min && !max) return null
  const peso = (amount) => `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
  if (min && max && min !== max) return `${peso(min)}–${peso(max)} a month`
  return `${peso(min || max)} a month`
}

export function formatPostedDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days <= 0) return 'Posted today'
  if (days === 1) return 'Posted yesterday'
  if (days < 7) return `Posted ${days} days ago`
  return `Posted ${date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export function formatMemberSince(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
}
