// Interview display helpers shared by the seeker and employer views.
// The backend sends `phase` and `ends_at`; we re-check `ends_at` against the
// clock so a page left open past the interview flips to "ended" on its own.

const ASSUMED_DURATION_MS = 60 * 60 * 1000 // matches InterviewSchedule::ASSUMED_DURATION_MINUTES

const MODE_LABELS = {
  online: 'Online video call',
  phone: 'Phone call',
  face_to_face: 'Face-to-face',
}

export const formatInterviewMode = (mode) => MODE_LABELS[mode] || 'Interview'

/** upcoming | in_progress | ended | cancelled */
export function interviewPhase(interview, now = Date.now()) {
  if (!interview) return null
  const serverPhase = interview.phase
  if (serverPhase === 'ended' || serverPhase === 'cancelled') return serverPhase
  if (!serverPhase && interview.status === 'cancelled') return 'cancelled'
  if (!serverPhase && interview.status === 'completed') return 'ended'
  if (!interview.schedule) return 'upcoming'

  const start = new Date(interview.schedule).getTime()
  const end = interview.ends_at ? new Date(interview.ends_at).getTime() : start + ASSUMED_DURATION_MS
  if (now >= end) return 'ended'
  return now >= start ? 'in_progress' : 'upcoming'
}

/** "Call ended" for online/phone, "Interview ended" for face-to-face. */
export const endedLabel = (interview) =>
  interview?.mode_of_interview === 'face_to_face' ? 'Interview ended' : 'Call ended'

/** Short status label + badge tone for each phase. */
export function interviewPhaseLabel(interview, now) {
  const phase = interviewPhase(interview, now)
  switch (phase) {
    case 'ended':
      return { phase, label: endedLabel(interview), tone: 'border-slate-300 bg-slate-100 text-slate-700' }
    case 'in_progress':
      return { phase, label: 'Happening now', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' }
    case 'cancelled':
      return { phase, label: 'Interview cancelled', tone: 'border-red-200 bg-red-50 text-red-700' }
    case 'upcoming':
      return { phase, label: 'Upcoming', tone: 'border-indigo-200 bg-indigo-50 text-indigo-700' }
    default:
      return null
  }
}

/**
 * A calendar event's phase, re-checked against the clock: the API's phase is only
 * right when the page loaded. Events carry start/end instead of schedule/ends_at.
 */
export const calendarEventPhase = (event, now) =>
  interviewPhase({ schedule: event.start, ends_at: event.end, phase: event.phase, mode_of_interview: event.mode_of_interview }, now)

/**
 * Where a calendar block ends: its real end, except that an interview running
 * past midnight stops at midnight so it is drawn on the day it starts only
 * (an 11:31 p.m. call is a Monday interview, not a sliver at the top of
 * Tuesday). The block's label still shows the real times.
 */
export function calendarDisplayEnd(start, end) {
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : null
  if (!endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return end
  if (endDate.toDateString() === startDate.toDateString()) return end
  const midnight = new Date(startDate)
  midnight.setHours(24, 0, 0, 0)
  return midnight.toISOString()
}

/**
 * The hours the Week and Day grids show: office hours (7 a.m. to 8 p.m.),
 * stretched to cover every loaded interview so none falls outside the grid,
 * e.g. one set for 11:30 p.m. runs the grid to midnight, while the morning
 * still starts at 7 a.m. Expects display ends (see calendarDisplayEnd).
 */
export function calendarVisibleHours(events, { from = 7, to = 20 } = {}) {
  let min = from
  let max = to
  for (const event of events) {
    const start = new Date(event.start)
    const end = event.end ? new Date(event.end) : new Date(start.getTime() + 60 * 60_000)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue
    min = Math.min(min, start.getHours())
    const endHour = end.toDateString() !== start.toDateString() ? 24 : end.getHours() + (end.getMinutes() ? 1 : 0)
    max = Math.max(max, endHour)
  }
  return { min, max }
}

/**
 * The interview a seeker should see first: one happening right now, else the
 * soonest upcoming. Ended and cancelled interviews are left out.
 */
export function nextInterviewOf(applications = [], now = Date.now()) {
  const live = (application) => application.status === 'interview' && application.interview?.schedule
  const byStart = (a, b) => new Date(a.interview.schedule) - new Date(b.interview.schedule)
  const withPhase = applications.filter(live).map((application) => ({ application, phase: interviewPhase(application.interview, now) }))
  return withPhase.filter((item) => item.phase === 'in_progress').map((item) => item.application).sort(byStart)[0]
    ?? withPhase.filter((item) => item.phase === 'upcoming').map((item) => item.application).sort(byStart)[0]
    ?? null
}

export const isJoinableLink = (interview) =>
  interview?.mode_of_interview === 'online' && /^https?:\/\//.test(interview?.venue_or_link || '')

export const formatInterviewTime = (value) =>
  value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Schedule pending'
