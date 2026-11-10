import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { reviewService } from '@/services/reviewService'

const REASONS = {
  false_information: 'False or misleading',
  not_genuine: 'Not a real experience',
  harassment: 'Harassment or insults',
  personal_information: 'Shares personal information',
  discrimination: 'Discriminatory',
  other: 'Something else',
}

/** Another job seeker flags a review for PESO to check. */
export default function ReportReviewDialog({ review, onClose }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')

  const send = useMutation({
    mutationFn: () => reviewService.report(review.id, { reason, details: details.trim() || null }),
    onSuccess: (res) => { toast.success(res.message); onClose() },
    onError: (err) => setError(err?.response?.data?.message ?? 'The report could not be sent.'),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && !send.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report this review</DialogTitle>
          <DialogDescription>PESO will look at it. Reviews stay up unless they break the community guidelines.</DialogDescription>
        </DialogHeader>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <fieldset>
          <legend className="text-sm font-bold text-slate-800">What's wrong with it?</legend>
          <div className="mt-2 space-y-1.5">
            {Object.entries(REASONS).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="report-reason" value={value} checked={reason === value} onChange={() => { setReason(value); setError('') }} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-bold text-slate-800">
          Details <span className="font-normal text-slate-500">(optional)</span>
          <textarea rows={3} maxLength={1000} value={details} onChange={(event) => setDetails(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20" />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={send.isPending}>Cancel</Button>
          <Button variant="danger" loading={send.isPending} onClick={() => (reason ? send.mutate() : setError('Choose a reason.'))}>Send report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
