import { BriefcaseBusiness, CalendarClock, CheckCircle2, Compass, Flag, Loader2, MapPin, Search, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from '@/lib/toast'
import { Button, EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getSeekerApplicationDetail, getSeekerApplications, withdrawSeekerApplication } from '@/services/seekerService'
import { formatInterviewMode, formatInterviewTime, interviewPhase, interviewPhaseLabel, isJoinableLink } from '@/utils/interview'
import ReviewFormDialog from '@/components/reviews/ReviewFormDialog'
import ReportEmployerModal from '@/components/ReportEmployerModal'
import { reviewService } from '@/services/reviewService'
import { MY_REVIEWS_KEY, isReviewed, openActions } from '@/utils/reviews'
import PortalPageHeader from '@/components/shell/PortalPageHeader'
import useMediaQuery from '@/hooks/useMediaQuery'
import { useNow } from '@/hooks/useNow'
import LiveDot from '@/components/interview/LiveDot'

const MotionArticle = motion.article

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
  { key: 'hired', label: 'Hired' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'withdrawn', label: 'Withdrawn' },
]

const statusTone = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  reviewed: 'border-[#c4d9f7] bg-[#e8f0fc] text-brand-navy',
  shortlisted: 'border-violet-200 bg-violet-50 text-violet-800',
  interview: 'border-[#c4d9f7] bg-[#e8f0fc] text-brand-navy',
  hired: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
  withdrawn: 'border-slate-300 bg-slate-100 text-slate-700',
}

const nextSteps = {
  pending: 'The employer hasn’t opened your application yet. No action needed, check back in a few days.',
  reviewed: 'The employer has viewed your application. If you’re shortlisted, you’ll be invited to an interview.',
  shortlisted: 'You’re on the shortlist. Watch for an interview invitation and keep your phone reachable.',
  interview: 'An interview is scheduled. Bring your resume, certificates, and a valid ID, and arrive early.',
  hired: 'Congratulations, you’ve been hired! The employer will coordinate your start date with you.',
  rejected: 'This application wasn’t successful this time. Keep going, new vacancies are posted often.',
  withdrawn: 'You withdrew this application. You can apply to other vacancies anytime.',
}

const interviewEndedStep = 'Your interview is done. The employer will update this application with their decision, so keep your phone reachable.'

const nextStepFor = (application) =>
  application.status === 'interview' && interviewPhase(application.interview) === 'ended'
    ? interviewEndedStep
    : nextSteps[application.status]

// A hired/rejected application keeps its interview record; only show it while
// it still matters (in the interview stage) or once it actually took place.
const showInterview = (application) =>
  Boolean(application.interview) &&
  (application.status === 'interview' || interviewPhase(application.interview) === 'ended')

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'recently')

const initialsOf = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

/** One line for the list row: the interview time when there is one, otherwise what's next. */
const rowSummary = (application) => {
  if (showInterview(application) && application.interview?.schedule && interviewPhase(application.interview) !== 'ended') {
    return `Interview ${formatInterviewTime(application.interview.schedule)}, ${formatInterviewMode(application.interview.mode_of_interview)}.`
  }
  return nextStepFor(application) || `Applied ${formatDate(application.applied_at)}.`
}

export default function MyApplications() {
  const queryClient = useQueryClient()
  // Wide screens show the list beside a details panel; smaller ones keep the
  // cards and open details in a dialog.
  const wide = useMediaQuery('(min-width: 1024px)')
  // Redraws every 30 seconds so interview labels flip Upcoming → Happening now → Call ended.
  useNow()
  const [writingReview, setWritingReview] = useState(null)
  // Which reviews each application allows (Verified Mutual Feedback System).
  const { data: reviewData } = useQuery({ queryKey: MY_REVIEWS_KEY, queryFn: reviewService.getMine, staleTime: 60_000 })
  const reviewByApplication = Object.fromEntries(
    (reviewData?.opportunities ?? []).filter((item) => item.source === 'application').map((item) => [item.source_id, item]),
  )
  const reviewActionsFor = (applicationId) => openActions(reviewByApplication[applicationId] ? [reviewByApplication[applicationId]] : [])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [withdrawingId, setWithdrawingId] = useState(null)
  const [reportingApplication, setReportingApplication] = useState(null)
  const [pendingWithdraw, setPendingWithdraw] = useState(null)
  const [queuedWithdraw, setQueuedWithdraw] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const loadApplications = async () => {
    setError('')
    try {
      const data = await getSeekerApplications()
      setApplications(data.applications || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load your applications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApplications()
  }, [])

  const statusCounts = useMemo(() => {
    const counts = {}
    applications.forEach((app) => { counts[app.status] = (counts[app.status] || 0) + 1 })
    return counts
  }, [applications])

  const visibleApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return applications.filter((app) => {
      if (statusFilter && app.status !== statusFilter) return false
      if (!query) return true
      return [app.job?.job_title, app.job?.employer?.company_name, app.job?.location]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query))
    })
  }, [applications, statusFilter, searchQuery])

  // On wide screens something is always selected: the picked row while it's
  // still in the filtered list, otherwise the first one.
  const effectiveId = wide
    ? (visibleApplications.some((app) => app.apply_id === selectedId) ? selectedId : visibleApplications[0]?.apply_id ?? null)
    : selectedId

  const detailQuery = useQuery({
    queryKey: ['seekerApplicationDetail', effectiveId],
    queryFn: async () => (await getSeekerApplicationDetail(effectiveId)).application,
    enabled: effectiveId != null,
    staleTime: 30_000,
  })
  const listItem = applications.find((app) => app.apply_id === effectiveId) ?? null
  const activeApplication = effectiveId != null ? (detailQuery.data ?? listItem) : null
  const dialogOpen = !wide && selectedId != null

  const openDetails = (application) => setSelectedId(application.apply_id)

  const handleWithdraw = async (application) => {
    if (!application) return
    setWithdrawingId(application.apply_id)
    try {
      const data = await withdrawSeekerApplication(application.apply_id)
      setApplications((current) => current.map((item) => item.apply_id === application.apply_id ? data.application : item))
      queryClient.invalidateQueries({ queryKey: ['seekerApplicationDetail', application.apply_id] })
      toast.success(`Withdrew your application for ${application.job?.job_title || 'this vacancy'}.`)
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Unable to withdraw this application.')
    } finally {
      setWithdrawingId(null)
      setPendingWithdraw(null)
    }
  }

  // Two Radix modals must never overlap: closing the details dialog and opening
  // the confirm in the same tick leaves pointer-events:none stuck on <body>, so
  // the confirm renders but its buttons stop responding. Queue it instead, and
  // open it from the details dialog's onCloseAutoFocus once Radix has cleaned up.
  const askWithdraw = (application) => {
    if (!dialogOpen) {
      setPendingWithdraw(application)
      return
    }
    setQueuedWithdraw(application)
    setSelectedId(null)
  }

  const flushQueuedWithdraw = () => {
    if (!queuedWithdraw) return
    setPendingWithdraw(queuedWithdraw)
    setQueuedWithdraw(null)
  }

  const detailActions = activeApplication && (
    <>
      {activeApplication.job?.employer?.employer_id && (
        <Button variant="ghost" icon={Flag} onClick={() => setReportingApplication(activeApplication)} className="mr-auto text-slate-500 hover:text-red-700">
          Report a concern
        </Button>
      )}
      {wide && reviewActionsFor(activeApplication.apply_id).map((action) => (
        <Button key={action.key} variant="outline" icon={Star} onClick={() => setWritingReview(action)}>
          Review company
        </Button>
      ))}
      {!wide && <Button variant="ghost" onClick={() => setSelectedId(null)} className="font-bold">Close</Button>}
      {activeApplication.can_withdraw && (
        <Button variant="danger" onClick={() => askWithdraw(activeApplication)} className="rounded-xl font-bold shadow-md">Withdraw application</Button>
      )}
    </>
  )

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-12">
      <PortalPageHeader
        title="Applications"
        subtitle="Every vacancy you applied to from the dashboard, the Job Map and job fairs, where it stands, and what to do next."
      >
        <Button to="/seeker/dashboard" icon={Search}>Find more jobs</Button>
      </PortalPageHeader>

      <div className="space-y-6">
        {error && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
            <span>{error}</span>
            <Button variant="danger" size="sm" onClick={loadApplications} className="rounded-lg">Try again</Button>
          </div>
        )}

        {!loading && applications.length > 0 && (
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map((tab) => {
                const count = tab.key ? statusCounts[tab.key] || 0 : applications.length
                if (tab.key && count === 0) return null
                return (
                  <button
                    key={tab.key || 'all'}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    aria-pressed={statusFilter === tab.key}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${statusFilter === tab.key ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}
                  >
                    {tab.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                  </button>
                )
              })}
            </div>
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search job or employer…"
                aria-label="Search your applications"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm placeholder:text-slate-400 outline-none transition focus:border-brand-navy focus:bg-white focus:ring-2 focus:ring-[#c4d9f7]"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2"><LoadingSkeleton variant="card" rows={4} /><LoadingSkeleton variant="card" rows={4} /></div>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
            <EmptyState
              icon={BriefcaseBusiness}
              title="No applications yet"
              description="Explore nearby vacancies and submit your first application."
              action={{ label: 'Open Smart Job Map', icon: Compass, to: '/seeker/job-map' }}
            />
          </div>
        ) : visibleApplications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 shadow-sm">
            <EmptyState
              filtered
              icon={BriefcaseBusiness}
              title="No applications match this filter"
              description="Try a different status or clear your search."
            />
          </div>
        ) : wide ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <ol className="space-y-3" aria-label="Your applications">
              {visibleApplications.map((application) => {
                const selected = application.apply_id === effectiveId
                const company = application.job?.employer?.company_name || 'Employer'
                return (
                  <li key={application.apply_id}>
                    <button
                      type="button"
                      onClick={() => openDetails(application)}
                      aria-current={selected ? 'true' : undefined}
                      className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${selected ? 'border-brand-navy ring-1 ring-brand-navy' : 'border-slate-200 hover:border-[#c4d9f7]'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          {application.job?.employer?.company_logo_url ? (
                            <img src={application.job.employer.company_logo_url} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-slate-100 object-cover p-0.5" />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fc] text-xs font-bold text-brand-navy" aria-hidden="true">{initialsOf(company)}</span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{application.job?.job_title || 'Vacancy unavailable'}</p>
                            <p className="truncate text-xs font-semibold text-slate-500">{company}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusTone[application.status] || statusTone.pending}`}>{application.status_label || application.status}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{rowSummary(application)}</p>
                    </button>
                  </li>
                )
              })}
            </ol>

            <aside aria-label="Application details" className="sticky top-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {activeApplication && (
                <>
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-slate-900">{activeApplication.job?.job_title || 'Application'}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{[activeApplication.job?.employer?.company_name, activeApplication.job?.location].filter(Boolean).join(', ')}</p>
                    </div>
                    {detailQuery.isFetching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-label="Loading details" />}
                  </div>
                  <div className="max-h-[calc(100vh-18rem)] overflow-y-auto p-6">
                    {detailQuery.isError ? (
                      <ErrorState size="sm" title="Details couldn't be loaded" error={detailQuery.error} onRetry={() => detailQuery.refetch()} />
                    ) : (
                      <ApplicationDetailBody application={activeApplication} />
                    )}
                    <ReviewNote item={reviewByApplication[activeApplication.apply_id]} />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 p-4">{detailActions}</div>
                </>
              )}
            </aside>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <AnimatePresence initial={false}>
            {visibleApplications.map((application) => (
              <MotionArticle
                key={application.apply_id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition hover:border-[#c4d9f7] hover:shadow-xl hover:shadow-blue-900/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    {application.job?.employer?.company_logo_url && (
                      <img src={application.job.employer.company_logo_url} alt="Logo" className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 bg-white object-cover p-1 shadow-sm" />
                    )}
                    <div>
                      <h2 className="text-xl font-bold leading-tight text-slate-900 transition-colors group-hover:text-brand-navy">{application.job?.job_title || 'Vacancy unavailable'}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{application.job?.employer?.company_name || 'Employer'}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${statusTone[application.status] || statusTone.pending}`}>{application.status_label || application.status}</span>
                </div>

                <div className="mt-5 grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-rose-400" />{application.job?.location || 'Location not specified'}</span>
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />{Math.round(application.match_percentage || 0)}% match when applied</span>
                  <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 shrink-0 text-indigo-400" />Applied {formatDate(application.applied_at)}</span>
                </div>

                {nextStepFor(application) && (
                  <div className="mt-4 flex flex-col gap-1 rounded-2xl border border-[#c4d9f7] bg-[#e8f0fc] p-4">
                    <span className="text-xs font-semibold text-brand-navy">What’s next</span>
                    <p className="text-xs font-semibold leading-relaxed text-brand-navy">{nextStepFor(application)}</p>
                  </div>
                )}

                {showInterview(application) && (() => {
                  const phase = interviewPhaseLabel(application.interview)
                  const muted = phase.phase === 'ended' || phase.phase === 'cancelled'
                  return (
                    <div className={`mt-4 rounded-2xl border p-4 ${muted ? 'border-slate-200 bg-slate-50' : 'border-[#c4d9f7] bg-[#e8f0fc]'}`}>
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <p className={`text-xs font-bold ${muted ? 'text-slate-600' : 'text-brand-navy'}`}>Interview</p>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold ${phase.tone}`}>{phase.phase === 'in_progress' && <LiveDot />}{phase.label}</span>
                      </div>
                      <p className={`text-sm font-bold ${muted ? 'text-slate-700' : 'text-brand-navy'}`}>{formatInterviewTime(application.interview.schedule)}, {formatInterviewMode(application.interview.mode_of_interview)}</p>
                    </div>
                  )
                })()}

                {application.employer_remarks && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-1 text-xs font-bold text-slate-500">Employer note</p>
                    <p className="text-sm font-semibold leading-relaxed text-slate-700">{application.employer_remarks}</p>
                  </div>
                )}

                <div className="mt-auto flex flex-wrap gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => openDetails(application)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#0f2d56] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  >
                    View full details
                  </button>
                  {reviewActionsFor(application.apply_id).map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => setWritingReview(action)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 shadow-sm transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                    >
                      <Star className="h-4 w-4" /> Review company
                    </button>
                  ))}
                  {application.can_withdraw && (
                    <button
                      type="button"
                      onClick={() => askWithdraw(application)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-red-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
                <ReviewNote item={reviewByApplication[application.apply_id]} />
              </MotionArticle>
            ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Application detail (smaller screens) */}
      <Dialog open={dialogOpen && Boolean(activeApplication)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent onCloseAutoFocus={flushQueuedWithdraw} className="max-h-[85vh] max-w-2xl overflow-y-auto border-0 shadow-2xl sm:rounded-2xl">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-4">
              {activeApplication?.job?.employer?.company_logo_url && (
                <img src={activeApplication.job.employer.company_logo_url} alt="Logo" className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 bg-white object-cover p-1 shadow-sm" />
              )}
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900">{activeApplication?.job?.job_title || 'Application'}</DialogTitle>
                <DialogDescription className="mt-1 text-base font-semibold text-slate-600">{activeApplication?.job?.employer?.company_name || 'Employer'}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {activeApplication && (detailQuery.isError
            ? <ErrorState size="sm" title="Details couldn't be loaded" error={detailQuery.error} onRetry={() => detailQuery.refetch()} />
            : <ApplicationDetailBody application={activeApplication} />)}

          <DialogFooter className="mt-4 border-t border-slate-100 pt-4">{detailActions}</DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportEmployerModal
        open={Boolean(reportingApplication)}
        employer={reportingApplication ? { employer_id: reportingApplication.job?.employer?.employer_id, employer_name: reportingApplication.job?.employer?.company_name } : null}
        vacancy={reportingApplication?.job ? { post_id: reportingApplication.job.post_id, job_title: reportingApplication.job.job_title } : null}
        applicationId={reportingApplication?.apply_id ?? null}
        onClose={() => setReportingApplication(null)}
      />

      {writingReview && (
        <ReviewFormDialog
          target={writingReview}
          onClose={() => setWritingReview(null)}
          onSaved={(res) => {
            setWritingReview(null)
            toast.success(res.message)
            queryClient.invalidateQueries({ queryKey: MY_REVIEWS_KEY })
          }}
        />
      )}

      {/* Withdraw confirmation */}
      <Dialog open={!!pendingWithdraw} onOpenChange={(open) => !open && setPendingWithdraw(null)}>
        <DialogContent className="border-0 shadow-2xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Withdraw this application?</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-slate-600">
              You’ll stop receiving employer updates for &ldquo;<span className="font-bold text-slate-900">{pendingWithdraw?.job?.job_title || 'this vacancy'}</span>&rdquo;. This can’t be undone, but you can apply to other vacancies anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setPendingWithdraw(null)} className="font-bold">Keep application</Button>
            <Button variant="danger" onClick={() => handleWithdraw(pendingWithdraw)} disabled={withdrawingId === pendingWithdraw?.apply_id} className="rounded-xl font-bold shadow-md">
              {withdrawingId === pendingWithdraw?.apply_id ? 'Withdrawing…' : 'Withdraw application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Everything about one application; shared by the side panel and the dialog. */
function ApplicationDetailBody({ application }) {
  const interview = application.interview
  const phase = showInterview(application) ? interviewPhaseLabel(interview) : null
  const ended = phase?.phase === 'ended'
  const muted = ended || phase?.phase === 'cancelled'
  const canJoin = phase && !muted && isJoinableLink(interview)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${statusTone[application.status] || statusTone.pending}`}>{application.status_label || application.status}</span>
        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{Math.round(application.match_percentage || 0)}% match</span>
        {!application.can_withdraw && <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">Final state locked</span>}
      </div>

      {nextStepFor(application) && (
        <div className="rounded-2xl border border-[#c4d9f7] bg-[#e8f0fc] p-5">
          <p className="text-xs font-bold text-brand-navy">What happens next</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">{nextStepFor(application)}</p>
        </div>
      )}

      <dl className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 sm:grid-cols-2">
        <div><dt className="text-xs font-bold text-slate-500">Location</dt><dd className="mt-1 font-bold text-slate-900">{application.job?.location || 'Location not specified'}</dd></div>
        <div><dt className="text-xs font-bold text-slate-500">Applied</dt><dd className="mt-1 font-bold text-slate-900">{formatDate(application.applied_at)}</dd></div>
        <div><dt className="text-xs font-bold text-slate-500">Employer remarks</dt><dd className="mt-1 font-bold text-slate-900">{application.employer_remarks || 'No remarks yet.'}</dd></div>
        <div><dt className="text-xs font-bold text-slate-500">Interview</dt><dd className="mt-1 font-bold text-slate-900">{phase ? `${formatInterviewMode(interview.mode_of_interview)}, ${phase.label}` : 'No interview scheduled yet.'}</dd></div>
      </dl>

      {phase && (
        <div className={`rounded-2xl border p-5 ${muted ? 'border-slate-200 bg-slate-50' : 'border-[#c4d9f7] bg-[#e8f0fc]'}`}>
          <div className={`mb-4 flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center ${muted ? 'border-slate-200' : 'border-[#c4d9f7]'}`}>
            <div>
              <p className={`text-xs font-bold ${muted ? 'text-slate-600' : 'text-brand-navy'}`}>{ended ? phase.label : phase.phase === 'cancelled' ? 'Interview cancelled' : phase.phase === 'in_progress' ? 'Interview happening now' : 'Interview scheduled'}</p>
              <p className={`mt-1 text-lg font-bold ${muted ? 'text-slate-800' : 'text-brand-navy'}`}>{formatInterviewTime(interview.schedule)}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm sm:self-auto ${phase.tone}`}>{phase.phase === 'in_progress' && <LiveDot />}{phase.label}</span>
          </div>
          <p className={`text-sm font-semibold ${muted ? 'text-slate-700' : 'text-brand-navy'}`}>{formatInterviewMode(interview.mode_of_interview)}</p>
          {canJoin ? (
            <a
              href={interview.venue_or_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f2d56] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
            >
              Join interview call
            </a>
          ) : !isJoinableLink(interview) && !muted ? (
            <p className="mt-1 text-sm font-semibold leading-relaxed text-brand-navy">{interview.venue_or_link || 'The venue will be shared by the employer.'}</p>
          ) : null}
          {interview.instructions && !muted && <p className="mt-3 whitespace-pre-wrap text-sm text-brand-navy">{interview.instructions}</p>}
          <p className={`mt-3 text-sm ${muted ? 'text-slate-600' : 'text-brand-navy/80'}`}>
            {ended
              ? 'This interview is over. The employer will update your application with their decision.'
              : phase.phase === 'cancelled'
                ? 'The employer cancelled this interview.'
                : 'Prepare your resume, certificates, and valid ID before the interview.'}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-5 text-sm font-bold text-slate-900">Progress</h3>
        <ol className="relative space-y-5 before:absolute before:inset-0 before:ml-[5px] before:h-full before:w-0.5 before:-translate-x-px before:bg-slate-200">
          {(application.timeline || []).map((item, index) => (
            <li key={`${item.title}-${index}`} className="relative flex gap-4">
              <span className="relative z-10 mt-1 flex h-3 w-3 shrink-0 rounded-full border-2 border-white bg-brand-navy shadow-sm" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">{item.description}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">{item.timestamp ? new Date(item.timestamp).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Pending'}</p>
              </div>
            </li>
          ))}
          {!(application.timeline || []).length && (
            <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">No progress recorded yet.</li>
          )}
        </ol>
      </div>

      {application.placement && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <p className="text-lg font-bold tracking-tight">Placement confirmed</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed">Starts on {application.placement.start_date ? new Date(application.placement.start_date).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'TBD'} at {Number(application.placement.salary || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })}.</p>
        </div>
      )}
    </div>
  )
}

/** Under each application: "You reviewed this" or when a review opens up. */
function ReviewNote({ item }) {
  if (!item) return null
  if (isReviewed(item)) {
    return (
      <p className="mt-3 text-xs font-semibold text-slate-500">
        You reviewed this company. <Link to="/seeker/reviews" className="text-brand-navy underline-offset-2 hover:underline">See or edit your review</Link>
      </p>
    )
  }
  return null
}
