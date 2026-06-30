import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Download, FileText, MapPin, Phone, UsersRound } from 'lucide-react'
import { createElement, useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { categoryLabel, categoryTone, statusLabel, statusTone } from '@/components/government-programs/programConstants'
import governmentProgramService from '@/services/governmentProgramService'

const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'long' }) : 'To be announced'

export default function ProgramDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [program, setProgram] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')

  const downloadAttachment = async () => {
    try {
      const blob = await governmentProgramService.seekerProgramAttachment(id)
      downloadBlob(blob, `${program.slug || 'government-program'}-attachment`)
    } catch {
      toast.error('Unable to download the attachment.')
    }
  }

  const load = useCallback(() => governmentProgramService.seekerProgram(id).then(setProgram).catch((requestError) => setError(requestError.response?.data?.message ?? 'Unable to load the program.')), [id])
  useEffect(() => { load() }, [load])

  const apply = async () => {
    setApplying(true)
    try { await governmentProgramService.applyToProgram(id); toast.success('Application submitted to PESO.'); setConfirming(false); await load() }
    catch (requestError) { toast.error(requestError.response?.data?.errors?.program?.[0] ?? requestError.response?.data?.message ?? 'Unable to submit the application.') }
    finally { setApplying(false) }
  }

  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
  if (!program) return <div className="py-16 text-center text-sm font-semibold text-slate-500">Loading program...</div>

  return <div className="mx-auto max-w-6xl space-y-6"><button onClick={() => navigate('/seeker/upskill-hub')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4" />Back to Upskill Hub</button>
    <header className="border-b border-slate-200 pb-6"><div className="flex flex-wrap gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${categoryTone[program.category] ?? categoryTone.other}`}>{categoryLabel(program.category)}</span><span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${statusTone[program.status] ?? statusTone.draft}`}>{statusLabel(program.status)}</span>{program.recommendation_score > 0 && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-700">Recommended for you</span>}</div><h1 className="mt-4 text-3xl font-black text-slate-950">{program.title}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{program.short_description || program.description}</p></header>
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]"><main className="space-y-5"><Section title="About this program"><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{program.description}</p></Section><Section title="Eligibility"><List items={program.eligibility_requirements} empty="No eligibility requirements listed." /></Section><Section title="Required documents"><List items={program.required_documents} empty="No documents required." /></Section><Section title="Skills taught"><div className="flex flex-wrap gap-2">{program.skills.length ? program.skills.map((skill) => <span key={skill.id} className="rounded-md bg-cyan-50 px-2.5 py-1.5 text-xs font-bold text-cyan-800">{skill.name}</span>) : <p className="text-sm text-slate-500">No linked skills.</p>}</div></Section></main>
      <aside className="space-y-4"><div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black text-slate-950">Program Details</h2><dl className="mt-5 space-y-4"><Detail icon={CalendarDays} label="Schedule" value={`${formatDate(program.start_date)} to ${formatDate(program.end_date)}`} /><Detail icon={Clock3} label="Deadline" value={formatDate(program.application_deadline)} /><Detail icon={MapPin} label="Venue" value={program.venue || program.location_address || 'To be announced'} /><Detail icon={UsersRound} label="Slots" value={program.total_slots === 0 ? 'Open capacity' : `${program.available_slots} of ${program.total_slots} available`} /><Detail icon={Phone} label="Contact" value={[program.contact_person, program.contact_phone, program.contact_email].filter(Boolean).join(' · ') || 'PESO Programs Desk'} /></dl>{program.has_attachment && <button onClick={downloadAttachment} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-900"><Download className="h-4 w-4" />Program attachment</button>}</div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">{program.my_application ? <><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-5 w-5" /><h2 className="font-black">Application submitted</h2></div><p className="mt-2 text-sm text-slate-600">Current status: <strong>{statusLabel(program.my_application.status)}</strong></p>{program.my_application.remarks && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">PESO remarks: {program.my_application.remarks}</p>}<button onClick={() => navigate('/seeker/program-applications')} className="mt-4 w-full rounded-lg border border-blue-900 px-4 py-2.5 text-sm font-bold text-blue-900">Track Application</button></> : <><h2 className="font-black text-slate-950">Apply with your i-PESO profile</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your current profile is reused for the eligibility snapshot. Supporting documents can be added after submission.</p><button onClick={() => setConfirming(true)} disabled={!program.can_apply} className="mt-4 w-full rounded-lg bg-blue-900 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">{program.can_apply ? 'Apply / Register' : program.available_slots === 0 && program.total_slots > 0 ? 'Program Full' : 'Applications Closed'}</button></>}</div>
      </aside></div>
    {confirming && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"><FileText className="h-7 w-7 text-blue-900" /><h2 className="mt-3 text-lg font-black text-slate-950">Submit your application?</h2><p className="mt-2 text-sm leading-6 text-slate-600">i-PESO will send your profile snapshot to PESO for {program.title}. You can only apply once.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setConfirming(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Cancel</button><button onClick={apply} disabled={applying} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{applying ? 'Submitting...' : 'Confirm Application'}</button></div></div></div>}
  </div>
}

function Section({ title, children }) { return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-black text-slate-950">{title}</h2>{children}</section> }
function List({ items = [], empty }) { return items.length ? <ul className="space-y-2">{items.map((item, index) => <li key={`${index}-${typeof item === 'string' ? item : item.label}`} className="flex gap-2 text-sm leading-6 text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-900" />{typeof item === 'string' ? item : item.label}</li>)}</ul> : <p className="text-sm text-slate-500">{empty}</p> }
function Detail({ icon: Icon, label, value }) { return <div className="flex gap-3">{createElement(Icon, { className: 'mt-0.5 h-4 w-4 shrink-0 text-slate-400' })}<div><dt className="text-xs font-bold text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold leading-5 text-slate-700">{value}</dd></div></div> }
function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url) }
