import { useState } from 'react'
import toast from 'react-hot-toast'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { REPORT_REASONS } from '@/constants/employerReports'
import { reportEmployer } from '@/services/seekerService'

/**
 * Reusable modal that lets a job seeker report an employer / job posting.
 * `employer` shape: { employer_id, employer_name }.
 */
export default function ReportEmployerModal({ open, employer, onClose }) {
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const employerId = employer?.employer_id
  const canSubmit = Boolean(reason && description.trim().length >= 10 && employerId)

  const close = () => {
    setReason('')
    setDescription('')
    setSubmitting(false)
    onClose?.()
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await reportEmployer(employerId, { reason, description: description.trim() })
      toast.success('Report submitted to PESO. Thank you for helping keep i-PESO safe.')
      close()
    } catch (error) {
      toast.error(
        error.response?.data?.errors?.reason?.[0]
          ?? error.response?.data?.errors?.description?.[0]
          ?? error.response?.data?.message
          ?? 'Unable to submit your report.',
      )
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-600" />
            Report {employer?.employer_name || 'this employer'}
          </DialogTitle>
          <DialogDescription>
            Flag suspicious, abusive, or fake employers or job postings. PESO administrators will review your report.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-slate-700">Reason <span className="text-red-500">*</span></span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="" disabled>Select a reason…</option>
              {REPORT_REASONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-slate-700">What happened? <span className="text-red-500">*</span></span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              minLength={10}
              maxLength={2000}
              required
              placeholder="Describe the issue with specific details (at least 10 characters)…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <span className="mt-1 block text-right text-xs text-slate-400">{description.trim().length}/2000</span>
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!canSubmit || submitting}>
              {submitting ? 'Submitting…' : 'Submit report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
