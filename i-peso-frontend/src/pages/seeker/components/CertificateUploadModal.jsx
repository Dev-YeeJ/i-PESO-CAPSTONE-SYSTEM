import { useState } from 'react'
import { FileUp, X } from 'lucide-react'
import { uploadCertificate } from '@/services/seekerService'

const initialForm = {
  title: '',
  issuingBody: '',
  issuedAt: '',
  file: null,
}

export default function CertificateUploadModal({ open, onClose, onUploaded }) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const close = () => {
    if (saving) return
    setForm(initialForm)
    setError('')
    onClose()
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.file) {
      setError('Select a PDF, JPG, or PNG certificate file.')
      return
    }

    const payload = new FormData()
    payload.append('title', form.title.trim())
    payload.append('issuing_body', form.issuingBody.trim())
    if (form.issuedAt) payload.append('issued_at', form.issuedAt)
    payload.append('certificate_file', form.file)

    setSaving(true)
    try {
      const result = await uploadCertificate(payload)
      onUploaded(result.certificate)
      close()
    } catch (requestError) {
      const errors = requestError.response?.data?.errors
      setError(
        errors ? Object.values(errors).flat()[0] : requestError.response?.data?.message ?? 'Unable to upload certificate.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Upload Certificate</h2>
            <p className="mt-1 text-sm text-slate-500">Keep verified training and competency records in your private vault.</p>
          </div>
          <button type="button" onClick={close} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="mt-5 space-y-4">
          <Field label="Certificate title">
            <input
              required
              maxLength={255}
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Example: Computer Systems Servicing NC II"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </Field>
          <Field label="Issuing body">
            <input
              required
              maxLength={255}
              value={form.issuingBody}
              onChange={(event) => setForm((current) => ({ ...current, issuingBody: event.target.value }))}
              placeholder="Example: TESDA"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </Field>
          <Field label="Date issued (optional)">
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.issuedAt}
              onChange={(event) => setForm((current) => ({ ...current, issuedAt: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
          </Field>
          <Field label="Certificate file">
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 p-4 hover:border-blue-400 hover:bg-blue-50/40">
              <span className="rounded-xl bg-blue-100 p-2 text-blue-700"><FileUp className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {form.file?.name ?? 'Choose PDF or image'}
                </span>
                <span className="text-xs text-slate-500">PDF, JPG, or PNG up to 5 MB</span>
              </span>
              <input
                required
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))}
                className="sr-only"
              />
            </label>
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={saving} onClick={close} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? 'Uploading...' : 'Save Certificate'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  )
}
