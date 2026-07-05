import { useMemo, useState } from 'react'
import { Award, FileCheck2, FileUp, Loader2, ShieldCheck, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadCertificate } from '@/services/seekerService'

const categories = [
  ['training_certificate', 'Training Certificate'],
  ['tesda_nc_certificate', 'TESDA / NC Certificate'],
  ['professional_certificate', 'Professional Certificate'],
  ['seminar_certificate', 'Seminar Certificate'],
  ['workshop_certificate', 'Workshop Certificate'],
  ['employment_certificate', 'Employment Certificate'],
  ['academic_certificate', 'Academic Certificate'],
  ['other', 'Other'],
]

const initialForm = {
  title: '',
  issuingBody: '',
  category: '',
  issuedAt: '',
  expiresAt: '',
  credentialNumber: '',
  description: '',
  trainingId: '',
  file: null,
}

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-800 focus:ring-4 focus:ring-blue-100'
const today = new Date().toISOString().slice(0, 10)

export default function CertificateUploadModal({ open, trainings = [], onClose, onUploaded }) {
  const [form, setForm] = useState(initialForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)

  const detailsComplete = Boolean(form.title.trim() && form.issuingBody.trim() && form.category && form.issuedAt)
  const selectedTraining = useMemo(
    () => trainings.find((training) => String(training.id) === String(form.trainingId)),
    [form.trainingId, trainings],
  )

  if (!open) return null

  const reset = () => {
    setForm(initialForm)
    setFieldErrors({})
    setGeneralError('')
    setProgress(0)
  }

  const close = () => {
    if (saving) return
    reset()
    onClose()
  }

  const update = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setGeneralError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (saving) return

    const errors = validate(form)
    setFieldErrors(errors)
    setGeneralError('')
    if (Object.keys(errors).length) {
      const message = form.file && !detailsComplete
        ? 'Please complete the certificate details before saving.'
        : 'Please review the required certificate details.'
      setGeneralError(message)
      toast.error(message)
      return
    }

    const payload = new FormData()
    payload.append('title', form.title.trim())
    payload.append('issuing_body', form.issuingBody.trim())
    payload.append('category', form.category)
    payload.append('issued_at', form.issuedAt)
    if (form.expiresAt) payload.append('expires_at', form.expiresAt)
    if (form.credentialNumber.trim()) payload.append('credential_number', form.credentialNumber.trim())
    if (form.description.trim()) payload.append('description', form.description.trim())
    if (form.trainingId) payload.append('training_id', form.trainingId)
    payload.append('certificate_file', form.file)

    setSaving(true)
    setProgress(0)
    try {
      const result = await uploadCertificate(payload, {
        onUploadProgress: ({ loaded, total }) => {
          if (total) setProgress(Math.min(100, Math.round((loaded / total) * 100)))
        },
      })
      onUploaded(result.certificate)
      toast.success('Certificate added to your private credential vault.')
      reset()
      onClose()
    } catch (requestError) {
      const serverErrors = requestError.response?.data?.errors ?? {}
      setFieldErrors(mapServerErrors(serverErrors))
      const message = Object.values(serverErrors).flat()[0]
        || requestError.response?.data?.message
        || 'Unable to save the certificate.'
      setGeneralError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 px-3 py-4 backdrop-blur-sm sm:px-6 sm:py-8" role="dialog" aria-modal="true" aria-labelledby="certificate-modal-title">
      <form onSubmit={submit} className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
        <header className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-blue-950 to-blue-900 px-5 py-5 text-white sm:px-7">
          <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-amber-400/15 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-400 text-blue-950 shadow-lg"><Award className="h-5 w-5" /></span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">Private credential vault</p>
                <h2 id="certificate-modal-title" className="mt-1 text-xl font-black sm:text-2xl">Add Certificate</h2>
                <p className="mt-1 max-w-xl text-sm leading-5 text-blue-100">Create the credential record and attach its proof in one secure submission.</p>
              </div>
            </div>
            <button type="button" onClick={close} disabled={saving} className="rounded-lg p-2 text-blue-100 hover:bg-white/10 hover:text-white disabled:opacity-50" aria-label="Close certificate form"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="max-h-[calc(100vh-13rem)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {generalError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{generalError}</div>}

          <section>
            <div className="mb-4">
              <h3 className="font-black text-slate-950">Certificate details</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Fields marked with an asterisk are required before the proof can be saved.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Certificate / Training Title" required error={fieldErrors.title}>
                <input value={form.title} onChange={(event) => update('title', event.target.value)} maxLength={255} placeholder="e.g. Computer Systems Servicing NC II" className={inputClass} />
              </Field>
              <Field label="Issuing Organization / Provider" required error={fieldErrors.issuingBody}>
                <input value={form.issuingBody} onChange={(event) => update('issuingBody', event.target.value)} maxLength={255} placeholder="e.g. TESDA" className={inputClass} />
              </Field>
              <Field label="Category / Type" required error={fieldErrors.category}>
                <select value={form.category} onChange={(event) => update('category', event.target.value)} className={inputClass}>
                  <option value="">Select certificate category</option>
                  {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Related Training Record" hint="Optional" error={fieldErrors.trainingId}>
                <select value={form.trainingId} onChange={(event) => update('trainingId', event.target.value)} className={inputClass}>
                  <option value="">Standalone certificate</option>
                  {trainings.map((training) => (
                    <option key={training.id} value={training.id}>{training.course}{training.training_institution ? ` — ${training.training_institution}` : ''}</option>
                  ))}
                </select>
              </Field>
              <Field label="Issue Date" required error={fieldErrors.issuedAt}>
                <input type="date" max={today} value={form.issuedAt} onChange={(event) => update('issuedAt', event.target.value)} className={inputClass} />
              </Field>
              <Field label="Expiration Date" hint="Optional" error={fieldErrors.expiresAt}>
                <input type="date" min={form.issuedAt || undefined} value={form.expiresAt} onChange={(event) => update('expiresAt', event.target.value)} className={inputClass} />
              </Field>
              <Field label="Credential Number" hint="Optional" error={fieldErrors.credentialNumber}>
                <input value={form.credentialNumber} onChange={(event) => update('credentialNumber', event.target.value)} maxLength={100} placeholder="Certificate or license number" className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description / Remarks" hint="Optional" error={fieldErrors.description}>
                  <textarea rows={3} value={form.description} onChange={(event) => update('description', event.target.value)} maxLength={2000} placeholder="Add relevant details about this credential." className={`${inputClass} resize-y`} />
                </Field>
              </div>
            </div>
          </section>

          <section className="mt-6 border-t border-slate-200 pt-6">
            <Field label="Proof File" required error={fieldErrors.file}>
              <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center transition hover:border-blue-500 hover:bg-blue-50/50">
                {form.file ? <FileCheck2 className="h-8 w-8 text-emerald-600" /> : <FileUp className="h-8 w-8 text-blue-800" />}
                <span className="mt-2 max-w-full truncate text-sm font-black text-slate-900">{form.file?.name ?? 'Choose a PDF or image'}</span>
                <span className="mt-1 text-xs text-slate-500">{form.file ? formatBytes(form.file.size) : 'PDF, JPG, JPEG, or PNG — maximum 5 MB'}</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={saving} onChange={(event) => update('file', event.target.files?.[0] ?? null)} className="sr-only" />
              </label>
            </Field>

            {form.file && !detailsComplete && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800">Please complete the certificate details before saving.</p>
            )}
            {selectedTraining && <p className="mt-3 text-xs font-semibold text-blue-800">This proof will be linked to: {selectedTraining.course}.</p>}
            {saving && (
              <div className="mt-4" aria-live="polite">
                <div className="flex justify-between text-xs font-bold text-slate-600"><span>Securely uploading</span><span>{progress}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-blue-800 to-amber-400 transition-all" style={{ width: `${progress}%` }} /></div>
              </div>
            )}
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-800" />Proof files remain private and are available only through authenticated, owner-protected access.</p>
          </section>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <button type="button" disabled={saving} onClick={close} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-950 px-6 text-sm font-black text-white shadow-sm hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4 text-amber-300" />}
            {saving ? 'Saving Certificate…' : 'Save Certificate'}
          </button>
        </footer>
      </form>
    </div>
  )
}

function Field({ label, required = false, hint = '', error, children }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1 text-xs font-black uppercase tracking-wide text-slate-600">
        {label}{required && <span className="text-red-600">*</span>}{hint && <span className="ml-auto normal-case tracking-normal text-slate-400">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  )
}

function validate(form) {
  const errors = {}
  if (!form.title.trim()) errors.title = 'Certificate title is required.'
  if (!form.issuingBody.trim()) errors.issuingBody = 'Issuing organization is required.'
  if (!form.category) errors.category = 'Select a certificate category.'
  if (!form.issuedAt) errors.issuedAt = 'Issue date is required.'
  else if (form.issuedAt > today) errors.issuedAt = 'Issue date cannot be in the future.'
  if (form.expiresAt && form.issuedAt && form.expiresAt <= form.issuedAt) errors.expiresAt = 'Expiration date must be after the issue date.'
  if (!form.file) errors.file = 'Select a certificate proof file.'
  else {
    const extension = form.file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) errors.file = 'Use a PDF, JPG, JPEG, or PNG file.'
    else if (form.file.size > 5 * 1024 * 1024) errors.file = 'The proof file must not exceed 5 MB.'
  }
  return errors
}

function mapServerErrors(errors) {
  const map = {
    title: 'title',
    issuing_body: 'issuingBody',
    category: 'category',
    issued_at: 'issuedAt',
    expires_at: 'expiresAt',
    credential_number: 'credentialNumber',
    description: 'description',
    training_id: 'trainingId',
    certificate_file: 'file',
  }
  return Object.fromEntries(Object.entries(errors).map(([key, messages]) => [map[key] || key, Array.isArray(messages) ? messages[0] : messages]))
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
