import { ExternalLink } from 'lucide-react'
import {
  formatInterviewMode,
  formatInterviewTime,
  interviewPhaseLabel,
  isJoinableLink,
} from '@/utils/interview'

const HEADINGS = {
  upcoming: 'Interview scheduled',
  in_progress: 'Interview happening now',
  cancelled: 'Interview cancelled',
}

/** Small status chip for applicant rows in the Interview tab. */
export function InterviewPhaseChip({ interview }) {
  const phase = interviewPhaseLabel(interview)
  if (!phase) return null
  return (
    <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${phase.tone}`}>
      {phase.phase === 'upcoming' ? formatInterviewTime(interview.schedule) : phase.label}
    </span>
  )
}

/**
 * Employer-side interview card. Once the interview time has passed it says
 * so ("Call ended"), drops the join link, and asks for the outcome so the
 * applicant isn't left waiting in the Interview stage.
 */
export default function InterviewSummary({ interview, applicationStatus }) {
  if (!interview) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">No interview scheduled yet.</div>
  }

  const { phase, label, tone } = interviewPhaseLabel(interview)
  const ended = phase === 'ended'
  const muted = ended || phase === 'cancelled'
  const canJoin = !muted && isJoinableLink(interview)

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${muted ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-blue-100 bg-blue-50 text-blue-900'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-black">{ended ? label : HEADINGS[phase]}</p>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${tone}`}>{label}</span>
      </div>
      <p className="mt-1 font-medium">
        {formatInterviewTime(interview.schedule)} · {formatInterviewMode(interview.mode_of_interview)}
      </p>

      {canJoin ? (
        <a
          href={interview.venue_or_link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          Join call <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      ) : !isJoinableLink(interview) ? (
        <p className={`mt-2 ${muted ? 'text-slate-600' : 'text-blue-800'}`}>{interview.venue_or_link || 'Venue to follow'}</p>
      ) : null}

      {ended && applicationStatus === 'interview' && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          Record the outcome: mark this applicant as hired or rejected so they aren't left waiting.
        </p>
      )}
    </div>
  )
}
