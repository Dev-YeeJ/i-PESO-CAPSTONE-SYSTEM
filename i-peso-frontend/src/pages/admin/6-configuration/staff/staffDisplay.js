// Labels and formatting shared by the Staff Management screens.

export const ACCOUNT_STATUS = {
  active: { label: 'Active', variant: 'active' },
  invited: { label: 'Invited', variant: 'pending' },
  invite_expired: { label: 'Invite expired', variant: 'warning' },
  deactivated: { label: 'Deactivated', variant: 'closed' },
}

export const accountStatus = (staff) => ACCOUNT_STATUS[staff?.account_status] ?? ACCOUNT_STATUS.active

export function formatDateTime(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function formatDate(value) {
  if (!value) return null
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}

export const initialsOf = (name = '') =>
  name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?'

/** First field error from a Laravel 422, keyed by field. */
export const fieldErrorsFrom = (error) =>
  Object.fromEntries(Object.entries(error?.response?.data?.errors ?? {}).map(([key, messages]) => [key, messages[0]]))

export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') =>
  error?.response?.data?.message ?? fallback
