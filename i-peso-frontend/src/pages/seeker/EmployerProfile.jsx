import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BriefcaseBusiness, Flag, ShieldCheck } from 'lucide-react'
import { Button, Card, CardHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui'
import JobDetailModal from '@/components/JobDetailModal'
import ReportEmployerModal from '@/components/ReportEmployerModal'
import CompanyFacts from '@/components/employers/CompanyFacts'
import CompanyLogo from '@/components/employers/CompanyLogo'
import VacancyRow from '@/components/employers/VacancyRow'
import { getPublicEmployerProfile } from '@/services/seekerService'
import { employerDisplayName, employerRegisteredName, formatIndustry, publicEmployerQueryKey } from '@/utils/employerProfile'

/**
 * Full-page company profile (/seeker/employers/:id), reached from the
 * slide-over panel's "Open full company page". Same content and wording as
 * the panel, laid out for a wide screen: story + jobs in the main column,
 * facts and trust signals in the sidebar.
 */
export default function EmployerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [viewingJobId, setViewingJobId] = useState(null)
  const [reporting, setReporting] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: publicEmployerQueryKey(id),
    queryFn: () => getPublicEmployerProfile(id),
    staleTime: 5 * 60 * 1000,
    retry: (count, err) => err?.response?.status !== 404 && count < 2,
  })

  // A page opened directly (new tab, shared link) has no history to go back to.
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/seeker/dashboard'))
  const backButton = (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-2 rounded-lg text-sm font-bold text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back
    </button>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        {backButton}
        <div className="h-48 rounded-2xl bg-slate-200 motion-safe:animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <LoadingSkeleton variant="card" rows={3} />
          <LoadingSkeleton variant="card" rows={1} />
        </div>
      </div>
    )
  }

  if (isError || !data?.employer) {
    const notFound = error?.response?.status === 404
    return (
      <div className="space-y-6">
        {backButton}
        <Card>
          {notFound ? (
            <EmptyState
              icon={ShieldCheck}
              title="This company profile isn't available"
              description="The employer may still be under PESO review, or their profile was removed."
              action={{ label: 'Browse jobs', to: '/seeker/dashboard' }}
            />
          ) : (
            <ErrorState
              title="Couldn't load this company"
              description="Check your connection, then try again."
              onRetry={() => refetch()}
              error={error}
            />
          )}
        </Card>
      </div>
    )
  }

  const { employer, vacancies = [] } = data
  const name = employerDisplayName(employer)
  const registeredName = employerRegisteredName(employer)
  const industry = formatIndustry(employer.industry)

  return (
    <div className="space-y-6">
      {backButton}

      <header className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="h-24 bg-brand-navy sm:h-32" />
        <div className="flex flex-col gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:px-7">
          <CompanyLogo src={employer.company_logo_url} name={name} size="xl" className="-mt-12 sm:-mt-14" />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{name}</h1>
            {registeredName && <p className="mt-1 text-sm text-slate-500">Registered as {registeredName}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verified by PESO
              </span>
              {industry && <span className="text-sm font-semibold text-slate-600">{industry}</span>}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="About the company" />
            {employer.company_description ? (
              <p className="max-w-prose whitespace-pre-wrap text-sm leading-7 text-slate-700">{employer.company_description}</p>
            ) : (
              <p className="text-sm text-slate-500">This employer hasn't added a description yet.</p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Open jobs"
              subtitle={vacancies.length > 0 ? 'Select a job to see the full details and apply.' : undefined}
              action={<span className="text-sm font-semibold text-slate-500">{vacancies.length} {vacancies.length === 1 ? 'opening' : 'openings'}</span>}
            />
            {vacancies.length > 0 ? (
              <ul className="space-y-2.5">
                {vacancies.map((job) => (
                  <VacancyRow key={job.post_id} job={job} onSelect={() => setViewingJobId(job.post_id)} />
                ))}
              </ul>
            ) : (
              <EmptyState
                size="sm"
                icon={BriefcaseBusiness}
                title="No open jobs right now"
                description="New postings from this company will show up here."
                action={{ label: 'Browse other jobs', variant: 'outline', to: '/seeker/dashboard' }}
              />
            )}
          </Card>
        </main>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Company facts" />
            <CompanyFacts employer={employer} columns={1} />
          </Card>

          <Card>
            <CardHeader title="How to apply" />
            <p className="text-sm leading-6 text-slate-600">
              Open a job above and apply from its details. Your application goes straight to this employer through i-PESO.
            </p>
            <div className="mt-4 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
              <p className="text-xs leading-5 text-blue-900">
                PESO checked this employer's business documents before letting them post jobs. If anyone asks you to pay to apply, report them.
              </p>
            </div>
          </Card>

          <div className="text-center lg:text-left">
            <Button variant="ghost" size="sm" icon={Flag} onClick={() => setReporting(true)} className="text-slate-500 hover:text-red-700">
              Report this employer
            </Button>
          </div>
        </aside>
      </div>

      <JobDetailModal
        postId={viewingJobId}
        open={viewingJobId !== null}
        onClose={() => setViewingJobId(null)}
        sourceLabel={name}
      />
      <ReportEmployerModal
        open={reporting}
        employer={{ employer_id: employer.employer_id, employer_name: name }}
        onClose={() => setReporting(false)}
      />
    </div>
  )
}
