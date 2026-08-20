import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EMPLOYER_MISMATCH_REASONS, SEEKER_MISMATCH_REASONS } from './atsConstants'

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/10'

const blankValues = { employerReason: '', seekerReason: '', details: '' }

export default function RejectModal({ open, onClose, targets = [], isSubmitting, onSubmit }) {
  const { register, watch, reset, handleSubmit } = useForm({ defaultValues: blankValues })

  useEffect(() => {
    if (open) reset(blankValues)
  }, [open, reset])

  const employerReason = watch('employerReason')
  const canSubmit = Boolean(employerReason) && !isSubmitting

  const submit = handleSubmit((values) => {
    onSubmit({
      employer_mismatch_reason_code: values.employerReason,
      seeker_mismatch_reason_code: values.seekerReason || null,
      mismatch_reason_details: values.details.trim() || null,
      employer_remarks: values.details.trim() || null,
    })
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <div className="-mx-6 -mt-6 rounded-t-xl border-b border-rose-100 bg-rose-50 p-6">
          <DialogTitle className="text-rose-950">Record rejection outcome</DialogTitle>
          <p className="mt-1 text-sm text-rose-800">
            Rejecting {targets.length} candidate{targets.length > 1 ? 's' : ''}. This will appear in the Establishment Report / RO1-JF Form 3.
          </p>
        </div>

        <div className="space-y-4 pt-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Employer-side reason <span className="text-red-500">*</span></span>
            <select {...register('employerReason', { required: true })} className={inputClass}>
              <option value="">Select a reason…</option>
              {EMPLOYER_MISMATCH_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Seeker-side reason</span>
            <select {...register('seekerReason')} className={inputClass}>
              {SEEKER_MISMATCH_REASONS.map(([value, label]) => <option key={value || 'none'} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Additional details <span className="text-xs font-normal text-slate-400">(optional)</span></span>
            <textarea {...register('details')} rows={3} maxLength={5000} className={inputClass} placeholder="Optional report context" />
          </label>

          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            This is final. Once confirmed, this application cannot be moved to another stage.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={submit} disabled={!canSubmit}>
            {isSubmitting ? 'Saving…' : 'Reject and record reason'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
