import { BriefcaseBusiness, CalendarClock, CheckCircle2, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSeekerApplications } from '@/services/seekerService'

const statusTone = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  reviewed: 'border-blue-200 bg-blue-50 text-blue-800',
  shortlisted: 'border-violet-200 bg-violet-50 text-violet-800',
  interview: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  hired: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
}

export default function MyApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getSeekerApplications()
      .then((data) => setApplications(data.applications || []))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load your applications.'))
      .finally(() => setLoading(false))
  }, [])

  return <div className="space-y-6"><header className="border-b border-slate-200 pb-6"><p className="text-xs font-black uppercase text-blue-800">Employment journey</p><h1 className="mt-1 text-3xl font-black text-slate-950">My Applications</h1><p className="mt-2 text-sm text-slate-600">Track every application submitted through the dashboard, AI Job Map, and job fairs.</p></header>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
    {loading ? <div className="py-16 text-center text-sm font-semibold text-slate-500">Loading applications…</div> : applications.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"><BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 font-black text-slate-800">No applications yet</h2><p className="mt-1 text-sm text-slate-500">Explore nearby vacancies and submit your first application.</p><Link to="/seeker/job-map" className="mt-4 inline-flex rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-bold text-white">Open AI Job Map</Link></div> : <div className="grid gap-4 lg:grid-cols-2">{applications.map((application) => <article key={application.apply_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-slate-950">{application.job?.job_title || 'Vacancy unavailable'}</h2><p className="mt-1 text-sm font-semibold text-slate-500">{application.job?.employer?.company_name || 'Employer'}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusTone[application.status] || statusTone.pending}`}>{application.status_label || application.status}</span></div><div className="mt-4 grid gap-2 text-xs text-slate-600"><span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" />{application.job?.location || 'Location not specified'}</span><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{Math.round(application.match_percentage || 0)}% match when applied</span><span className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5 text-slate-400" />Applied {application.applied_at ? new Date(application.applied_at).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'recently'}</span></div>{application.interview && <div className="mt-4 rounded-xl bg-indigo-50 p-3 text-xs font-semibold text-indigo-800">Interview: {new Date(application.interview.schedule).toLocaleString('en-PH')} · {application.interview.mode_of_interview}</div>}{application.employer_remarks && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Employer note: {application.employer_remarks}</p>}</article>)}</div>}
  </div>
}
