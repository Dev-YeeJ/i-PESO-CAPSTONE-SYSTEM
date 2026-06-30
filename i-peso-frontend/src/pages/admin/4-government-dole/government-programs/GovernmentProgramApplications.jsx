import { ArrowLeft, FileText, Search, UserRoundCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { APPLICATION_STATUSES, statusLabel, statusTone } from '@/components/government-programs/programConstants'
import governmentProgramService from '@/services/governmentProgramService'

export default function GovernmentProgramApplications() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [program, setProgram] = useState(null)
  const [applications, setApplications] = useState([])
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [review, setReview] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await governmentProgramService.programApplications(id, { status, per_page: 100 })
      setProgram(response.program)
      setApplications(response.applications?.data ?? [])
    } catch (requestError) {
      toast.error(requestError.response?.data?.message ?? 'Unable to load applicants.')
    } finally {
      setLoading(false)
    }
  }, [id, status])

  useEffect(() => { load() }, [load])

  const visible = applications.filter((application) => `${application.seeker.name} ${application.seeker.email}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(`/admin/government-programs/${id}`)} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-900"><ArrowLeft className="h-4 w-4" />Back to program</button>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-black uppercase text-blue-800">Program Applicant Management</p><h1 className="mt-1 text-2xl font-black text-slate-950">{program?.title ?? 'Program Applicants'}</h1><p className="mt-1 text-sm text-slate-500">{program ? `${program.available_slots} of ${program.total_slots || 'open'} slots available` : 'Loading capacity...'}</p></div>
        <div className="flex flex-wrap gap-2"><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search applicant" className="rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold"><option value="">All statuses</option>{APPLICATION_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
      </header>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="py-16 text-center text-sm font-semibold text-slate-500">Loading applicants...</div> : visible.length === 0 ? <div className="py-16 text-center"><UserRoundCheck className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold text-slate-700">No applicants found.</p></div> : (
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-left"><thead className="bg-slate-50 text-xs font-extrabold uppercase text-slate-500"><tr><th className="px-5 py-3">Applicant</th><th className="px-5 py-3">Eligibility</th><th className="px-5 py-3">Documents</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Review</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((application) => <tr key={application.application_id}><td className="px-5 py-4"><p className="font-extrabold text-slate-900">{application.seeker.name}</p><p className="mt-1 text-xs text-slate-500">{application.seeker.email} · {application.seeker.mobile_number}</p></td><td className="px-5 py-4 text-sm"><span className="font-black text-slate-800">{application.eligibility_score ?? 0}%</span><p className="mt-1 text-xs text-slate-500">Profile snapshot</p></td><td className="px-5 py-4"><span className="inline-flex items-center gap-1 text-sm font-bold text-slate-600"><FileText className="h-4 w-4" />{application.documents.length}</span></td><td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${statusTone[application.status] ?? statusTone.draft}`}>{statusLabel(application.status)}</span></td><td className="px-5 py-4 text-right"><button onClick={() => setReview({ application, status: application.status, remarks: application.remarks ?? '' })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-900 hover:text-blue-900">Update</button></td></tr>)}</tbody></table></div>
        )}
      </section>

      {review && <ReviewModal review={review} setReview={setReview} onSaved={load} />}
    </div>
  )
}

function ReviewModal({ review, setReview, onSaved }) {
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (review.status === 'rejected' && !review.remarks.trim()) return toast.error('Add remarks when rejecting an application.')
    setSaving(true)
    try {
      await governmentProgramService.updateApplicationStatus(review.application.application_id, { status: review.status, remarks: review.remarks })
      toast.success('Application status updated.')
      setReview(null)
      await onSaved()
    } catch (requestError) {
      toast.error(requestError.response?.data?.errors?.status?.[0] ?? requestError.response?.data?.message ?? 'Unable to update the application.')
    } finally { setSaving(false) }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl"><h2 className="text-lg font-black text-slate-950">Review {review.application.seeker.name}</h2><label className="mt-5 block text-sm font-bold text-slate-700">Application status<select value={review.status} onChange={(event) => setReview((current) => ({ ...current, status: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5">{APPLICATION_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="mt-4 block text-sm font-bold text-slate-700">Admin remarks{review.status === 'rejected' && <span className="ml-1 text-red-500">*</span>}<textarea value={review.remarks} onChange={(event) => setReview((current) => ({ ...current, remarks: event.target.value }))} rows={4} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="Record the reason or next steps." /></label><div className="mt-6 flex justify-end gap-2"><button onClick={() => setReview(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Cancel</button><button onClick={save} disabled={saving} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save Status'}</button></div></div></div>
}
