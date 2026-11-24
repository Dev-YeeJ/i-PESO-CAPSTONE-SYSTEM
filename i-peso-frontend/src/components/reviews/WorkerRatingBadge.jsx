import { Star } from 'lucide-react'

/**
 * On an applicant's profile: the average of all employers' feedback about this
 * person and how many employers gave it. Comments and company names are never
 * shown here.
 */
export default function WorkerRatingBadge({ rating, className = '' }) {
  if (!rating) return null

  const { average, employers } = rating
  const label = `Employer feedback: rated ${average.toFixed(1)} out of 5 by ${employers} ${employers === 1 ? 'employer' : 'employers'}`

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ${className}`}
      aria-label={label}
      title="From employers who hired this person through i-PESO. Comments stay private."
    >
      <span className="text-slate-500">Employer feedback:</span>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
      <strong className="text-slate-900">{average.toFixed(1)}</strong>
      <span>from {employers} {employers === 1 ? 'employer' : 'employers'}</span>
    </span>
  )
}
