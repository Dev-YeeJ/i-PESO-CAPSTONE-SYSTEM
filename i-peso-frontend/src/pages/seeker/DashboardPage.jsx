import { useEffect, useState } from 'react'
import JobSeekerHome from './JobSeekerHome'
import { getNearbyJobs, getSeekerDashboardSummary, getSeekerAnalytics } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'
import { listJobFairs } from '@/services/jobFairService'
import { CalendarDays, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

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

  useEffect(() => {
    let active = true
    let analyticsTimer = null

    getSeekerDashboardSummary()
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

    listJobFairs().then((items) => { if (active) setJobFairs(items.slice(0, 2)) }).catch(() => {})
      .catch((profileError) => {
        if (active) setError(profileError?.response?.data?.message ?? 'Unable to load your employment dashboard.')
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

  return (<>
    {!!jobFairs.length && <section className="mx-auto mb-5 max-w-[1600px] rounded-2xl border border-blue-200 bg-blue-50 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-blue-700">PESO Job Fair Bulletin</p><h2 className="mt-1 text-lg font-black text-blue-950">Upcoming employment events</h2><p className="mt-1 text-sm text-blue-800">Informational only—no RSVP, QR pass, or digital check-in required.</p></div><Link to="/seeker/job-fairs" className="rounded-lg bg-blue-950 px-4 py-2 text-sm font-bold text-white">View details</Link></div><div className="mt-4 grid gap-3 md:grid-cols-2">{jobFairs.map((fair) => <div key={fair.job_fair_id} className="rounded-xl bg-white p-4"><p className="font-black text-slate-950">{fair.title}</p><p className="mt-2 flex items-center gap-2 text-xs text-slate-600"><CalendarDays className="h-4 w-4" />{fair.start_date} · {fair.start_time?.slice(0, 5)}</p><p className="mt-1 flex items-center gap-2 text-xs text-slate-600"><MapPin className="h-4 w-4" />{fair.venue}</p></div>)}</div></section>}
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
  </>)
}
