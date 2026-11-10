import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { staffService } from '@/services/staffService'
import { formatWorkDate, toTimeInput, todayInManila } from '@/utils/ojt'

/**
 * Correct an entry (wrong or missing time out) or add a day the intern worked
 * but never timed in. Either way the entry is saved as approved, with the
 * reason recorded in the activity log.
 */
export default function TimeEntryDialog({ intern, log, onClose, onSaved }) {
  const isAdd = !log
  const [workDate, setWorkDate] = useState(log?.work_date ?? '')
  const [timeIn, setTimeIn] = useState(toTimeInput(log?.time_in) || '08:00')
  const [timeOut, setTimeOut] = useState(toTimeInput(log?.time_out) || '17:00')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState({})

  const save = useMutation({
    mutationFn: () => {
      const payload = { time_in: timeIn, time_out: timeOut, note: note.trim() }
      return isAdd ? staffService.addLog(intern.id, { ...payload, work_date: workDate }) : staffService.correctLog(log.id, payload)
    },
    onSuccess: (data) => onSaved(data),
    onError: (error) => {
      const fieldErrors = Object.fromEntries(Object.entries(error?.response?.data?.errors ?? {}).map(([key, messages]) => [key, messages[0]]))
      setErrors(Object.keys(fieldErrors).length ? fieldErrors : { form: error?.response?.data?.message ?? 'The entry could not be saved.' })
    },
  })

  const submit = (event) => {
    event.preventDefault()
    const next = {}
    if (isAdd && !workDate) next.work_date = 'Choose the date.'
    if (!timeIn) next.time_in = 'Enter the time in.'
    if (!timeOut) next.time_out = 'Enter the time out.'
    else if (timeIn && timeOut <= timeIn) next.time_out = 'Time out must be later than time in.'
    if (!note.trim()) next.note = 'Give a reason for the change.'
    setErrors(next)
    if (!Object.keys(next).length) save.mutate()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isAdd ? 'Add a missed day' : 'Correct this entry'}</DialogTitle>
          <DialogDescription>
            {isAdd
              ? `For a day ${intern.name} worked but has no entry. It is saved as approved.`
              : `${intern.name} · ${formatWorkDate(log.work_date)}. The corrected entry is saved as approved.`}
          </DialogDescription>
        </DialogHeader>

        {errors.form && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}

        <form id="time-entry" onSubmit={submit} noValidate className="space-y-4">
          {isAdd && (
            <Field label="Date" error={errors.work_date}>
              <input type="date" value={workDate} max={todayInManila()} onChange={(event) => setWorkDate(event.target.value)} className={inputClass(errors.work_date)} />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Time in" error={errors.time_in}>
              <input type="time" value={timeIn} onChange={(event) => setTimeIn(event.target.value)} className={inputClass(errors.time_in)} />
            </Field>
            <Field label="Time out" error={errors.time_out}>
              <input type="time" value={timeOut} onChange={(event) => setTimeOut(event.target.value)} className={inputClass(errors.time_out)} />
            </Field>
          </div>
          <Field label="Reason" error={errors.note} hint="Recorded in the activity log, e.g. “Forgot to time out; checked the logbook.”">
            <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} className={inputClass(errors.note)} />
          </Field>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form="time-entry" loading={save.isPending}>{isAdd ? 'Add entry' : 'Save correction'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const inputClass = (error) =>
  `mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-navy/20 ${error ? 'border-red-400' : 'border-slate-300 focus:border-brand-navy'}`

function Field({ label, error, hint, children }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {children}
      {error
        ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>
        : hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  )
}
