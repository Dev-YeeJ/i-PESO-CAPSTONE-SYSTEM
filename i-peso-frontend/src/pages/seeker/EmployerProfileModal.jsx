import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BriefcaseBusiness, ExternalLink, Flag, ShieldCheck } from 'lucide-react'
import { Button, EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import JobDetailModal from '@/components/JobDetailModal'
import ReportEmployerModal from '@/components/ReportEmployerModal'
import CompanyFacts from '@/components/employers/CompanyFacts'
import CompanyLogo from '@/components/employers/CompanyLogo'
import VacancyRow from '@/components/employers/VacancyRow'
import CompanyReviews from '@/components/reviews/CompanyReviews'
import { getPublicEmployerProfile } from '@/services/seekerService'
import { employerDisplayName, employerRegisteredName, publicEmployerQueryKey } from '@/utils/employerProfile'

/**
 * Slide-over company profile opened from a job card. Reading order follows
 * what a seeker decides on: who the company is → can I trust it → what it
 * does → which jobs are open. Reporting is available but deliberately quiet.
 */
export default function EmployerProfileModal({ open, employerId, onClose }) {
  const [viewingJobId, setViewingJobId] = useState(null)
  const [reporting, setReporting] = useState(false)
  const navigate = useNavigate()

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: publicEmployerQueryKey(employerId),
    queryFn: () => getPublicEmployerProfile(employerId),
    enabled: Boolean(employerId) && open,
    staleTime: 5 * 60 * 1000,
    retry: (count, err) => err?.response?.status !== 404 && count < 2,
  })

  const employer = data?.employer
  const vacancies = data?.vacancies ?? []
  const name = employerDisplayName(employer)
  const registeredName = employerRegisteredName(employer)
  const notFound = error?.response?.status === 404

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        {/* Overrides DialogContent's centring + zoom so it slides in from the right (same fix as the ATS panel). */}
        <DialogContent className="fixed bottom-0 left-auto right-0 top-0 z-50 flex h-full w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-l bg-slate-50 p-0 shadow-2xl duration-300 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full sm:w-[520px] sm:rounded-none lg:w-[600px]">
          <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 pr-14">
            <DialogTitle className="text-base">Company profile</DialogTitle>
            <DialogDescription className="sr-only">
              Details and open jobs for {employer ? name : 'this employer'}.
            </DialogDescription>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {isLoading ? (
              <div className="space-y-6 p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-2xl bg-slate-200 motion-safe:animate-pulse" />
                  <LoadingSkeleton variant="text" rows={2} className="flex-1" />
                </div>
                <LoadingSkeleton variant="card" rows={3} />
              </div>
            ) : isError ? (
              notFound ? (
                <EmptyState
                  icon={ShieldCheck}
                  title="This company profile isn't available"
                  description="The employer may still be under PESO review, or their profile was removed."
                  action={{ label: 'Back to jobs', variant: 'outline', onClick: onClose }}
                />
              ) : (
                <ErrorState
                  title="Couldn't load this company"
                  description="Check your connection, then try again."
                  onRetry={() => refetch()}
                  error={error}
                />
              )
            ) : employer ? (
              <>
                <section className="bg-brand-navy px-5 pb-6 pt-6 text-white sm:px-6">
                  <div className="flex items-center gap-4">
                    <CompanyLogo src={employer.company_logo_url} name={name} size="lg" />
                    <div className="min-w-0">
                      <h2 className="break-words text-xl font-black leading-tight sm:text-2xl">{name}</h2>
                      {registeredName && <p className="mt-0.5 text-sm text-blue-100">Registered as {registeredName}</p>}
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Verified by PESO
                      </p>
                    </div>
                  </div>
                </section>

                <div className="space-y-6 p-5 sm:p-6">
                  <section aria-labelledby="panel-facts" className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 id="panel-facts" className="sr-only">Company facts</h3>
                    <CompanyFacts employer={employer} />
                  </section>

                  <section aria-labelledby="panel-about">
                    <h3 id="panel-about" className="text-sm font-bold text-slate-900">About the company</h3>
                    {employer.company_description ? (
                      <p className="mt-2 max-w-prose whitespace-pre-wrap text-sm leading-6 text-slate-700">{employer.company_description}</p>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">This employer hasn't added a description yet.</p>
                    )}
                  </section>

                  <section aria-labelledby="panel-reviews">
                    <h3 id="panel-reviews" className="mb-3 text-sm font-bold text-slate-900">Reviews</h3>
                    <CompanyReviews
                      employerId={employer.employer_id}
                      compact
                      onSeeAll={() => { onClose(); navigate(`/seeker/employers/${employer.employer_id}#reviews`) }}
                    />
                  </section>

                  <section aria-labelledby="panel-jobs">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 id="panel-jobs" className="text-sm font-bold text-slate-900">Open jobs</h3>
                      <span className="text-xs font-semibold text-slate-500">
                        {vacancies.length} {vacancies.length === 1 ? 'opening' : 'openings'}
                      </span>
                    </div>
                    {vacancies.length > 0 ? (
                      <>
                        <ul className="mt-3 space-y-2.5">
                          {vacancies.map((job) => (
                            <VacancyRow key={job.post_id} job={job} onSelect={() => setViewingJobId(job.post_id)} />
                          ))}
                        </ul>
                        <p className="mt-2 text-xs text-slate-500">Select a job to see the full details and apply.</p>
                      </>
                    ) : (
                      <EmptyState
                        size="sm"
                        icon={BriefcaseBusiness}
                        title="No open jobs right now"
                        description="New postings from this company will show up here."
                        className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white"
                      />
                    )}
                  </section>
                </div>
              </>
            ) : null}
          </div>

          {employer && (
            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-3">
              <Button variant="ghost" size="sm" icon={Flag} onClick={() => setReporting(true)} className="text-slate-500 hover:text-red-700">
                Report this employer
              </Button>
              <Button variant="secondary" size="sm" icon={ExternalLink} to={`/seeker/employers/${employer.employer_id}`} onClick={onClose}>
                Open full company page
              </Button>
            </footer>
          )}

          {isFetching && !isLoading && <span className="sr-only" role="status">Refreshing company profile…</span>}
        </DialogContent>
      </Dialog>

      {/* Both stack above the panel; closing either returns the seeker to the company profile. */}
      <JobDetailModal
        postId={viewingJobId}
        open={viewingJobId !== null}
        onClose={() => setViewingJobId(null)}
        sourceLabel={employer ? name : undefined}
      />
      <ReportEmployerModal
        open={reporting}
        employer={employer ? { employer_id: employer.employer_id, employer_name: name } : null}
        onClose={() => setReporting(false)}
      />
    </>
  )
}
