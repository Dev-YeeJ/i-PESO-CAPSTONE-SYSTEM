import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, BriefcaseBusiness, Building2, CheckCircle2, FileText, Flag, Lock, Paperclip, UserRound, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { safetyReportService } from '@/services/safetyReportService'

const todayIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
const formatSize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

/**
 * Report a concern to PESO — a job seeker reporting an employer/company, or an
 * employer reporting a job seeker who applied to them.
 *
 * role:   'seeker' | 'employer' (who is filing)
 * target: { subjectId, subjectName, postId?, postTitle?, applicationId? }
 */
export default function ReportConcernDialog({ open, role, target, onClose }) {
  if (!open || !target) return null
  // Keyed so every opening starts with a clean form.
  return <ReportConcernForm key={`${target.subjectId}-${target.postId}-${target.applicationId}`} role={role} target={target} onClose={onClose} />
}

function ReportConcernForm({ role, target, onClose }) {
  const queryClient = useQueryClient()
  const fileInput = useRef(null)
  const [step, setStep] = useState('form') // form | confirm | done | duplicate
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [incidentDate, setIncidentDate] = useState('')
  const [files, setFiles] = useState([])
  const [acknowledge, setAcknowledge] = useState(false)
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)

  const reportingEmployer = role === 'seeker'
  const SubjectIcon = reportingEmployer ? Building2 : UserRound

  const { data: options, isLoading: optionsLoading } = useQuery({
    queryKey: ['safetyReportOptions', role],
    queryFn: () => safetyReportService.options(role),
    staleTime: 10 * 60_000,
  })
  const limits = options?.limits ?? { description_min: 30, description_max: 3000, max_attachments: 5, max_attachment_kb: 5120, attachment_types: ['jpg', 'jpeg', 'png', 'webp', 'pdf'] }
  const categories = useMemo(() => options?.categories ?? [], [options])
  const selected = categories.find((item) => item.value === category)

  const submit = useMutation({
    mutationFn: () => safetyReportService.submit(role, {
      subject_id: target.subjectId,
      post_id: target.postId,
      application_id: target.applicationId,
      category,
      description: description.trim(),
      incident_date: incidentDate || undefined,
      acknowledge,
      attachments: files,
    }),
    onSuccess: (data) => {
      setResult(data.report)
      setStep('done')
      queryClient.invalidateQueries({ queryKey: ['mySafetyReports', role] })
    },
    onError: (error) => {
      const response = error?.response
      if (response?.status === 409) {
        setResult({ ...response.data.existing_report, message: response.data.message })
        setStep('duplicate')
        return
      }
      const fieldErrors = Object.fromEntries(Object.entries(response?.data?.errors ?? {}).map(([key, messages]) => [key.replace(/\.\d+$/, ''), messages[0]]))
      setErrors(Object.keys(fieldErrors).length ? fieldErrors : { form: response?.data?.message ?? 'Your report could not be sent. Please try again.' })
      // Field problems are fixed on the form, not on the confirmation step.
      if (Object.keys(fieldErrors).some((key) => key !== 'acknowledge')) setStep('form')
    },
  })

  const addFiles = (list) => {
    const allowed = limits.attachment_types
    const next = [...files]
    let problem = null
    Array.from(list ?? []).forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!allowed.includes(extension)) problem = `${file.name}: only ${allowed.join(', ').toUpperCase()} files are accepted.`
      else if (file.size > limits.max_attachment_kb * 1024) problem = `${file.name} is larger than ${Math.round(limits.max_attachment_kb / 1024)} MB.`
      else if (next.length >= limits.max_attachments) problem = `You can attach up to ${limits.max_attachments} files.`
      else next.push(file)
    })
    setFiles(next)
    setErrors((current) => ({ ...current, attachments: problem ?? undefined }))
    if (fileInput.current) fileInput.current.value = ''
  }

  const goToConfirm = (event) => {
    event.preventDefault()
    const next = {}
    if (!category) next.category = 'Choose the reason that fits best.'
    const length = description.trim().length
    if (length < limits.description_min) next.description = `Describe what happened in at least ${limits.description_min} characters — include dates and what was said or done.`
    if (incidentDate && incidentDate > todayIso()) next.incident_date = 'The date cannot be in the future.'
    setErrors(next)
    if (!Object.keys(next).length) setStep('confirm')
  }

  const confirm = () => {
    if (!acknowledge) {
      setErrors({ acknowledge: 'Please confirm that your report is truthful.' })
      return
    }
    setErrors({})
    submit.mutate()
  }

  const close = () => { if (!submit.isPending) onClose() }
  const myReportsPath = `/${role}/safety-reports`

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        {step === 'done' ? (
          <div className="py-2 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <DialogHeader className="mt-3 items-center text-center sm:text-center">
              <DialogTitle>Report received</DialogTitle>
              <DialogDescription>
                Your case number is <strong className="font-mono text-slate-900">{result?.case_number}</strong>.
              </DialogDescription>
            </DialogHeader>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
              An authorized PESO administrator will review it. You'll be notified when the review starts and when it's closed. Your identity is not shared with {reportingEmployer ? 'the employer' : 'the job seeker'}.
            </p>
            <DialogFooter className="mt-6 justify-center gap-2 sm:justify-center">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button to={`${myReportsPath}?case=${result?.id}`} variant="navy" onClick={onClose}>View my reports</Button>
            </DialogFooter>
          </div>
        ) : step === 'duplicate' ? (
          <div className="py-2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" />You already reported {target.subjectName}</DialogTitle>
              <DialogDescription>{result?.message}</DialogDescription>
            </DialogHeader>
            <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              Adding to case <strong className="font-mono">{result?.case_number}</strong> keeps everything together for the PESO administrator reviewing it.
            </p>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button to={`${myReportsPath}?case=${result?.id}`} variant="navy" onClick={onClose}>Add details to that case</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-red-600" />
                {step === 'confirm' ? 'Confirm your report' : reportingEmployer ? 'Report an employer' : 'Report a job seeker'}
              </DialogTitle>
              <DialogDescription>
                {step === 'confirm'
                  ? 'Check the details below before sending them to PESO.'
                  : 'Reports go to authorized PESO administrators only and are reviewed before any action is taken.'}
              </DialogDescription>
            </DialogHeader>

            {/* Who / what is being reported — shown on every step to prevent accidental reports. */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">You are reporting</p>
              <p className="mt-1 flex items-center gap-2 font-black text-slate-950"><SubjectIcon className="h-4 w-4 text-slate-500" />{target.subjectName}</p>
              {(target.postTitle || target.applicationId) && (
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                  <BriefcaseBusiness className="h-3.5 w-3.5 text-slate-400" />
                  {target.postTitle ? `Vacancy: ${target.postTitle}` : 'Linked application'}
                  {target.applicationId && target.postTitle ? ' · your application is linked' : ''}
                </p>
              )}
            </div>

            {errors.form && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
            {(errors.subject_id || errors.application_id || errors.post_id) && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.subject_id || errors.application_id || errors.post_id}</p>
            )}

            {step === 'form' ? (
              <form id="report-concern-form" onSubmit={goToConfirm} noValidate className="space-y-5">
                <fieldset>
                  <legend className="text-sm font-bold text-slate-800">What is the concern? <span className="text-red-500">*</span></legend>
                  {optionsLoading ? (
                    <p className="mt-2 text-sm text-slate-500">Loading reasons…</p>
                  ) : (
                    <div className="mt-2 grid gap-2">
                      {categories.map((item) => (
                        <label
                          key={item.value}
                          className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600 ${category === item.value ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        >
                          <input type="radio" name="category" value={item.value} checked={category === item.value} onChange={() => { setCategory(item.value); setErrors((current) => ({ ...current, category: undefined })) }} className="mt-1 accent-red-600" />
                          <span>
                            <span className="block font-bold text-slate-900">{item.label}</span>
                            {item.hint && <span className="block text-xs leading-5 text-slate-500">{item.hint}</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {errors.category && <p className="mt-1 text-xs font-medium text-red-600">{errors.category}</p>}
                </fieldset>

                <label className="block text-sm font-bold text-slate-800">
                  What happened? <span className="text-red-500">*</span>
                  <textarea
                    rows={5}
                    maxLength={limits.description_max}
                    value={description}
                    onChange={(event) => { setDescription(event.target.value); setErrors((current) => ({ ...current, description: undefined })) }}
                    placeholder="Describe the facts: when it happened, who you dealt with (by role, e.g. “the HR officer”), and what was said or done."
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                  />
                  <span className="mt-1 flex justify-between gap-3 text-xs font-normal text-slate-500">
                    <span>Stick to what you saw or experienced. Clear, factual reports are reviewed faster.</span>
                    <span className="shrink-0">{description.trim().length}/{limits.description_max}</span>
                  </span>
                  {errors.description && <span className="mt-1 block text-xs font-medium text-red-600">{errors.description}</span>}
                </label>

                <label className="block text-sm font-bold text-slate-800">
                  When did it happen? <span className="font-normal text-slate-500">(optional)</span>
                  <input
                    type="date"
                    max={todayIso()}
                    value={incidentDate}
                    onChange={(event) => setIncidentDate(event.target.value)}
                    className="mt-1.5 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                  />
                  {errors.incident_date && <span className="mt-1 block text-xs font-medium text-red-600">{errors.incident_date}</span>}
                </label>

                <div>
                  <p className="text-sm font-bold text-slate-800">Supporting evidence <span className="font-normal text-slate-500">(optional)</span></p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    Screenshots, receipts or documents ({limits.attachment_types.join(', ').toUpperCase()}, up to {limits.max_attachments} files, {Math.round(limits.max_attachment_kb / 1024)} MB each).
                  </p>
                  <p className="mt-2 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Only PESO administrators can open these files. Don't upload more personal information than needed — cover ID numbers, bank details and other people's private information that isn't part of the concern.
                  </p>
                  {files.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {files.map((file, index) => (
                        <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                          <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="min-w-0 flex-1 truncate">{file.name}</span>
                          <span className="text-xs text-slate-400">{formatSize(file.size)}</span>
                          <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {files.length < limits.max_attachments && (
                    <>
                      <input ref={fileInput} type="file" multiple accept={limits.attachment_types.map((type) => `.${type}`).join(',')} onChange={(event) => addFiles(event.target.files)} className="sr-only" id="report-evidence" />
                      <label htmlFor="report-evidence" className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-700">
                        <Paperclip className="h-4 w-4" />Attach files
                      </label>
                    </>
                  )}
                  {errors.attachments && <p className="mt-1 text-xs font-medium text-red-600">{errors.attachments}</p>}
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <dl className="space-y-3 rounded-xl border border-slate-200 p-4 text-sm">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Reason</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{selected?.label}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">What happened</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap leading-6 text-slate-700">{description.trim()}</dd>
                  </div>
                  {incidentDate && (
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Date</dt>
                      <dd className="mt-0.5 text-slate-700">{new Date(`${incidentDate}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'long' })}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Evidence</dt>
                    <dd className="mt-0.5 text-slate-700">{files.length ? files.map((file) => file.name).join(', ') : 'None attached'}</dd>
                  </div>
                </dl>

                <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                  <input type="checkbox" checked={acknowledge} onChange={(event) => { setAcknowledge(event.target.checked); setErrors((current) => ({ ...current, acknowledge: undefined })) }} className="mt-0.5" />
                  <span>
                    I confirm this report is truthful to the best of my knowledge. I understand that submitting false or malicious reports violates i-PESO policies and may lead to action on my own account.
                  </span>
                </label>
                {errors.acknowledge && <p className="text-xs font-medium text-red-600">{errors.acknowledge}</p>}
              </div>
            )}

            <DialogFooter>
              {step === 'form' ? (
                <>
                  <Button variant="outline" onClick={close}>Cancel</Button>
                  <Button type="submit" form="report-concern-form" variant="navy" disabled={optionsLoading}>Review report</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setStep('form')} disabled={submit.isPending}>Back</Button>
                  <Button variant="danger" onClick={confirm} loading={submit.isPending}>Submit report</Button>
                </>
              )}
            </DialogFooter>
            {step === 'form' && (
              <p className="text-center text-xs text-slate-500">
                Emergencies or crimes in progress? Contact the PNP (911) first.{' '}
                <Link to={`${myReportsPath}`} onClick={onClose} className="font-semibold text-blue-700 hover:underline">My reports</Link>
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
