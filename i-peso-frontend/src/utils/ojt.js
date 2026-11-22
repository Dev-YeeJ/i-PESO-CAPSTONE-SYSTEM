// Internship dates for OJT interns (Add / Edit staff form). Dates are office dates,
// worked out in Philippine time whatever timezone the viewer's device is set to.
// OJT hours tracking (required hours, daily time in / out) was removed on 2026-11-22.

const TIMEZONE = 'Asia/Manila'

/** A start date can be at most this many days in the past. */
export const OJT_START_LOOKBACK_DAYS = 30

/** Today's date in the Philippines as YYYY-MM-DD. */
export function todayInManila(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

const toUtc = (ymd) => {
  const [y, m, d] = String(ymd).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
const toYmd = (date) => date.toISOString().slice(0, 10)

/** The earliest start date allowed for a new intern: up to 30 days back. */
export function earliestStartDate(today = todayInManila()) {
  const day = toUtc(today)
  day.setUTCDate(day.getUTCDate() - OJT_START_LOOKBACK_DAYS)
  return toYmd(day)
}
