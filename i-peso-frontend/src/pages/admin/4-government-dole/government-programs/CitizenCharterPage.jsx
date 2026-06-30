import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import PageHeader from '@/pages/admin/_components/PageHeader'
import governmentProgramService from '@/services/governmentProgramService'

const empty = { service_name: '', description: '', requirements: '', processing_time: '', fees: 'None', responsible_office: 'Urdaneta City PESO', steps: '', contact_info: '', status: 'published', display_order: 0 }

export default function CitizenCharterPage() {
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)

  const load = async () => {
    setLoading(true)
    try { setServices(await governmentProgramService.citizenCharter()) }
    catch { toast.error('Unable to load Citizen Charter services.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const archive = async () => {
    try { await governmentProgramService.archiveCitizenCharter(archiveTarget.service_id); toast.success('Service archived.'); setArchiveTarget(null); await load() }
    catch { toast.error('Unable to archive the service.') }
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/admin/government-programs')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4" />Programs Center</button>
      <PageHeader eyebrow="PESO Citizen Charter" title="Citizen Charter Services" subtitle="Maintain clear service requirements, processing commitments, offices, and procedures." actions={[{ label: 'Add Service', icon: Plus, onClick: () => setEditing(empty) }]} />
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="py-14 text-center text-sm font-semibold text-slate-500">Loading services...</div> : services.length === 0 ? <div className="py-14 text-center"><p className="font-bold text-slate-700">No Citizen Charter services yet.</p></div> : <div className="divide-y divide-slate-100">{services.map((service) => <article key={service.service_id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><h2 className="font-black text-slate-950">{service.service_name}</h2><span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${service.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{service.status}</span></div><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{service.description}</p><dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs"><div><dt className="font-bold text-slate-400">Processing time</dt><dd className="mt-1 font-semibold text-slate-700">{service.processing_time || 'Not specified'}</dd></div><div><dt className="font-bold text-slate-400">Fees</dt><dd className="mt-1 font-semibold text-slate-700">{service.fees || 'None'}</dd></div><div><dt className="font-bold text-slate-400">Responsible office</dt><dd className="mt-1 font-semibold text-slate-700">{service.responsible_office || 'PESO'}</dd></div></dl></div><div className="flex shrink-0 gap-1"><button title="Edit service" onClick={() => setEditing({ ...service, requirements: (service.requirements ?? []).join('\n'), steps: (service.steps ?? []).join('\n') })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button><button title="Archive service" onClick={() => setArchiveTarget(service)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}
      </section>
      {editing && <CharterModal form={editing} setForm={setEditing} onSaved={load} />}
      {archiveTarget && <Confirm title="Archive service?" text={`${archiveTarget.service_name} will no longer appear in the public Citizen Charter.`} onCancel={() => setArchiveTarget(null)} onConfirm={archive} />}
    </div>
  )
}

function CharterModal({ form, setForm, onSaved }) {
  const [saving, setSaving] = useState(false)
  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  const save = async () => {
    if (!form.service_name.trim()) return toast.error('Service name is required.')
    setSaving(true)
    const payload = { ...form, requirements: lines(form.requirements), steps: lines(form.steps), display_order: Number(form.display_order || 0) }
    try {
      if (form.service_id) await governmentProgramService.updateCitizenCharter(form.service_id, payload)
      else await governmentProgramService.createCitizenCharter(payload)
      toast.success('Citizen Charter service saved.'); setForm(null); await onSaved()
    } catch (requestError) { toast.error(requestError.response?.data?.message ?? 'Unable to save the service.') }
    finally { setSaving(false) }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-2xl"><h2 className="text-lg font-black text-slate-950">{form.service_id ? 'Edit Service' : 'Add Citizen Charter Service'}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Input label="Service name" value={form.service_name} onChange={(value) => update('service_name', value)} wide /><TextArea label="Description" value={form.description} onChange={(value) => update('description', value)} wide /><TextArea label="Requirements" hint="One per line" value={form.requirements} onChange={(value) => update('requirements', value)} /><TextArea label="Procedure" hint="One step per line" value={form.steps} onChange={(value) => update('steps', value)} /><Input label="Processing time" value={form.processing_time} onChange={(value) => update('processing_time', value)} /><Input label="Fees" value={form.fees} onChange={(value) => update('fees', value)} /><Input label="Responsible office/person" value={form.responsible_office} onChange={(value) => update('responsible_office', value)} /><Input label="Contact information" value={form.contact_info} onChange={(value) => update('contact_info', value)} /><label className="text-sm font-bold text-slate-700">Status<select value={form.status} onChange={(event) => update('status', event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><Input label="Display order" type="number" value={form.display_order} onChange={(value) => update('display_order', value)} /></div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setForm(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Cancel</button><button onClick={save} disabled={saving} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save Service'}</button></div></div></div>
}
function Input({ label, value, onChange, type = 'text', wide = false }) { return <label className={`text-sm font-bold text-slate-700 ${wide ? 'sm:col-span-2' : ''}`}>{label}<input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label> }
function TextArea({ label, hint, value, onChange, wide = false }) { return <label className={`text-sm font-bold text-slate-700 ${wide ? 'sm:col-span-2' : ''}`}>{label}{hint && <span className="ml-2 text-xs font-normal text-slate-400">{hint}</span>}<textarea rows={4} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label> }
function Confirm({ title, text, onCancel, onConfirm }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"><h2 className="text-lg font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p><div className="mt-6 flex justify-end gap-2"><button onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Cancel</button><button onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">Archive</button></div></div></div> }
function lines(value) { return String(value ?? '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean) }
