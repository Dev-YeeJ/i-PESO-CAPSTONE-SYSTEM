// Shared styles and helpers for the Site Content admin tabs.

export const labelClass = 'text-xs font-extrabold uppercase tracking-wide text-slate-600'
export const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10 disabled:bg-slate-50 disabled:text-slate-500'

/** Laravel 422 → { 'values.phone': 'The phone …' } (first message per field). */
export function fieldErrorsOf(error) {
  const errors = error?.response?.data?.errors
  if (!errors) return null
  return Object.fromEntries(Object.entries(errors).map(([key, messages]) => [key, Array.isArray(messages) ? messages[0] : String(messages)]))
}

export const apiMessage = (error, fallback) => error?.response?.data?.message ?? fallback

export const isConflict = (error) => error?.response?.status === 409

export function formatWhen(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** Plain-language rendering of a section value for "before → after" lists. */
export function describeValue(value) {
  if (value === null || value === undefined || value === '') return '(not on record)'
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'object' && item !== null ? item.title ?? JSON.stringify(item) : String(item))).join(' · ')
  }
  return String(value)
}

export const sameValue = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export function changedKeys(before, after, keys) {
  return keys.filter((key) => !sameValue(before?.[key], after?.[key]))
}

export const todayInput = () => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
