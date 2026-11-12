import { ArrowDown, ArrowUp, ExternalLink, History, Plus, Save, Undo2, X } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { ABOUT_LIMITS, SERVICE_AUDIENCES } from '@/components/site-content/siteContentDefaults'
import { ChangesDialog, Field, ReadOnlyNote, SectionHistoryDialog } from './SiteContentBits'
import { formatWhen, inputClass } from './formStyles'
import useSectionEditor from './useSectionEditor'

const TEXT_FIELDS = [
  { key: 'headline', hint: 'The page title.', rows: 1 },
  { key: 'intro', hint: 'Who PESO Urdaneta is, in two or three sentences.', rows: 4 },
  { key: 'mission', hint: 'PESO Urdaneta’s official mission statement. Leave blank to hide it — don’t write a new one here.', rows: 3 },
  { key: 'vision', hint: 'The official vision statement. Leave blank to hide it.', rows: 3 },
  { key: 'mandate', hint: 'The law that sets up PESOs.', rows: 3 },
]

const blankService = { title: '', description: '', audience: 'everyone', link_label: '', link_url: '' }
const trimOrNull = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null)

const normalize = (form) => ({
  ...form,
  ...Object.fromEntries(TEXT_FIELDS.map(({ key }) => [key, trimOrNull(form[key])])),
  services: (form.services ?? []).map((s) => ({
    title: s.title?.trim() ?? '',
    description: s.description?.trim() ?? '',
    audience: s.audience,
    link_label: trimOrNull(s.link_label),
    link_url: trimOrNull(s.link_url),
  })),
})

export default function AboutTab({ section, canEdit, office }) {
  return <AboutForm key={section.version} section={section} canEdit={canEdit} office={office} />
}

function AboutForm({ section, canEdit }) {
  const editor = useSectionEditor('about', section, { normalize })
  const { form, set, err, dirty } = editor
  const services = form.services ?? []

  const setService = (index, patch) => set('services', services.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  const moveService = (index, delta) => {
    const next = [...services]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    set('services', next)
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">About PESO</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            The public <strong>/about</strong> page: who PESO Urdaneta is, what it offers, and how to reach it (from Office info).
          </p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" icon={ExternalLink} to="/about" target="_blank">Open</Button>
          <Button size="sm" variant="ghost" icon={History} onClick={() => editor.setHistoryOpen(true)}>History</Button>
        </div>
      </div>
      {!canEdit && <div className="mt-4"><ReadOnlyNote>You can view the About page but not change it.</ReadOnlyNote></div>}

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {TEXT_FIELDS.map((field) => (
          <Field key={field.key} label={section.labels[field.key]} max={ABOUT_LIMITS[field.key]} count={(form[field.key] ?? '').length} error={err(field.key)} hint={field.hint} className={field.key === 'intro' || field.key === 'headline' ? 'xl:col-span-2' : ''}>
            {field.rows === 1 ? (
              <input value={form[field.key] ?? ''} onChange={(e) => set(field.key, e.target.value.slice(0, ABOUT_LIMITS[field.key]))} disabled={!canEdit} aria-label={section.labels[field.key]} className={inputClass} />
            ) : (
              <textarea value={form[field.key] ?? ''} onChange={(e) => set(field.key, e.target.value.slice(0, ABOUT_LIMITS[field.key]))} disabled={!canEdit} rows={field.rows} aria-label={section.labels[field.key]} className={inputClass} />
            )}
          </Field>
        ))}
      </div>

      <fieldset className="mt-6 border-t border-slate-100 pt-5">
        <legend className="text-sm font-black text-slate-950">PESO services <span className="font-semibold text-slate-400">({services.length}/{ABOUT_LIMITS.max_services})</span></legend>
        {err('services') && <p className="mt-1 text-xs font-semibold text-red-600">{err('services')}</p>}
        <ol className="mt-3 grid gap-3 xl:grid-cols-2">
          {services.map((service, index) => (
            <li key={index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Service {index + 1}</span>
                {canEdit && (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveService(index, -1)} disabled={index === 0} aria-label={`Move service ${index + 1} up`} className="rounded-md p-1 text-slate-400 hover:bg-white disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => moveService(index, 1)} disabled={index === services.length - 1} aria-label={`Move service ${index + 1} down`} className="rounded-md p-1 text-slate-400 hover:bg-white disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => set('services', services.filter((_, i) => i !== index))} aria-label={`Remove service ${index + 1}`} className="rounded-md p-1 text-red-500 hover:bg-red-50"><X className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-[2fr_1fr]">
                <Field label="Name" max={ABOUT_LIMITS.service_title} count={service.title?.length ?? 0} error={err(`services.${index}.title`)}>
                  <input value={service.title ?? ''} onChange={(e) => setService(index, { title: e.target.value.slice(0, ABOUT_LIMITS.service_title) })} disabled={!canEdit} aria-label={`Service ${index + 1} name`} className={inputClass} />
                </Field>
                <Field label="For" error={err(`services.${index}.audience`)}>
                  <select value={service.audience} onChange={(e) => setService(index, { audience: e.target.value })} disabled={!canEdit} aria-label={`Service ${index + 1} audience`} className={inputClass}>
                    {SERVICE_AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Description" max={ABOUT_LIMITS.service_description} count={service.description?.length ?? 0} error={err(`services.${index}.description`)} className="mt-2">
                <textarea value={service.description ?? ''} onChange={(e) => setService(index, { description: e.target.value.slice(0, ABOUT_LIMITS.service_description) })} disabled={!canEdit} rows={2} aria-label={`Service ${index + 1} description`} className={inputClass} />
              </Field>
              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_2fr]">
                <Field label="Link button (optional)" error={err(`services.${index}.link_label`)}>
                  <input value={service.link_label ?? ''} onChange={(e) => setService(index, { link_label: e.target.value.slice(0, 60) })} disabled={!canEdit} aria-label={`Service ${index + 1} link label`} className={inputClass} />
                </Field>
                <Field label="Link" error={err(`services.${index}.link_url`)}>
                  <input value={service.link_url ?? ''} onChange={(e) => setService(index, { link_url: e.target.value })} disabled={!canEdit} placeholder="/register/seeker or https://…" aria-label={`Service ${index + 1} link`} className={inputClass} />
                </Field>
              </div>
            </li>
          ))}
        </ol>
        {canEdit && (
          <Button size="sm" variant="outline" icon={Plus} className="mt-3" disabled={services.length >= ABOUT_LIMITS.max_services} onClick={() => set('services', [...services, { ...blankService }])}>
            Add a service
          </Button>
        )}
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">
          {section.updated_at ? `Last saved ${formatWhen(section.updated_at)}${section.updated_by ? ` by ${section.updated_by}` : ''}.` : 'Showing the starting text — nothing saved yet.'}
        </p>
        {canEdit && (
          <div className="flex gap-2">
            {dirty.length > 0 && <Button variant="ghost" size="sm" icon={Undo2} onClick={editor.discard}>Discard changes</Button>}
            <Button variant="navy" icon={Save} disabled={dirty.length === 0} onClick={() => editor.setConfirmOpen(true)}>Save{dirty.length ? ` (${dirty.length})` : ''}</Button>
          </div>
        )}
      </div>

      <ChangesDialog open={editor.confirmOpen} onOpenChange={editor.setConfirmOpen} title="Update the About page?" changes={editor.changes} busy={editor.save.isPending} onConfirm={() => editor.save.mutate()} />
      <SectionHistoryDialog sectionKey="about" open={editor.historyOpen} onOpenChange={editor.setHistoryOpen} canEdit={canEdit} busy={editor.restore.isPending} onRestore={(revision) => editor.restore.mutate(revision)} />
    </Card>
  )
}
