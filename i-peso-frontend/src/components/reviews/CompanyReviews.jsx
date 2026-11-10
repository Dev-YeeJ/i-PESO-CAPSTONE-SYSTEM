import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Flag, MessageSquareReply, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button, ErrorState, LoadingSkeleton } from '@/components/ui'
import { reviewService } from '@/services/reviewService'
import { Stars } from './StarRating'
import ReportReviewDialog from './ReportReviewDialog'

const TABS = [
  { type: 'recruitment', label: 'Hiring process', who: 'applicants', reviewer: 'Verified applicant' },
  { type: 'employment', label: 'Working here', who: 'employees', reviewer: 'Verified employee' },
]

/**
 * A company's reputation on its profile: hiring and working there shown
 * separately, a summary only once 3 people have reviewed, then the reviews
 * themselves (anonymous) with the employer's reply.
 *
 * compact: the slide-over panel — the summary plus the latest few reviews.
 */
export default function CompanyReviews({ employerId, compact = false, onSeeAll }) {
  const [type, setType] = useState('recruitment')
  const [page, setPage] = useState(1)
  const [reporting, setReporting] = useState(null)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['seeker', 'employer-reviews', employerId, type, page],
    queryFn: () => reviewService.forEmployer(employerId, { type, page }),
    enabled: !!employerId,
    placeholderData: keepPreviousData,
  })

  const tab = TABS.find((item) => item.type === type)
  const section = data?.summary?.[type]
  const paginator = data?.reviews
  const reviews = compact ? (paginator?.data ?? []).slice(0, 3) : (paginator?.data ?? [])

  const switchTab = (next) => { setType(next); setPage(1) }

  return (
    <div>
      <div role="tablist" aria-label="Review type" className="inline-flex rounded-xl bg-slate-100 p-1">
        {TABS.map((item) => (
          <button
            key={item.type}
            type="button"
            role="tab"
            aria-selected={type === item.type}
            onClick={() => switchTab(item.type)}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${type === item.type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {item.label}
            {data?.summary?.[item.type] && <span className="ml-1 text-slate-400">({data.summary[item.type].reviewers})</span>}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-4"><LoadingSkeleton variant="text" rows={4} /></div>
      ) : error ? (
        <div className="mt-4"><ErrorState description="Reviews could not be loaded." onRetry={refetch} error={error} /></div>
      ) : (
        <div className="mt-4 space-y-4" role="tabpanel">
          <Summary section={section} tab={tab} minReviews={data?.summary?.min_reviews ?? 3} />

          {reviews.length > 0 ? (
            <ul className="space-y-3">
              {reviews.map((review) => (
                <li key={review.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {review.reviewer}
                    </span>
                    <span className="text-xs text-slate-500">{review.month}{review.edited ? ' · edited' : ''}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1.5"><Stars value={review.average} /><span className="text-sm font-bold text-slate-800">{review.average?.toFixed(1)}</span></span>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${review.recommend ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {review.recommend ? <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> : <ThumbsDown className="h-3.5 w-3.5" aria-hidden />}
                      {review.recommend ? 'Recommends' : "Doesn't recommend"}
                    </span>
                    {review.limited && <span className="text-xs text-amber-700">Employer didn't respond to their application</span>}
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    {review.ratings.map((rating) => <li key={rating.key}>{rating.label}: <strong className="text-slate-800">{rating.value}</strong>/5</li>)}
                  </ul>
                  {review.comment && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{review.comment}</p>}
                  {review.reply && (
                    <div className="mt-3 rounded-lg border-l-4 border-blue-200 bg-blue-50/60 px-3 py-2">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-blue-900"><MessageSquareReply className="h-3.5 w-3.5" aria-hidden /> Employer's reply{review.reply.edited ? ' · edited' : ''}</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{review.reply.body}</p>
                    </div>
                  )}
                  <div className="mt-2 text-right">
                    <button type="button" onClick={() => setReporting(review)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">
                      <Flag className="h-3 w-3" aria-hidden /> Report
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
              No reviews from verified {tab.who} yet.
            </p>
          )}

          {compact ? (
            (paginator?.total ?? 0) > reviews.length && onSeeAll && (
              <Button variant="outline" size="sm" onClick={onSeeAll}>See all {paginator.total} reviews</Button>
            )
          ) : paginator?.last_page > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Page {paginator.current_page} of {paginator.last_page}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={isFetching || page <= 1} onClick={() => setPage((current) => current - 1)}>Newer</Button>
                <Button size="sm" variant="outline" disabled={isFetching || page >= paginator.last_page} onClick={() => setPage((current) => current + 1)}>Older</Button>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500">Only people who applied or worked here through i-PESO can review. Names are never shown.</p>
        </div>
      )}

      {reporting && <ReportReviewDialog review={reporting} onClose={() => setReporting(null)} />}
    </div>
  )
}

function Summary({ section, tab, minReviews }) {
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
