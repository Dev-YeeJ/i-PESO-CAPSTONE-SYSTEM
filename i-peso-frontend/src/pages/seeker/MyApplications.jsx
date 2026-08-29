import { BriefcaseBusiness, CalendarClock, CheckCircle2, Compass, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, EmptyState, LoadingSkeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getSeekerApplicationDetail, getSeekerApplications, withdrawSeekerApplication } from '@/services/seekerService'

const statusTone = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  reviewed: 'border-blue-200 bg-blue-50 text-blue-800',
  shortlisted: 'border-violet-200 bg-violet-50 text-violet-800',
  interview: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  hired: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
  withdrawn: 'border-slate-300 bg-slate-100 text-slate-700',
}

const nextSteps = {
  pending: 'The employer hasn’t opened your application yet. No action needed — check back in a few days.',
  reviewed: 'The employer has viewed your application. If you’re shortlisted, you’ll be invited to an interview.',
  shortlisted: 'You’re on the shortlist. Watch for an interview invitation and keep your phone reachable.',
  interview: 'An interview is scheduled. Bring your resume, certificates, and a valid ID, and arrive early.',
  hired: 'Congratulations — you’ve been hired! The employer will coordinate your start date with you.',
  rejected: 'This application wasn’t successful this time. Keep going — new vacancies are posted often.',
  withdrawn: 'You withdrew this application. You can apply to other vacancies anytime.',
}

export default function MyApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeApplication, setActiveApplication] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [withdrawingId, setWithdrawingId] = useState(null)
  const [pendingWithdraw, setPendingWithdraw] = useState(null)
  const [queuedWithdraw, setQueuedWithdraw] = useState(null)

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

  const openDetails = async (application) => {
    if (application?.apply_id === activeApplication?.apply_id) {
      setActiveApplication(null)
      return
    }

    setDetailLoading(true)
    setActiveApplication(null)
    try {
      const data = await getSeekerApplicationDetail(application.apply_id)
      setActiveApplication(data.application)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load application details.')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleWithdraw = async (application) => {
    if (!application) return
    setWithdrawingId(application.apply_id)
    try {
      const data = await withdrawSeekerApplication(application.apply_id)
      setApplications((current) => current.map((item) => item.apply_id === application.apply_id ? data.application : item))
      setActiveApplication((current) => current?.apply_id === application.apply_id ? data.application : current)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to withdraw this application.')
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
    if (!activeApplication) {
      setPendingWithdraw(application)
      return
    }
    setQueuedWithdraw(application)
    setActiveApplication(null)
  }

  const flushQueuedWithdraw = () => {
    if (!queuedWithdraw) return
    setPendingWithdraw(queuedWithdraw)
    setQueuedWithdraw(null)
  }

  return (
    <div className="space-y-10 pb-12 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 px-8 py-8 text-white shadow-xl sm:px-12 sm:py-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"></div>
        
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Employment Journey</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white drop-shadow-sm">My Applications</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-blue-100">
            Track every application submitted through the dashboard, AI Job Map, and job fairs.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
            <span>{error}</span>
            <button type="button" onClick={loadApplications} className="font-extrabold hover:underline rounded-md px-3 py-1 bg-red-100">Try again</button>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2"><LoadingSkeleton variant="card" rows={4} /><LoadingSkeleton variant="card" rows={4} /></div>
        ) : applications.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
            <EmptyState
              icon={BriefcaseBusiness}
              title="No applications yet"
              description="Explore nearby vacancies and submit your first application."
              action={{ label: 'Open AI Job Map', icon: Compass, to: '/seeker/job-map' }}
            />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {applications.map((application) => (
              <article key={application.apply_id} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/10 flex flex-col h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    {application.job?.employer?.company_logo_url && (
                      <img src={application.job.employer.company_logo_url} alt="Logo" className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 bg-white object-cover p-1 shadow-sm" />
                    )}
                    <div>
                      <h2 className="text-xl font-black text-slate-900 group-hover:text-blue-900 transition-colors leading-tight">{application.job?.job_title || 'Vacancy unavailable'}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{application.job?.employer?.company_name || 'Employer'}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow-sm ${statusTone[application.status] || statusTone.pending}`}>{application.status_label || application.status}</span>
                </div>

                <div className="mt-5 grid gap-2 text-xs font-semibold text-slate-500 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-rose-400 shrink-0" />{application.job?.location || 'Location not specified'}</span>
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />{Math.round(application.match_percentage || 0)}% match when applied</span>
                  <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-indigo-400 shrink-0" />Applied {application.applied_at ? new Date(application.applied_at).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'recently'}</span>
                </div>

                {nextSteps[application.status] && (
                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 flex flex-col gap-1">
                    <span className="font-extrabold uppercase tracking-wider text-[10px] text-blue-700">What’s next</span>
                    <p className="text-xs font-semibold leading-relaxed text-blue-900">{nextSteps[application.status]}</p>
                  </div>
                )}

                {application.interview && (
                  <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                     <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-1">Interview Scheduled</p>
                     <p className="text-sm font-bold text-indigo-900">{new Date(application.interview.schedule).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })} · {application.interview.mode_of_interview}</p>
                  </div>
                )}

                {application.employer_remarks && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Employer Note</p>
                     <p className="text-sm font-semibold text-slate-700 leading-relaxed">{application.employer_remarks}</p>
                  </div>
                )}

                <div className="mt-auto pt-6 flex flex-wrap gap-3">
                  <button onClick={() => openDetails(application)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-blue-900 shadow-md">
                    {detailLoading && activeApplication?.apply_id === application.apply_id ? 'Loading…' : 'View full details'}
                  </button>
                  {application.can_withdraw && (
                    <button onClick={() => askWithdraw(application)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-red-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 shadow-sm">
                      Withdraw
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Application detail */}
      <Dialog open={!!activeApplication} onOpenChange={(open) => !open && setActiveApplication(null)}>
        <DialogContent onCloseAutoFocus={flushQueuedWithdraw} className="max-h-[85vh] max-w-2xl overflow-y-auto sm:rounded-3xl border-0 shadow-2xl">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-4">
              {activeApplication?.job?.employer?.company_logo_url && (
                <img src={activeApplication.job.employer.company_logo_url} alt="Logo" className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 bg-white object-cover p-1 shadow-sm" />
              )}
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900">{activeApplication?.job?.job_title || 'Application'}</DialogTitle>
                <DialogDescription className="mt-1 text-base font-semibold text-slate-600">{activeApplication?.job?.employer?.company_name || 'Employer'}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {activeApplication && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider ${statusTone[activeApplication.status] || statusTone.pending}`}>{activeApplication.status_label || activeApplication.status}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-600 border border-slate-200">{Math.round(activeApplication.match_percentage || 0)}% match</span>
                {!activeApplication.can_withdraw && <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-700">Final state locked</span>}
              </div>

              {nextSteps[activeApplication.status] && (
                <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-800">What happens next</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">{nextSteps[activeApplication.status]}</p>
                </div>
              )}

              <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700 sm:grid-cols-2">
                <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Location</p><p className="mt-1 font-bold text-slate-900">{activeApplication.job?.location || 'Location not specified'}</p></div>
                <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Applied</p><p className="mt-1 font-bold text-slate-900">{activeApplication.applied_at ? new Date(activeApplication.applied_at).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'Recently'}</p></div>
                <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Employer remarks</p><p className="mt-1 font-bold text-slate-900">{activeApplication.employer_remarks || 'No remarks yet.'}</p></div>
                <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Interview</p><p className="mt-1 font-bold text-slate-900">{activeApplication.interview ? `${activeApplication.interview.mode_of_interview} · ${activeApplication.interview.venue_or_link || 'Venue to follow'}` : 'No interview scheduled yet.'}</p></div>
              </div>

              {activeApplication.interview && (
                <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm shadow-indigo-900/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100/50 pb-4 mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Interview scheduled</p>
                      <p className="mt-1 text-lg font-black text-indigo-950">{activeApplication.interview.schedule ? new Date(activeApplication.interview.schedule).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Schedule pending'}</p>
                    </div>
                    <span className="self-start sm:self-auto rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wider text-indigo-700 shadow-sm">{activeApplication.interview.mode_of_interview}</span>
                  </div>
                  <p className="text-sm font-semibold text-indigo-900 leading-relaxed">{activeApplication.interview.venue_or_link || 'Meeting link or venue will be shared by the employer.'}</p>
                  <p className="mt-2 text-sm text-indigo-700/80">Prepare your resume, certificates, and valid ID before the interview.</p>
                </div>
              )}

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6">Application timeline</h3>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[5px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:to-transparent">
                  {(activeApplication.timeline || []).map((item, index) => (
                    <div key={`${item.title}-${index}`} className="relative flex gap-4">
                      <div className="relative z-10 mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow-sm" />
                      <div>
                        <p className="text-sm font-black text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-600 leading-relaxed">{item.description}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.timestamp ? new Date(item.timestamp).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Pending'}</p>
                      </div>
                    </div>
                  ))}
                  {!(activeApplication.timeline || []).length && (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">No timeline events recorded yet.</p>
                  )}
                </div>
              </div>

              {activeApplication.placement && (
                <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm shadow-emerald-900/5 text-emerald-900">
                  <p className="text-lg font-black tracking-tight">Placement confirmed</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed">Starts on {activeApplication.placement.start_date ? new Date(activeApplication.placement.start_date).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'TBD'} at {Number(activeApplication.placement.salary || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })}.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setActiveApplication(null)} className="font-bold">Close</Button>
            {activeApplication?.can_withdraw && (
              <Button variant="danger" onClick={() => askWithdraw(activeApplication)} className="rounded-xl font-bold shadow-md">Withdraw application</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw confirmation */}
      <Dialog open={!!pendingWithdraw} onOpenChange={(open) => !open && setPendingWithdraw(null)}>
        <DialogContent className="sm:rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Withdraw this application?</DialogTitle>
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
