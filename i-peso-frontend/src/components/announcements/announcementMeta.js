// Shared look-and-feel for announcements across admin, reader and public surfaces.
import { CalendarDays, GraduationCap, Info, Megaphone, MonitorCog, Building } from 'lucide-react'

export const CATEGORY_META = {
  general: { label: 'General update', icon: Megaphone, chip: 'bg-blue-50 text-blue-800 border-blue-200' },
  job_fair: { label: 'Job fairs & events', icon: CalendarDays, chip: 'bg-violet-50 text-violet-800 border-violet-200' },
  program: { label: 'Programs & services', icon: GraduationCap, chip: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  advisory: { label: 'Office advisory', icon: Building, chip: 'bg-amber-50 text-amber-800 border-amber-200' },
  system: { label: 'System notice', icon: MonitorCog, chip: 'bg-slate-100 text-slate-700 border-slate-200' },
}

export const categoryMeta = (category) => CATEGORY_META[category] ?? { label: 'Announcement', icon: Info, chip: 'bg-slate-100 text-slate-700 border-slate-200' }

export const PRIORITY_META = {
  normal: { label: 'Normal', pill: 'bg-slate-100 text-slate-600 border-slate-200' },
  important: {
    label: 'Important',
    pill: 'bg-amber-100 text-amber-800 border-amber-300',
    banner: 'border-amber-300 bg-amber-50',
    bannerAccent: 'bg-amber-500',
    bannerText: 'text-amber-900',
  },
  urgent: {
    label: 'Urgent',
    pill: 'bg-red-100 text-red-700 border-red-300',
    banner: 'border-red-300 bg-red-50',
    bannerAccent: 'bg-red-600',
    bannerText: 'text-red-900',
  },
}

export const priorityMeta = (priority) => PRIORITY_META[priority] ?? PRIORITY_META.normal

/** Admin state → Badge status variant. */
export const STATE_BADGE = {
  live: 'active',
  scheduled: 'review',
  draft: 'draft',
  expired: 'closed',
  archived: 'closed',
}

export const AUDIENCE_SHORT = {
  public: 'Public',
  all: 'All users',
  seekers: 'Job seekers',
  employers: 'Employers',
}

export const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

export const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-PH', { dateStyle: 'medium' })
}

/** True for an i-PESO path ("/seeker/job-fairs"), false for an external https:// link. */
export const isInternalLink = (url) => typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')
