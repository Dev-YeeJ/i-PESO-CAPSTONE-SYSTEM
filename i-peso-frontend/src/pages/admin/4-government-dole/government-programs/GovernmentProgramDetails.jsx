import { ArrowLeft, CalendarDays, Download, MapPin, Pencil, UsersRound } from 'lucide-react'
import { createElement, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { categoryLabel, categoryTone, statusLabel, statusTone } from '@/components/government-programs/programConstants'
import governmentProgramService from '@/services/governmentProgramService'

const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'Not set'

export default function GovernmentProgramDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [program, setProgram] = useState(null)
  const [error, setError] = useState('')

  const downloadAttachment = async () => {
    try {
      const blob = await governmentProgramService.adminProgramAttachment(id)
      downloadBlob(blob, `${program.slug || 'government-program'}-attachment`)
    } catch {
      toast.error('Unable to download the attachment.')
    }
  }

  useEffect(() => {
    governmentProgramService.adminProgram(id).then(setProgram).catch((requestError) => setError(requestError.response?.data?.message ?? 'Unable to load the program.'))
  }, [id])

  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
  if (!program) return <div className="py-16 text-center text-sm font-semibold text-slate-500">Loading program...</div>

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <button onClick={() => navigate('/admin/government-programs')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-900"><ArrowLeft className="h-4 w-4" />Back to programs</button>
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${categoryTone[program.category] ?? categoryTone.other}`}>{categoryLabel(program.category)}</span><span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${statusTone[program.status] ?? statusTone.draft}`}>{statusLabel(program.status)}</span></div>
          <h1 className="mt-3 text-3xl font-black text-slate-950">{program.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{program.short_description || program.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate(`/admin/government-programs/${id}/edit`)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"><Pencil className="h-4 w-4" />Edit</button>
          <button onClick={() => navigate(`/admin/government-programs/${id}/applications`)} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-bold text-white"><UsersRound className="h-4 w-4" />Applicants</button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Applicants" value={program.applications_count ?? 0} />
        <Stat label="Approved" value={program.approved_count ?? 0} />
        <Stat label="Completed" value={program.completed_count ?? 0} />
        <Stat label="Available Slots" value={program.total_slots === 0 ? 'Open' : `${program.available_slots} / ${program.total_slots}`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <ContentSection title="Program Description"><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{program.description}</p></ContentSection>
          <ContentSection title="Eligibility Requirements"><ItemList items={program.eligibility_requirements} empty="No eligibility requirements listed." /></ContentSection>
          <ContentSection title="Required Documents"><ItemList items={program.required_documents} empty="No documents required." /></ContentSection>
          <ContentSection title="Skills Taught or Targeted"><div className="flex flex-wrap gap-2">{program.skills.length ? program.skills.map((skill) => <span key={skill.id} className="rounded-md border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-bold text-cyan-800">{skill.name}</span>) : <p className="text-sm text-slate-500">No linked skills.</p>}</div></ContentSection>
        </div>
        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Schedule & Venue</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <Detail icon={CalendarDays} label="Program dates" value={`${formatDate(program.start_date)} to ${formatDate(program.end_date)}`} />
              <Detail icon={CalendarDays} label="Application deadline" value={formatDate(program.application_deadline)} />
              <Detail icon={MapPin} label="Venue" value={program.venue || program.location_address || 'To be announced'} />
            </dl>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">Program Contact</h2>
            <p className="mt-4 text-sm font-bold text-slate-700">{program.contact_person || 'PESO Programs Desk'}</p>
            <p className="mt-1 text-sm text-slate-600">{program.contact_email || 'No email listed'}</p>
            <p className="mt-1 text-sm text-slate-600">{program.contact_phone || 'No phone listed'}</p>
            {program.has_attachment && <button onClick={downloadAttachment} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-900"><Download className="h-4 w-4" />Download attachment</button>}
          </div>
        </aside>
      </section>
    </div>
  )
}

function Stat({ label, value }) { return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-bold text-slate-500">{label}</p></div> }
function ContentSection({ title, children }) { return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-black text-slate-950">{title}</h2>{children}</section> }
function ItemList({ items = [], empty }) { return items.length ? <ul className="space-y-2">{items.map((item, index) => <li key={`${index}-${typeof item === 'string' ? item : item.label}`} className="flex gap-2 text-sm leading-6 text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-900" />{typeof item === 'string' ? item : item.label}</li>)}</ul> : <p className="text-sm text-slate-500">{empty}</p> }
function Detail({ icon: Icon, label, value }) { return <div className="flex gap-3">{createElement(Icon, { className: 'mt-0.5 h-4 w-4 shrink-0 text-slate-400' })}<div><dt className="text-xs font-bold text-slate-400">{label}</dt><dd className="mt-1 font-semibold text-slate-700">{value}</dd></div></div> }
function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url) }
