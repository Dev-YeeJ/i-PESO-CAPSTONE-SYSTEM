import { BriefcaseBusiness, CalendarClock, CheckCircle2, MapPin, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

export default function MyApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeApplication, setActiveApplication] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [withdrawingId, setWithdrawingId] = useState(null)

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
    const confirmed = window.confirm('Withdraw this application? This will stop future employer updates for this application.')
    if (!confirmed) return

    setWithdrawingId(application.apply_id)
    try {
      const data = await withdrawSeekerApplication(application.apply_id)
      setApplications((current) => current.map((item) => item.apply_id === application.apply_id ? data.application : item))
      setActiveApplication((current) => current?.apply_id === application.apply_id ? data.application : current)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to withdraw this application.')
    } finally {
      setWithdrawingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-black uppercase text-blue-800">Employment journey</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">My Applications</h1>
        <p className="mt-2 text-sm text-slate-600">Track every application submitted through the dashboard, AI Job Map, and job fairs.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      {loading ? (
        <div className="py-16 text-center text-sm font-semibold text-slate-500">Loading applications…</div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-3 font-black text-slate-800">No applications yet</h2>
          <p className="mt-1 text-sm text-slate-500">Explore nearby vacancies and submit your first application.</p>
          <Link to="/seeker/job-map" className="mt-4 inline-flex rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-bold text-white">Open AI Job Map</Link>
        </div>
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

              {application.interview && (
                <div className="mt-4 rounded-xl bg-indigo-50 p-3 text-xs font-semibold text-indigo-800">
                  Interview: {new Date(application.interview.schedule).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })} · {application.interview.mode_of_interview}
                </div>
              )}

              {application.employer_remarks && (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Employer note: {application.employer_remarks}</p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => openDetails(application)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-blue-900 hover:text-blue-900">
                  {detailLoading && activeApplication?.apply_id === application.apply_id ? 'Loading…' : 'View details'}
                </button>
                {application.can_withdraw && (
                  <button type="button" onClick={() => handleWithdraw(application)} disabled={withdrawingId === application.apply_id} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-70">
                    {withdrawingId === application.apply_id ? 'Withdrawing…' : 'Withdraw'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {activeApplication && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 px-4 py-6">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Application details</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{activeApplication.job?.job_title || 'Application'}</h2>
                <p className="mt-1 text-sm text-slate-500">{activeApplication.job?.employer?.company_name || 'Employer'}</p>
              </div>
              <button type="button" onClick={() => setActiveApplication(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[80vh] space-y-5 overflow-y-auto px-5 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusTone[activeApplication.status] || statusTone.pending}`}>{activeApplication.status_label || activeApplication.status}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{Math.round(activeApplication.match_percentage || 0)}% match</span>
                {!activeApplication.can_withdraw && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">Final state locked</span>}
              </div>

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
                      <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-900" />
                      <div>
                        <p className="text-sm font-black text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{item.timestamp ? new Date(item.timestamp).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Pending'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {activeApplication.placement && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="font-black">Placement confirmed</p>
                  <p className="mt-1">Starts on {activeApplication.placement.start_date ? new Date(activeApplication.placement.start_date).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'TBD'} at {Number(activeApplication.placement.salary || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })}.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button type="button" onClick={() => setActiveApplication(null)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-slate-500">Close</button>
              {activeApplication.can_withdraw && (
                <button type="button" onClick={() => handleWithdraw(activeApplication)} disabled={withdrawingId === activeApplication.apply_id} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-70">
                  {withdrawingId === activeApplication.apply_id ? 'Withdrawing…' : 'Withdraw application'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
