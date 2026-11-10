import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { EmployerRatingBadge, NearbyJob } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'

const NO_RATINGS: Record<string, EmployerRatingBadge> = {}

/**
 * Verified-review ratings for the employers in a feed, in one request — mirrors
 * ratingEmployerIds / employerRatings in i-peso-frontend's JobSeekerHome.jsx. Employers with
 * fewer than 3 reviewers come back without a rating. Pass every job the screen shows (a
 * stable/memoised array); the sorted id list keys the query, so re-renders don't refetch.
 */
export function useEmployerRatings(jobs: NearbyJob[]): Record<string, EmployerRatingBadge> {
  const ids = useMemo(() => [...new Set(
    jobs.map((job) => Number(job.employer?.employer_id)).filter((id) => Number.isFinite(id) && id > 0),
  )].sort((a, b) => a - b), [jobs])

  const { data } = useQuery({
    queryKey: ['seeker', 'employer-ratings', ids],
    queryFn: () => seekerService.getEmployerRatings(ids),
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  return data ?? NO_RATINGS
}
