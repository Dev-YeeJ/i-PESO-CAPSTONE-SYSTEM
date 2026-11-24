import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import toast from '@/lib/toast'
import { CalendarClock, Check, ChevronDown, FileSpreadsheet, Lock, Pencil, Star, UsersRound } from 'lucide-react'
import { Button, EmptyState, ErrorState } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StarInput, Stars } from '@/components/reviews/StarRating'
import { employerFeedbackService } from '@/services/employerFeedbackService'
import { cn } from '@/lib/utils'
import HireAvatar from './HireAvatar'
import { HIRES_KEY } from './reviewKeys'
import Segmented from './Segmented'
import { sortHires } from './sortHires'

const average = (ratings = {}) => {
  const values = Object.values(ratings).map(Number).filter(Boolean)
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}
const startedOn = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'medium' })
const updatedOn = (date) => new Date(date).toLocaleDateString('en-PH', { dateStyle: 'medium' })

/** People this employer hired, and the private feedback given (or still to give) about each. */
export default function HiresTab() {
  const [giving, setGiving] = useState(null)
  const [show, setShow] = useState('all')
  const { data, isLoading, error, refetch } = useQuery({ queryKey: HIRES_KEY, queryFn: employerFeedbackService.getHires })
  const hires = data?.hires ?? []

  const given = hires.filter((hire) => hire.feedback).length
  const waiting = hires.filter((hire) => !hire.feedback && hire.can_give_feedback).length
  const visible = sortHires(hires.filter((hire) => (show === 'waiting' ? !hire.feedback : show === 'done' ? hire.feedback : true)))

  return (
    <div className="space-y-5">
      <PrivacyNote />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
          {[0, 1, 2, 3].map((key) => <div key={key} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : error ? (
        <ErrorState description="Your hires could not be loaded." onRetry={refetch} error={error} />
      ) : hires.length === 0 ? (
        <EmptyState icon={UsersRound} title="No hires yet" description="People you mark as Hired, or that PESO links from your placement reports, will appear here." />
      ) : (
        <>
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">Feedback given for {given} of {hires.length} {hires.length === 1 ? 'hire' : 'hires'}</p>
              <div className="mt-2 h-2 max-w-sm overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <Motion.div className="h-full rounded-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${(given / hires.length) * 100}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
              </div>
            </div>
            <Segmented
              label="Show hires"
              size="sm"
              value={show}
              onChange={setShow}
              options={[
                { value: 'all', label: 'All', count: hires.length },
                { value: 'waiting', label: 'To rate', count: hires.length - given, highlight: waiting > 0 },
                { value: 'done', label: 'Rated', count: given },
              ]}
            />
          </div>

          {visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              {show === 'waiting' ? "You're all caught up. Every hire has feedback." : 'No feedback given yet.'}
            </p>
          ) : (
            <ul className="grid items-start gap-4 md:grid-cols-2">
              <AnimatePresence initial={false}>
                {visible.map((hire, index) => (
                  <HireCard
                    key={`${hire.source}-${hire.source_id}`}
                    hire={hire}
                    index={index}
                    aspects={data?.aspects ?? {}}
                    onGive={() => setGiving(hire)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </>
      )}

      {giving && <WorkerFeedbackDialog hire={giving} aspects={data?.aspects ?? {}} onClose={() => setGiving(null)} />}
    </div>
  )
}

function PrivacyNote() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-sky-950">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Lock className="h-4 w-4 shrink-0 text-sky-700" aria-hidden />
        <span className="font-semibold">Comments are private — only PESO and the worker read them.</span>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="hires-privacy-details"
          className="inline-flex items-center gap-1 rounded text-xs font-bold text-sky-800 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          How this works <ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} aria-hidden />
        </button>
      </div>
      {open && (
        <p id="hires-privacy-details" className="mt-2 pl-7 leading-6 text-sky-900">
          Employers the worker applies to later see only their <strong>star average</strong>, never your comments or your company name.
        </p>
      )}
    </div>
  )
}

function HireCard({ hire, index, aspects, onGive }) {
  const [details, setDetails] = useState(false)
  const score = average(hire.feedback?.ratings)
  const detailsId = `hire-details-${hire.source}-${hire.source_id}`
  const nameClass = 'block truncate text-base font-bold text-slate-900'

  return (
    <Motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 8) * 0.04 } }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-18px_rgba(15,23,42,0.22)]"
    >
      <div className="flex items-start gap-3.5">
        <HireAvatar seekerId={hire.seeker_id} name={hire.name} hasPhoto={hire.has_photo} />
        <div className="min-w-0 flex-1">
          {hire.application_id ? (
            <Link
              to={`/employer/ats/applicant/${hire.application_id}`}
              data-testid="hire-name"
              className={cn(nameClass, 'rounded underline-offset-2 hover:text-brand-navy hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus')}
            >
              {hire.name}
            </Link>
          ) : (
            <p data-testid="hire-name" className={nameClass}>{hire.name}</p>
          )}
          <p className="truncate text-sm text-slate-500">{hire.job_title ?? 'Position not set'}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            {hire.start_date && <span>Started {startedOn(hire.start_date)}</span>}
            {hire.source === 'placement' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                <FileSpreadsheet className="h-3 w-3" aria-hidden /> From placement report
              </span>
            )}
          </div>
        </div>
        {hire.feedback && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
            <Check className="h-3 w-3" aria-hidden /> Rated
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {hire.feedback ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            {score && <span className="flex items-center gap-1.5"><Stars value={score} /><strong className="text-slate-800">{score.toFixed(1)}</strong></span>}
          </div>
        ) : hire.can_give_feedback ? (
          <span className="text-xs font-semibold text-amber-700">Waiting for your feedback</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><CalendarClock className="h-3.5 w-3.5" aria-hidden />Opens on their start date</span>
        )}
        {hire.can_give_feedback && (
          <Button size="sm" variant={hire.feedback ? 'outline' : 'navy'} icon={hire.feedback ? Pencil : Star} onClick={onGive}>
            {hire.feedback ? 'Edit' : 'Give feedback'}
          </Button>
        )}
      </div>

      {hire.feedback && (
        <div>
          <button
            type="button"
            onClick={() => setDetails((value) => !value)}
            aria-expanded={details}
            aria-controls={detailsId}
            className="inline-flex items-center gap-1 rounded text-xs font-bold text-brand-navy underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {details ? 'Hide details' : 'Show details'}
            <ChevronDown className={cn('h-3.5 w-3.5 transition', details && 'rotate-180')} aria-hidden />
          </button>
          {details && (
            <div id={detailsId} data-testid="hire-feedback-details" className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
              <ul className="grid gap-2 sm:grid-cols-2">
                {Object.entries(aspects).map(([key, label]) => (
                  <li key={key} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-xs ring-1 ring-slate-100">
                    <span className="text-slate-600">{label}</span>
                    <span className="flex items-center gap-1"><Stars value={hire.feedback.ratings?.[key] ?? 0} /><strong className="text-slate-800">{hire.feedback.ratings?.[key] ?? '–'}</strong></span>
                  </li>
                ))}
              </ul>
              {hire.feedback.comment && (
                <blockquote className="whitespace-pre-line border-l-4 border-slate-300 pl-3 text-sm italic text-slate-700">{hire.feedback.comment}</blockquote>
              )}
              {hire.feedback.updated_at && <p className="text-[11px] text-slate-500">Updated {updatedOn(hire.feedback.updated_at)}</p>}
            </div>
          )}
        </div>
      )}
    </Motion.li>
  )
}

function WorkerFeedbackDialog({ hire, aspects, onClose }) {
  const queryClient = useQueryClient()
  const [ratings, setRatings] = useState(hire.feedback?.ratings ?? {})
  const [comment, setComment] = useState(hire.feedback?.comment ?? '')
  const [errors, setErrors] = useState({})
  const firstName = hire.name.split(' ')[0]

  const save = useMutation({
    mutationFn: () => employerFeedbackService.saveWorkerFeedback({
      [hire.source === 'placement' ? 'placement_record_id' : 'application_id']: hire.source_id,
      ratings,
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
    setErrors(next)
    if (!Object.keys(next).length) save.mutate()
  }

  const rated = Object.keys(aspects).filter((key) => ratings[key]).length
  const total = Object.keys(aspects).length

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Feedback on {hire.name}</DialogTitle>
          <DialogDescription>Your comment is private (PESO and {firstName} only). Your stars count toward the rating other employers see.</DialogDescription>
        </DialogHeader>
        {errors.form && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}

        <div className="space-y-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-500">{rated} of {total} rated</p>
          {Object.entries(aspects).map(([key, label]) => (
            <StarInput key={key} label={label} value={ratings[key] ?? 0} error={errors[`ratings.${key}`]}
              onChange={(value) => setRatings((current) => ({ ...current, [key]: value }))} />
          ))}
        </div>


        <div>
          <label htmlFor="worker-comment" className="text-sm font-bold text-slate-900">Comment <span className="font-normal text-slate-500">(optional, private)</span></label>
          <textarea id="worker-comment" rows={3} maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)}
            placeholder="Specific, job-related observations. No contact details."
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm leading-6 focus:border-brand-navy focus:outline-none focus:ring-4 focus:ring-brand-navy/10" />
          {errors.comment && <p className="mt-1 text-xs font-semibold text-red-600">{errors.comment}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button variant="navy" loading={save.isPending} onClick={submit}>Save feedback</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
