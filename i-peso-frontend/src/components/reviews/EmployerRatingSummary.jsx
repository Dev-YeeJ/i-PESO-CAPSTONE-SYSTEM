import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, Star } from 'lucide-react'
import { reviewService } from '@/services/reviewService'

/**
 * Compact company rating for side panels (e.g. the Smart Job Map job details):
 * the one overall average, how many verified people it's based on, and % who
 * recommend. Below 3 reviewers it says so instead.
 */
export default function EmployerRatingSummary({ employerId, onSeeAll }) {
  const { data, isLoading, isError } = useQuery({
    // Same key CompanyReviews uses for its first page, so the two share the cache.
    queryKey: ['seeker', 'employer-reviews', employerId, 1],
    queryFn: () => reviewService.forEmployer(employerId, { page: 1 }),
    enabled: !!employerId,
    staleTime: 5 * 60 * 1000,
  })

  if (!employerId || isError) return null

  const section = data?.summary?.overall

  return (
    <section aria-labelledby={`company-ratings-${employerId}`} className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id={`company-ratings-${employerId}`} className="text-sm font-black text-slate-900">Company rating</h3>
        {onSeeAll && (
          <button type="button" onClick={onSeeAll} className="text-xs font-bold text-blue-700 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
            See all reviews
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2" aria-hidden="true">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        </div>
      ) : (
        <p className="mt-3 text-sm">
          {section?.enough ? (
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <strong className="text-slate-900">{section.average?.toFixed(1)}</strong>
              <span className="text-xs text-slate-500">({section.reviewers}) · {section.recommend_percent}% recommend</span>
              <span className="sr-only"> from verified reviewers</span>
            </span>
          ) : (
            <span className="text-xs text-slate-500">
              Not enough verified reviews yet{section?.reviewers ? ` (${section.reviewers} so far)` : ''}
            </span>
          )}
        </p>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
        From people who applied here through i-PESO.
      </p>
    </section>
  )
}
