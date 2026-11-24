import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { MessageSquareReply, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button, ErrorState, LoadingSkeleton } from '@/components/ui'
import { reviewService } from '@/services/reviewService'
import { Stars } from './StarRating'
import ReputationSummaryCard from './ReputationSummaryCard'

/**
 * A company's reputation on its profile: ONE summary of every verified review
 * (shown once 3 people have reviewed), then the reviews themselves, anonymous,
 * with the employer's reply. Reviews are about the hiring process; ones written
 * earlier about working there are part of the same list.
 *
 * compact: the slide-over panel — the summary plus the latest few reviews.
 */
export default function CompanyReviews({ employerId, compact = false, onSeeAll }) {
  const [page, setPage] = useState(1)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['seeker', 'employer-reviews', employerId, page],
    queryFn: () => reviewService.forEmployer(employerId, { page }),
    enabled: !!employerId,
    placeholderData: keepPreviousData,
  })

  const section = data?.summary?.overall
  const paginator = data?.reviews
  const reviews = compact ? (paginator?.data ?? []).slice(0, 3) : (paginator?.data ?? [])

  if (isLoading) return <LoadingSkeleton variant="text" rows={4} />
  if (error) return <ErrorState description="Reviews could not be loaded." onRetry={refetch} error={error} />

  return (
    <div className="space-y-4">
      <ReputationSummaryCard section={section} minReviews={data?.summary?.min_reviews ?? 3} />

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
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          No verified reviews yet.
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

      <p className="text-xs text-slate-500">
        Only people who applied here through i-PESO can review. Names are never shown.{' '}
        <a href="/review-guidelines" target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline-offset-2 hover:underline">Review guidelines</a>
      </p>
    </div>
  )
}
