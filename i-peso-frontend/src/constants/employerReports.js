// Shared vocabulary for the Seeker-to-Employer reporting module.
// Keep in sync with the backend EmployerReport::REASONS / ::STATUSES.

export const REPORT_REASONS = [
  { value: 'fake_job', label: 'Fake or scam job posting' },
  { value: 'misleading', label: 'Misleading job details' },
  { value: 'abusive', label: 'Abusive or harassing behavior' },
  { value: 'discrimination', label: 'Discriminatory posting' },
  { value: 'illegal_fees', label: 'Asking for illegal fees / payment' },
  { value: 'other', label: 'Other' },
]

export const REPORT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
]

export const reasonLabel = (value) =>
  REPORT_REASONS.find((reason) => reason.value === value)?.label ?? value?.replaceAll('_', ' ') ?? '—'

export const statusLabel = (value) =>
  REPORT_STATUSES.find((status) => status.value === value)?.label ?? value ?? '—'

// Map a report status onto a <Badge status="…"> variant.
export const statusBadge = (value) =>
  ({ pending: 'pending', investigating: 'warning', resolved: 'verified', dismissed: 'neutral' }[value] ?? 'neutral')
