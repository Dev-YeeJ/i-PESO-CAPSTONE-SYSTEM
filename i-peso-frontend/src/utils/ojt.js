// OJT time-record formatting. Times always display in Philippine time — the
// office's clock — whatever timezone the viewer's device is set to.

const TIMEZONE = 'Asia/Manila'

export const OJT_STATUS = {
  open: { label: 'Timed in', variant: 'review' },
  pending: { label: 'Waiting for approval', variant: 'pending' },
  approved: { label: 'Approved', variant: 'approved' },
  rejected: { label: 'Rejected', variant: 'rejected' },
  incomplete: { label: 'No time out', variant: 'warning' },
}

export const ojtStatus = (status) => OJT_STATUS[status] ?? { label: status, variant: 'neutral' }

export function formatClock(iso) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString('en-PH', { timeZone: TIMEZONE, hour: 'numeric', minute: '2-digit' })
}

/** "HH:MM" (24-hour, Philippine time) for <input type="time">. */
export function toTimeInput(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const get = (type) => parts.find((part) => part.type === type)?.value ?? '00'
  return `${get('hour')}:${get('minute')}`
}

export function formatWorkDate(ymd, options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!ymd) return null
  const date = new Date(`${ymd}T00:00:00+08:00`)
  if (Number.isNaN(date.getTime())) return ymd
  return date.toLocaleDateString('en-PH', { timeZone: TIMEZONE, ...options })
}

export function formatHours(value) {
  if (value === null || value === undefined) return '—'
  const number = Number(value)
  const rounded = Math.round(number * 100) / 100
  return `${rounded.toLocaleString('en-PH', { maximumFractionDigits: 2 })} ${rounded === 1 ? 'hr' : 'hrs'}`
}

/** Today's date in the Philippines as YYYY-MM-DD. */
export function todayInManila(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  return parts
}

export function daysLeftLabel(progress) {
  if (progress?.ended) return 'Internship ended'
  const days = progress?.days_left
  if (days === null || days === undefined) return 'No end date'
  if (days < 0) return 'Past the end date'
  if (days === 0) return 'Last day today'
  return `${days} ${days === 1 ? 'day' : 'days'} left`
}

// ── Planning an internship (Add / Edit staff form) ───────────────────────────

/** Common school OJT requirements; "Other" covers anything else. */
export const OJT_HOUR_PRESETS = [240, 300, 360, 400, 486, 500, 600]

/** The office's standard day, used to estimate the end date. */
export const OJT_HOURS_PER_DAY = 8

/** A start date can be at most this many days in the past. */
export const OJT_START_LOOKBACK_DAYS = 30

const toUtc = (ymd) => {
  const [y, m, d] = String(ymd).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
const toYmd = (date) => date.toISOString().slice(0, 10)
const isWorkingDay = (date) => date.getUTCDay() !== 0 && date.getUTCDay() !== 6 // Monday–Friday

export function workingDaysNeeded(hours) {
  const value = Number(hours)
  return value > 0 ? Math.ceil(value / OJT_HOURS_PER_DAY) : 0
}

/**
 * The date of the last working day needed to finish the hours, counting the
 * start date if it's a weekday (8 hours a day, Monday to Friday).
 */
export function endDateFor(startYmd, hours) {
  const needed = workingDaysNeeded(hours)
  if (!startYmd || !needed) return ''
  const day = toUtc(startYmd)
  let counted = 0
  while (true) {
    if (isWorkingDay(day)) counted += 1
    if (counted === needed) return toYmd(day)
    day.setUTCDate(day.getUTCDate() + 1)
  }
}

/** Working days (Monday–Friday) from start to end, both included. */
export function workingDaysBetween(startYmd, endYmd) {
  if (!startYmd || !endYmd || endYmd < startYmd) return 0
  const day = toUtc(startYmd)
  const end = toUtc(endYmd)
  let count = 0
  while (day <= end) {
    if (isWorkingDay(day)) count += 1
    day.setUTCDate(day.getUTCDate() + 1)
  }
  return count
}

export function earliestStartDate(today = todayInManila()) {
  const day = toUtc(today)
  day.setUTCDate(day.getUTCDate() - OJT_START_LOOKBACK_DAYS)
  return toYmd(day)
}
