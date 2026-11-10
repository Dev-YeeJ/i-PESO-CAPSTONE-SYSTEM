import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Flag, Lock, MessageSquareReply, ShieldCheck, ThumbsDown, ThumbsUp, UserRound } from 'lucide-react'
import { Badge, Button, Card, ConfirmDialog, ErrorState, LoadingSkeleton } from '@/components/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ReputationSummaryCard from '@/components/reviews/ReputationSummaryCard'
import { StarInput, Stars } from '@/components/reviews/StarRating'
import { employerFeedbackService } from '@/services/employerFeedbackService'

const REVIEWS_KEY = ['employer', 'reviews']
const HIRES_KEY = ['employer', 'hires']

const errorText = (error, fallback) =>
  Object.values(error?.response?.data?.errors ?? {}).flat()[0] ?? error?.response?.data?.message ?? fallback

/** Reviews of the company (read, reply once, dispute) and private feedback about hires. */
export default function EmployerReviewsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <p className="text-xs font-black uppercase tracking-widest text-blue-700">Verified feedback</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Reviews</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Reviews come only from people who applied or worked here through i-PESO, and you never see who wrote them.
          You can reply once to each review. If one breaks the <a href="/review-guidelines" target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline-offset-2 hover:underline">community guidelines</a>, dispute it and PESO will check it.
        </p>
      </header>

      <Tabs defaultValue="company" className="mt-6">
        <TabsList>
          <TabsTrigger value="company">Reviews of your company</TabsTrigger>
          <TabsTrigger value="hires">Feedback on your hires</TabsTrigger>
        </TabsList>
        <TabsContent value="company"><CompanyReviewsTab /></TabsContent>
        <TabsContent value="hires"><HiresTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ── Reviews of the company ──────────────────────────────────────────────────

function CompanyReviewsTab() {
  const [type, setType] = useState('recruitment')
  const [page, setPage] = useState(1)
  const [disputing, setDisputing] = useState(null)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: [...REVIEWS_KEY, type, page],
    queryFn: () => employerFeedbackService.getReviews({ type, page }),
    placeholderData: keepPreviousData,
  })
  const paginator = data?.reviews
  const reviews = paginator?.data ?? []

  return (
    <div className="mt-4 space-y-4">
      <div role="tablist" aria-label="Review type" className="inline-flex rounded-xl bg-slate-100 p-1">
        {[['recruitment', 'Hiring process'], ['employment', 'Working here']].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={type === value}
            onClick={() => { setType(value); setPage(1) }}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${type === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {label}{data?.summary?.[value] ? <span className="ml-1 text-slate-400">({data.summary[value].reviewers})</span> : null}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="card" rows={2} />
      ) : error ? (
        <ErrorState description="Your reviews could not be loaded." onRetry={refetch} error={error} />
      ) : (
        <>
          <ReputationSummaryCard section={data?.summary?.[type]} type={type} minReviews={data?.summary?.min_reviews} />

          {reviews.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              No reviews of this kind yet. Applicants can review you once you respond to their application.
            </p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((review) => (
                <ReviewItem key={review.id} review={review} onDispute={() => setDisputing(review)} />
              ))}
            </ul>
          )}

          {paginator?.last_page > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Page {paginator.current_page} of {paginator.last_page}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={isFetching || page <= 1} onClick={() => setPage((current) => current - 1)}>Newer</Button>
                <Button size="sm" variant="outline" disabled={isFetching || page >= paginator.last_page} onClick={() => setPage((current) => current + 1)}>Older</Button>
              </div>
            </div>
          )}
        </>
      )}

      {disputing && <DisputeDialog review={disputing} reasons={data?.dispute_reasons ?? {}} onClose={() => setDisputing(null)} />}
    </div>
  )
}

function ReviewItem({ review, onDispute }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(review.own_reply?.body ?? '')
  const [error, setError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)

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

  const dispute = review.dispute
  const disputeOpen = dispute?.status === 'open'

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {review.reviewer}</span>
        <span className="text-xs text-slate-500">{review.month}{review.edited ? ' · edited' : ''}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5"><Stars value={review.average} /><span className="text-sm font-bold text-slate-800">{review.average?.toFixed(1)}</span></span>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${review.recommend ? 'text-emerald-700' : 'text-slate-500'}`}>
          {review.recommend ? <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> : <ThumbsDown className="h-3.5 w-3.5" aria-hidden />}
          {review.recommend ? 'Recommends you' : "Doesn't recommend you"}
        </span>
        {review.limited && <span className="text-xs text-amber-700">You didn't respond to this person's application</span>}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {review.ratings.map((rating) => <li key={rating.key}>{rating.label}: <strong className="text-slate-800">{rating.value}</strong>/5</li>)}
      </ul>
      {review.comment && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{review.comment}</p>}

      {dispute && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-xs ${disputeOpen ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'}`}>
          {disputeOpen
            ? `You disputed this review (${dispute.reason}). PESO is looking into it; it stays up meanwhile.`
            : `PESO reviewed your dispute (${dispute.reason}): ${dispute.status === 'upheld' ? 'upheld' : 'the review stays up'}.${dispute.resolution_note ? ` ${dispute.resolution_note}` : ''}`}
        </p>
      )}

      {/* Their one public reply */}
      {!editing && review.own_reply && (
        <div className="mt-3 rounded-lg border-l-4 border-blue-200 bg-blue-50/60 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-bold text-blue-900"><MessageSquareReply className="h-3.5 w-3.5" aria-hidden /> Your public reply{review.own_reply.edited ? ' · edited' : ''}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{review.own_reply.body}</p>
          {review.own_reply.status === 'hidden' && <p className="mt-1 text-xs text-red-700">PESO hid this reply.</p>}
        </div>
      )}
      {editing && (
        <div className="mt-3">
          <label htmlFor={`reply-${review.id}`} className="text-sm font-bold text-slate-800">Your public reply</label>
          <textarea
            id={`reply-${review.id}`}
            rows={3}
            maxLength={1500}
            value={body}
            onChange={(event) => { setBody(event.target.value); setError('') }}
            placeholder="Thank the reviewer and explain any changes you've made. Stay professional."
            className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700/20 ${error ? 'border-red-400' : 'border-slate-300 focus:border-blue-700'}`}
          />
          <div className="flex justify-between text-xs text-slate-500"><span>Everyone who views your company page can read this.</span><span>{body.length}/1500</span></div>
          {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
          <div className="mt-2 flex gap-2">
            <Button size="sm" loading={save.isPending} onClick={() => (body.trim().length >= 10 ? save.mutate() : setError('Write at least a short sentence.'))}>
              {review.own_reply ? 'Save reply' : 'Post reply'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setBody(review.own_reply?.body ?? ''); setError('') }}>Cancel</Button>
          </div>
        </div>
      )}

      {!editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" icon={MessageSquareReply} onClick={() => setEditing(true)}>{review.own_reply ? 'Edit reply' : 'Reply'}</Button>
          {review.own_reply && <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(true)}>Remove reply</Button>}
          {!disputeOpen && <Button size="sm" variant="ghost" icon={Flag} className="text-slate-500 hover:text-red-700" onClick={onDispute}>Dispute</Button>}
        </div>
      )}

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={(open) => !remove.isPending && setConfirmRemove(open)}
        title="Remove your reply?"
        description="It will no longer show under the review. You can write a new one later."
        confirmLabel="Remove reply"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </li>
  )
}

function DisputeDialog({ review, reasons, onClose }) {
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
    if (details.trim().length < 20) return setError('Explain what is wrong in a bit more detail (at least 20 characters).')
    send.mutate()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !send.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dispute this review</DialogTitle>
          <DialogDescription>
            PESO checks it against the community guidelines. Honest negative reviews stay up; you can reply to them instead.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <fieldset>
          <legend className="text-sm font-bold text-slate-800">Why should PESO look at it?</legend>
          <div className="mt-2 space-y-1.5">
            {Object.entries(reasons).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="dispute-reason" checked={reason === value} onChange={() => { setReason(value); setError('') }} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-bold text-slate-800">
          What's wrong with it?
          <textarea rows={4} maxLength={2000} value={details} onChange={(event) => { setDetails(event.target.value); setError('') }}
            placeholder="Explain what is false or against the guidelines. Records you can share with PESO help."
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20" />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={send.isPending}>Cancel</Button>
          <Button loading={send.isPending} onClick={submit}>Send to PESO</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Private feedback about hires ────────────────────────────────────────────

function HiresTab() {
  const [giving, setGiving] = useState(null)
  const { data, isLoading, error, refetch } = useQuery({ queryKey: HIRES_KEY, queryFn: employerFeedbackService.getHires })
  const hires = data?.hires ?? []

  return (
    <div className="mt-4 space-y-4">
      <p className="flex gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>Feedback about the people you hired is <strong>private</strong>. Only PESO and the worker can read it. It is never shown to other employers or on any public page.</span>
      </p>

      {isLoading ? (
        <LoadingSkeleton variant="table" rows={4} columns={3} />
      ) : error ? (
        <ErrorState description="Your hires could not be loaded." onRetry={refetch} error={error} />
      ) : hires.length === 0 ? (
        <Card className="text-sm text-slate-500">No hires yet. People you mark as Hired, or that PESO links from your placement reports, will appear here.</Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {hires.map((hire) => (
            <li key={`${hire.source}-${hire.source_id}`} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"><UserRound className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{hire.name}</p>
                  <p className="truncate text-xs text-slate-500">{hire.job_title ?? 'Position not set'}{hire.start_date ? ` · started ${new Date(`${hire.start_date}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'medium' })}` : ''}</p>
                  {hire.feedback && (
                    <p className="mt-1 text-xs text-slate-600">
                      <Badge variant="approved" icon={false}>Feedback given</Badge>{' '}
                      Would rehire: <strong>{data?.would_rehire?.[hire.feedback.would_rehire] ?? hire.feedback.would_rehire}</strong>
                    </p>
                  )}
                </div>
              </div>
              {hire.can_give_feedback ? (
                <Button size="sm" variant={hire.feedback ? 'outline' : 'primary'} onClick={() => setGiving(hire)}>{hire.feedback ? 'Edit' : 'Give feedback'}</Button>
              ) : (
                <span className="text-xs text-slate-500">From their start date</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {giving && <WorkerFeedbackDialog hire={giving} aspects={data?.aspects ?? {}} rehireOptions={data?.would_rehire ?? {}} onClose={() => setGiving(null)} />}
    </div>
  )
}

function WorkerFeedbackDialog({ hire, aspects, rehireOptions, onClose }) {
  const queryClient = useQueryClient()
  const [ratings, setRatings] = useState(hire.feedback?.ratings ?? {})
  const [rehire, setRehire] = useState(hire.feedback?.would_rehire ?? '')
  const [comment, setComment] = useState(hire.feedback?.comment ?? '')
  const [errors, setErrors] = useState({})

  const save = useMutation({
    mutationFn: () => employerFeedbackService.saveWorkerFeedback({
      [hire.source === 'placement' ? 'placement_record_id' : 'application_id']: hire.source_id,
      ratings,
      would_rehire: rehire,
      comment: comment.trim() || null,
    }),
    onSuccess: (res) => { toast.success(res.message); queryClient.invalidateQueries({ queryKey: HIRES_KEY }); onClose() },
    onError: (err) => {
      const fieldErrors = Object.fromEntries(Object.entries(err?.response?.data?.errors ?? {}).map(([key, messages]) => [key, messages[0]]))
      setErrors(Object.keys(fieldErrors).length ? fieldErrors : { form: err?.response?.data?.message ?? 'Your feedback could not be saved.' })
    },
  })

  const submit = () => {
    const next = {}
    Object.entries(aspects).forEach(([key, label]) => { if (!ratings[key]) next[`ratings.${key}`] = `Rate ${label.toLowerCase()}.` })
    if (!rehire) next.would_rehire = 'Choose an answer.'
    setErrors(next)
    if (!Object.keys(next).length) save.mutate()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Feedback on {hire.name}</DialogTitle>
          <DialogDescription>Private: only PESO and {hire.name.split(' ')[0]} can read this.</DialogDescription>
        </DialogHeader>
        {errors.form && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
        <div className="space-y-4">
          {Object.entries(aspects).map(([key, label]) => (
            <StarInput key={key} label={label} value={ratings[key] ?? 0} error={errors[`ratings.${key}`]}
              onChange={(value) => setRatings((current) => ({ ...current, [key]: value }))} />
          ))}
          <fieldset>
            <legend className="text-sm font-bold text-slate-800">Would you hire them again?</legend>
            <div className="mt-2 flex gap-2">
              {Object.entries(rehireOptions).map(([value, label]) => (
                <label key={value} className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600 ${rehire === value ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400'}`}>
                  <input type="radio" name="would-rehire" className="sr-only" checked={rehire === value} onChange={() => setRehire(value)} />
                  {label}
                </label>
              ))}
            </div>
            {errors.would_rehire && <p className="mt-1 text-xs font-medium text-red-600">{errors.would_rehire}</p>}
          </fieldset>
          <label className="block text-sm font-bold text-slate-800">
            Comment <span className="font-normal text-slate-500">(optional)</span>
            <textarea rows={3} maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)}
              placeholder="Specific, job-related observations. No contact details."
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20" />
            {errors.comment && <span className="mt-1 block text-xs font-medium text-red-600">{errors.comment}</span>}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button loading={save.isPending} onClick={submit}>Save feedback</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
