import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from '@/lib/toast'
import { Building2, Lock, MessageSquareReply, Pencil, Star, Trash2 } from 'lucide-react'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui'
import ReviewFormDialog from '@/components/reviews/ReviewFormDialog'
import { Stars } from '@/components/reviews/StarRating'
import { reviewService } from '@/services/reviewService'
import { MY_REVIEWS_KEY, findRequestedReview, openActions } from '@/utils/reviews'
import PortalPageHeader from '@/components/shell/PortalPageHeader'

const STATUS = {
  published: { label: 'Published', variant: 'approved' },
  held: { label: 'Waiting for PESO', variant: 'pending' },
  hidden: { label: 'Hidden by PESO', variant: 'rejected' },
}

export default function MyReviewsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [writing, setWriting] = useState(null)   // a target from openActions
  const [editing, setEditing] = useState(null)   // one of the seeker's reviews
  const [removing, setRemoving] = useState(null)

  const { data, isLoading, error, refetch } = useQuery({ queryKey: MY_REVIEWS_KEY, queryFn: reviewService.getMine })
  const actions = useMemo(() => openActions(data?.opportunities), [data])
  const reviews = useMemo(() => data?.reviews ?? [], [data])

  // A notification links here as ?review=application-12-employment: open the
  // review for that job (or their existing one) with that kind preselected.
  const wanted = searchParams.get('review')
  const requested = useMemo(() => (data ? findRequestedReview(wanted, actions, reviews) : {}), [wanted, data, actions, reviews])
  const clearRequest = () => wanted && setSearchParams({}, { replace: true })

  const writingTarget = writing ?? requested.action ?? null
  const editingReview = editing ?? requested.review ?? null

  const refresh = () => queryClient.invalidateQueries({ queryKey: MY_REVIEWS_KEY })

  const remove = useMutation({
    mutationFn: (id) => reviewService.remove(id),
    onSuccess: (res) => { toast.success(res.message); setRemoving(null); refresh() },
    onError: (err) => { toast.error(err?.response?.data?.message ?? 'The review could not be removed.'); setRemoving(null) },
  })

  const closeForms = () => {
    setWriting(null)
    setEditing(null)
    clearRequest()
  }

  const onSaved = (res) => {
    closeForms()
    toast.success(res.message)
    refresh()
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 pb-12">
      <PortalPageHeader
        title="Reviews"
        subtitle="Review a company once you apply: one review per job, about the hiring process or, once you're hired, working there. Only people with a real application or job through i-PESO can review, and your name is never shown."
      >
        <Button to="/review-guidelines" variant="secondary" size="sm">Review guidelines</Button>
      </PortalPageHeader>

      {isLoading ? (
        <LoadingSkeleton variant="card" rows={3} />
      ) : error ? (
        <ErrorState description="Your reviews could not be loaded." onRetry={refetch} error={error} />
      ) : (
        <>
          <section className="rounded-2xl border border-brand-gold/40 bg-[#fffbeb] p-5" aria-labelledby="ready-heading">
            <h2 id="ready-heading" className="text-lg font-semibold text-slate-900">Ready to review <span className="font-normal text-slate-500">({actions.length})</span></h2>
            <p className="mt-1 text-sm text-slate-700">PESO confirmed you applied to or worked for these employers.</p>
            {actions.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
                Nothing to review right now. Every company you apply to through i-PESO appears here.
              </p>
            ) : (
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {actions.map((action) => (
                  <li key={action.key} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fc] text-brand-navy"><Building2 className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{action.employerName}</p>
                        <p className="truncate text-xs text-slate-500">
                          {[action.jobTitle, action.types.includes('employment') ? 'hiring process or working here' : 'hiring process'].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" icon={Star} onClick={() => setWriting(action)}>Review company</Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <EmployerFeedbackSection items={data?.employer_feedback ?? []} />

          <section aria-labelledby="mine-heading">
            <h2 id="mine-heading" className="text-lg font-semibold text-slate-900">Your reviews <span className="font-normal text-slate-500">({reviews.length})</span></h2>
            {reviews.length === 0 ? (
              <div className="mt-3"><EmptyState icon={Star} title="No reviews yet" description="Reviews you write will appear here. You can edit or take them back anytime." /></div>
            ) : (
              <ul className="mt-3 space-y-3">
                {reviews.map((review) => {
                  const status = STATUS[review.status] ?? STATUS.published
                  return (
                    <li key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{review.employer?.name}</p>
                          <p className="text-xs text-slate-500">
                            {[review.job_title, review.type === 'employment' ? 'working here' : 'hiring process', review.month].filter(Boolean).join(', ')}{review.edited ? ' (edited)' : ''}
                          </p>
                        </div>
                        <Badge status={status.variant}>{status.label}</Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                        <span className="flex items-center gap-2"><Stars value={review.average} /> <span className="text-sm font-bold text-slate-800">{review.average?.toFixed(1)}</span></span>
                        <span className="text-sm text-slate-600">{review.recommend ? 'Would recommend' : "Wouldn't recommend"}</span>
                      </div>
                      {review.comment && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{review.comment}</p>}

                      {review.status === 'held' && review.hold_reason && (
                        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">PESO will check this review before it appears: {review.hold_reason.toLowerCase()}.</p>
                      )}
                      {review.status === 'hidden' && (
                        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                          PESO hid this review{review.moderation_note ? `: ${review.moderation_note}` : '.'} You can edit it and PESO will check it again.
                        </p>
                      )}
                      {review.reply && (
                        <div className="mt-3 rounded-lg border-l-4 border-slate-300 bg-slate-50 px-3 py-2 text-sm">
                          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><MessageSquareReply className="h-3.5 w-3.5" /> Reply from {review.employer?.name}</p>
                          <p className="mt-1 text-slate-700">{review.reply.body}</p>
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" icon={Pencil} onClick={() => setEditing(review)}>Edit</Button>
                        <Button size="sm" variant="ghost" icon={Trash2} className="text-red-700 hover:bg-red-50" onClick={() => setRemoving(review)}>Take back</Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {writingTarget && <ReviewFormDialog target={writingTarget} onClose={closeForms} onSaved={onSaved} />}
      {!writingTarget && editingReview && <ReviewFormDialog existing={editingReview} onClose={closeForms} onSaved={onSaved} />}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && !remove.isPending && setRemoving(null)}
        title="Take back this review?"
        description={`Your review of ${removing?.employer?.name ?? 'this employer'} will be removed from the company profile. You can write a new one later.`}
        confirmLabel="Take back review"
        busy={remove.isPending}
        onConfirm={() => remove.mutate(removing.id)}
      />
    </div>
  )
}

/**
 * What employers privately said about this job seeker. Only they and PESO can
 * read it, and it opens once they've reviewed that workplace (or after the
 * waiting period), so neither side writes in reaction to the other.
 */
function EmployerFeedbackSection({ items }) {
  if (!items.length) return null

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card" aria-labelledby="employer-feedback-heading">
      <h2 id="employer-feedback-heading" className="text-lg font-semibold text-slate-900">Feedback from employers</h2>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><Lock className="h-4 w-4" aria-hidden /> Only you and PESO can read the comments. Employers you apply to see only your average rating and how many would hire you again.</p>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl bg-brand-canvas p-4">
            <p className="font-semibold text-slate-900">{item.employer?.name}</p>
            {item.job_title && <p className="text-xs text-slate-500">{item.job_title}</p>}
            {item.locked ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {item.employer?.name} left feedback about you. Review this workplace to read it now, or it opens on{' '}
                {new Date(`${item.visible_from}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}.
              </p>
            ) : (
              <>
                <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {item.ratings?.map((rating) => (
                    <li key={rating.key} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-1.5">
                      <span className="text-slate-700">{rating.label}</span>
                      <span className="flex items-center gap-1.5"><Stars value={rating.value} /><span className="font-bold">{rating.value}</span></span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-slate-700">Would hire you again: <strong>{item.would_rehire}</strong></p>
                {item.comment && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{item.comment}</p>}
                <p className="mt-3 text-xs text-slate-500">
                  Think something here is unfair or not about your work? Tell PESO at the office; staff can remove feedback that breaks the{' '}
                  <a href="/review-guidelines" target="_blank" rel="noreferrer" className="font-semibold text-brand-navy underline-offset-2 hover:underline">guidelines</a>.
                </p>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
