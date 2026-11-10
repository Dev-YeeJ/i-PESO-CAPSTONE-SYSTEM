import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, MessageSquareReply, Star } from 'lucide-react'
import { employerFeedbackService } from '@/services/employerFeedbackService'
import { reviewsQueryKey } from '@/pages/employer/reviews/reviewKeys'

const SECTIONS = [
  { type: 'recruitment', label: 'Hiring process' },
  { type: 'employment', label: 'Working here' },
]

/** What job seekers see of the company's reviews, with a way into the Reviews page. */
export default function ReputationSnapshotCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: reviewsQueryKey('recruitment', 'all', 1),
    queryFn: () => employerFeedbackService.getReviews({ type: 'recruitment', page: 1 }),
    retry: false,
    staleTime: 60 * 1000,
  })

  if (isError) return null

  const waiting = (data?.counts?.recruitment?.needs_reply ?? 0) + (data?.counts?.employment?.needs_reply ?? 0)

  return (
    <section aria-labelledby="reputation-snapshot" className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.18)]">
      <div className="p-6">
        <h2 id="reputation-snapshot" className="text-base font-black text-slate-900">Your reputation</h2>
        <p className="mt-0.5 text-sm text-slate-600">From verified applicants and employees.</p>

        {isLoading ? (
          <div className="mt-4 space-y-3" aria-hidden="true">
            <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : (
          <dl className="mt-4 grid grid-cols-2 gap-3">
            {SECTIONS.map(({ type, label }) => {
              const section = data?.summary?.[type]
              return (
                <div key={type} className="rounded-2xl bg-slate-50 p-3.5">
                  <dt className="text-xs font-bold text-slate-500">{label}</dt>
                  <dd className="mt-1">
                    {section?.enough ? (
                      <>
                        <span className="flex items-center gap-1 text-2xl font-black text-slate-950">
                          {section.average?.toFixed(1)}
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                        </span>
                        <span className="text-xs text-slate-500">{section.reviewers} reviewers · {section.recommend_percent}% recommend</span>
                      </>
                    ) : (
                      <>
                        <span className="block text-sm font-bold text-slate-700">Not rated yet</span>
                        <span className="text-xs text-slate-500">{section?.reviewers ?? 0} of {data?.summary?.min_reviews ?? 3} reviews needed</span>
                      </>
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        )}
      </div>

      <Link
        to="/employer/reviews"
        className="group flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5 text-sm font-bold text-brand-navy transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
      >
        <span className="flex items-center gap-2">
          {waiting > 0 ? <><MessageSquareReply className="h-4 w-4 text-amber-600" aria-hidden /> {waiting} {waiting === 1 ? 'review is' : 'reviews are'} waiting for your reply</> : 'Open reviews'}
        </span>
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </section>
  )
}
