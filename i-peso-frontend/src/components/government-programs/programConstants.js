export const PROGRAM_CATEGORIES = [
  { value: 'job_fair', label: 'Job Fair' },
  { value: 'spes', label: 'SPES' },
  { value: 'tupad', label: 'TUPAD' },
  { value: 'gip', label: 'GIP (Gov Internship)' },
  { value: 'ofw_assistance', label: 'OFW Assistance (DOLE-AKAP)' },
  { value: 'livelihood_program', label: 'Livelihood Program' },
  { value: 'tech_voc_training', label: 'Tech-Voc Training' },
  { value: 'career_guidance', label: 'Career Guidance / Counseling' },
  { value: 'citizen_charter', label: 'PESO Citizen Charter' },
  { value: 'other', label: 'Other PESO Programs' },
]

export const PROGRAM_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

export const APPLICATION_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'for_interview', label: 'For Interview / Assessment' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const categoryLabel = (value) => PROGRAM_CATEGORIES.find((item) => item.value === value)?.label ?? value?.replaceAll('_', ' ') ?? 'Program'
export const statusLabel = (value) => [...PROGRAM_STATUSES, ...APPLICATION_STATUSES].find((item) => item.value === value)?.label ?? value?.replaceAll('_', ' ') ?? 'Unknown'

export const categoryTone = {
  job_fair: 'border-blue-200 bg-blue-50 text-blue-700',
  spes: 'border-amber-200 bg-amber-50 text-amber-700',
  tupad: 'border-teal-200 bg-teal-50 text-teal-700',
  gip: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  ofw_assistance: 'border-sky-200 bg-sky-50 text-sky-700',
  livelihood_program: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  tech_voc_training: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  career_guidance: 'border-violet-200 bg-violet-50 text-violet-700',
  citizen_charter: 'border-slate-200 bg-slate-100 text-slate-700',
  other: 'border-rose-200 bg-rose-50 text-rose-700',
}

export const statusTone = {
  open: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  completed: 'border-blue-200 bg-blue-50 text-blue-700',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  under_review: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  qualified: 'border-violet-200 bg-violet-50 text-violet-700',
  for_interview: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  closed: 'border-slate-200 bg-slate-100 text-slate-600',
  draft: 'border-slate-200 bg-slate-100 text-slate-600',
  archived: 'border-slate-200 bg-slate-100 text-slate-500',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
}
