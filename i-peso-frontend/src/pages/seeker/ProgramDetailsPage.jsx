import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Download, MapPin, Phone, Check, FileText, Target, UsersRound } from 'lucide-react'
import { createElement, useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ErrorState, LoadingSkeleton } from '@/components/ui'
import { categoryLabel, statusLabel } from '@/components/government-programs/programConstants'
import EligibilityBadge from '@/components/government-programs/EligibilityBadge'
import EligibilityBreakdown from '@/components/government-programs/EligibilityBreakdown'
import governmentProgramService from '@/services/governmentProgramService'

const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'long' }) : 'To be announced'

export default function ProgramDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [program, setProgram] = useState(null)
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

  if (error) return <ErrorState description={error} onRetry={() => { setError(''); load() }} />
  if (!program) return <div className="mx-auto max-w-6xl space-y-6"><LoadingSkeleton variant="text" rows={2} className="max-w-md" /><LoadingSkeleton variant="card" rows={3} /></div>

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <button onClick={() => navigate('/seeker/government-programs')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Government Programs
      </button>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 px-8 py-8 text-white shadow-xl ring-1 ring-white/10 sm:px-12 sm:py-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-wrap items-center gap-3 mb-6">
          <span className="rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3 py-1.5 text-xs font-bold tracking-wide shadow-sm">
            {categoryLabel(program.category)}
          </span>
          <span className="rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3 py-1.5 text-xs font-bold tracking-wide shadow-sm">
            {statusLabel(program.status)}
          </span>
          <div className="flex items-center">
             <EligibilityBadge eligibility={program.eligibility} />
          </div>
          {program.recommendation_score > 0 && (
            <span className="rounded-full border border-amber-300/30 bg-amber-400/20 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-amber-200 shadow-sm">
              Recommended for you
            </span>
          )}
        </div>
        
        <h1 className="relative z-10 text-3xl font-black tracking-tight sm:text-4xl text-white drop-shadow-sm">
          {program.title}
        </h1>
        <p className="relative z-10 mt-4 max-w-3xl text-base leading-relaxed text-blue-100">
          {program.short_description || (program.description && program.description.length > 150 ? program.description.slice(0, 150) + '...' : program.description)}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.8fr_1fr]">
        <main className="space-y-8">
          <Section title="About this program" icon={FileText}>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-700">{program.description}</p>
          </Section>

          <div className="grid gap-6 sm:grid-cols-2">
            <Section title="Eligibility" icon={Target} className="h-full">
              <CheckList items={program.eligibility_requirements} empty="No specific eligibility requirements listed." />
            </Section>
            <Section title="Required Documents" icon={CheckCircle2} className="h-full">
              <CheckList items={program.required_documents} empty="No documents required." />
            </Section>
          </div>

          <Section title="Skills Taught" icon={UsersRound}>
            <div className="flex flex-wrap gap-2">
              {program.skills.length ? program.skills.map((skill) => (
                <span key={skill.id} className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-1.5 text-sm font-semibold text-indigo-900 shadow-sm">
                  {skill.name}
                </span>
              )) : <p className="text-sm text-slate-500">No linked skills.</p>}
            </div>
          </Section>
        </main>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-blue-200 bg-gradient-to-b from-blue-50 to-white p-6 shadow-md shadow-blue-900/5">
            <h2 className="text-xl font-black tracking-tight text-blue-950 mb-6">How to Apply (In-Person)</h2>
            <div className="relative space-y-2">
               <StepperSteps program={program} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black tracking-tight text-slate-900">Program Details</h2>
            <dl className="mt-6 space-y-5">
              <Detail icon={CalendarDays} label="Schedule" value={`${formatDate(program.start_date)} to ${formatDate(program.end_date)}`} />
              <Detail icon={Clock3} label="Deadline" value={formatDate(program.application_deadline)} />
              <Detail icon={MapPin} label="Venue" value={program.venue || program.location_address || 'To be announced'} />
              <Detail icon={UsersRound} label="Slots" value={program.total_slots === 0 ? 'Open capacity' : `${program.available_slots} of ${program.total_slots} available`} />
              <Detail icon={Phone} label="Contact" value={[program.contact_person, program.contact_phone, program.contact_email].filter(Boolean).join(' · ') || 'PESO Programs Desk'} />
            </dl>
            {program.has_attachment && (
              <button onClick={downloadAttachment} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 shadow-md">
                <Download className="h-4 w-4" /> Download Attachment
              </button>
            )}
          </div>
          
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <EligibilityBreakdown eligibility={program.eligibility} />
          </div>
        </aside>
      </div>

    </div>
  )
}

function Section({ title, icon: Icon, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm ${className}`}>
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
        {Icon && <Icon className="h-5 w-5 text-indigo-600" />}
        <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function CheckList({ items = [], empty }) {
  return items.length ? (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3 text-sm leading-relaxed text-slate-700">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <span>{typeof item === 'string' ? item : item.label}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-slate-500 italic">{empty}</p>
  )
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 border border-slate-100">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</dt>
        <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
      </div>
    </div>
  )
}

function StepperSteps({ program }) {
  const steps = program.citizen_charter_steps?.length > 0 
    ? program.citizen_charter_steps
    : [
        "Gather all required documents listed on this page.",
        `Proceed to the PESO Office at ${program.venue || program.location_address || 'the City Hall'}.`,
        `Look for ${program.contact_person || 'the assigned PESO Officer'}.`,
        "Submit your documents and undergo a brief interview and assessment."
      ];

  return steps.map((step, index) => (
    <div key={index} className="relative flex items-start gap-4">
      <div className="absolute left-4 top-4 -ml-[0.5px] h-full w-[2px] bg-blue-200" style={{ display: index === steps.length - 1 ? 'none' : 'block' }}></div>
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-blue-600 text-xs font-bold text-white shadow-sm">
        {index + 1}
      </div>
      <div className="pt-1.5 pb-6">
        <p className="text-sm font-semibold text-blue-950 leading-relaxed">{step}</p>
      </div>
    </div>
  ))
}

function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url) }
