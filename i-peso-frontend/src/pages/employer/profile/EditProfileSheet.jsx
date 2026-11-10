import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Lock, Plus, X } from 'lucide-react'
import { Button, ConfirmDialog } from '@/components/ui'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { INDUSTRIES } from '@/utils/constants'
import { COMPANY_SIZES, MIN_DESCRIPTION, industriesOf } from '@/utils/employerProfileStrength'
import { cn } from '@/lib/utils'

const PHONE = /^(\+63|0)\d{10}$/
const phoneMessage = 'Use 09XXXXXXXXX or +639XXXXXXXXX.'
const STANDARD_INDUSTRIES = INDUSTRIES.filter((industry) => industry !== 'Other')

const schema = z.object({
  company_description: z.string().max(5000, 'Keep it under 5,000 characters.'),
  industry: z.array(z.string().trim().min(1)).min(1, 'Choose at least one industry.'),
  company_size: z.enum(['micro', 'small', 'medium', 'large'], { message: 'Choose a company size.' }),
  representative_name: z.string().trim().min(2, "Enter the representative's full name.").max(255),
  representative_designation: z.string().trim().min(2, 'Enter their position, e.g. HR Manager.').max(255),
  mobile_number: z.string().trim().regex(PHONE, phoneMessage),
  representative_contact_number: z.string().trim().refine((value) => value === '' || PHONE.test(value), phoneMessage),
})

const toForm = (profile) => ({
  company_description: profile?.company_description ?? '',
  industry: industriesOf(profile),
  company_size: profile?.company_size ?? undefined,
  representative_name: profile?.representative_name ?? '',
  representative_designation: profile?.representative_designation ?? '',
  mobile_number: profile?.mobile_number ?? '',
  representative_contact_number: profile?.representative_contact_number ?? '',
})

const inputClass = (error) => cn(
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-4',
  error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-300 focus:border-brand-navy focus:ring-brand-navy/10',
)

function Field({ id, label, hint, error, optional, children }) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-bold text-slate-800">
        <span>{label}{optional && <span className="ml-1 font-normal text-slate-500">(optional)</span>}</span>
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

function Group({ title, children }) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</legend>
      {children}
    </fieldset>
  )
}

function IndustryPicker({ value, onChange, error }) {
  const [custom, setCustom] = useState('')
  const selected = new Set(value)
  const extras = value.filter((industry) => !STANDARD_INDUSTRIES.includes(industry))
  const toggle = (industry) => onChange(selected.has(industry) ? value.filter((item) => item !== industry) : [...value, industry])
  const addCustom = () => {
    const name = custom.trim()
    if (name && !selected.has(name)) onChange([...value, name])
    setCustom('')
  }

  return (
    <div>
      <div role="group" aria-label="Industries" aria-describedby={error ? 'industry-error' : undefined} className="flex flex-wrap gap-2">
        {[...STANDARD_INDUSTRIES, ...extras].map((industry, index) => {
          const on = selected.has(industry)
          return (
            <button
              key={industry}
              id={index === 0 ? 'industry' : undefined}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(industry)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                on ? 'border-brand-navy bg-brand-navy text-white shadow-sm' : 'border-slate-300 bg-white text-slate-600 hover:border-brand-navy/50 hover:text-slate-900',
              )}
            >
              {on && <Check className="h-3.5 w-3.5" aria-hidden />}
              {industry}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom() } }}
          placeholder="Not listed? Type your industry"
          aria-label="Add an industry that isn't listed"
          maxLength={255}
          className={inputClass(false)}
        />
        <Button variant="outline" icon={Plus} onClick={addCustom} disabled={!custom.trim()}>Add</Button>
      </div>
    </div>
  )
}

/**
 * Edit panel for the company profile. Validates as you go (same rules as the
 * server), shows the server's own messages next to the field, and asks before
 * throwing away unsaved changes.
 */
export default function EditProfileSheet({ open, onOpenChange, profile, focusField, onSave }) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const {
    register, control, handleSubmit, reset, setError, setFocus,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), mode: 'onTouched', defaultValues: toForm(profile) })

  // Start from the saved profile every time the panel opens.
  useEffect(() => { if (open) reset(toForm(profile)) }, [open, profile, reset])

  const description = useWatch({ control, name: 'company_description' }) ?? ''

  const requestClose = () => (isDirty ? setConfirmDiscard(true) : onOpenChange(false))

  const submit = handleSubmit(async (values) => {
    try {
      await onSave({
        ...values,
        company_description: values.company_description.trim() || null,
        representative_contact_number: values.representative_contact_number || null,
      })
      onOpenChange(false)
    } catch (error) {
      const fieldErrors = error?.response?.data?.errors ?? {}
      const entries = Object.entries(fieldErrors)
      entries.forEach(([field, messages]) => setError(field.split('.')[0], { type: 'server', message: [messages].flat()[0] }))
      if (!entries.length) setError('root', { type: 'server', message: error?.response?.data?.message ?? error?.response?.data?.error ?? 'Your changes could not be saved. Try again.' })
    }
  })

  const described = (name, hasHint = false) => (errors[name] ? `${name}-error` : hasHint ? `${name}-hint` : undefined)

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <SheetContent
          aria-describedby="edit-profile-description"
          onOpenAutoFocus={(event) => {
            if (!focusField) return
            event.preventDefault()
            if (focusField === 'industry') document.getElementById('industry')?.focus()
            else setFocus(focusField)
          }}
        >
          <form onSubmit={submit} className="flex h-full flex-col" noValidate>
            <SheetHeader>
              <SheetTitle>Edit company profile</SheetTitle>
              <SheetDescription id="edit-profile-description">Job seekers see this on your company page and job posts.</SheetDescription>
            </SheetHeader>

            <SheetBody className="space-y-9">
              {errors.root && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.root.message}</p>}

              <Group title="Company">
                <Field id="company_description" label="About the company" error={errors.company_description?.message}>
                  <textarea
                    id="company_description"
                    rows={6}
                    maxLength={5000}
                    placeholder="What does your company do? What is it like to work there? What do you look for in applicants?"
                    aria-invalid={!!errors.company_description}
                    aria-describedby="company_description-count"
                    className={inputClass(errors.company_description)}
                    {...register('company_description')}
                  />
                  <div id="company_description-count" className="mt-1.5 flex justify-between text-xs text-slate-500">
                    <span className={description.trim().length >= MIN_DESCRIPTION ? 'font-semibold text-emerald-700' : ''}>
                      {description.trim().length >= MIN_DESCRIPTION ? 'Good length' : `${MIN_DESCRIPTION - description.trim().length} more characters for a complete profile`}
                    </span>
                    <span className="tabular-nums">{description.length.toLocaleString()}/5,000</span>
                  </div>
                </Field>

                <Field id="industry" label="Industry" error={errors.industry?.message ?? errors.industry?.root?.message}>
                  <Controller name="industry" control={control} render={({ field }) => (
                    <IndustryPicker value={field.value ?? []} onChange={field.onChange} error={errors.industry} />
                  )} />
                </Field>

                <Controller name="company_size" control={control} render={({ field }) => (
                  <fieldset aria-describedby={errors.company_size ? 'company_size-error' : undefined}>
                    <legend className="text-sm font-bold text-slate-800">Company size</legend>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      {COMPANY_SIZES.map((size, index) => (
                        <label
                          key={size.value}
                          className={cn(
                            'cursor-pointer rounded-xl border px-3.5 py-2.5 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus',
                            field.value === size.value ? 'border-brand-navy bg-brand-navy/5 ring-1 ring-brand-navy' : 'border-slate-300 hover:border-brand-navy/50',
                          )}
                        >
                          <input
                            type="radio"
                            name={field.name}
                            value={size.value}
                            checked={field.value === size.value}
                            onChange={() => field.onChange(size.value)}
                            ref={index === 0 ? field.ref : undefined}
                            className="sr-only"
                          />
                          <span className="block text-sm font-bold text-slate-900">{size.label}</span>
                          <span className="block text-xs text-slate-500">{size.detail}</span>
                        </label>
                      ))}
                    </div>
                    {errors.company_size && <p id="company_size-error" className="mt-1.5 text-xs font-semibold text-red-600">{errors.company_size.message}</p>}
                  </fieldset>
                )} />
              </Group>

              <Group title="Representative">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="representative_name" label="Full name" error={errors.representative_name?.message}>
                    <input id="representative_name" autoComplete="name" aria-invalid={!!errors.representative_name} aria-describedby={described('representative_name')} className={inputClass(errors.representative_name)} {...register('representative_name')} />
                  </Field>
                  <Field id="representative_designation" label="Position" error={errors.representative_designation?.message}>
                    <input id="representative_designation" autoComplete="organization-title" placeholder="e.g. HR Manager" aria-invalid={!!errors.representative_designation} aria-describedby={described('representative_designation')} className={inputClass(errors.representative_designation)} {...register('representative_designation')} />
                  </Field>
                  <Field id="mobile_number" label="Mobile number" hint="PESO and applicants use this for follow-ups." error={errors.mobile_number?.message}>
                    <input id="mobile_number" type="tel" inputMode="tel" autoComplete="tel" placeholder="09XXXXXXXXX" aria-invalid={!!errors.mobile_number} aria-describedby={described('mobile_number', true)} className={inputClass(errors.mobile_number)} {...register('mobile_number')} />
                  </Field>
                  <Field id="representative_contact_number" label="Other number" optional error={errors.representative_contact_number?.message}>
                    <input id="representative_contact_number" type="tel" inputMode="tel" placeholder="09XXXXXXXXX" aria-invalid={!!errors.representative_contact_number} aria-describedby={described('representative_contact_number')} className={inputClass(errors.representative_contact_number)} {...register('representative_contact_number')} />
                  </Field>
                </div>
              </Group>

              <p className="flex gap-2.5 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                Your registered name, business type, TIN and address are checked against your permits. To change them, contact the PESO office so they can re-verify your documents.
              </p>
            </SheetBody>

            <SheetFooter>
              <span className="mr-auto hidden text-xs text-slate-500 sm:block">{isDirty ? 'You have unsaved changes' : 'No changes yet'}</span>
              <Button variant="outline" icon={X} onClick={requestClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" icon={Check} loading={isSubmitting} disabled={!isDirty}>Save changes</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard your changes?"
        description="What you've typed in the profile panel won't be saved."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => { setConfirmDiscard(false); onOpenChange(false) }}
      />
    </>
  )
}
