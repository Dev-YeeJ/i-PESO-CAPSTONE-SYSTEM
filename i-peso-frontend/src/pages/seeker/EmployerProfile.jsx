import { createElement, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, MapPin, BriefcaseBusiness, Calendar, Users, Target, ShieldCheck } from 'lucide-react'
import LazyImage from '@/components/common/LazyImage'
import { Card, CardHeader, LoadingSkeleton, Badge, Button } from '@/components/ui'
import api from '@/services/api'

function formatDate(value) {
  if (!value) return 'Not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}
import toast from 'react-hot-toast'

export default function EmployerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get(`/seeker/employers/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => {
        setError('Failed to load employer profile')
        toast.error('Failed to load employer profile')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-64 w-full rounded-2xl" />
        <LoadingSkeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <Building2 className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Employer Not Found</h2>
        <p className="mt-2 text-slate-500">{error}</p>
        <Button variant="outline" className="mt-6" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    )
  }

  const { employer, vacancies } = data

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Hero Banner Section */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="h-32 bg-gradient-to-r from-brand-navy to-blue-700 sm:h-48" />
        <div className="relative px-5 pb-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative -mt-10 shrink-0 sm:-mt-12">
                <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg sm:h-32 sm:w-32">
                  {employer.company_logo_url ? (
                    <LazyImage src={employer.company_logo_url} alt={employer.company_name} className="h-full w-full object-contain p-2" />
                  ) : (
                    <Building2 className="h-10 w-10 text-slate-300 sm:h-12 sm:w-12" />
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1 pt-1 sm:pt-4">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-2xl font-black text-slate-950 sm:text-3xl">{employer.trade_name || employer.company_name}</h1>
                  {employer.verification_status === 'verified' && (
                    <Badge status="success" icon={ShieldCheck}>Verified</Badge>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-500 mt-1">{employer.industry}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <main className="space-y-6">
          <Card>
            <CardHeader title="About the Company" subtitle="Overview and details" />
            <div className="mt-4">
              <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                {employer.company_description || 'No description provided.'}
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Industry</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Target className="h-4 w-4 text-slate-400" />
                  {employer.industry}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Company Size</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Users className="h-4 w-4 text-slate-400" />
                  {employer.company_size || 'Not specified'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Location</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  {employer.full_address}
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">Active Job Vacancies</h2>
            {vacancies.length > 0 ? (
              <div className="grid gap-4">
                {vacancies.map(job => (
                  <div key={job.post_id} className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-brand-navy hover:shadow-md sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{job.job_title}</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                        <span className="flex items-center gap-1"><BriefcaseBusiness className="h-3 w-3 capitalize" />{job.employment_type?.replaceAll('_', ' ')}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Posted {formatDate(job.created_at)}</span>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => navigate(`/seeker/job-map/${job.post_id}`)}>
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center">
                <BriefcaseBusiness className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-600">No active job vacancies at the moment.</p>
              </Card>
            )}
          </div>
        </main>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Contact Info" />
            <div className="mt-4 space-y-4">
              {/* Do not show private representative info here */}
              <p className="text-sm text-slate-600">
                To apply or inquire about jobs, please click "View Details" on the respective job postings.
              </p>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    This employer has been verified by the PESO Office and is an authorized job provider.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
