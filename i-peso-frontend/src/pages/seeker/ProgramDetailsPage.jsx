import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Download, MapPin, Phone, Check, FileText, Target, UsersRound } from 'lucide-react'
import { createElement, useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from '@/lib/toast'
import { ErrorState, LoadingSkeleton } from '@/components/ui'
import { categoryLabel, statusLabel } from '@/components/government-programs/programConstants'
import EligibilityBadge from '@/components/government-programs/EligibilityBadge'
import EligibilityBreakdown from '@/components/government-programs/EligibilityBreakdown'
import governmentProgramService from '@/services/governmentProgramService'
import PortalPageHeader from '@/components/shell/PortalPageHeader'

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
    <div className="mx-auto max-w-[1440px] space-y-6 pb-12">
      <button onClick={() => navigate('/seeker/government-programs')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-brand-navy">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Government Programs
      </button>

      <PortalPageHeader
        title={program.title}
        subtitle="Apply in person at the PESO office. There's no online application."
        chips={(
          <>
            <span className="rounded-full bg-[#e8f0fc] px-2.5 py-1 text-xs font-semibold text-brand-navy">{categoryLabel(program.category)}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{statusLabel(program.status)}</span>
            <EligibilityBadge eligibility={program.eligibility} />
            {program.recommendation_score > 0 && (
              <span className="rounded-full bg-brand-gold px-2.5 py-1 text-xs font-bold text-brand-navy">Recommended for you</span>
            )}
          </>
        )}
      />

      <div className="grid gap-8 lg:grid-cols-[1.8fr_1fr]">
        <main className="space-y-8">
          <Section title="About this program" icon={FileText}>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-700">{program.description}</p>
          </Section>

          <div className="grid gap-6">
            <Section title="Who can apply" icon={Target} className="h-full">
              <CheckList items={program.eligibility_requirements} empty="No specific eligibility requirements listed." />
            </Section>
          </div>

        </main>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="mb-6 text-lg font-semibold tracking-tight text-slate-900">How to apply in person</h2>
            <div className="relative space-y-2">
               <StepperSteps program={program} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Program details</h2>
            <dl className="mt-6 space-y-5">
              <Detail icon={Clock3} label="Deadline" value={formatDate(program.application_deadline)} />
              <Detail icon={MapPin} label="Venue" value={program.location_address || program.venue || 'PESO Office, Urdaneta City Hall'} />
              <Detail icon={UsersRound} label="Slots" value={program.total_slots === 0 ? 'Open capacity' : `${program.total_slots} slots`} />
              <Detail icon={Phone} label="Contact" value="PESO Programs Desk" />
            </dl>
            {program.has_attachment && (
              <button onClick={downloadAttachment} className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 text-sm font-semibold text-white transition hover:bg-[#0f2d56]">
                <Download className="h-4 w-4" aria-hidden="true" /> Download attachment
              </button>
            )}
          </div>
          
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <EligibilityBreakdown eligibility={program.eligibility} />
          </div>
        </aside>
      </div>

    </div>
  )
}

function Section({ title, icon: Icon, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-7 ${className}`}>
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
        {Icon && <Icon className="h-5 w-5 text-brand-navy" />}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
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
        {createElement(Icon, { className: 'h-5 w-5' })}
      </div>
      <div>
        <dt className="text-xs font-bold text-slate-500">{label}</dt>
        <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
      </div>
    </div>
  )
}

function StepperSteps({ program }) {
  const steps = [
    'Review the eligibility requirements and your profile-based estimate on this page.',
    `Confirm the current checklist, forms, schedule, and processing time in the PESO Citizen's Charter with PESO at ${program.location_address || program.venue || 'the PESO Office, Urdaneta City Hall'}.`,
    `Submit your application in person${program.application_deadline ? ` by ${formatDate(program.application_deadline)}` : ''}. PESO will verify your eligibility and explain the next steps.`,
  ];

  return steps.map((step, index) => (
    <div key={index} className="relative flex items-start gap-4">
      <div className="absolute left-4 top-4 -ml-[0.5px] h-full w-[2px] bg-[#c4d9f7]" style={{ display: index === steps.length - 1 ? 'none' : 'block' }}></div>
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-brand-navy text-xs font-bold text-white shadow-sm">
        {index + 1}
      </div>
      <div className="pt-1.5 pb-6">
        <p className="text-sm leading-relaxed text-slate-700">{step}</p>
      </div>
    </div>
  ))
}

function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url) }
