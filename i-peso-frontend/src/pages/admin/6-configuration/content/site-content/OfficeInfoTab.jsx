import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Bot, History, Save, Undo2 } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { adminSiteContentService } from '@/services/siteContentService'
import OfficeContactCard from '@/components/site-content/OfficeContactCard'
import { OFFICE_LIMITS } from '@/components/site-content/siteContentDefaults'
import { Field, MoreSection, ReadOnlyNote, SectionHistoryDialog } from './SiteContentBits'
import { apiMessage, changedKeys, fieldErrorsOf, formatWhen, inputClass, isConflict } from './formStyles'

/** What people change and ask about most — always on screen. */
const MAIN_FIELDS = [
  { key: 'address', wide: true },
  { key: 'hours', placeholder: 'Monday to Friday, 8:00 AM – 5:00 PM' },
  { key: 'phone' },
  { key: 'email' },
  { key: 'facebook', placeholder: 'https://www.facebook.com/…' },
]

/** Rarely changed — folded under "More options". */
const MORE_FIELDS = [
  { key: 'fees_policy', placeholder: 'All PESO services are free of charge.', wide: true },
  { key: 'employer_approval_time', placeholder: '3–5 working days after complete documents', wide: true },
  { key: 'office_name' },
  { key: 'map_url', placeholder: 'Leave blank to search the address' },
]

const ALL_KEYS = [...MAIN_FIELDS, ...MORE_FIELDS].map((f) => f.key)

/** Blank fields the assistant must not guess (it tells people to contact the office). */
const ASSISTANT_FIELDS = ['address', 'hours', 'phone', 'email', 'facebook', 'fees_policy', 'employer_approval_time']

export default function OfficeInfoTab({ section, canEdit }) {
  // Keyed by the saved version, so a save, restore or reload resets the form.
  return <OfficeInfoForm key={section.version} section={section} canEdit={canEdit} />
}

function OfficeInfoForm({ section, canEdit }) {
  const queryClient = useQueryClient()
  const saved = section.values
  const [form, setForm] = useState(saved)
  const [errors, setErrors] = useState({})
  const [historyOpen, setHistoryOpen] = useState(false)

  const normalized = Object.fromEntries(ALL_KEYS.map((key) => [key, form[key]?.trim?.() ? form[key].trim() : null]))
  const dirty = changedKeys(saved, normalized, ALL_KEYS)

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    if (errors[`values.${key}`]) setErrors((current) => ({ ...current, [`values.${key}`]: undefined }))
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-site-content'] })
    queryClient.invalidateQueries({ queryKey: ['site-content'] })
    queryClient.invalidateQueries({ queryKey: ['content-health'] })
    queryClient.invalidateQueries({ queryKey: ['admin-site-content-revisions', 'office'] })
  }
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
  const onSaved = (data) => {
    setHistoryOpen(false)
    toast.success(data.message ?? 'Saved. Undo any time from History.')
    refresh()
  }

  const save = useMutation({ mutationFn: () => adminSiteContentService.save('office', normalized, section.version), onSuccess: onSaved, onError })
  const restore = useMutation({ mutationFn: (revision) => adminSiteContentService.restore('office', revision.id, section.version), onSuccess: onSaved, onError })

  const blanks = ASSISTANT_FIELDS.filter((key) => !normalized[key])
  const moreHasError = MORE_FIELDS.some((f) => errors[`values.${f.key}`])
  const moreBlank = MORE_FIELDS.filter((f) => ASSISTANT_FIELDS.includes(f.key) && !normalized[f.key]).length

  const field = (item) => {
    const value = form[item.key] ?? ''
    const max = OFFICE_LIMITS[item.key]
    return (
      <Field
        key={item.key}
        label={section.labels[item.key]}
        error={errors[`values.${item.key}`]}
        hint={!value.trim() && ASSISTANT_FIELDS.includes(item.key) ? 'Blank — hidden on the site; the assistant will say to contact the office.' : null}
        className={item.wide ? 'sm:col-span-2' : ''}
      >
        <input
          value={value}
          onChange={(e) => set(item.key, e.target.value.slice(0, max))}
          disabled={!canEdit}
          placeholder={item.placeholder}
          aria-label={section.labels[item.key]}
          className={inputClass}
        />
      </Field>
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Office information</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">Entered once, used everywhere: footer, Help pages, Privacy Policy, emails and the assistant.</p>
          </div>
          <Button size="sm" variant="ghost" icon={History} onClick={() => setHistoryOpen(true)}>History</Button>
        </div>

        {!canEdit && <div className="mt-4"><ReadOnlyNote>You can view the office information but not change it.</ReadOnlyNote></div>}

        <div className="mt-5 grid gap-5 sm:grid-cols-2">{MAIN_FIELDS.map(field)}</div>

        <MoreSection summary={moreBlank ? `${moreBlank} not filled in` : 'fees, approval time, office name, map link'} forceOpen={moreHasError}>
          <div className="grid gap-5 sm:grid-cols-2">{MORE_FIELDS.map(field)}</div>
        </MoreSection>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            {section.updated_at ? `Last saved ${formatWhen(section.updated_at)}${section.updated_by ? ` by ${section.updated_by}` : ''}.` : 'Nothing saved yet.'}
          </p>
          {canEdit && (
            <div className="flex gap-2">
              {dirty.length > 0 && <Button variant="ghost" size="sm" icon={Undo2} onClick={() => { setForm(saved); setErrors({}) }}>Discard</Button>}
              <Button variant="navy" icon={Save} loading={save.isPending} disabled={dirty.length === 0} onClick={() => save.mutate()}>Save</Button>
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Preview</p>
        <OfficeContactCard office={normalized} role="employer" />
        {blanks.length > 0 && (
          <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <Bot className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            <p className="text-slate-600">
              The assistant can’t answer about <strong>{blanks.map((key) => section.labels[key].toLowerCase()).join(', ')}</strong> until these are filled in.
            </p>
          </div>
        )}
      </div>

      <SectionHistoryDialog sectionKey="office" open={historyOpen} onOpenChange={setHistoryOpen} canEdit={canEdit} busy={restore.isPending} onRestore={(revision) => restore.mutate(revision)} />
    </div>
  )
}
