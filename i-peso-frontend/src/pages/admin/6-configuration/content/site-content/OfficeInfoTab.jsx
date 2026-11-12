import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Bot, History, Save, Undo2 } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { adminSiteContentService } from '@/services/siteContentService'
import OfficeContactCard from '@/components/site-content/OfficeContactCard'
import { OFFICE_LIMITS } from '@/components/site-content/siteContentDefaults'
import { ChangesDialog, Field, ReadOnlyNote, SectionHistoryDialog } from './SiteContentBits'
import { apiMessage, changedKeys, fieldErrorsOf, formatWhen, inputClass, isConflict } from './formStyles'

/** Fields in form order, with what each one is used for. */
const FIELDS = [
  { key: 'office_name', hint: 'Shown on Help pages and contact cards.' },
  { key: 'address', hint: 'Footer, Help pages, Privacy Policy, emails, and the assistant’s “where is the office?” answer.' },
  { key: 'map_url', hint: 'Optional Google Maps link for “Get directions”. Leave blank to search the address.', placeholder: 'https://maps.app.goo.gl/…' },
  { key: 'hours', hint: 'e.g. Monday to Friday, 8:00 AM – 5:00 PM (closed on holidays)' },
  { key: 'phone', hint: 'Mobile or landline.' },
  { key: 'email', hint: 'Also the reply-to address in job fair emails and suspension notices.' },
  { key: 'facebook', hint: 'The office’s Facebook page link.', placeholder: 'https://www.facebook.com/…' },
  { key: 'fees_policy', hint: 'e.g. All PESO services are free of charge.', multiline: true },
  { key: 'employer_approval_time', hint: 'Shown to employers waiting for approval, e.g. 3–5 working days after complete documents.' },
]

/** Blank fields the assistant must not guess (it tells people to contact the office). */
const ASSISTANT_FIELDS = ['address', 'hours', 'phone', 'email', 'facebook', 'fees_policy', 'employer_approval_time']

export default function OfficeInfoTab({ section, canEdit }) {
  const queryClient = useQueryClient()
  // Keyed by the saved version, so a save, restore or reload resets the form.
  return <OfficeInfoForm key={section.version} section={section} canEdit={canEdit} queryClient={queryClient} />
}

function OfficeInfoForm({ section, canEdit, queryClient }) {
  const saved = section.values
  const [form, setForm] = useState(saved)
  const [errors, setErrors] = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const keys = FIELDS.map((f) => f.key)
  const normalized = Object.fromEntries(keys.map((key) => [key, form[key]?.trim?.() ? form[key].trim() : null]))
  const dirty = changedKeys(saved, normalized, keys)

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    if (errors[`values.${key}`]) setErrors((current) => ({ ...current, [`values.${key}`]: undefined }))
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-site-content'] })
  const onError = (error) => {
    if (isConflict(error)) {
      toast.error(apiMessage(error, 'Someone else saved changes. Reloading.'))
      refresh()
      return
    }
    const fieldErrors = fieldErrorsOf(error)
    if (fieldErrors) setErrors(fieldErrors)
    toast.error(apiMessage(error, 'Could not save the office information.'))
  }

  const save = useMutation({
    mutationFn: () => adminSiteContentService.save('office', normalized, section.version),
    onSuccess: (data) => {
      setConfirmOpen(false)
      toast.success(data.message)
      queryClient.setQueryData(['admin-site-content'], (current) => current && ({ ...current, sections: { ...current.sections, office: data.section } }))
      queryClient.invalidateQueries({ queryKey: ['site-content'] })
    },
    onError: (error) => { setConfirmOpen(false); onError(error) },
  })

  const restore = useMutation({
    mutationFn: (revision) => adminSiteContentService.restore('office', revision.id, section.version),
    onSuccess: (data) => {
      setHistoryOpen(false)
      toast.success(data.message)
      refresh()
      queryClient.invalidateQueries({ queryKey: ['admin-site-content-revisions', 'office'] })
    },
    onError,
  })

  const blanks = ASSISTANT_FIELDS.filter((key) => !normalized[key])

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Office information</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Entered once, used everywhere: the footer, Help pages, Privacy Policy, emails and the assistant.
            </p>
          </div>
          <Button size="sm" variant="ghost" icon={History} onClick={() => setHistoryOpen(true)}>History</Button>
        </div>

        {!canEdit && <ReadOnlyNote>You can view the office information but not change it.</ReadOnlyNote>}

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {FIELDS.map((field) => {
            const value = form[field.key] ?? ''
            const max = OFFICE_LIMITS[field.key]
            const blank = !value.trim()
            const Input = field.multiline ? 'textarea' : 'input'
            return (
              <Field
                key={field.key}
                label={section.labels[field.key]}
                max={max}
                count={value.length}
                error={errors[`values.${field.key}`]}
                hint={blank && ASSISTANT_FIELDS.includes(field.key) ? 'Left blank — hidden on the site, and the assistant will tell people to contact the office.' : field.hint}
                className={field.multiline || field.key === 'address' ? 'sm:col-span-2' : ''}
              >
                <Input
                  value={value}
                  onChange={(e) => set(field.key, e.target.value.slice(0, max))}
                  disabled={!canEdit}
                  placeholder={field.placeholder}
                  rows={field.multiline ? 2 : undefined}
                  aria-label={section.labels[field.key]}
                  className={inputClass}
                />
              </Field>
            )
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            {section.updated_at ? `Last saved ${formatWhen(section.updated_at)}${section.updated_by ? ` by ${section.updated_by}` : ''}.` : 'Showing the starting values from the system setup — nothing saved yet.'}
          </p>
          {canEdit && (
            <div className="flex gap-2">
              {dirty.length > 0 && <Button variant="ghost" size="sm" icon={Undo2} onClick={() => { setForm(saved); setErrors({}) }}>Discard changes</Button>}
              <Button variant="navy" icon={Save} disabled={dirty.length === 0} onClick={() => setConfirmOpen(true)}>
                Save{dirty.length ? ` (${dirty.length})` : ''}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Preview — Help page contact card</p>
        <OfficeContactCard office={normalized} role="employer" />
        <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-brand-navy" aria-hidden="true" />
          <p className="text-slate-700">
            {blanks.length === 0
              ? 'The assistant can answer every office question from these details.'
              : <>The assistant can’t answer questions about <strong>{blanks.map((key) => section.labels[key].toLowerCase()).join(', ')}</strong> yet — it will refer people to the office until you fill them in.</>}
          </p>
        </div>
      </div>

      <ChangesDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Save office information?"
        changes={dirty.map((key) => ({ key, label: section.labels[key], before: saved[key], after: normalized[key] }))}
        busy={save.isPending}
        onConfirm={() => save.mutate()}
      />
      <SectionHistoryDialog
        sectionKey="office"
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        canEdit={canEdit}
        busy={restore.isPending}
        onRestore={(revision) => restore.mutate(revision)}
      />
    </div>
  )
}
