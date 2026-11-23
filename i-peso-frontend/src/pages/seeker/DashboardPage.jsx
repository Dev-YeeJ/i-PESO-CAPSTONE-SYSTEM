import { useEffect, useState } from 'react'
import JobSeekerHome from './JobSeekerHome'
import { getNearbyJobs, getSeekerAnalytics, getSeekerApplications, getSeekerDashboardSummary } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'
import { listJobFairs } from '@/services/jobFairService'

export default function SeekerDashboard() {
  const user = useAuthStore((state) => state.user)
  const [profile, setProfile] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [jobFeeds, setJobFeeds] = useState({ recommended: null, nearby: null, latest: null })
  const [locationState, setLocationState] = useState('unknown')
  const [jobsLoading, setJobsLoading] = useState(true)
  const [error, setError] = useState('')
  const [jobsError, setJobsError] = useState('')
  const [jobFairs, setJobFairs] = useState([])
  // null = still loading; [] = loaded, none yet (the summary card tells those apart).
  const [applications, setApplications] = useState(null)

  useEffect(() => {
    let active = true
    let analyticsTimer = null

    getSeekerDashboardSummary()
      .then((profileData) => {
        if (!active) return

        setProfile(profileData)
        setLocationState(hasSavedLocation(profileData) ? 'available' : 'missing')
      })
      .catch((profileError) => {
        if (active) {
          setError(profileError?.response?.data?.message ?? 'Unable to load your employment dashboard.')
        }
      })

    listJobFairs()
      .then((items) => {
        // The bulletin keeps past fairs as a record; the dashboard only wants what's next.
        const today = new Date().toISOString().slice(0, 10)
        const upcoming = items.filter((fair) => String(fair.end_date ?? fair.start_date ?? fair.event_date ?? '').slice(0, 10) >= today)
        if (active) setJobFairs(upcoming.slice(0, 2))
      })
      .catch(() => {
        // Job fair cards are supplementary; the vacancy feed should stay usable.
      })

    getNearbyJobs({ feedMode: 'latest', sort: 'newest', limit: 10, compact: true })
      .then((feed) => {
        if (!active) return

        const jobs = Array.isArray(feed?.jobs) ? feed.jobs : []
        setLocationState(feed?.location_available ? 'available' : 'missing')
        setJobFeeds((current) => ({
          ...current,
          nearby: {
            ...feed,
            feed_mode: 'nearby',
            radius_km: 20,
            jobs: jobs
              .filter((job) => job.distance_km !== null && Number(job.distance_km) <= 20)
              .sort((left, right) => Number(left.distance_km) - Number(right.distance_km)),
          },
          latest: feed,
        }))
      })
      .catch((jobsRequestError) => {
        if (active) setJobsError(jobsRequestError?.response?.data?.message ?? 'Unable to load job vacancies right now.')
      })
      .finally(() => {
        if (!active) return

        setJobsLoading(false)
        getNearbyJobs({ feedMode: 'recommended', sort: 'match', limit: 10 })
          .then((recommended) => {
            if (active) setJobFeeds((current) => ({ ...current, recommended }))
          })
          .catch(() => {
            // Recommendations are progressive; latest jobs remain usable.
          })
      })

    getSeekerApplications()
      .then((data) => {
        if (active) setApplications(data?.applications ?? [])
      })
      .catch(() => {
        // Supplementary: the card falls back to its empty state.
        if (active) setApplications([])
      })

    analyticsTimer = window.setTimeout(() => {
      getSeekerAnalytics()
        .then((analytics) => {
          if (active) setAnalyticsData(analytics)
        })
        .catch(() => {
          // Analytics is supplementary and must never hold up the vacancy feed.
        })
    }, 250)

    return () => {
      active = false
      window.clearTimeout(analyticsTimer)
    }
  }, [])

  return (
    <>
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
        jobFairs={jobFairs}
        applications={applications}
      />
    </>
  )
}

function hasSavedLocation(profileData) {
  return profileData?.latitude !== null
    && profileData?.latitude !== undefined
    && profileData?.longitude !== null
    && profileData?.longitude !== undefined
}
