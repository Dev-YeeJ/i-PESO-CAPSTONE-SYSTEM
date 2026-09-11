import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, Download, Eye, FileText, FileUp, MapPin, Save, ShieldCheck } from 'lucide-react'
import { AlertBox, Badge, Button, Card, CardHeader } from '@/components/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import EstablishmentReportPreview from '@/components/reports/EstablishmentReportPreview'
import JobFairResultEntryEditor from '@/components/reports/JobFairResultEntryEditor'
import { blankResultEntry } from '@/components/reports/jobFairResultVocab'
import {
  downloadJobFairResult,
  expressJobFairInterest,
  listEmployerJobFairs,
  respondToJobFairInvitation,
  searchApplicantSuggestions,
  submitJobFairConfirmation,
  submitJobFairResults,
  uploadJobFairRequirement,
  viewJobFairRequirement,
} from '@/services/jobFairService'

const blankConfirmation = {
  representative_1_name: '', representative_1_contact: '', representative_2_name: '', representative_2_contact: '',
  email: '', number_of_job_vacancies: 0, will_conduct_onsite_interview: false, logistics_requests: '',
}
const MISMATCH_STATUSES = ['employer_mismatch', 'seeker_mismatch']

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10'

export default function EmployerJobFairDashboard() {
  const [fairs, setFairs] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [confirmation, setConfirmation] = useState(blankConfirmation)
  const [entries, setEntries] = useState([blankResultEntry()])
  const [vacancies, setVacancies] = useState({ solicited: 0, offered: 0 })
  const [remarks, setRemarks] = useState('')
  const [clearanceNo, setClearanceNo] = useState('')
  const [viewingReport, setViewingReport] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selected = useMemo(() => fairs.find((x) => String(x.job_fair_id) === String(selectedId)) ?? fairs[0], [fairs, selectedId])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listEmployerJobFairs()
      setFairs(data)
      if (!selectedId && data[0]) setSelectedId(String(data[0].job_fair_id))
    } catch (e) {
      setError(e.response?.data?.message ?? 'Unable to load Job Fairs.')
    } finally {
      setLoading(false)
    }
  }, [selectedId])
  useEffect(() => { load() }, [load])

  const act = async (work, success) => {
    setError(''); setNotice('')
    try {
      await work()
      setNotice(success)
      await load()
    } catch (e) {
      setError(Object.values(e.response?.data?.errors ?? {}).flat().join(' ') || e.response?.data?.message || 'Action failed.')
    }
  }

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
      setError(e.response?.data?.message ?? 'Unable to generate report.')
    }
  }

  const viewSubmission = async (submission) => {
    setError('')
    try {
      const blob = await viewJobFairRequirement(submission.id)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch (e) {
      setError(e.response?.data?.message ?? 'Unable to open this document.')
    }
  }

  const requirementsDone = selected?.requirements?.length
    ? selected.requirements.every((req) => {
        const submitted = selected.participation?.requirements?.find((x) => x.job_fair_requirement_id === req.id)
        return submitted && submitted.status !== 'rejected'
      })
    : false

  return (
    <div className="portal-page">
      <div>
        <p className="portal-eyebrow">Job Fair Ecosystem</p>
        <h1 className="portal-title mt-1">Employer Coordination & Results</h1>
        <p className="portal-subtitle">Complete digital steps when convenient. No laptop, QR scanner, or live system use is required at the venue.</p>
      </div>

      {error && <AlertBox variant="danger" title="Job Fair action failed">{error}</AlertBox>}
      {notice && <AlertBox variant="success" title="Saved">{notice}</AlertBox>}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        <strong>During the physical event:</strong> use your normal table, paper resumes, screening, and interview process. Return here afterward to encode results from your notes.
      </div>

      {loading ? (
        <Card><p className="p-8 text-center text-slate-500">Loading announcements…</p></Card>
      ) : !fairs.length ? (
        <Card><p className="p-8 text-center text-slate-500">No published Job Fairs are available.</p></Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Job Fair announcement" subtitle="Select an event to view its coordination record." />
            <select value={selected?.job_fair_id ?? ''} onChange={(e) => setSelectedId(e.target.value)} className={inputClass}>
              {fairs.map((f) => <option key={f.job_fair_id} value={f.job_fair_id}>{f.title}</option>)}
            </select>

            <h2 className="mt-5 text-xl font-black text-slate-950">{selected?.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{selected?.description}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" />{selected?.start_date} · {selected?.start_time}–{selected?.end_time}</span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />{selected?.venue}
                {selected?.latitude && selected?.longitude && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${selected.latitude},${selected.longitude}`} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-navy hover:underline">
                    Get Directions
                  </a>
                )}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!selected?.participation && (
                <Button onClick={() => act(() => expressJobFairInterest(selected.job_fair_id), 'Interest sent to PESO.')}>Express Interest</Button>
              )}
              {selected?.participation?.status === 'invited' && (
                <>
                  <Button onClick={() => act(() => respondToJobFairInvitation(selected.job_fair_id, 'accepted'), 'Invitation accepted.')}>Accept Invitation</Button>
                  <Button variant="outline" onClick={() => act(() => respondToJobFairInvitation(selected.job_fair_id, 'declined'), 'Invitation declined.')}>Decline</Button>
                </>
              )}
              <a href={`mailto:${selected?.contact_email ?? ''}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Contact PESO</a>
            </div>
          </Card>

          {selected?.participation && (
            <Card padding="none">
              <div className="border-b border-slate-100 p-5 pb-0">
                <Tabs defaultValue="requirements">
                  <TabsList>
                    <TabsTrigger value="requirements">
                      1. Requirements {requirementsDone && <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-emerald-600" />}
                    </TabsTrigger>
                    <TabsTrigger value="confirmation">2. Confirmation Slip</TabsTrigger>
                    <TabsTrigger value="results">3. Post-Event Results</TabsTrigger>
                  </TabsList>

                  <div className="pb-6">
                    <TabsContent value="requirements">
                      <p className="mb-4 text-sm text-slate-500">Participation status: <span className="font-bold text-slate-800">{selected.participation.status.replaceAll('_', ' ')}</span></p>
                      <div className="space-y-3">
                        {selected.requirements.map((req) => {
                          const submitted = selected.participation.requirements?.find((x) => x.job_fair_requirement_id === req.id)
                          const reused = Boolean(submitted?.reused_from_verification)
                          const autoSatisfied = Boolean(submitted?.auto_satisfied)
                          const canUpload = req.code !== 'confirmation_slip' && !reused && !autoSatisfied && (!submitted || submitted.status === 'rejected')

                          return (
                            <div key={req.id} className="rounded-xl border border-slate-200 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm font-bold text-slate-800">{req.label}</span>
                                <Badge variant={submitted ? (submitted.status === 'rejected' ? 'rejected' : 'approved') : 'neutral'} icon={false}>
                                  {submitted?.status ?? 'pending'}
                                </Badge>
                              </div>

                              {autoSatisfied && (
                                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                  <ShieldCheck className="h-3.5 w-3.5" />Verified from your active job postings — nothing to upload
                                </p>
                              )}
                              {submitted?.original_filename && !autoSatisfied && submitted.original_filename !== 'Digital confirmation slip' && (
                                <button type="button" onClick={() => viewSubmission(submitted)} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-navy hover:underline">
                                  <FileText className="h-3.5 w-3.5" />{reused ? `Already verified — ${submitted.original_filename}` : submitted.original_filename}
                                </button>
                              )}
                              {canUpload && (
                                <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-brand-navy hover:text-brand-navy">
                                  <FileUp className="h-4 w-4" />Upload document
                                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => {
                                    const file = e.target.files[0]; e.target.value = ''
                                    if (file) act(() => uploadJobFairRequirement(selected.job_fair_id, req.id, file), `${req.label} submitted.`)
                                  }} />
                                </label>
                              )}
                              {submitted?.admin_remarks && <p className="mt-2 text-xs font-semibold text-rose-700">PESO: {submitted.admin_remarks}</p>}
                            </div>
                          )
                        })}
                      </div>
                    </TabsContent>

                    <TabsContent value="confirmation">
                      <p className="mb-4 text-sm text-slate-500">Maximum {selected.maximum_representatives} representative(s) for this event.</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {Object.entries(confirmation).map(([key, value]) => key === 'will_conduct_onsite_interview' ? (
                          <label key={key} className="flex items-center gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                            <input type="checkbox" checked={value} onChange={(e) => setConfirmation((x) => ({ ...x, [key]: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
                            Will conduct on-site interview
                          </label>
                        ) : (
                          <label key={key} className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            {key.replaceAll('_', ' ')}
                            <input
                              type={key === 'number_of_job_vacancies' ? 'number' : key === 'email' ? 'email' : 'text'}
                              value={value}
                              onChange={(e) => setConfirmation((x) => ({ ...x, [key]: key === 'number_of_job_vacancies' ? Number(e.target.value) : e.target.value }))}
                              className={`mt-1.5 normal-case ${inputClass}`}
                            />
                          </label>
                        ))}
                      </div>
                      <Button className="mt-5" icon={Save} onClick={() => act(() => submitJobFairConfirmation(selected.job_fair_id, confirmation), 'Confirmation slip submitted.')}>
                        Submit Confirmation
                      </Button>
                    </TabsContent>

                    <TabsContent value="results">
                      <p className="mb-4 text-sm text-slate-500">Enter applicants from your physical notes after the event.</p>

                      <div className="mb-4 flex flex-wrap gap-2">
                        {[
                          ['Applicants', totals.total_applicants, 'bg-slate-100 text-slate-700'],
                          ['Male', totals.total_male, 'bg-slate-100 text-slate-700'],
                          ['Female', totals.total_female, 'bg-slate-100 text-slate-700'],
                          ['Qualified', totals.total_qualified, 'bg-blue-50 text-blue-700'],
                          ['HOTS', totals.total_hots, 'bg-emerald-50 text-emerald-700'],
                          ['Near Hired', totals.total_near_hired, 'bg-blue-50 text-blue-700'],
                          ['Mismatched', totals.total_rejected, 'bg-rose-50 text-rose-700'],
                        ].map(([label, value, tone]) => (
                          <span key={label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${tone}`}>
                            <span className="text-sm font-black">{value}</span>{label}
                          </span>
                        ))}
                      </div>

                      <JobFairResultEntryEditor entries={entries} onChange={setEntries} searchApplicants={searchApplicantSuggestions} />

                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Job Fair Clearance No.
                          <input value={clearanceNo} onChange={(e) => setClearanceNo(e.target.value)} className={`mt-1.5 normal-case ${inputClass}`} />
                        </label>
                        <div />
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Vacancies solicited
                          <input type="number" min="0" value={vacancies.solicited} onChange={(e) => setVacancies((x) => ({ ...x, solicited: Number(e.target.value) }))} className={`mt-1.5 ${inputClass}`} />
                        </label>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Vacancies offered
                          <input type="number" min="0" value={vacancies.offered} onChange={(e) => setVacancies((x) => ({ ...x, offered: Number(e.target.value) }))} className={`mt-1.5 ${inputClass}`} />
                        </label>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:col-span-2">
                          Remarks (optional)
                          <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className={`mt-1.5 normal-case ${inputClass}`} />
                        </label>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <Button
                          icon={Save}
                          disabled={!validEntries.length}
                          onClick={() => act(() => submitJobFairResults(selected.job_fair_id, {
                            ...totals,
                            clearance_no: clearanceNo || null,
                            total_vacancies_solicited: vacancies.solicited,
                            total_vacancies_offered: vacancies.offered,
                            remarks,
                            entries: validEntries.map((e) => ({ ...e, mismatch_code: e.mismatch_code || null })),
                          }), 'Post-event results saved.')}
                        >
                          Save Results
                        </Button>
                        {selected.participation.result_report?.id && (
                          <>
                            <Button variant="outline" icon={Eye} onClick={() => setViewingReport(true)}>View Report</Button>
                            <Button variant="navy" icon={Download} onClick={download}>RO1-JF Form 3</Button>
                          </>
                        )}
                        {!validEntries.length && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Clock3 className="h-3.5 w-3.5" />Add at least one applicant with a name and position to save.</span>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </Card>
          )}
        </>
      )}

      <Dialog open={viewingReport} onOpenChange={setViewingReport}>
        <DialogContent className="max-w-7xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.title} — RO1-JF Form 3</DialogTitle>
          </DialogHeader>
          <EstablishmentReportPreview report={selected?.participation?.result_report} jobFair={selected} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
