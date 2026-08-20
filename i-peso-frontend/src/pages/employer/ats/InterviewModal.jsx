import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Video } from 'lucide-react'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { INTERVIEW_MODE_OPTIONS, VENUE_LABEL_BY_MODE } from './atsConstants'
import { nowLocalTime, todayLocalDate } from './atsFormatters'

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10'

function blankValues(initialInterview) {
  if (!initialInterview?.schedule) {
    return { date: '', time: '', mode: 'online', autoMeet: true, venueOrLink: '', instructions: '' }
  }
  const scheduled = new Date(initialInterview.schedule)
  return {
    date: Number.isNaN(scheduled.getTime()) ? '' : scheduled.toISOString().slice(0, 10),
    time: Number.isNaN(scheduled.getTime()) ? '' : scheduled.toTimeString().slice(0, 5),
    mode: initialInterview.mode_of_interview || 'online',
    autoMeet: false,
    venueOrLink: initialInterview.venue_or_link || '',
    instructions: initialInterview.instructions || '',
  }
}

export default function InterviewModal({ open, onClose, targets = [], initialInterview = null, isSubmitting, onSubmit }) {
  const { register, watch, reset, handleSubmit } = useForm({ defaultValues: blankValues(null) })

  useEffect(() => {
    if (open) reset(blankValues(initialInterview))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialInterview])

  const date = watch('date')
  const time = watch('time')
  const mode = watch('mode')
  const autoMeet = watch('mode') === 'online' && watch('autoMeet')
  const venueOrLink = watch('venueOrLink')

  const scheduleIsPast = useMemo(() => {
    if (!date || !time) return false
    const candidate = new Date(`${date}T${time}:00`)
    return Number.isNaN(candidate.getTime()) || candidate.getTime() <= Date.now()
  }, [date, time])

  const venueRequired = !autoMeet
  const canSubmit = date && time && !scheduleIsPast && (!venueRequired || venueOrLink.trim()) && !isSubmitting

  const submit = handleSubmit((values) => {
    onSubmit({
      interview: {
        schedule: `${values.date} ${values.time}`,
        mode_of_interview: values.mode,
        auto_meet_link: values.mode === 'online' && values.autoMeet,
        venue_or_link: values.mode === 'online' && values.autoMeet ? undefined : values.venueOrLink.trim(),
        instructions: values.instructions.trim() || undefined,
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule interview</DialogTitle>
          <p className="text-sm text-slate-500">Moving {targets.length} candidate{targets.length > 1 ? 's' : ''} to the Interview stage.</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Date</span>
              <input type="date" min={todayLocalDate()} {...register('date', { required: true })} className={inputClass} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Time</span>
              <input
                type="time"
                min={date === todayLocalDate() ? nowLocalTime() : undefined}
                {...register('time', { required: true })}
                className={inputClass}
              />
            </label>
          </div>
          {scheduleIsPast && date && time && (
            <p className="text-xs font-semibold text-red-600">This date and time has already passed. Choose a time in the future.</p>
          )}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Mode of interview</span>
            <select {...register('mode')} className={inputClass}>
              {INTERVIEW_MODE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          {mode === 'online' && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <Video className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div className="flex-1">
                <label className="flex cursor-pointer items-center">
                  <input type="checkbox" {...register('autoMeet')} className="peer sr-only" />
                  <div className="relative h-6 w-11 rounded-full bg-slate-300 transition-all after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:ring-4 peer-focus:ring-blue-300" />
                  <span className="ml-3 text-sm font-semibold text-slate-900">Auto-generate Google Meet link</span>
                </label>
                <p className="mt-1 text-xs text-slate-600">Creates a meeting on your connected Google Calendar and fills in the link automatically.</p>
              </div>
            </div>
          )}

          {venueRequired && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                {VENUE_LABEL_BY_MODE[mode] || 'Venue or link'} <span className="text-red-500">*</span>
              </span>
              <input
                {...register('venueOrLink')}
                className={inputClass}
                placeholder={mode === 'phone' ? 'e.g. 0917 123 4567' : mode === 'face_to_face' ? 'PESO office or company address' : 'Meeting link'}
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Instructions <span className="text-xs font-normal text-slate-400">(optional)</span></span>
            <textarea {...register('instructions')} rows={2} maxLength={5000} className={inputClass} placeholder="What to bring, how to prepare, etc." />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {isSubmitting ? 'Scheduling…' : 'Schedule interview'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
