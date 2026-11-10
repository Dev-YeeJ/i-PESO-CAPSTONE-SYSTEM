import { forwardRef, useId, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { ChevronDown, Clock3, CornerDownRight, EyeOff, Flag, MessageSquareReply, Pencil, ShieldCheck, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react'
import { Button, ConfirmDialog } from '@/components/ui'
import { Stars } from '@/components/reviews/StarRating'
import { employerFeedbackService } from '@/services/employerFeedbackService'
import { REVIEWS_KEY } from './reviewKeys'
import { errorText } from './errorText'

const MAX_REPLY = 1500
const LONG_COMMENT = 320

const TIPS = ['Thank them for the feedback', 'Answer the specific point', 'Say what you changed']

const scoreTone = (value) => (value >= 4 ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : value >= 3 ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-red-50 text-red-800 ring-red-200')

/** One review of the company, with the employer's single public reply and the dispute route. */
const ReviewCard = forwardRef(function ReviewCard({ review, onDispute }, ref) {
  const queryClient = useQueryClient()
  const replyId = useId()
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(review.own_reply?.body ?? '')
  const [error, setError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [showRatings, setShowRatings] = useState(false)

  const refresh = () => queryClient.invalidateQueries({ queryKey: REVIEWS_KEY })

  const save = useMutation({
    mutationFn: () => employerFeedbackService.reply(review.id, body.trim()),
    onSuccess: (res) => { toast.success(res.message); setEditing(false); refresh() },
    onError: (err) => setError(errorText(err, 'Your reply could not be saved.')),
  })
  const remove = useMutation({
    mutationFn: () => employerFeedbackService.deleteReply(review.id),
    onSuccess: (res) => { toast.success(res.message); setConfirmRemove(false); setBody(''); refresh() },
    onError: (err) => { setConfirmRemove(false); toast.error(errorText(err, 'Your reply could not be removed.')) },
  })

  const submit = () => (body.trim().length >= 10 ? save.mutate() : setError('Write at least a short sentence.'))
  const cancel = () => { setEditing(false); setBody(review.own_reply?.body ?? ''); setError('') }

  const dispute = review.dispute
  const disputeOpen = dispute?.status === 'open'
  const reply = review.own_reply
  const long = (review.comment?.length ?? 0) > LONG_COMMENT
  const left = MAX_REPLY - body.length

  return (
    <Motion.li
      ref={ref}
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-18px_rgba(15,23,42,0.22)] sm:p-6"
    >
      {/* Who and when */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"><ShieldCheck className="h-5 w-5" aria-hidden /></span>
          <div>
            <p className="text-sm font-black text-slate-900">{review.reviewer}</p>
            <p className="text-xs text-slate-500">{review.month}{review.edited ? ' · edited' : ''}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-black tabular-nums ring-1 ${scoreTone(review.average)}`}>
            {review.average?.toFixed(1)}<span className="sr-only"> out of 5</span>
          </span>
          {!reply && !editing && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700"><Clock3 className="h-3 w-3" aria-hidden />Needs reply</span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Stars value={review.average} />
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${review.recommend ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
          {review.recommend ? <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> : <ThumbsDown className="h-3.5 w-3.5" aria-hidden />}
          {review.recommend ? 'Recommends you' : "Doesn't recommend you"}
        </span>
        {review.limited && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">You didn't respond to this application</span>}
      </div>

      {review.comment ? (
        <div className="mt-4">
          <p className={`whitespace-pre-line text-[15px] leading-7 text-slate-700 ${long && !showAll ? 'line-clamp-4' : ''}`}>{review.comment}</p>
          {long && (
            <button type="button" onClick={() => setShowAll((open) => !open)} className="mt-1 text-sm font-bold text-brand-navy hover:underline focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-focus">
              {showAll ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm italic text-slate-400">Ratings only, no written comment.</p>
      )}

      {/* Per-aspect ratings */}
      <button
        type="button"
        aria-expanded={showRatings}
        aria-controls={`${replyId}-ratings`}
        onClick={() => setShowRatings((open) => !open)}
        className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-focus"
      >
        <ChevronDown className={`h-4 w-4 transition ${showRatings ? 'rotate-180' : ''}`} aria-hidden />
        {showRatings ? 'Hide rating details' : 'Rating details'}
      </button>
      <AnimatePresence initial={false}>
        {showRatings && (
          <Motion.ul
            id={`${replyId}-ratings`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="grid gap-x-6 gap-y-2 overflow-hidden pt-3 sm:grid-cols-2"
          >
            {review.ratings.map((rating) => (
              <li key={rating.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-600">{rating.label}</span>
                <span className="flex items-center gap-2"><Stars value={rating.value} /><span className="sr-only">{rating.value} out of 5</span></span>
              </li>
            ))}
          </Motion.ul>
        )}
      </AnimatePresence>

      {dispute && (
        <p className={`mt-4 flex gap-2 rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${disputeOpen ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'}`}>
          <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {disputeOpen
              ? `You disputed this review (${dispute.reason}). PESO is looking into it; it stays up meanwhile.`
              : `PESO reviewed your dispute (${dispute.reason}): ${dispute.status === 'upheld' ? 'upheld' : 'the review stays up'}.${dispute.resolution_note ? ` ${dispute.resolution_note}` : ''}`}
          </span>
        </p>
      )}

      {/* The one public reply, or the composer */}
      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <Motion.div key="composer" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <label htmlFor={replyId} className="text-sm font-black text-slate-900">{reply ? 'Edit your public reply' : 'Write a public reply'}</label>
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Tips for a good reply">
                {TIPS.map((tip) => <li key={tip} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">{tip}</li>)}
              </ul>
              <textarea
                id={replyId}
                rows={4}
                maxLength={MAX_REPLY}
                autoFocus
                value={body}
                onChange={(event) => { setBody(event.target.value); setError('') }}
                onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); submit() } }}
                placeholder="Thank the reviewer and explain any changes you've made. Stay professional and don't try to identify them."
                aria-invalid={!!error}
                aria-describedby={`${replyId}-meta`}
                className={`mt-3 w-full rounded-xl border bg-white px-3.5 py-3 text-sm leading-6 shadow-sm focus:outline-none focus:ring-4 ${error ? 'border-red-400 focus:ring-red-500/10' : 'border-slate-300 focus:border-brand-navy focus:ring-brand-navy/10'}`}
              />
              <div id={`${replyId}-meta`} className="mt-1.5 flex justify-between gap-3 text-xs text-slate-500">
                <span>Anyone who views your company page can read this. Ctrl+Enter to post.</span>
                <span className={`tabular-nums ${left < 100 ? 'font-bold text-amber-700' : ''}`}>{left} left</span>
              </div>
              {error && <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="navy" icon={MessageSquareReply} loading={save.isPending} onClick={submit}>{reply ? 'Save reply' : 'Post reply'}</Button>
                <Button size="sm" variant="ghost" onClick={cancel} disabled={save.isPending}>Cancel</Button>
              </div>
            </div>
          </Motion.div>
        ) : (
          <Motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {reply && (
              <div className="mt-5 flex gap-3 rounded-2xl bg-brand-navy/[0.04] p-4 ring-1 ring-brand-navy/10">
                <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy/60" aria-hidden />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-xs font-black text-brand-navy">
                    Your public reply{reply.edited ? <span className="font-semibold text-slate-500">· edited</span> : null}
                    {reply.status === 'hidden' && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700"><EyeOff className="h-3 w-3" aria-hidden />Hidden by PESO</span>}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{reply.body}</p>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              {reply ? (
                <>
                  <Button size="sm" variant="outline" icon={Pencil} onClick={() => setEditing(true)}>Edit reply</Button>
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirmRemove(true)}>Remove</Button>
                </>
              ) : (
                <Button size="sm" variant="navy" icon={MessageSquareReply} onClick={() => setEditing(true)}>Reply</Button>
              )}
              {!disputeOpen && (
                <Button size="sm" variant="ghost" icon={Flag} className="ml-auto text-slate-500 hover:bg-red-50 hover:text-red-700" onClick={onDispute}>Dispute</Button>
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={(open) => !remove.isPending && setConfirmRemove(open)}
        title="Remove your reply?"
        description="It will no longer show under the review. You can write a new one later."
        confirmLabel="Remove reply"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </Motion.li>
  )
})

export default ReviewCard
