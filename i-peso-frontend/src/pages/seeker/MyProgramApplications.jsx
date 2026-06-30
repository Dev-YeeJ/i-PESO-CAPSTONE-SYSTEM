import { ArrowRight, Award, BookOpenCheck, FileUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { statusLabel, statusTone } from '@/components/government-programs/programConstants'
import governmentProgramService from '@/services/governmentProgramService'

export default function MyProgramApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [upload, setUpload] = useState(null)

  const load = async () => {
    setLoading(true)
    try { setApplications(await governmentProgramService.seekerApplications()) }
    catch { toast.error('Unable to load your program applications.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return <div className="space-y-6"><header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase text-blue-800">Upskill Hub</p><h1 className="mt-1 text-3xl font-black text-slate-950">My Program Applications</h1><p className="mt-2 text-sm text-slate-600">Track PESO review, next steps, completion, and supporting documents.</p></div><Link to="/seeker/upskill-hub" className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-bold text-white">Browse Programs<ArrowRight className="h-4 w-4" /></Link></header>
    {loading ? <div className="py-16 text-center text-sm font-semibold text-slate-500">Loading applications...</div> : applications.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center"><BookOpenCheck className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-3 font-black text-slate-800">No program applications yet</h2><p className="mt-1 text-sm text-slate-500">Browse the Upskill Hub to find training and government support.</p></div> : <div className="space-y-4">{applications.map((application) => <article key={application.application_id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black text-slate-950">{application.program.title}</h2><span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${statusTone[application.status] ?? statusTone.draft}`}>{statusLabel(application.status)}</span></div><p className="mt-2 text-sm text-slate-500">Applied {new Date(application.applied_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</p>{application.remarks && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">PESO remarks: {application.remarks}</p>}</div><Link to={`/seeker/upskill-hub/${application.program_id}`} className="shrink-0 text-sm font-bold text-blue-900">View Program</Link></div>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4"><span className="text-xs font-bold text-slate-500">{application.documents.length} supporting document{application.documents.length === 1 ? '' : 's'}</span><button onClick={() => setUpload({ application, document_type: 'requirement', document_name: '', file: null })} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"><FileUp className="h-4 w-4" />Add Document</button>{application.status === 'completed' && !application.certificate && <button onClick={() => setUpload({ application, document_type: 'certificate', document_name: 'Completion Certificate', file: null })} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"><Award className="h-4 w-4" />Upload Certificate</button>}{application.certificate && <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700"><Award className="h-4 w-4" />Certificate recorded</span>}</div>
        </article>)}</div>}
    {upload && <UploadModal upload={upload} setUpload={setUpload} onSaved={load} />}
  </div>
}

function UploadModal({ upload, setUpload, onSaved }) {
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!upload.document_name.trim() || !upload.file) return toast.error('Add a document name and choose a file.')
    setSaving(true)
    try { await governmentProgramService.uploadApplicationDocument(upload.application.application_id, upload); toast.success('Document uploaded securely.'); setUpload(null); await onSaved() }
    catch (requestError) { toast.error(requestError.response?.data?.message ?? 'Unable to upload the document.') }
    finally { setSaving(false) }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"><h2 className="text-lg font-black text-slate-950">{upload.document_type === 'certificate' ? 'Record Completion Certificate' : 'Add Supporting Document'}</h2><label className="mt-5 block text-sm font-bold text-slate-700">Document name<input value={upload.document_name} onChange={(event) => setUpload((current) => ({ ...current, document_name: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="e.g. Barangay Certificate" /></label><label className="mt-4 block cursor-pointer rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center"><FileUp className="mx-auto h-6 w-6 text-blue-900" /><span className="mt-2 block text-sm font-bold text-slate-700">{upload.file?.name ?? 'Choose PDF or image'}</span><span className="mt-1 block text-xs text-slate-500">Maximum 5 MB</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="sr-only" onChange={(event) => setUpload((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} /></label><div className="mt-6 flex justify-end gap-2"><button onClick={() => setUpload(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Cancel</button><button onClick={save} disabled={saving} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Uploading...' : 'Upload'}</button></div></div></div>
}
