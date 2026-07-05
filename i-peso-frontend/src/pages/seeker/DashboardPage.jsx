import { useEffect, useState } from 'react'
import JobSeekerHome from './JobSeekerHome'
import { getNearbyJobs, getSeekerProfile, getSeekerAnalytics } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'

export default function SeekerDashboard() {
  const user = useAuthStore((state) => state.user)
  const [profile, setProfile] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [jobFeeds, setJobFeeds] = useState({ recommended: null, nearby: null, latest: null })
  const [locationState, setLocationState] = useState('unknown')
  const [loading, setLoading] = useState(true)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [error, setError] = useState('')
  const [jobsError, setJobsError] = useState('')

  useEffect(() => {
    let active = true

    getSeekerProfile()
      .then((profileData) => {
        if (!active) return
        setProfile(profileData)
        setLocationState(
          profileData?.latitude !== null && profileData?.latitude !== undefined
          && profileData?.longitude !== null && profileData?.longitude !== undefined
            ? 'available'
            : 'missing',
        )
      })
      .catch((profileError) => {
        if (active) setError(profileError?.response?.data?.message ?? 'Unable to load your employment dashboard.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    getNearbyJobs({ feedMode: 'latest', sort: 'newest', limit: 20 })
      .then((feed) => {
        if (!active) return
        const jobs = Array.isArray(feed?.jobs) ? feed.jobs : []
        setJobFeeds({
          recommended: {
            ...feed,
            feed_mode: 'recommended',
            jobs: [...jobs].sort((left, right) => Number(right.match_percentage ?? 0) - Number(left.match_percentage ?? 0)),
          },
          nearby: {
            ...feed,
            feed_mode: 'nearby',
            radius_km: 20,
            jobs: jobs
              .filter((job) => job.distance_km !== null && Number(job.distance_km) <= 20)
              .sort((left, right) => Number(left.distance_km) - Number(right.distance_km)),
          },
          latest: feed,
        })
      })
      .catch((jobsRequestError) => {
        if (active) setJobsError(jobsRequestError?.response?.data?.message ?? 'Unable to load job vacancies right now.')
      })
      .finally(() => {
        if (active) setJobsLoading(false)
      })

    getSeekerAnalytics()
      .then((analytics) => {
        if (active) setAnalyticsData(analytics)
      })
      .catch(() => {
        // Analytics is supplementary and must never hold up the vacancy feed.
      })

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <JobSeekerHome
      profile={profile}
      user={user}
      recommendedJobsData={jobFeeds.recommended}
      nearbyJobsData={jobFeeds.nearby}
      latestJobsData={jobFeeds.latest}
      locationState={locationState}
      analyticsData={analyticsData}
      error={error}
      jobsError={jobsError}
      jobsLoading={jobsLoading}
    />
  )
}

function DashboardSkeleton() {
  return (
    <div className="portal-page animate-pulse">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <div className="h-56 rounded-xl bg-slate-200" />
          <div className="h-72 rounded-xl bg-slate-200" />
          <div className="h-[28rem] rounded-xl bg-slate-200" />
        </div>
        <div className="space-y-6">
          <div className="h-72 rounded-xl bg-slate-200" />
          <div className="h-80 rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  )
}
