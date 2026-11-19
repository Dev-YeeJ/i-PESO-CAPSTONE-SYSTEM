import { useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, History, Link2, Plus, Save, Undo2, X } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { ABOUT_LIMITS, ORG_LEVELS, SERVICE_AUDIENCES } from '@/components/site-content/siteContentDefaults'
import { Field, MoreSection, ReadOnlyNote, SectionHistoryDialog } from './SiteContentBits'
import { formatWhen, inputClass } from './formStyles'
import useSectionEditor from './useSectionEditor'

const blankService = { title: '', description: '', audience: 'everyone', link_label: '', link_url: '' }
const blankPerson = { name: '', position: '', level: 'staff', unit: '' }
const trimOrNull = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null)

const normalize = (form) => ({
  ...form,
  ...Object.fromEntries(['headline', 'intro', 'mission', 'vision', 'mandate'].map((key) => [key, trimOrNull(form[key])])),
  services: (form.services ?? []).map((s) => ({
    title: s.title?.trim() ?? '',
    description: s.description?.trim() ?? '',
    audience: s.audience,
    link_label: trimOrNull(s.link_label),
    link_url: trimOrNull(s.link_url),
  })),
  org_chart: (form.org_chart ?? []).map((p) => ({
    name: p.name?.trim() ?? '',
    position: p.position?.trim() ?? '',
    level: p.level || 'staff',
    unit: trimOrNull(p.unit),
  })),
})

/** Move item `index` of `list` by `delta`, or return the list unchanged at either end. */
const moved = (list, index, delta) => {
  const target = index + delta
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export default function AboutTab({ section, canEdit }) {
  return <AboutForm key={section.version} section={section} canEdit={canEdit} />
}

function AboutForm({ section, canEdit }) {
  const editor = useSectionEditor('about', section, { normalize })
  const { form, set, err, dirty } = editor
  const services = form.services ?? []
  const people = form.org_chart ?? []
  const setPerson = (index, patch) => set('org_chart', people.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  // Unit names already typed, offered as suggestions so a unit is spelled the same everywhere.
  const units = [...new Set(people.map((p) => p.unit?.trim()).filter(Boolean))]
  // Services whose link fields are open (already have a link, or "Add a link" was pressed).
  const [linkOpen, setLinkOpen] = useState(() => new Set(services.map((s, i) => (s.link_url ? i : null)).filter((i) => i !== null)))

  const setService = (index, patch) => set('services', services.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  const moveService = (index, delta) => set('services', moved(services, index, delta))

  const textArea = (key, { rows = 3, placeholder, hint } = {}) => (
    <Field label={section.labels[key]} max={ABOUT_LIMITS[key]} count={(form[key] ?? '').length} error={err(key)} hint={hint}>
      <textarea value={form[key] ?? ''} onChange={(e) => set(key, e.target.value.slice(0, ABOUT_LIMITS[key]))} disabled={!canEdit} rows={rows} placeholder={placeholder} aria-label={section.labels[key]} className={inputClass} />
    </Field>
  )

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">About PESO</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">The public <strong>/about</strong> page. Contact details come from Office info.</p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" icon={ExternalLink} to="/about" target="_blank">Open</Button>
          <Button size="sm" variant="ghost" icon={History} onClick={() => editor.setHistoryOpen(true)}>History</Button>
        </div>
      </div>
      {!canEdit && <div className="mt-4"><ReadOnlyNote>You can view the About page but not change it.</ReadOnlyNote></div>}

      <div className="mt-5 space-y-5">
        {textArea('intro', { rows: 3 })}
        <div className="grid gap-5 xl:grid-cols-2">
          {textArea('mission', { rows: 2, placeholder: 'Leave blank until PESO gives its official wording', hint: 'Hidden on the page while blank.' })}
          {textArea('vision', { rows: 2, placeholder: 'Leave blank until PESO gives its official wording', hint: 'Hidden on the page while blank.' })}
        </div>

        <fieldset>
          <legend className="text-xs font-semibold text-slate-600">PESO services ({services.length}/{ABOUT_LIMITS.max_services})</legend>
          {err('services') && <p className="mt-1 text-xs font-semibold text-red-600">{err('services')}</p>}
          <ol className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {services.map((service, index) => {
              const showLink = linkOpen.has(index)
              const rowError = err(`services.${index}.title`) ?? err(`services.${index}.description`) ?? err(`services.${index}.link_url`) ?? err(`services.${index}.link_label`)
              return (
                <li key={index} className="space-y-2 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={service.title ?? ''} onChange={(e) => setService(index, { title: e.target.value.slice(0, ABOUT_LIMITS.service_title) })} disabled={!canEdit} placeholder="Service name" aria-label={`Service ${index + 1} name`} className={`${inputClass} !mt-0 min-w-[12rem] flex-1`} />
                    <select value={service.audience} onChange={(e) => setService(index, { audience: e.target.value })} disabled={!canEdit} aria-label={`Service ${index + 1} audience`} className="rounded-xl border border-slate-300 bg-white px-2.5 py-2.5 text-sm">
                      {SERVICE_AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                    {canEdit && (
                      <span className="flex">
                        <button type="button" onClick={() => moveService(index, -1)} disabled={index === 0} aria-label={`Move service ${index + 1} up`} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                        <button type="button" onClick={() => moveService(index, 1)} disabled={index === services.length - 1} aria-label={`Move service ${index + 1} down`} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                        <button type="button" onClick={() => set('services', services.filter((_, i) => i !== index))} aria-label={`Remove service ${index + 1}`} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
                      </span>
                    )}
                  </div>
                  <textarea value={service.description ?? ''} onChange={(e) => setService(index, { description: e.target.value.slice(0, ABOUT_LIMITS.service_description) })} disabled={!canEdit} rows={2} placeholder="One or two sentences about it" aria-label={`Service ${index + 1} description`} className={`${inputClass} !mt-0`} />
                  {showLink ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                      <input value={service.link_label ?? ''} onChange={(e) => setService(index, { link_label: e.target.value.slice(0, 60) })} disabled={!canEdit} placeholder="Button label" aria-label={`Service ${index + 1} link label`} className={`${inputClass} !mt-0`} />
                      <input value={service.link_url ?? ''} onChange={(e) => setService(index, { link_url: e.target.value })} disabled={!canEdit} placeholder="/register/seeker or https://…" aria-label={`Service ${index + 1} link`} className={`${inputClass} !mt-0`} />
                    </div>
                  ) : canEdit ? (
                    <button type="button" onClick={() => setLinkOpen((current) => new Set(current).add(index))} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900">
                      <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Add a link button
                    </button>
                  ) : null}
                  {rowError && <p className="text-xs font-semibold text-red-600">{rowError}</p>}
                </li>
              )
            })}
          </ol>
          {canEdit && (
            <Button size="sm" variant="outline" icon={Plus} className="mt-3" disabled={services.length >= ABOUT_LIMITS.max_services} onClick={() => set('services', [...services, { ...blankService }])}>
              Add a service
            </Button>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-xs font-semibold text-slate-600">Organization chart ({people.length}/{ABOUT_LIMITS.max_org})</legend>
          <p className="mt-1 text-xs text-slate-500">
            The office&apos;s real staff, shown on the About page as office head, then each unit head with their staff. Hidden on the page while empty.
            Staff are grouped under the unit head with the same unit name.
          </p>
          {err('org_chart') && <p className="mt-1 text-xs font-semibold text-red-600">{err('org_chart')}</p>}
          {people.length > 0 && (
            <ol className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {people.map((person, index) => {
                const rowError = err(`org_chart.${index}.name`) ?? err(`org_chart.${index}.position`) ?? err(`org_chart.${index}.level`) ?? err(`org_chart.${index}.unit`)
                return (
                  <li key={index} className="space-y-2 p-3">
                    <div className="grid gap-2 md:grid-cols-[1.2fr_1.2fr_9rem_1fr_auto]">
                      <input value={person.name ?? ''} onChange={(e) => setPerson(index, { name: e.target.value.slice(0, ABOUT_LIMITS.org_name) })} disabled={!canEdit} placeholder="Full name" aria-label={`Person ${index + 1} name`} className={`${inputClass} !mt-0`} />
                      <input value={person.position ?? ''} onChange={(e) => setPerson(index, { position: e.target.value.slice(0, ABOUT_LIMITS.org_position) })} disabled={!canEdit} placeholder="Position" aria-label={`Person ${index + 1} position`} className={`${inputClass} !mt-0`} />
                      <select value={person.level || 'staff'} onChange={(e) => setPerson(index, { level: e.target.value })} disabled={!canEdit} aria-label={`Person ${index + 1} level`} className="rounded-xl border border-slate-300 bg-white px-2.5 py-2.5 text-sm">
                        {ORG_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                      </select>
                      <input value={person.unit ?? ''} list="org-units" onChange={(e) => setPerson(index, { unit: e.target.value.slice(0, ABOUT_LIMITS.org_unit) })} disabled={!canEdit || person.level === 'head'} placeholder={person.level === 'head' ? 'Not needed' : 'Unit (optional)'} aria-label={`Person ${index + 1} unit`} className={`${inputClass} !mt-0`} />
                      {canEdit && (
                        <span className="flex items-center">
                          <button type="button" onClick={() => set('org_chart', moved(people, index, -1))} disabled={index === 0} aria-label={`Move person ${index + 1} up`} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                          <button type="button" onClick={() => set('org_chart', moved(people, index, 1))} disabled={index === people.length - 1} aria-label={`Move person ${index + 1} down`} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                          <button type="button" onClick={() => set('org_chart', people.filter((_, i) => i !== index))} aria-label={`Remove person ${index + 1}`} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
                        </span>
                      )}
                    </div>
                    {rowError && <p className="text-xs font-semibold text-red-600">{rowError}</p>}
                  </li>
                )
              })}
            </ol>
          )}
          <datalist id="org-units">{units.map((unit) => <option key={unit} value={unit} />)}</datalist>
          {canEdit && (
            <Button size="sm" variant="outline" icon={Plus} className="mt-3" disabled={people.length >= ABOUT_LIMITS.max_org} onClick={() => set('org_chart', [...people, { ...blankPerson, level: people.length === 0 ? 'head' : 'staff' }])}>
              Add a person
            </Button>
          )}
        </fieldset>
      </div>

      <MoreSection summary="page heading, legal mandate" forceOpen={Boolean(err('headline') || err('mandate'))}>
        <div className="space-y-5">
          <Field label={section.labels.headline} max={ABOUT_LIMITS.headline} count={(form.headline ?? '').length} error={err('headline')}>
            <input value={form.headline ?? ''} onChange={(e) => set('headline', e.target.value.slice(0, ABOUT_LIMITS.headline))} disabled={!canEdit} aria-label={section.labels.headline} className={inputClass} />
          </Field>
          {textArea('mandate', { rows: 2 })}
        </div>
      </MoreSection>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">
          {section.updated_at ? `Last saved ${formatWhen(section.updated_at)}${section.updated_by ? ` by ${section.updated_by}` : ''}.` : 'Showing the starting text.'}
        </p>
        {canEdit && (
          <div className="flex gap-2">
            {dirty.length > 0 && <Button variant="ghost" size="sm" icon={Undo2} onClick={editor.discard}>Discard</Button>}
            <Button variant="navy" icon={Save} loading={editor.save.isPending} disabled={dirty.length === 0} onClick={() => editor.save.mutate()}>Save</Button>
          </div>
        )}
      </div>

      <SectionHistoryDialog sectionKey="about" open={editor.historyOpen} onOpenChange={editor.setHistoryOpen} canEdit={canEdit} busy={editor.restore.isPending} onRestore={(revision) => editor.restore.mutate(revision)} />
    </Card>
  )
}
