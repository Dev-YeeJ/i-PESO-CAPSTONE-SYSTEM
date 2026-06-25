import { useEffect, useState } from 'react'
import JobSeekerHome from './JobSeekerHome'
import { getNearbyJobs, getSeekerProfile, getSeekerAnalytics } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'

export default function SeekerDashboard() {
  const user = useAuthStore((state) => state.user)
  const [profile, setProfile] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [nearbyJobs, setNearbyJobs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [jobsError, setJobsError] = useState('')

  useEffect(() => {
    let active = true

    Promise.allSettled([
      getSeekerProfile(),
      getNearbyJobs({ radiusKm: 20, limit: 24 }),
      getSeekerAnalytics(),
    ]).then(([profileResult, jobsResult, analyticsResult]) => {
      if (!active) return

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value)
      } else {
        setError(profileResult.reason?.response?.data?.message ?? 'Unable to load your employment dashboard.')
      }

      if (jobsResult.status === 'fulfilled') {
        setNearbyJobs(jobsResult.value)
      } else {
        setJobsError(jobsResult.reason?.response?.data?.message ?? 'Nearby job feed is not available right now.')
      }

      if (analyticsResult.status === 'fulfilled') {
        setAnalyticsData(analyticsResult.value)
      }
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <DashboardSkeleton />
  }

  return <JobSeekerHome profile={profile} user={user} jobsData={nearbyJobs} analyticsData={analyticsData} error={error} jobsError={jobsError} />
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
