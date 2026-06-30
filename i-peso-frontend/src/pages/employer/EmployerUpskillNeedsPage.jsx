import { BriefcaseBusiness, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import governmentProgramService from '@/services/governmentProgramService'

export default function EmployerUpskillNeedsPage() {
  const navigate = useNavigate()
  const [needs, setNeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [removeTarget, setRemoveTarget] = useState(null)

  const load = async () => {
    setLoading(true)
    try { const response = await governmentProgramService.employerNeeds({ per_page: 100 }); setNeeds(response.data ?? []) }
    catch { toast.error('Unable to load skill demand requests.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const remove = async () => {
    try { await governmentProgramService.deleteEmployerNeed(removeTarget.demand_id); toast.success('Skill demand removed.'); setRemoveTarget(null); await load() }
    catch { toast.error('Unable to remove the request.') }
  }

  return <div className="space-y-6"><header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase text-blue-800">Workforce Development</p><h1 className="mt-1 text-3xl font-black text-slate-950">Upskill Needs</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Tell PESO which skills are difficult to hire so local training can respond to real workforce demand.</p></div><button onClick={() => navigate('/employer/upskill-needs/create')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" />Submit Skill Demand</button></header>
    {loading ? <div className="py-16 text-center text-sm font-semibold text-slate-500">Loading requests...</div> : needs.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center"><BriefcaseBusiness className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-3 font-black text-slate-800">No skill demand requests yet</h2><p className="mt-1 text-sm text-slate-500">Submit a hiring skill gap for PESO review.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{needs.map((need) => <article key={need.demand_id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${tone(need.status)}`}>{label(need.status)}</span><h2 className="mt-3 text-lg font-black text-slate-950">{need.skill_name}</h2><p className="mt-1 text-sm font-semibold text-slate-600">{need.workers_needed} workers · {need.vacancy?.job_title ?? 'General workforce need'}</p></div><div className="flex gap-1"><button title="Edit request" onClick={() => navigate(`/employer/upskill-needs/${need.demand_id}/edit`)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button><button title="Delete request" onClick={() => setRemoveTarget(need)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div><p className="mt-4 text-sm leading-6 text-slate-600">{need.reason}</p><dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs"><div><dt className="font-bold text-slate-400">Preferred timeline</dt><dd className="mt-1 font-semibold text-slate-700">{need.preferred_training_timeline || 'Flexible'}</dd></div><div><dt className="font-bold text-slate-400">Linked program</dt><dd className="mt-1 font-semibold text-slate-700">{need.linked_program?.program_name ?? 'Awaiting PESO review'}</dd></div></dl>{need.admin_remarks && <p className="mt-4 rounded-lg bg-blue-50 p-3 text-xs font-semibold leading-5 text-blue-800">PESO remarks: {need.admin_remarks}</p>}</article>)}</div>}
    {removeTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"><h2 className="text-lg font-black text-slate-950">Delete skill demand?</h2><p className="mt-2 text-sm leading-6 text-slate-600">This removes the {removeTarget.skill_name} request from your workspace.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setRemoveTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Cancel</button><button onClick={remove} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">Delete</button></div></div></div>}
  </div>
}

function label(value) { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function tone(status) { if (status === 'resolved' || status === 'linked_to_program') return 'border-emerald-200 bg-emerald-50 text-emerald-700'; if (status === 'submitted') return 'border-amber-200 bg-amber-50 text-amber-700'; if (status === 'reviewed') return 'border-blue-200 bg-blue-50 text-blue-700'; return 'border-slate-200 bg-slate-50 text-slate-600' }
