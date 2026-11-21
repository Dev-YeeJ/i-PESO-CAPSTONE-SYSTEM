// i-peso-frontend/src/services/publicLandingService.js
// Read-only data for the logged-out landing page (backend: PublicLandingController).
import api from './api'

export const publicLandingService = {
  /** Up to 6 open vacancies from verified employers; `meta.total` = all matches. */
  featuredJobs: async ({ q, location } = {}) => {
    const params = {}
    if (q?.trim()) params.q = q.trim()
    if (location?.trim()) params.location = location.trim()
    const { data } = await api.get('/public/featured-jobs', { params })
    return { jobs: data.data ?? [], total: data.meta?.total ?? 0 }
  },
  /** The next public job fairs (up to 3). */
  jobFairs: async () => (await api.get('/public/job-fairs')).data.data ?? [],
  /** Four headline counts for the stats strip. */
  stats: async () => (await api.get('/public/stats')).data.data,
}
