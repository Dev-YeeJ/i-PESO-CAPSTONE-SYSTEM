import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { staffService } from '@/services/staffService'
import { errorMessage, fieldErrorsFrom } from '../staffDisplay'

const EMPTY = {
  first_name: '',
  middle_name: '',
  last_name: '',
  suffix: '',
  email: '',
  mobile_number: '',
  position: '',
  ojt_school: '',
  ojt_course: '',
  ojt_required_hours: '',
  ojt_start_date: '',
  ojt_end_date: '',
}

const INTERNSHIP_FIELDS = { ojt_school: 'school', ojt_course: 'course', ojt_required_hours: 'required_hours', ojt_start_date: 'start_date', ojt_end_date: 'end_date' }

const fromStaff = (staff) => Object.fromEntries(
  Object.keys(EMPTY).map((key) => {
    if (INTERNSHIP_FIELDS[key]) return [key, staff.internship?.[INTERNSHIP_FIELDS[key]] ?? '']
    return [key, staff[key] ?? '']
  }),
)

/**
 * Add a staff member (their sign-in details are emailed) or edit one.
 * The position decides what they can open; that's set per position on the
 * Roles & Permissions page.
 */
export default function StaffFormDialog({ open, onOpenChange, staff, positions, isSelf, onSaved }) {
  const isEdit = !!staff
  const [form, setForm] = useState(() => (staff ? fromStaff(staff) : EMPTY))
  const isIntern = form.position === 'ojt_intern'
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  const set = (field) => (event) => {
    const value = event.target.value
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const mutation = useMutation({
    mutationFn: (payload) => (isEdit ? staffService.updateStaff(staff.id, payload) : staffService.createStaff(payload)),
    onSuccess: (data) => onSaved(data),
    onError: (error) => {
      setErrors(fieldErrorsFrom(error))
      setFormError(error?.response?.status === 422 && error.response.data?.errors ? '' : errorMessage(error))
    },
  })

  const submit = (event) => {
    event.preventDefault()
    const required = { first_name: 'First name', last_name: 'Last name', mobile_number: 'Mobile number', position: 'Position' }
    if (!isEdit) required.email = 'Email'
    if (isIntern) {
      Object.assign(required, { ojt_school: 'School', ojt_required_hours: 'Required hours', ojt_start_date: 'Start date', ojt_end_date: 'End date' })
    }
    const missing = Object.fromEntries(
      Object.entries(required).filter(([key]) => !String(form[key]).trim()).map(([key, label]) => [key, `${label} is required.`]),
    )
    if (Object.keys(missing).length) {
      setErrors(missing)
      return
    }

    setFormError('')
    const payload = Object.fromEntries(
      Object.entries(form)
        .filter(([key]) => !(isEdit && key === 'email'))
        .filter(([key]) => !(isEdit && isSelf && key === 'position'))
        .map(([key, value]) => [key, value === '' ? null : value]),
    )
    if (!isIntern) Object.keys(INTERNSHIP_FIELDS).forEach((key) => delete payload[key])
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${staff.name}` : 'Add staff member'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update their details or position.'
              : 'They will receive an email with the sign-in link and a temporary password, and set their own password on first sign-in.'}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</p>
        )}

        <form id="staff-form" onSubmit={submit} noValidate className="space-y-5">
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Personal details</legend>
            <Field label="First name" required error={errors.first_name}>
              <input value={form.first_name} onChange={set('first_name')} className={inputClass(errors.first_name)} autoComplete="off" />
            </Field>
            <Field label="Middle name" error={errors.middle_name}>
              <input value={form.middle_name} onChange={set('middle_name')} className={inputClass(errors.middle_name)} autoComplete="off" />
            </Field>
            <Field label="Last name" required error={errors.last_name}>
              <input value={form.last_name} onChange={set('last_name')} className={inputClass(errors.last_name)} autoComplete="off" />
            </Field>
            <Field label="Suffix" hint="e.g. Jr., III" error={errors.suffix}>
              <input value={form.suffix} onChange={set('suffix')} className={inputClass(errors.suffix)} autoComplete="off" />
            </Field>
            <Field label="Email" required={!isEdit} hint={isEdit ? 'The sign-in email cannot be changed.' : 'Their sign-in email. The account details are sent here.'} error={errors.email}>
              <input type="email" value={form.email} onChange={set('email')} disabled={isEdit} className={inputClass(errors.email)} autoComplete="off" />
            </Field>
            <Field label="Mobile number" required error={errors.mobile_number}>
              <input type="tel" value={form.mobile_number} onChange={set('mobile_number')} placeholder="09XX XXX XXXX" className={inputClass(errors.mobile_number)} autoComplete="off" />
            </Field>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Position</legend>
            <Field
              label="Position"
              required
              hint={isEdit && isSelf ? "You can't change your own position." : 'Decides what they can open. Set what each position can open on the Roles & Permissions page.'}
              error={errors.position}
            >
              <select value={form.position} onChange={set('position')} disabled={isEdit && isSelf} className={inputClass(errors.position)}>
                <option value="">Select a position</option>
                {positions.map((position) => (
                  <option key={position.value} value={position.value}>{position.label}</option>
                ))}
              </select>
            </Field>
          </fieldset>

          {isIntern && (
            <fieldset className="grid gap-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4 sm:grid-cols-2">
              <legend className="px-1 text-xs font-bold uppercase tracking-wide text-blue-800">Internship</legend>
              <Field label="School" required error={errors.ojt_school}>
                <input value={form.ojt_school} onChange={set('ojt_school')} placeholder="e.g. Pangasinan State University" className={inputClass(errors.ojt_school)} autoComplete="off" />
              </Field>
              <Field label="Course / program" error={errors.ojt_course}>
                <input value={form.ojt_course} onChange={set('ojt_course')} placeholder="e.g. BS Information Technology" className={inputClass(errors.ojt_course)} autoComplete="off" />
              </Field>
              <Field label="Required hours" required hint="From the school's OJT requirement, e.g. 486." error={errors.ojt_required_hours}>
                <input type="number" min="1" max="2000" inputMode="numeric" value={form.ojt_required_hours} onChange={set('ojt_required_hours')} className={inputClass(errors.ojt_required_hours)} />
              </Field>
              <div className="hidden sm:block" />
              <Field label="Start date" required error={errors.ojt_start_date}>
                <input type="date" value={form.ojt_start_date} onChange={set('ojt_start_date')} className={inputClass(errors.ojt_start_date)} />
              </Field>
              <Field label="End date" required hint="The account closes automatically after this date." error={errors.ojt_end_date}>
                <input type="date" value={form.ojt_end_date} min={form.ojt_start_date || undefined} onChange={set('ojt_end_date')} className={inputClass(errors.ojt_end_date)} />
              </Field>
            </fieldset>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="staff-form" loading={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add and send email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const inputClass = (error) =>
  `mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-brand-navy/20 disabled:bg-slate-50 disabled:text-slate-500 ${error ? 'border-red-400' : 'border-slate-300 focus:border-brand-navy'}`

function Field({ label, required, hint, error, children }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}{required && <span className="text-red-600"> *</span>}
      {children}
      {error
        ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>
        : hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  )
}
