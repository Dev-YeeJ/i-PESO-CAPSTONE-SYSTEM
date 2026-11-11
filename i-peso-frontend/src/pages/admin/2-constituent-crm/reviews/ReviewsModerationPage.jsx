import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle2, EyeOff, Flag, Gavel, MessageSquareWarning, Search, ShieldAlert } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatCard from '@/pages/admin/_components/StatCard'
import DataTable from '@/pages/admin/_components/DataTable'
import { Stars } from '@/components/reviews/StarRating'
import { reviewModerationService } from '@/services/reviewModerationService'
import { useAuthStore } from '@/stores/authStore'
import { canManage } from '@/utils/adminAccess'

const KEY = ['admin', 'reviews']

const QUEUES = [
  { value: 'attention', label: 'Needs attention' },
  { value: 'held', label: 'Held' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'reported', label: 'Reported' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'published', label: 'Published' },
  { value: 'all', label: 'All' },
]

const STATUS = {
  published: { label: 'Published', variant: 'approved' },
  held: { label: 'Held', variant: 'pending' },
  hidden: { label: 'Hidden', variant: 'rejected' },
}

// Same categories a job seeker picks when reporting an employer (SafetyReportCatalog).
const REPORT_REASONS = {
  scam_fraud: 'Suspected scam or fraudulent job offer',
  fake_vacancy: 'Fake or misleading job vacancy',
  misleading_terms: 'Misleading salary, benefits, or job information',
  illegal_fees: 'Request for money or unauthorized fees',
  unprofessional_conduct: 'Inappropriate or unprofessional behavior',
  discrimination_harassment: 'Discrimination or harassment',
  suspicious_company: 'Suspicious company information',
  offer_mismatch: 'Job vacancy does not match the actual offer',
  other: 'Other concern',
}

const errorText = (error, fallback) =>
  Object.values(error?.response?.data?.errors ?? {}).flat()[0] ?? error?.response?.data?.message ?? fallback

/**
 * PESO's moderation queue for employer reviews: held reviews (failed the
 * automatic check or reported by 3 people), employer disputes and job
 * seekers' reports. Honest negative reviews stay up.
 */
export default function ReviewsModerationPage() {
  const user = useAuthStore((s) => s.user)
  const canAct = canManage(user, 'constituent_crm')
  const [queue, setQueue] = useState('attention')
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState(null)

  const summary = useQuery({ queryKey: [...KEY, 'summary'], queryFn: reviewModerationService.summary })
  const list = useQuery({
    queryKey: [...KEY, 'list', queue, submittedSearch, page],
    queryFn: () => reviewModerationService.list({ queue, search: submittedSearch, page }),
    placeholderData: keepPreviousData,
  })
  const paginator = list.data?.reviews
  const counts = summary.data ?? {}

  const columns = [
    {
      key: 'employer',
      label: 'Review',
      render: (_, review) => (
        <div className="min-w-0 max-w-md">
          <button type="button" onClick={(event) => { event.stopPropagation(); setOpenId(review.id) }}
            className="text-left font-bold text-slate-900 hover:text-brand-navy hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40">
            {review.employer?.name}
          </button>
          <p className="text-xs text-slate-500">{review.type === 'employment' ? 'Employment' : 'Recruitment'} · by {review.reviewer?.name}</p>
          {review.comment && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{review.comment}</p>}
        </div>
      ),
    },
    { key: 'average', label: 'Rating', render: (value) => <span className="flex items-center gap-1.5"><Stars value={value} /> <span className="text-sm font-bold">{value?.toFixed(1)}</span></span> },
    {
      key: 'status',
      label: 'Status',
      render: (value, review) => (
        <div className="space-y-1">
          <Badge status={STATUS[value]?.variant}>{STATUS[value]?.label ?? value}</Badge>
          {review.disputed && <p className="text-xs font-semibold text-amber-800">Disputed by employer</p>}
          {review.open_flags > 0 && !review.disputed && <p className="text-xs font-semibold text-red-700">{review.open_flags} open report(s)</p>}
          {value === 'held' && review.hold_reason && <p className="max-w-[14rem] text-xs text-slate-500">{review.hold_reason}</p>}
        </div>
      ),
    },
    { key: 'created_at', label: 'Submitted', render: (value) => <span className="text-sm text-slate-600">{value ? new Date(value).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—'}</span> },
  ]

  return (
    <div className="portal-page">
      <PageHeader
        title="Reviews & Feedback"
        eyebrow="Constituent CRM"
        subtitle="Check held, reported and disputed employer reviews. Keep honest reviews up, even negative ones; hide only what breaks the community guidelines."
      />

      {!canAct && (
        <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">You can view reviews here. Publishing, hiding and escalating need full Constituent CRM access.</p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={AlertTriangle} color="amber" label="Needs attention" value={(counts.attention ?? 0).toLocaleString()} subtitle="Held, reported or disputed" />
        <StatCard icon={Gavel} color="red" label="Employer disputes" value={(counts.disputed ?? 0).toLocaleString()} subtitle="Waiting for a decision" />
        <StatCard icon={EyeOff} color="slate" label="Hidden" value={(counts.hidden ?? 0).toLocaleString()} subtitle="Taken off company pages" />
        <StatCard icon={CheckCircle2} color="green" label="Published" value={(counts.published ?? 0).toLocaleString()} subtitle="Showing on company pages" />
      </div>

      <Card padding="none" className="mt-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center">
          <div role="tablist" aria-label="Queue" className="flex flex-wrap gap-1.5">
            {QUEUES.map((item) => (
              <button key={item.value} type="button" role="tab" aria-selected={queue === item.value}
                onClick={() => { setQueue(item.value); setPage(1) }}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40 ${queue === item.value ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-navy'}`}>
                {item.label}{counts[item.value] != null && item.value !== 'all' ? ` (${counts[item.value]})` : ''}
              </button>
            ))}
          </div>
          <form className="relative lg:ml-auto lg:w-72" onSubmit={(event) => { event.preventDefault(); setSubmittedSearch(search.trim()); setPage(1) }}>
            <label htmlFor="review-search" className="sr-only">Search reviews</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="review-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Company, reviewer or text"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20" />
          </form>
        </div>

        <DataTable
          columns={columns}
          data={paginator?.data ?? []}
          loading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          onRowClick={(review) => setOpenId(review.id)}
          caption="Employer reviews for moderation. Select a row to open it."
          emptyTitle={queue === 'attention' ? 'Nothing needs attention' : 'No reviews here'}
          emptyDescription={queue === 'attention' ? 'Held, reported and disputed reviews will show up here.' : 'Try another queue or clear the search.'}
        />

        {paginator?.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 p-4">
            <span className="text-xs text-slate-500">Page {paginator.current_page} of {paginator.last_page}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={list.isFetching || page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={list.isFetching || page >= paginator.last_page} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {openId && <ReviewDetailDialog id={openId} canAct={canAct} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function ReviewDetailDialog({ id, canAct, onClose }) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState(null) // 'publish' | 'hide' | 'escalate'
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('illegal_fees')
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({ queryKey: [...KEY, 'detail', id], queryFn: () => reviewModerationService.show(id) })
  const review = data?.review

  const done = (message) => {
    toast.success(message)
    setMode(null)
    setNote('')
    setError('')
    queryClient.invalidateQueries({ queryKey: KEY })
  }

  const act = useMutation({
    mutationFn: () => {
      if (mode === 'publish') return reviewModerationService.publish(id, note)
      if (mode === 'hide') return reviewModerationService.hide(id, note)
      return reviewModerationService.escalate(id, reason, note)
    },
    onSuccess: (res) => done(mode === 'escalate' ? res.message : mode === 'hide' ? 'Review hidden. The reviewer was told why.' : 'Review published.'),
    onError: (err) => setError(errorText(err, 'That did not go through.')),
  })
  const replyVisibility = useMutation({
    mutationFn: (visible) => reviewModerationService.setReplyVisible(id, visible),
    onSuccess: (_, visible) => done(visible ? 'Reply restored.' : 'Reply hidden.'),
    onError: (err) => toast.error(errorText(err, 'That did not go through.')),
  })

  const submit = () => {
    if (mode === 'hide' && note.trim().length < 10) return setError('Tell the reviewer which guideline it breaks (at least 10 characters).')
    act.mutate()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !act.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{review ? `Review of ${review.employer?.name}` : 'Review'}</DialogTitle>
          <DialogDescription>
            {review ? `${review.type === 'employment' ? 'Employment' : 'Recruitment'} experience · submitted ${new Date(review.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}${review.edited_at ? ' · edited' : ''}` : 'Loading…'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !review ? <p className="text-sm text-slate-500">Loading…</p> : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge status={STATUS[review.status]?.variant}>{STATUS[review.status]?.label}</Badge>
              {review.hold_reason && <span className="text-xs text-slate-600">Held because: {review.hold_reason}</span>}
              {review.status === 'hidden' && review.moderation_note && <span className="text-xs text-red-700">Hidden: {review.moderation_note}</span>}
            </div>

            <dl className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Reviewer (visible to PESO only)</dt><dd className="font-semibold text-slate-900">{review.reviewer?.name}</dd><dd className="text-xs text-slate-500">{review.reviewer?.email}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Verified interaction</dt><dd className="font-semibold text-slate-900">{review.interaction?.source}{review.interaction?.job_title ? ` · ${review.interaction.job_title}` : ''}</dd>
                <dd className="text-xs text-slate-500">{review.interaction?.application_status ? `Application: ${review.interaction.application_status}` : ''}{review.interaction?.start_date ? ` · started ${review.interaction.start_date}` : ''}</dd></div>
            </dl>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2"><Stars value={review.average} /><span className="font-bold">{review.average?.toFixed(1)}</span><span className="text-sm text-slate-600">· {review.recommend ? 'Recommends' : "Doesn't recommend"}</span></div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {review.public?.ratings?.map((rating) => <li key={rating.key}>{rating.label}: <strong>{rating.value}</strong>/5</li>)}
              </ul>
              {review.comment ? <p className="mt-2 whitespace-pre-line text-sm text-slate-800">{review.comment}</p> : <p className="mt-2 text-sm text-slate-500">No written comment.</p>}
            </div>

            {review.signals?.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="flex items-center gap-1.5 font-bold"><ShieldAlert className="h-4 w-4" /> Worth a second look</p>
                <ul className="mt-1 list-disc pl-5">{review.signals.map((signal) => <li key={signal}>{signal}</li>)}</ul>
              </div>
            )}

            {review.flags?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reports and disputes</h3>
                <ul className="mt-2 space-y-2">
                  {review.flags.map((flag) => (
                    <li key={flag.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-800"><Flag className="h-3.5 w-3.5" /> {flag.from} · {flag.reason}</span>
                        <Badge variant={flag.status === 'open' ? 'pending' : 'neutral'} icon={false}>{flag.status}</Badge>
                      </div>
                      {flag.details && <p className="mt-1 text-slate-600">{flag.details}</p>}
                      {flag.resolution_note && <p className="mt-1 text-xs text-slate-500">Resolution: {flag.resolution_note}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {review.reply && (
              <div className="rounded-lg border-l-4 border-blue-200 bg-blue-50/60 px-3 py-2 text-sm">
                <p className="flex items-center justify-between gap-2 text-xs font-bold text-blue-900">
                  <span className="flex items-center gap-1.5"><MessageSquareWarning className="h-3.5 w-3.5" /> Employer's reply {review.reply.status === 'hidden' ? '(hidden)' : ''}</span>
                  {canAct && (
                    <button type="button" className="font-semibold underline-offset-2 hover:underline" disabled={replyVisibility.isPending} onClick={() => replyVisibility.mutate(review.reply.status === 'hidden')}>
                      {review.reply.status === 'hidden' ? 'Restore reply' : 'Hide reply'}
                    </button>
                  )}
                </p>
                <p className="mt-1 text-slate-700">{review.reply.body}</p>
              </div>
            )}

            {canAct && mode && (
              <div className="space-y-3 rounded-xl border border-slate-300 p-4">
                {mode === 'escalate' && (
                  <label className="block text-sm font-bold text-slate-800">Safety case category
                    <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal">
                      {Object.entries(REPORT_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                )}
                <label className="block text-sm font-bold text-slate-800">
                  {mode === 'hide' ? 'Reason the reviewer will see' : 'Note (optional)'}
                  <textarea rows={3} maxLength={1000} value={note} onChange={(event) => { setNote(event.target.value); setError('') }}
                    placeholder={mode === 'hide' ? 'e.g. It names a private person. Remove the name and PESO will check it again.' : ''}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20" />
                </label>
                {error && <p className="text-xs font-medium text-red-600">{error}</p>}
              </div>
            )}
          </div>
        )}

        {canAct && review && (
          <DialogFooter className="flex-wrap gap-2">
            {mode ? (
              <>
                <Button variant="outline" onClick={() => { setMode(null); setError('') }} disabled={act.isPending}>Back</Button>
                <Button variant={mode === 'hide' ? 'danger' : 'primary'} loading={act.isPending} onClick={submit}>
                  {mode === 'publish' ? (review.status === 'published' ? 'Keep published' : 'Publish review') : mode === 'hide' ? 'Hide review' : 'Open safety case'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setMode('escalate')}>Open a safety case</Button>
                {review.status !== 'hidden' && <Button variant="danger" onClick={() => setMode('hide')}>Hide</Button>}
                <Button onClick={() => setMode('publish')}>{review.status === 'published' ? 'Keep published' : 'Publish'}</Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
