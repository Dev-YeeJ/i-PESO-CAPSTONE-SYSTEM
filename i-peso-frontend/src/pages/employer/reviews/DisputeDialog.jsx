import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Check, Info } from 'lucide-react'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { employerFeedbackService } from '@/services/employerFeedbackService'
import { cn } from '@/lib/utils'
import { REVIEWS_KEY } from './reviewKeys'
import { errorText } from './errorText'

const MIN_DETAILS = 20

/** Ask PESO to check a review against the guidelines. The review stays up while they look. */
export default function DisputeDialog({ review, reasons, onClose }) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')

  const send = useMutation({
    mutationFn: () => employerFeedbackService.dispute(review.id, { reason, details: details.trim() }),
    onSuccess: (res) => { toast.success(res.message); queryClient.invalidateQueries({ queryKey: REVIEWS_KEY }); onClose() },
    onError: (err) => setError(errorText(err, 'The dispute could not be sent.')),
  })

  const submit = () => {
    if (!reason) return setError('Choose a reason.')
    if (details.trim().length < MIN_DETAILS) return setError(`Explain what is wrong in a bit more detail (at least ${MIN_DETAILS} characters).`)
    send.mutate()
  }

  const remaining = Math.max(0, MIN_DETAILS - details.trim().length)

  return (
    <Dialog open onOpenChange={(open) => !open && !send.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dispute this review</DialogTitle>
          <DialogDescription>PESO checks it against the review guidelines and tells you what they decide.</DialogDescription>
        </DialogHeader>

        <p className="flex gap-2.5 rounded-2xl bg-sky-50 p-3.5 text-xs leading-5 text-sky-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Honest negative reviews stay up, even if you disagree. For those, a calm public reply usually helps more.
        </p>

        {review.comment && (
          <blockquote className="line-clamp-3 border-l-4 border-slate-200 pl-3 text-sm italic text-slate-600">{review.comment}</blockquote>
        )}

        <fieldset>
          <legend className="text-sm font-black text-slate-900">Why should PESO look at it?</legend>
          <div className="mt-2 grid gap-2">
            {Object.entries(reasons).map(([value, label]) => {
              const on = reason === value
              return (
                <label key={value} className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus',
                  on ? 'border-brand-navy bg-brand-navy/5 font-bold text-slate-900 ring-1 ring-brand-navy' : 'border-slate-200 text-slate-700 hover:border-slate-300',
                )}>
                  <input type="radio" name="dispute-reason" className="sr-only" checked={on} onChange={() => { setReason(value); setError('') }} />
                  <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', on ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300')} aria-hidden>
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  {label}
                </label>
              )
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="dispute-details" className="text-sm font-black text-slate-900">What's wrong with it?</label>
          <textarea
            id="dispute-details"
            rows={4}
            maxLength={2000}
            value={details}
            onChange={(event) => { setDetails(event.target.value); setError('') }}
            placeholder="Explain what is false or against the guidelines. Mention any records you can show PESO."
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm leading-6 focus:border-brand-navy focus:outline-none focus:ring-4 focus:ring-brand-navy/10"
          />
          <p className="mt-1 text-xs text-slate-500">{remaining > 0 ? `${remaining} more characters needed` : 'Thanks, that is enough detail.'}</p>
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={send.isPending}>Cancel</Button>
          <Button variant="navy" loading={send.isPending} onClick={submit}>Send to PESO</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
