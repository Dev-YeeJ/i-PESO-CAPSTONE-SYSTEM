import { useEffect, useState } from 'react'
import JobSeekerHome from './JobSeekerHome'
import { getSeekerProfile } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'

export default function SeekerDashboard() {
  const user = useAuthStore((state) => state.user)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getSeekerProfile()
      .then(setProfile)
      .catch((requestError) => {
        setError(requestError.response?.data?.message ?? 'Unable to load your employment dashboard.')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <DashboardSkeleton />
  }

  return <JobSeekerHome profile={profile} user={user} error={error} />
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
