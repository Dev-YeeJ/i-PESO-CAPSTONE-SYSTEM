import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { CalendarClock, Check, Lock, Pencil, Star, UsersRound } from 'lucide-react'
import { Button, EmptyState, ErrorState } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StarInput, Stars } from '@/components/reviews/StarRating'
import { employerFeedbackService } from '@/services/employerFeedbackService'
import { cn } from '@/lib/utils'
import { HIRES_KEY } from './reviewKeys'
import Segmented from './Segmented'

const GRADIENTS = ['from-sky-500 to-brand-navy', 'from-emerald-500 to-teal-700', 'from-amber-400 to-orange-600', 'from-violet-500 to-indigo-700', 'from-rose-400 to-pink-700']

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'
const average = (ratings = {}) => {
  const values = Object.values(ratings).map(Number).filter(Boolean)
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}
const startedOn = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'medium' })

/** People this employer hired, and the private feedback given (or still to give) about each. */
export default function HiresTab() {
  const [giving, setGiving] = useState(null)
  const [show, setShow] = useState('all')
  const { data, isLoading, error, refetch } = useQuery({ queryKey: HIRES_KEY, queryFn: employerFeedbackService.getHires })
  const hires = data?.hires ?? []

  const given = hires.filter((hire) => hire.feedback).length
  const waiting = hires.filter((hire) => !hire.feedback && hire.can_give_feedback).length
  const visible = hires.filter((hire) => (show === 'waiting' ? !hire.feedback : show === 'done' ? hire.feedback : true))

  return (
    <div className="space-y-5">
      <p className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm leading-6 text-sky-950">
        <Lock className="mt-1 h-4 w-4 shrink-0 text-sky-700" aria-hidden />
        <span>Your <strong>comments are private</strong>: only PESO and the worker can read them. Employers the worker applies to later see only their <strong>star average and would-rehire count</strong>, never your comments or your company name.</span>
      </p>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
          {[0, 1, 2, 3].map((key) => <div key={key} className="h-32 animate-pulse rounded-3xl bg-slate-100" />)}
        </div>
      ) : error ? (
        <ErrorState description="Your hires could not be loaded." onRetry={refetch} error={error} />
      ) : hires.length === 0 ? (
        <EmptyState icon={UsersRound} title="No hires yet" description="People you mark as Hired, or that PESO links from your placement reports, will appear here." />
      ) : (
        <>
          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-900">Feedback given for {given} of {hires.length} {hires.length === 1 ? 'hire' : 'hires'}</p>
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
            <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              {show === 'waiting' ? "You're all caught up. Every hire has feedback." : 'No feedback given yet.'}
            </p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              <AnimatePresence initial={false}>
                {visible.map((hire, index) => {
                  const score = average(hire.feedback?.ratings)
                  return (
                    <Motion.li
                      key={`${hire.source}-${hire.source_id}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 8) * 0.04 } }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-18px_rgba(15,23,42,0.22)]"
                    >
                      <div className="flex items-start gap-3.5">
                        <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-base font-black text-white shadow-md', GRADIENTS[(hire.seeker_id ?? index) % GRADIENTS.length])} aria-hidden="true">
                          {initials(hire.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-black text-slate-900">{hire.name}</p>
                          <p className="truncate text-sm text-slate-500">{hire.job_title ?? 'Position not set'}</p>
                          {hire.start_date && <p className="mt-0.5 text-xs text-slate-400">Started {startedOn(hire.start_date)}</p>}
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
                            <span>Rehire: <strong className="text-slate-800">{data?.would_rehire?.[hire.feedback.would_rehire] ?? hire.feedback.would_rehire}</strong></span>
                          </div>
                        ) : hire.can_give_feedback ? (
                          <span className="text-xs font-semibold text-amber-700">Waiting for your feedback</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><CalendarClock className="h-3.5 w-3.5" aria-hidden />Opens on their start date</span>
                        )}
                        {hire.can_give_feedback && (
                          <Button size="sm" variant={hire.feedback ? 'outline' : 'navy'} icon={hire.feedback ? Pencil : Star} onClick={() => setGiving(hire)}>
                            {hire.feedback ? 'Edit' : 'Give feedback'}
                          </Button>
                        )}
                      </div>
                    </Motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          )}
        </>
      )}

      {giving && <WorkerFeedbackDialog hire={giving} aspects={data?.aspects ?? {}} rehireOptions={data?.would_rehire ?? {}} onClose={() => setGiving(null)} />}
    </div>
  )
}

const REHIRE_TONE = {
  yes: 'border-emerald-600 bg-emerald-600 text-white',
  maybe: 'border-amber-500 bg-amber-500 text-white',
  no: 'border-slate-700 bg-slate-700 text-white',
}

function WorkerFeedbackDialog({ hire, aspects, rehireOptions, onClose }) {
  const queryClient = useQueryClient()
  const [ratings, setRatings] = useState(hire.feedback?.ratings ?? {})
  const [rehire, setRehire] = useState(hire.feedback?.would_rehire ?? '')
  const [comment, setComment] = useState(hire.feedback?.comment ?? '')
  const [errors, setErrors] = useState({})
  const firstName = hire.name.split(' ')[0]

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

  const rated = Object.keys(aspects).filter((key) => ratings[key]).length
  const total = Object.keys(aspects).length

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Feedback on {hire.name}</DialogTitle>
          <DialogDescription>Your comment is private (PESO and {firstName} only). Your stars and would-rehire answer count toward the rating other employers see.</DialogDescription>
        </DialogHeader>
        {errors.form && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}

        <div className="space-y-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-500">{rated} of {total} rated</p>
          {Object.entries(aspects).map(([key, label]) => (
            <StarInput key={key} label={label} value={ratings[key] ?? 0} error={errors[`ratings.${key}`]}
              onChange={(value) => setRatings((current) => ({ ...current, [key]: value }))} />
          ))}
        </div>

        <fieldset>
          <legend className="text-sm font-black text-slate-900">Would you hire {firstName} again?</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {Object.entries(rehireOptions).map(([value, label]) => (
              <label key={value} className={cn(
                'cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-bold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus',
                rehire === value ? REHIRE_TONE[value] ?? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400',
              )}>
                <input type="radio" name="would-rehire" className="sr-only" checked={rehire === value} onChange={() => { setRehire(value); setErrors((current) => ({ ...current, would_rehire: undefined })) }} />
                {label}
              </label>
            ))}
          </div>
          {errors.would_rehire && <p className="mt-1 text-xs font-semibold text-red-600">{errors.would_rehire}</p>}
        </fieldset>

        <div>
          <label htmlFor="worker-comment" className="text-sm font-black text-slate-900">Comment <span className="font-normal text-slate-500">(optional, private)</span></label>
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
