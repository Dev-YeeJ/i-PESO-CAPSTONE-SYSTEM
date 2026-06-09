import { createElement, useEffect, useMemo, useState } from 'react'
import { ArrowRight, BriefcaseBusiness, Building2, CircleCheck, Clock3, FilePenLine, Plus, ShieldCheck } from 'lucide-react'
import PendingVerificationBanner from './components/PendingVerificationBanner'
import { AlertBox, Badge, Button, Card, CardHeader } from '@/components/ui'
import * as employerService from '@/services/employerService'
import { useAuthStore } from '@/stores/authStore'

export default function EmployerDashboard() {
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const [profile, setProfile] = useState(null)
  const [vacancies, setVacancies] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    employerService.getProfile()
      .then(async (result) => {
        setProfile(result)
        updateUser({
          verification_status: result.employer.verification_status,
          company_name: result.employer.company_name,
          name: result.employer.company_name,
        })
        if (result.employer.verification_status === 'verified') {
          const vacancyResult = await employerService.getVacancies({ per_page: 50 })
          setVacancies(vacancyResult.data ?? [])
        }
      })
      .catch((requestError) => setError(requestError.response?.data?.message ?? 'Unable to load the employer workspace.'))
      .finally(() => setLoading(false))
  }, [updateUser])

  const status = profile?.employer?.verification_status ?? user?.verification_status ?? 'pending'
  const company = profile?.employer?.company_name ?? user?.company_name ?? user?.name ?? 'Employer'
  const counts = useMemo(() => ({
    active: vacancies.filter((item) => item.status === 'active').length,
    draft: vacancies.filter((item) => item.status === 'draft').length,
    closed: vacancies.filter((item) => item.status === 'closed').length,
    openings: vacancies.filter((item) => item.status === 'active').reduce((sum, item) => sum + Number(item.vacancies_count ?? 0), 0),
  }), [vacancies])

  if (loading) return <div className="portal-page animate-pulse"><div className="h-44 rounded-xl bg-slate-200" /><div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-xl bg-slate-200" />)}</div></div>

  return (
    <div className="portal-page">
      <section className="portal-card-hero relative overflow-hidden rounded-xl border border-blue-900 bg-brand-navy px-6 py-7 text-white shadow-elevated sm:px-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">PESO Employer Workspace</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">{company}</h1>
              <Badge variant={status} className="border-white/10">Accreditation: {status}</Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">Manage accredited vacancies and monitor your company&apos;s hiring activity through i-PESO.</p>
          </div>
          {status === 'verified' && <Button to="/employer/post-job" icon={Plus}>Post New Vacancy</Button>}
        </div>
      </section>

      {error && <AlertBox variant="danger" title="Employer workspace unavailable">{error}</AlertBox>}
      <PendingVerificationBanner status={status} rejectionReason={profile?.employer?.rejection_reason} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={BriefcaseBusiness} label="Active Vacancies" value={counts.active} detail={`${counts.openings} total opening${counts.openings === 1 ? '' : 's'}`} tone="brand" />
        <Metric icon={FilePenLine} label="Draft Vacancies" value={counts.draft} detail="Not visible to seekers" tone="amber" />
        <Metric icon={CircleCheck} label="Closed Vacancies" value={counts.closed} detail="Completed postings" tone="slate" />
        <Metric icon={ShieldCheck} label="Account Access" value={status === 'verified' ? 'Enabled' : 'Limited'} detail="Based on PESO approval" tone="emerald" />
      </div>

      {status === 'verified' ? (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <Card>
            <CardHeader
              title="Vacancy Portfolio"
              subtitle="A compact view of your most recent job postings."
              action={<Button to="/employer/vacancies" variant="secondary" size="sm" icon={ArrowRight}>View All</Button>}
            />
            {vacancies.length ? (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[1fr_auto] bg-brand-navy px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-300 sm:grid-cols-[1.3fr_0.7fr_0.5fr_auto]">
                  <span>Position</span><span className="hidden sm:block">Location</span><span className="hidden sm:block">Openings</span><span>Status</span>
                </div>
                {vacancies.slice(0, 6).map((vacancy) => (
                  <div key={vacancy.post_id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-4 last:border-0 sm:grid-cols-[1.3fr_0.7fr_0.5fr_auto]">
                    <div><p className="font-bold text-slate-900">{vacancy.job_title}</p><p className="mt-0.5 text-xs capitalize text-slate-500">{vacancy.employment_type?.replaceAll('_', ' ')}</p></div>
                    <span className="hidden text-sm text-slate-600 sm:block">{vacancy.location}</span>
                    <span className="hidden text-sm font-bold text-slate-700 sm:block">{vacancy.vacancies_count}</span>
                    <Badge variant={vacancy.status}>{vacancy.status}</Badge>
                  </div>
                ))}
              </div>
            ) : <EmptyVacancy />}
          </Card>

          <Card>
            <CardHeader title="Hiring Workflow" subtitle="Vacancy stages across your employer account." />
            <div className="grid gap-3">
              <PipelineStage label="Draft" count={counts.draft} description="Prepare requirements and job details" color="bg-slate-400" />
              <PipelineStage label="Published" count={counts.active} description="Visible to qualified job seekers" color="bg-emerald-500" />
              <PipelineStage label="Closed" count={counts.closed} description="No longer accepting applications" color="bg-brand-700" />
            </div>
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800">Applicant tracking</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Applicant management and interview stages will appear here when those workflow modules are connected.</p>
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <span className="rounded-xl bg-amber-50 p-4 text-amber-700"><Clock3 className="h-7 w-7" /></span>
            <div className="flex-1"><h2 className="text-lg font-bold text-slate-950">Hiring tools are temporarily locked</h2><p className="mt-1 text-sm leading-6 text-slate-600">PESO must approve the employer accreditation and required documents before vacancies can be published.</p></div>
          </div>
        </Card>
      )}
    </div>
  )
}

function Metric({ icon, label, value, detail, tone }) {
  const tones = { brand: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', slate: 'bg-slate-100 text-slate-600', emerald: 'bg-emerald-50 text-emerald-700' }
  return <Card padding="sm"><div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div><span className={`h-fit rounded-xl p-2.5 ${tones[tone]}`}>{createElement(icon, { className: 'h-5 w-5' })}</span></div></Card>
}

function PipelineStage({ label, count, description, color }) {
  return <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><p className="font-bold text-slate-900">{label}</p></div><span className="text-xl font-black text-slate-950">{count}</span></div><p className="mt-2 text-xs text-slate-500">{description}</p></div>
}

function EmptyVacancy() {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center"><Building2 className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold text-slate-800">No vacancies posted</p><p className="mt-1 text-sm text-slate-500">Create your first PESO-accredited job opportunity.</p><Button to="/employer/post-job" size="sm" className="mt-4" icon={Plus}>Post a Job</Button></div>
}
