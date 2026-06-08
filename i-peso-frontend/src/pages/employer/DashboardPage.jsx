import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PendingVerificationBanner from './components/PendingVerificationBanner'
import * as employerService from '@/services/employerService'
import { useAuthStore } from '@/stores/authStore'

export default function EmployerDashboard() {
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    employerService.getProfile()
      .then((result) => {
        setProfile(result)
        updateUser({
          verification_status: result.employer.verification_status,
          company_name: result.employer.company_name,
          name: result.employer.company_name,
        })
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.message ?? 'Unable to refresh your verification status.')
      })
  }, [updateUser])

  const status = profile?.employer?.verification_status ?? user?.verification_status ?? 'pending'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Employer Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">{profile?.employer?.company_name ?? user?.company_name}</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <PendingVerificationBanner
        status={status}
        rejectionReason={profile?.employer?.rejection_reason}
      />

      {status === 'verified' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Link to="/employer/post-job" className="rounded-2xl border border-blue-200 bg-white p-6 transition hover:border-blue-400">
            <h2 className="font-bold text-slate-900">Post a Job</h2>
            <p className="mt-1 text-sm text-slate-500">Publish a new opportunity for PESO job seekers.</p>
          </Link>
          <Link to="/employer/vacancies" className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-blue-400">
            <h2 className="font-bold text-slate-900">Manage Vacancies</h2>
            <p className="mt-1 text-sm text-slate-500">Review and manage your company job postings.</p>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-bold text-slate-900">Job posting is locked</h2>
          <p className="mt-1 text-sm text-slate-600">
            PESO must approve your employer accreditation before your company can publish vacancies.
          </p>
        </div>
      )}
    </div>
  )
}
