import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import SkillTaxonomyTags from '@/components/form/SkillTaxonomyTags'
import { getVacancies } from '@/services/employerService'
import governmentProgramService from '@/services/governmentProgramService'

const empty = { skills: [], job_vacancy_id: '', workers_needed: 1, reason: '', preferred_training_timeline: '', remarks: '' }
const fieldClass = 'mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10'

export default function EmployerUpskillNeedForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [vacancies, setVacancies] = useState([])
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    Promise.all([getVacancies({ per_page: 100 }), id ? governmentProgramService.employerNeeds({ per_page: 100 }) : Promise.resolve(null)]).then(([vacancyResponse, needsResponse]) => {
      setVacancies(vacancyResponse.data ?? [])
      if (id) {
        const need = needsResponse.data?.find((item) => String(item.demand_id) === String(id))
        if (!need) throw new Error('Request not found')
        setForm({ ...empty, ...need, skills: [{ id: need.skill_id, skill_id: need.skill_id, name: need.skill_name }] })
      }
    }).catch(() => toast.error('Unable to load the request form.')).finally(() => setLoading(false))
  }, [id])

  const update = (name, value) => { setForm((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: undefined })) }
  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (!form.skills.length) next.skill_name = 'Choose the needed skill.'
    if (Number(form.workers_needed) < 1) next.workers_needed = 'Enter at least one worker.'
    if (!form.reason.trim()) next.reason = 'Explain why this training demand matters.'
    if (Object.keys(next).length) return setErrors(next)
    setSaving(true)
    const skill = form.skills[0]
    const vacancy = vacancies.find((item) => String(item.post_id) === String(form.job_vacancy_id))
    const payload = { skill_id: skill.skill_id ?? skill.id ?? null, skill_name: skill.name, job_vacancy_id: form.job_vacancy_id || null, occupation_id: vacancy?.occupation_id ?? null, workers_needed: Number(form.workers_needed), reason: form.reason, preferred_training_timeline: form.preferred_training_timeline || null, remarks: form.remarks || null }
    try { if (id) await governmentProgramService.updateEmployerNeed(id, payload); else await governmentProgramService.createEmployerNeed(payload); toast.success(id ? 'Skill demand updated.' : 'Skill demand submitted to PESO.'); navigate('/employer/upskill-needs') }
    catch (requestError) { const server = requestError.response?.data?.errors ?? {}; setErrors(Object.fromEntries(Object.entries(server).map(([key, messages]) => [key, messages?.[0]]))); toast.error(requestError.response?.data?.message ?? 'Unable to submit the request.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="py-16 text-center text-sm font-semibold text-slate-500">Loading request...</div>
  return <div className="mx-auto max-w-3xl space-y-6"><button onClick={() => navigate('/employer/upskill-needs')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4" />Upskill Needs</button><header><p className="text-xs font-black uppercase text-blue-800">Employer Workforce Demand</p><h1 className="mt-1 text-3xl font-black text-slate-950">{id ? 'Edit Skill Demand' : 'Submit Skill Demand'}</h1><p className="mt-2 text-sm leading-6 text-slate-600">Company information is taken from your verified employer profile.</p></header><form onSubmit={submit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SkillTaxonomyTags value={form.skills} onChange={(skills) => update('skills', skills.slice(-1))} output="objects" mode="employer" category="technical" label="Needed Skill" required limit={1} error={errors.skill_name} placeholder="Search the skill employers cannot find" /><label className="block text-sm font-bold text-slate-700">Related Vacancy<select value={form.job_vacancy_id ?? ''} onChange={(event) => update('job_vacancy_id', event.target.value)} className={fieldClass}><option value="">General company need</option>{vacancies.map((vacancy) => <option key={vacancy.post_id} value={vacancy.post_id}>{vacancy.job_title}</option>)}</select></label><label className="block text-sm font-bold text-slate-700">Number of Workers Needed<input type="number" min="1" value={form.workers_needed} onChange={(event) => update('workers_needed', event.target.value)} className={fieldClass} />{errors.workers_needed && <span className="mt-1 block text-xs text-red-600">{errors.workers_needed}</span>}</label><label className="block text-sm font-bold text-slate-700">Reason for Demand<textarea value={form.reason} onChange={(event) => update('reason', event.target.value)} rows={5} className={fieldClass} placeholder="Describe the hiring gap, tools, certification, or practical competency needed." />{errors.reason && <span className="mt-1 block text-xs text-red-600">{errors.reason}</span>}</label><label className="block text-sm font-bold text-slate-700">Preferred Training Timeline<input value={form.preferred_training_timeline ?? ''} onChange={(event) => update('preferred_training_timeline', event.target.value)} className={fieldClass} placeholder="e.g. Within the next 3 months" /></label><label className="block text-sm font-bold text-slate-700">Optional Remarks<textarea value={form.remarks ?? ''} onChange={(event) => update('remarks', event.target.value)} rows={3} className={fieldClass} /></label><div className="flex justify-end border-t border-slate-100 pt-5"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{id ? 'Save Changes' : 'Submit to PESO'}</button></div></form></div>
}
