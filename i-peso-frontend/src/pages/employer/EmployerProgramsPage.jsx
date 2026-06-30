import { GraduationCap, Send, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import ProgramCard from '@/components/government-programs/ProgramCard'
import { getEmployerApplications } from '@/services/employerApplicationService'
import governmentProgramService from '@/services/governmentProgramService'

export default function EmployerProgramsPage() {
  const [programs, setPrograms] = useState([])
  const [applications, setApplications] = useState([])
  const [skill, setSkill] = useState('')
  const [loading, setLoading] = useState(true)
  const [recommend, setRecommend] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const [programRows, applicationResponse] = await Promise.all([governmentProgramService.employerPrograms({ skill }), getEmployerApplications({ per_page: 100 })]); setPrograms(programRows); setApplications((applicationResponse.data ?? []).filter((application) => ['reviewed', 'shortlisted'].includes(application.status))) }
    catch { toast.error('Unable to load training programs.') }
    finally { setLoading(false) }
  }, [skill])
  useEffect(() => { const timer = window.setTimeout(load, 220); return () => window.clearTimeout(timer) }, [load])

  return <div className="space-y-6"><header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase text-blue-800">PESO Workforce Development</p><h1 className="mt-1 text-3xl font-black text-slate-950">Training Programs</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review active local training, the skills each program covers, and guide nearly qualified applicants toward a stronger next step.</p></div><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={skill} onChange={(event) => setSkill(event.target.value)} placeholder="Filter by skill" className="rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm" /></label></header>
    {loading ? <div className="py-16 text-center text-sm font-semibold text-slate-500">Loading active programs...</div> : programs.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center"><GraduationCap className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-black text-slate-800">No active programs match this skill.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{programs.map((program) => <div key={program.program_id} className="flex flex-col gap-2"><ProgramCard program={program} /><button onClick={() => setRecommend({ program, application_id: '', message: '' })} disabled={applications.length === 0} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-900 px-4 py-2 text-sm font-bold text-blue-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"><Send className="h-4 w-4" />Recommend to Applicant</button></div>)}</div>}
    {recommend && <RecommendModal state={recommend} setState={setRecommend} applications={applications} />}
  </div>
}

function RecommendModal({ state, setState, applications }) {
  const [sending, setSending] = useState(false)
  const send = async () => {
    if (!state.application_id) return toast.error('Choose an applicant.')
    setSending(true)
    try { await governmentProgramService.recommendApplicant({ application_id: state.application_id, program_id: state.program.program_id, message: state.message || null }); toast.success('Upskill recommendation sent.'); setState(null) }
    catch (requestError) { toast.error(requestError.response?.data?.message ?? 'Unable to send the recommendation.') }
    finally { setSending(false) }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl"><h2 className="text-lg font-black text-slate-950">Recommend {state.program.title}</h2><p className="mt-2 text-sm text-slate-600">Choose a reviewed or shortlisted applicant who is close to qualifying.</p><label className="mt-5 block text-sm font-bold text-slate-700">Applicant<select value={state.application_id} onChange={(event) => setState((current) => ({ ...current, application_id: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="">Choose applicant</option>{applications.map((application) => <option key={application.apply_id} value={application.apply_id}>{application.seeker?.name ?? 'Applicant'} · {application.job?.job_title ?? 'Vacancy'}</option>)}</select></label><label className="mt-4 block text-sm font-bold text-slate-700">Optional message<textarea value={state.message} onChange={(event) => setState((current) => ({ ...current, message: event.target.value }))} rows={4} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="Explain which missing skill this program can help build." /></label><div className="mt-6 flex justify-end gap-2"><button onClick={() => setState(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Cancel</button><button onClick={send} disabled={sending} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{sending ? 'Sending...' : 'Send Recommendation'}</button></div></div></div>
}
