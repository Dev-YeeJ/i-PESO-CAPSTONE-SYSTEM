// Shared by the announcement screens. Mirrors i-peso-frontend's
// components/announcements/announcementMeta.js (labels, order, date formats).
import type MaterialIcons from '@expo/vector-icons/MaterialIcons'

type IconName = React.ComponentProps<typeof MaterialIcons>['name']

/** Same keys as the website, so invalidation matches: ['announcements', 'feed' | 'banner' | 'unread' | 'detail', …]. */
export const ANNOUNCEMENT_KEYS = {
  all: ['announcements'] as const,
  feed: ['announcements', 'feed'] as const,
  banner: ['announcements', 'banner'] as const,
  unread: ['announcements', 'unread'] as const,
  detail: (id: number | string) => ['announcements', 'detail', String(id)] as const,
}

/** The five categories in the website's filter order. Cards use the API's category_label. */
export const ANNOUNCEMENT_CATEGORIES: { value: string; label: string; icon: IconName }[] = [
  { value: 'general', label: 'General update', icon: 'campaign' },
  { value: 'job_fair', label: 'Job fairs & events', icon: 'event' },
  { value: 'program', label: 'Programs & services', icon: 'school' },
  { value: 'advisory', label: 'Office advisory', icon: 'apartment' },
  { value: 'system', label: 'System notice', icon: 'settings-suggest' },
]

export const categoryIcon = (category: string): IconName =>
  ANNOUNCEMENT_CATEGORIES.find((item) => item.value === category)?.icon ?? 'info-outline'

/** "Nov 13, 2026, 9:00 AM" — explicit parts, since Hermes' Intl lacks full dateStyle/timeStyle support. */
export function formatAnnouncementDateTime(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
