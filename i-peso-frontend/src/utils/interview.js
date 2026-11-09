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

export const isJoinableLink = (interview) =>
  interview?.mode_of_interview === 'online' && /^https?:\/\//.test(interview?.venue_or_link || '')

export const formatInterviewTime = (value) =>
  value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Schedule pending'
