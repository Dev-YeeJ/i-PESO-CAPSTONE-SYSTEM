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

// Plain-language "what happens now" for each status — the brief asks that seekers
// always know what a status means and what to do next.
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

  // Open the withdraw confirmation, closing the detail dialog first so we never
  // stack two dialogs on top of each other.
  const askWithdraw = (application) => {
    setActiveApplication(null)
    setPendingWithdraw(application)
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-black uppercase text-blue-800">Employment journey</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">My Applications</h1>
        <p className="mt-2 text-sm text-slate-600">Track every application submitted through the dashboard, AI Job Map, and job fairs.</p>
      </header>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <span>{error}</span>
          <button type="button" onClick={loadApplications} className="font-extrabold hover:underline">Try again</button>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton variant="card" rows={4} />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No applications yet"
          description="Explore nearby vacancies and submit your first application."
          action={{ label: 'Open AI Job Map', icon: Compass, to: '/seeker/job-map' }}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {applications.map((application) => (
            <article key={application.apply_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-950">{application.job?.job_title || 'Vacancy unavailable'}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{application.job?.employer?.company_name || 'Employer'}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusTone[application.status] || statusTone.pending}`}>{application.status_label || application.status}</span>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-slate-600">
                <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" />{application.job?.location || 'Location not specified'}</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{Math.round(application.match_percentage || 0)}% match when applied</span>
                <span className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5 text-slate-400" />Applied {application.applied_at ? new Date(application.applied_at).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'recently'}</span>
              </div>

              {nextSteps[application.status] && (
                <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  <span className="font-bold text-slate-700">What’s next: </span>{nextSteps[application.status]}
                </p>
              )}

              {application.interview && (
                <div className="mt-3 rounded-xl bg-indigo-50 p-3 text-xs font-semibold text-indigo-800">
                  Interview: {new Date(application.interview.schedule).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })} · {application.interview.mode_of_interview}
                </div>
              )}

              {application.employer_remarks && (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Employer note: {application.employer_remarks}</p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openDetails(application)}>
                  {detailLoading && activeApplication?.apply_id === application.apply_id ? 'Loading…' : 'View details'}
                </Button>
                {application.can_withdraw && (
                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => askWithdraw(application)}>
                    Withdraw
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Application detail */}
      <Dialog open={!!activeApplication} onOpenChange={(open) => !open && setActiveApplication(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeApplication?.job?.job_title || 'Application'}</DialogTitle>
            <DialogDescription>{activeApplication?.job?.employer?.company_name || 'Employer'}</DialogDescription>
          </DialogHeader>

          {activeApplication && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusTone[activeApplication.status] || statusTone.pending}`}>{activeApplication.status_label || activeApplication.status}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{Math.round(activeApplication.match_percentage || 0)}% match</span>
                {!activeApplication.can_withdraw && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">Final state locked</span>}
              </div>

              {nextSteps[activeApplication.status] && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-800">What happens next</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{nextSteps[activeApplication.status]}</p>
                </div>
              )}

              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
                <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Location</p><p className="mt-1 font-semibold">{activeApplication.job?.location || 'Location not specified'}</p></div>
                <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Applied</p><p className="mt-1 font-semibold">{activeApplication.applied_at ? new Date(activeApplication.applied_at).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'Recently'}</p></div>
                <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Employer remarks</p><p className="mt-1 font-semibold">{activeApplication.employer_remarks || 'No remarks yet.'}</p></div>
                <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Interview</p><p className="mt-1 font-semibold">{activeApplication.interview ? `${activeApplication.interview.mode_of_interview} · ${activeApplication.interview.venue_or_link || 'Venue to follow'}` : 'No interview scheduled yet.'}</p></div>
              </div>

              {activeApplication.interview && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">Interview scheduled</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{activeApplication.interview.schedule ? new Date(activeApplication.interview.schedule).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Schedule pending'}</p>
                    </div>
                    <span className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase text-indigo-700">{activeApplication.interview.mode_of_interview}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{activeApplication.interview.venue_or_link || 'Meeting link or venue will be shared by the employer.'}</p>
                  <p className="mt-3 text-sm text-slate-600">Prepare your resume, certificates, and valid ID before the interview.</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-black text-slate-950">Application timeline</h3>
                <div className="mt-3 space-y-3">
                  {(activeApplication.timeline || []).map((item, index) => (
                    <div key={`${item.title}-${index}`} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-navy" />
                      <div>
                        <p className="text-sm font-black text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{item.timestamp ? new Date(item.timestamp).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Pending'}</p>
                      </div>
                    </div>
                  ))}
                  {!(activeApplication.timeline || []).length && (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">No timeline events recorded yet.</p>
                  )}
                </div>
              </div>

              {activeApplication.placement && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="font-black">Placement confirmed</p>
                  <p className="mt-1">Starts on {activeApplication.placement.start_date ? new Date(activeApplication.placement.start_date).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'TBD'} at {Number(activeApplication.placement.salary || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })}.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActiveApplication(null)}>Close</Button>
            {activeApplication?.can_withdraw && (
              <Button variant="danger" onClick={() => askWithdraw(activeApplication)}>Withdraw application</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw confirmation */}
      <Dialog open={!!pendingWithdraw} onOpenChange={(open) => !open && setPendingWithdraw(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw this application?</DialogTitle>
            <DialogDescription>
              You’ll stop receiving employer updates for &ldquo;{pendingWithdraw?.job?.job_title || 'this vacancy'}&rdquo;. This can’t be undone, but you can apply to other vacancies anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingWithdraw(null)}>Keep application</Button>
            <Button variant="danger" onClick={() => handleWithdraw(pendingWithdraw)} disabled={withdrawingId === pendingWithdraw?.apply_id}>
              {withdrawingId === pendingWithdraw?.apply_id ? 'Withdrawing…' : 'Withdraw application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
