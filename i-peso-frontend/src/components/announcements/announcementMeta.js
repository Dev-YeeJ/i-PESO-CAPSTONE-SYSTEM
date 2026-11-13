// Shared look-and-feel for announcements across admin, reader and public surfaces.
import { CalendarDays, GraduationCap, Info, Megaphone, MonitorCog, Building } from 'lucide-react'

export const CATEGORY_META = {
  general: { label: 'General update', icon: Megaphone, chip: 'bg-slate-50 text-slate-700 border-slate-200' },
  job_fair: { label: 'Job fairs & events', icon: CalendarDays, chip: 'bg-slate-50 text-slate-700 border-slate-200' },
  program: { label: 'Programs & services', icon: GraduationCap, chip: 'bg-slate-50 text-slate-700 border-slate-200' },
  advisory: { label: 'Office advisory', icon: Building, chip: 'bg-slate-50 text-slate-700 border-slate-200' },
  system: { label: 'System notice', icon: MonitorCog, chip: 'bg-slate-100 text-slate-700 border-slate-200' },
}

export const categoryMeta = (category) => CATEGORY_META[category] ?? { label: 'Announcement', icon: Info, chip: 'bg-slate-100 text-slate-700 border-slate-200' }

export const PRIORITY_META = {
  normal: { label: 'Normal', pill: 'bg-slate-100 text-slate-600 border-slate-200' },
  important: {
    label: 'Important',
    pill: 'bg-white text-amber-700 border-amber-200',
    banner: 'border-slate-200 bg-white',
    bannerAccent: 'bg-amber-400',
    bannerText: 'text-amber-700',
  },
  urgent: {
    label: 'Urgent',
    pill: 'bg-white text-red-700 border-red-200',
    banner: 'border-slate-200 bg-white',
    bannerAccent: 'bg-red-400',
    bannerText: 'text-red-700',
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
