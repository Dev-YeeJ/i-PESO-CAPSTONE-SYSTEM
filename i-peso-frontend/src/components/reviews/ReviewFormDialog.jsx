import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { reviewService } from '@/services/reviewService'
import { aspectsFor } from '@/utils/reviews'
import { StarInput } from './StarRating'

const HINTS = {
  communication: 'Did they keep you informed and reply on time?',
  process: 'Was it organized and fair?',
  professionalism: 'Were you treated with respect?',
  posting_accuracy: 'Did the job posting describe the job honestly?',
  work_environment: 'Safety, cleanliness, how coworkers treat each other.',
  management: 'How supervisors communicate and treat staff.',
  job_accuracy: 'Pay, duties and schedule compared with the posting.',
  overall: 'Your experience working there so far.',
}

/**
 * Write or edit a review.
 * target: { type, source: 'application' | 'placement', sourceId, employerName, jobTitle, limited }
 * existing: the seeker's own review when editing.
 */
export default function ReviewFormDialog({ target, existing, onClose, onSaved }) {
  const isEdit = !!existing
  const type = existing?.type ?? target.type
  const limited = existing?.limited ?? target.limited ?? false
  const aspects = aspectsFor(type, limited)
  const employment = type === 'employment'

  const [ratings, setRatings] = useState(() => existing?.ratings_map ?? {})
  const [recommend, setRecommend] = useState(existing ? existing.recommend : null)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [agree, setAgree] = useState(isEdit)
  const [confirmStarted, setConfirmStarted] = useState(isEdit)
  const [errors, setErrors] = useState({})

  const save = useMutation({
    mutationFn: () => {
      const body = { ratings, recommend, comment: comment.trim() || null }
      if (isEdit) return reviewService.update(existing.id, body)
      return reviewService.submit({
        ...body,
        type,
        [target.source === 'placement' ? 'placement_record_id' : 'application_id']: target.sourceId,
        agree_guidelines: agree,
        ...(employment ? { confirm_started: confirmStarted } : {}),
      })
    },
    onSuccess: (data) => onSaved(data),
    onError: (error) => {
      const fieldErrors = Object.fromEntries(Object.entries(error?.response?.data?.errors ?? {}).map(([key, messages]) => [key, messages[0]]))
      setErrors(Object.keys(fieldErrors).length ? fieldErrors : { form: error?.response?.data?.message ?? 'Your review could not be saved. Please try again.' })
    },
  })

  const submit = (event) => {
    event.preventDefault()
    const next = {}
    Object.entries(aspects).forEach(([key, label]) => {
      if (!ratings[key]) next[`ratings.${key}`] = `Rate ${label.toLowerCase()}.`
    })
    if (recommend === null) next.recommend = 'Choose yes or no.'
    if (!isEdit && !agree) next.agree_guidelines = 'Please confirm your review follows the guidelines.'
    if (!isEdit && employment && !confirmStarted) next.confirm_started = 'Please confirm that you started working here.'
    setErrors(next)
    if (!Object.keys(next).length) save.mutate()
  }

  const employerName = existing?.employer?.name ?? target.employerName
  const jobTitle = existing?.job_title ?? target.jobTitle

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employment ? 'Rate working at' : 'Rate applying to'} {employerName}</DialogTitle>
          <DialogDescription>
            {jobTitle ? `${jobTitle} · ` : ''}{employment ? 'Employment experience' : 'Recruitment experience'}
          </DialogDescription>
        </DialogHeader>

        <p className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Your name is never shown. Others see you as a <strong>{employment ? 'Verified employee' : 'Verified applicant'}</strong>.
            {!employment && ' Rate how the hiring was handled, not whether you got the job.'}
          </span>
        </p>
        {limited && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            The employer hasn't responded to your application, so you can rate their communication and the job posting.
          </p>
        )}
        {errors.form && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
        {errors.type && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.type}</p>}

        <form id="review-form" onSubmit={submit} noValidate className="space-y-5">
          {Object.entries(aspects).map(([key, label]) => (
            <div key={key}>
              <StarInput
                label={label}
                value={ratings[key] ?? 0}
                onChange={(value) => { setRatings((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [`ratings.${key}`]: undefined })) }}
                error={errors[`ratings.${key}`]}
              />
              <p className="mt-0.5 text-xs text-slate-500">{HINTS[key]}</p>
            </div>
          ))}

          <fieldset>
            <legend className="text-sm font-bold text-slate-800">{employment ? 'Would you recommend working here?' : 'Would you recommend applying here?'}</legend>
            <div className="mt-2 flex gap-2">
              {[[true, 'Yes'], [false, 'No']].map(([value, text]) => (
                <label key={text} className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-bold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600 ${recommend === value ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400'}`}>
                  <input type="radio" name="recommend" className="sr-only" checked={recommend === value} onChange={() => { setRecommend(value); setErrors((current) => ({ ...current, recommend: undefined })) }} />
                  {text}
                </label>
              ))}
            </div>
            {errors.recommend && <p className="mt-1 text-xs font-medium text-red-600">{errors.recommend}</p>}
          </fieldset>

          <label className="block text-sm font-bold text-slate-800">
            Your experience <span className="font-normal text-slate-500">(optional)</span>
            <textarea
              rows={4}
              maxLength={2000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={employment ? 'What is it like to work there?' : 'What went well, and what could be better?'}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
            />
            <span className="mt-1 flex justify-between text-xs font-normal text-slate-500">
              <span>Don't include names, phone numbers or other personal details.</span>
              <span>{comment.length}/2000</span>
            </span>
            {errors.comment && <span className="mt-1 block text-xs font-medium text-red-600">{errors.comment}</span>}
          </label>

          {!isEdit && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              {employment && (
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={confirmStarted} onChange={(event) => setConfirmStarted(event.target.checked)} className="mt-0.5" />
                  <span>I started working for this employer.</span>
                </label>
              )}
              {errors.confirm_started && <p className="text-xs font-medium text-red-600">{errors.confirm_started}</p>}
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} className="mt-0.5" />
                <span>
                  This is my honest experience and follows the <a href="/review-guidelines" target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline-offset-2 hover:underline">community guidelines</a>: no insults, discrimination,
                  accusations I can't back up, or anyone's personal information. PESO can hide reviews that break them.
                </span>
              </label>
              {errors.agree_guidelines && <p className="text-xs font-medium text-red-600">{errors.agree_guidelines}</p>}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form="review-form" loading={save.isPending}>{isEdit ? 'Save changes' : 'Submit review'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
