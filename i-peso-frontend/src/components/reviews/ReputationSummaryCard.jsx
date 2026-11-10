import { Stars } from './StarRating'

/**
 * The reputation summary for one review type: average, how many verified
 * people it's based on, a bar per aspect, strengths and areas to improve.
 * Below the minimum number of reviewers it says there aren't enough yet.
 */
export default function ReputationSummaryCard({ section, type, minReviews = 3 }) {
  const tab = { type, who: type === 'employment' ? 'employees' : 'applicants' }
  if (!section) return null

  if (!section.enough) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-800">Not enough verified reviews yet</p>
        <p className="mt-1 text-sm text-slate-600">
          A summary appears once {minReviews} verified {tab.who} have reviewed this company
          {section.reviewers > 0 ? ` (${section.reviewers} so far)` : ''}.
        </p>
      </div>
    )
  }

  const aspects = Object.entries(section.aspects ?? {})
  const label = (key) => section.aspects?.[key]?.label ?? key

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className="text-3xl font-black text-slate-950">{section.average?.toFixed(1)}</p>
          <Stars value={section.average} size="lg" />
        </div>
        <div className="text-sm text-slate-600">
          <p>Based on <strong className="text-slate-900">{section.reviewers}</strong> verified {tab.who}</p>
          <p><strong className="text-slate-900">{section.recommend_percent}%</strong> would recommend {tab.type === 'employment' ? 'working here' : 'applying here'}</p>
        </div>
      </div>

      <dl className="mt-4 space-y-2">
        {aspects.map(([key, aspect]) => (
          <div key={key} className="grid grid-cols-[minmax(0,10rem)_1fr_2.5rem] items-center gap-3 text-sm">
            <dt className="truncate text-slate-700">{aspect.label}</dt>
            <dd className="h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden>
              <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(aspect.average / 5) * 100}%` }} />
            </dd>
            <dd className="text-right font-bold tabular-nums text-slate-800">{aspect.average.toFixed(1)}</dd>
          </div>
        ))}
      </dl>

      {(section.strengths?.length > 0 || section.to_improve?.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {section.strengths?.map((key) => (
            <span key={key} className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">Strong: {label(key)}</span>
          ))}
          {section.to_improve?.map((key) => (
            <span key={key} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900">Could improve: {label(key)}</span>
          ))}
        </div>
      )}
    </div>
  )
}
