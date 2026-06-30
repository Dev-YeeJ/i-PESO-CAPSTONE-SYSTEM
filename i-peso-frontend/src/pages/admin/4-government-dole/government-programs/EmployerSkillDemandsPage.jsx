import { ArrowLeft, BriefcaseBusiness, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import PageHeader from '@/pages/admin/_components/PageHeader'
import governmentProgramService from '@/services/governmentProgramService'

const statuses = ['submitted', 'reviewed', 'linked_to_program', 'resolved', 'archived']

export default function EmployerSkillDemandsPage() {
  const navigate = useNavigate()
  const [demands, setDemands] = useState([])
  const [programs, setPrograms] = useState([])
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [loading, setLoading] = useState(true)
  const [review, setReview] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [demandResponse, programResponse] = await Promise.all([
        governmentProgramService.adminSkillDemands({ ...filters, per_page: 100 }),
        governmentProgramService.adminPrograms({ status: 'open', per_page: 100 }),
      ])
      setDemands(demandResponse.data ?? [])
      setPrograms(programResponse.data ?? [])
    } catch { toast.error('Unable to load employer skill demands.') }
    finally { setLoading(false) }
  }, [filters])
  useEffect(() => { const timer = window.setTimeout(load, 220); return () => window.clearTimeout(timer) }, [load])

  return <div className="space-y-6"><button onClick={() => navigate('/admin/government-programs')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4" />Programs Center</button><PageHeader eyebrow="Employer Demand Intelligence" title="Employer Skill Demands" subtitle="Review hard-to-fill skills and connect local hiring needs to an active training program." />
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black text-slate-950">Demand Queue</h2><p className="mt-1 text-sm text-slate-500">{demands.length} requests in the current view</p></div><div className="flex gap-2"><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Skill or company" className="rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm" /></label><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></div></div>
      {loading ? <div className="py-14 text-center text-sm font-semibold text-slate-500">Loading requests...</div> : demands.length === 0 ? <div className="py-14 text-center"><BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold text-slate-700">No employer skill demands found.</p></div> : <div className="divide-y divide-slate-100">{demands.map((demand) => <article key={demand.demand_id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-950">{demand.skill_name}</h3><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-600">{label(demand.status)}</span></div><p className="mt-1 text-sm font-semibold text-slate-700">{demand.employer?.company_name} · {demand.workers_needed} workers</p><p className="mt-2 line-clamp-2 text-sm text-slate-500">{demand.reason}</p><div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-500"><span>Vacancy: {demand.vacancy?.job_title ?? 'Not linked'}</span><span>Timeline: {demand.preferred_training_timeline || 'Flexible'}</span>{demand.linked_program && <span className="text-emerald-700">Program: {demand.linked_program.program_name}</span>}</div>{demand.admin_remarks && <p className="mt-2 text-xs font-semibold text-blue-800">PESO remarks: {demand.admin_remarks}</p>}</div><button onClick={() => setReview({ ...demand, linked_program_id: demand.linked_program_id ?? '', admin_remarks: demand.admin_remarks ?? '' })} className="shrink-0 rounded-lg border border-blue-900 px-4 py-2.5 text-sm font-bold text-blue-900">Review Request</button></article>)}</div>}
    </section>{review && <DemandReview review={review} setReview={setReview} programs={programs} onSaved={load} />}</div>
}

function DemandReview({ review, setReview, programs, onSaved }) {
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (review.status === 'linked_to_program' && !review.linked_program_id) return toast.error('Choose the linked training program.')
    setSaving(true)
    try { await governmentProgramService.reviewSkillDemand(review.demand_id, { status: review.status, linked_program_id: review.linked_program_id || null, admin_remarks: review.admin_remarks }); toast.success('Skill demand updated.'); setReview(null); await onSaved() }
    catch (requestError) { toast.error(requestError.response?.data?.message ?? 'Unable to review the demand.') }
    finally { setSaving(false) }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl"><h2 className="text-lg font-black text-slate-950">Review {review.skill_name}</h2><label className="mt-5 block text-sm font-bold text-slate-700">Status<select value={review.status} onChange={(event) => setReview((current) => ({ ...current, status: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5">{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>{review.status === 'linked_to_program' && <label className="mt-4 block text-sm font-bold text-slate-700">Linked program<select value={review.linked_program_id} onChange={(event) => setReview((current) => ({ ...current, linked_program_id: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="">Choose program</option>{programs.map((program) => <option key={program.program_id} value={program.program_id}>{program.title}</option>)}</select></label>}<label className="mt-4 block text-sm font-bold text-slate-700">Admin remarks<textarea value={review.admin_remarks} onChange={(event) => setReview((current) => ({ ...current, admin_remarks: event.target.value }))} rows={4} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><div className="mt-6 flex justify-end gap-2"><button onClick={() => setReview(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Cancel</button><button onClick={save} disabled={saving} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save Review'}</button></div></div></div>
}
function label(value) { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
