import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, ClipboardCheck, Clock3, Download, Save } from 'lucide-react'
import { AlertBox, Badge, Button, Card, EmptyState, LoadingSkeleton } from '@/components/ui'
import EstablishmentReportPreview from '@/components/reports/EstablishmentReportPreview'
import JobFairResultEntryEditor from '@/components/reports/JobFairResultEntryEditor'
import { blankResultEntry } from '@/components/reports/jobFairResultVocab'
import { useForm, FormProvider, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  downloadJobFairResult,
  listEmployerJobFairs,
  searchApplicantSuggestions,
  submitJobFairResults,
} from '@/services/jobFairService'
import { toast } from 'sonner'

const ELIGIBLE_STATUSES = ['approved', 'attended', 'encoded_results', 'report_generated']
const MISMATCH_STATUSES = ['employer_mismatch', 'seeker_mismatch']

const RESULT_STATS = [
  ['total_applicants', 'Applicants', 'neutral'],
  ['total_male', 'Male', 'neutral'],
  ['total_female', 'Female', 'neutral'],
  ['total_qualified', 'Qualified', 'review'],
  ['total_hots', 'HOTS', 'verified'],
  ['total_near_hired', 'Near Hired', 'review'],
  ['total_rejected', 'Mismatched', 'rejected'],
]

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20'

function FormField({ label, value, onChange, className = '' }) {
  return (
    <label className={`text-[11px] font-extrabold uppercase tracking-wider text-slate-500 ${className}`}>
      {label}
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={`mt-2 normal-case ${inputClass}`} />
    </label>
  )
}

function FairPickerCard({ fair, onClick }) {
  const submitted = Boolean(fair.participation?.result_report?.id)
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col items-start gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-navy hover:shadow-md"
    >
      <div className="flex w-full items-start justify-between gap-2">
        <h3 className="font-black tracking-tight text-slate-950">{fair.title}</h3>
        <Badge variant={submitted ? 'verified' : 'warning'} className="shrink-0">{submitted ? 'Submitted' : 'Not yet submitted'}</Badge>
      </div>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />{fair.start_date}
      </span>
      <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand-navy opacity-0 transition-opacity group-hover:opacity-100">
        {submitted ? 'View / resubmit' : 'Submit report'} <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </button>
  )
}

const formSchema = z.object({
  entries: z.array(z.any()),
  clearanceNo: z.string().optional(),
  vacancies: z.object({
    solicited: z.number().min(0),
    offered: z.number().min(0),
  }),
  remarks: z.string().optional(),
})

export default function EmployerEstablishmentReportPage() {
  const [fairs, setFairs] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)

  const methods = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entries: [blankResultEntry()],
      clearanceNo: '',
      vacancies: { solicited: 0, offered: 0 },
      remarks: '',
    },
  })
  
  const { control, reset, handleSubmit } = methods
  const entries = useWatch({ control, name: 'entries' }) || []

  const eligibleFairs = useMemo(
    () => fairs.filter((fair) => ELIGIBLE_STATUSES.includes(fair.participation?.status)),
    [fairs],
  )
  const selected = useMemo(
    () => eligibleFairs.find((x) => String(x.job_fair_id) === String(selectedId)),
    [eligibleFairs, selectedId],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setFairs(await listEmployerJobFairs())
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Unable to load Job Fairs.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    reset({
      entries: [blankResultEntry()],
      clearanceNo: '',
      vacancies: { solicited: 0, offered: 0 },
      remarks: '',
    })
  }, [selectedId, reset])

  const validEntries = entries.filter((e) => e.applicant_name && e.position_applied_for)
  const totals = {
    total_male: validEntries.filter((e) => e.gender === 'male').length,
    total_female: validEntries.filter((e) => e.gender === 'female').length,
    total_applicants: validEntries.length,
    total_qualified: validEntries.filter((e) => e.status === 'qualified').length,
    total_hots: validEntries.filter((e) => e.status === 'hots').length,
    total_near_hired: validEntries.filter((e) => e.status === 'near_hired').length,
    total_rejected: validEntries.filter((e) => MISMATCH_STATUSES.includes(e.status)).length,
  }

  const download = async () => {
    try {
      const blob = await downloadJobFairResult(selected.participation.result_report.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `ro1-jf-form-3-${selected.job_fair_id}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Unable to generate report.')
    }
  }

  const onSubmit = async (data) => {
    try {
      await submitJobFairResults(selected.job_fair_id, {
        ...totals,
        clearance_no: data.clearanceNo || null,
        total_vacancies_solicited: data.vacancies.solicited,
        total_vacancies_offered: data.vacancies.offered,
        remarks: data.remarks,
        entries: validEntries.map((e) => ({ ...e, mismatch_code: e.mismatch_code || null })),
      })
      toast.success('Establishment Report saved.')
      await load()
    } catch (e) {
      toast.error(Object.values(e.response?.data?.errors ?? {}).flat().join(' ') || e.response?.data?.message || 'Action failed.')
    }
  }

  const alreadySubmitted = Boolean(selected?.participation?.result_report?.id)

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-black uppercase tracking-widest text-brand-navy">DOLE Region I Job Fair Reporting</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Establishment Report</h1>
        <p className="mt-1.5 text-sm font-bold text-slate-500">RO1-JF Form 3</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Encode post-event results for every Job Fair you were approved to participate in.
        </p>
      </header>

      {loading ? (
        <LoadingSkeleton variant="card" rows={2} />
      ) : !eligibleFairs.length ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="No approved Job Fair participation yet"
            description="You must be an approved participant of a Job Fair before you can submit an Establishment Report (RO1-JF Form 3). Join a Job Fair and get approved first."
            action={{ label: 'Browse Job Fairs', to: '/employer/job-fairs' }}
          />
        </Card>
      ) : !selected ? (
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-950">Eligible Job Fairs</h2>
          <p className="mt-1.5 text-sm text-slate-500">Select an event to submit or review its Establishment Report.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {eligibleFairs.map((fair) => (
              <FairPickerCard key={fair.job_fair_id} fair={fair} onClick={() => setSelectedId(String(fair.job_fair_id))} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <button type="button" onClick={() => setSelectedId('')} className="flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to eligible Job Fairs
          </button>

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">{selected.title}</h2>
                <p className="mt-1.5 text-sm font-medium text-slate-500">{selected.start_date} · {selected.venue}</p>
              </div>
              <Badge variant={alreadySubmitted ? 'verified' : 'warning'} className="shrink-0">{alreadySubmitted ? 'Submitted' : 'Not yet submitted'}</Badge>
            </div>

            {alreadySubmitted && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-800">Previously submitted report</p>
                  <Button variant="outline" icon={Download} onClick={download}>Download RO1-JF Form 3</Button>
                </div>
                <EstablishmentReportPreview report={selected.participation.result_report} jobFair={selected} />
              </div>
            )}
          </Card>

          <Card>
            <p className="text-lg font-black tracking-tight text-slate-950">{alreadySubmitted ? 'Resubmit Establishment Report' : 'Submit Establishment Report'}</p>
            <p className="mt-1.5 text-sm font-medium text-slate-500">Enter applicants from your physical notes after the event.</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {RESULT_STATS.map(([key, label, status]) => (
                <Badge key={key} variant={status} icon={false}>
                  <span className="text-sm font-black">{totals[key]}</span> {label}
                </Badge>
              ))}
            </div>

            <FormProvider {...methods}>
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
                <JobFairResultEntryEditor control={control} name="entries" searchApplicants={searchApplicantSuggestions} />

                <div className="mt-8 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
                  <Controller name="clearanceNo" control={control} render={({ field }) => (
                    <FormField label="Job Fair Clearance No." {...field} />
                  )} />
                  <div />
                  
                  <Controller name="vacancies.solicited" control={control} render={({ field: { value, onChange } }) => (
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Vacancies solicited
                      <input type="number" min="0" value={value} onChange={(e) => onChange(Number(e.target.value))} className={`mt-2 ${inputClass}`} />
                    </label>
                  )} />

                  <Controller name="vacancies.offered" control={control} render={({ field: { value, onChange } }) => (
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Vacancies offered
                      <input type="number" min="0" value={value} onChange={(e) => onChange(Number(e.target.value))} className={`mt-2 ${inputClass}`} />
                    </label>
                  )} />

                  <Controller name="remarks" control={control} render={({ field }) => (
                    <FormField label="Remarks (optional)" className="sm:col-span-2" {...field} />
                  )} />
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
                  <Button
                    type="submit"
                    icon={Save}
                    disabled={!validEntries.length}
                  >
                    Save Establishment Report
                  </Button>
                  {!validEntries.length && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Clock3 className="h-3.5 w-3.5" />Add at least one applicant with a name and position to save.</span>
                  )}
                </div>
              </form>
            </FormProvider>
          </Card>
        </div>
      )}
    </div>
  )
}
