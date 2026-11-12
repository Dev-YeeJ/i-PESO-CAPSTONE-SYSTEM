import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowDown, ArrowLeft, ArrowUp, Eye, FilePlus2, PenLine, Plus, Save, Send, Trash2, X } from 'lucide-react'
import { Badge, Button, Card, ConfirmDialog, ErrorState, LoadingSkeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { adminPolicyService } from '@/services/siteContentService'
import RichText from '@/components/site-content/RichText'
import { formatPolicyDate } from '@/pages/legal/policyMeta'
import { Field, ReadOnlyNote } from './SiteContentBits'
import { apiMessage, fieldErrorsOf, formatWhen, inputClass, sameValue, todayInput } from './formStyles'

const TITLE_MAX = 120
const BODY_MAX = 8000

export default function PolicyEditor({ slug, canEdit, office, onBack, tokens }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['admin-policy', slug], queryFn: () => adminPolicyService.get(slug) })

  const start = useMutation({
    mutationFn: () => adminPolicyService.startDraft(slug),
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['admin-policy', slug] })
      queryClient.invalidateQueries({ queryKey: ['admin-policies'] })
    },
    onError: (error) => toast.error(apiMessage(error, 'Could not start a new version.')),
  })

  if (query.isLoading) return <LoadingSkeleton variant="card" rows={3} />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  const { policy, current, draft, versions } = query.data

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack}>All policy pages</Button>
        <Button variant="ghost" size="sm" to={`/${slug}`} target="_blank">View the live page</Button>
      </div>

      {draft ? (
        <DraftEditor key={`${draft.version}-${draft.updated_at}`} slug={slug} policy={policy} draft={draft} canEdit={canEdit} office={office} tokens={tokens} />
      ) : (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">{policy.title}</h2>
              <p className="mt-1 text-sm text-slate-600">
                Version {current.version}, effective {formatPolicyDate(current.effective_at)}{current.is_builtin ? ' (the original text)' : ''}.
              </p>
            </div>
            {canEdit && <Button variant="navy" icon={FilePlus2} loading={start.isPending} onClick={() => start.mutate()}>Start a new version</Button>}
          </div>
          {!canEdit && <div className="mt-4"><ReadOnlyNote>You can read the policy versions but not change them.</ReadOnlyNote></div>}
          <PolicyPreview version={current} office={office} className="mt-5" />
        </Card>
      )}

      <Card>
        <h3 className="text-sm font-black text-slate-950">Published versions</h3>
        <ol className="mt-3 divide-y divide-slate-100 text-sm">
          {versions.map((version) => (
            <li key={version.version} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
              <span className="w-24 shrink-0 font-bold text-slate-900">Version {version.version}</span>
              <span className="w-44 shrink-0 text-slate-500">Effective {formatPolicyDate(version.effective_at)}</span>
              <span className="flex-1 text-slate-700">{version.change_note}</span>
              <span className="text-xs text-slate-400">{version.published_by ? `by ${version.published_by}` : version.is_builtin ? 'shipped with i-PESO' : ''}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}

function DraftEditor({ slug, policy, draft, canEdit, office, tokens }) {
  const queryClient = useQueryClient()
  const initial = {
    summary: { title: draft.summary?.title ?? '', body: draft.summary?.body ?? '' },
    sections: draft.sections.map((section) => ({ ...section })),
    change_note: draft.change_note ?? '',
  }
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [mode, setMode] = useState('edit')
  const [publishOpen, setPublishOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [effectiveAt, setEffectiveAt] = useState(todayInput())
  const dirty = !sameValue(initial, form)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-policy', slug] })
    queryClient.invalidateQueries({ queryKey: ['admin-policies'] })
    queryClient.invalidateQueries({ queryKey: ['policy', slug] })
  }
  const onError = (fallback) => (error) => {
    const fieldErrors = fieldErrorsOf(error)
    if (fieldErrors) setErrors(fieldErrors)
    toast.error(apiMessage(error, fallback))
  }

  const payload = () => ({
    summary: form.summary.body.trim() ? form.summary : null,
    sections: form.sections.map(({ id, title, body }) => ({ id, title, body })),
    change_note: form.change_note,
  })

  const save = useMutation({
    mutationFn: () => adminPolicyService.saveDraft(slug, payload()),
    onSuccess: (data) => { toast.success(data.message); setErrors({}); refresh() },
    onError: onError('Could not save the draft.'),
  })

  const publish = useMutation({
    mutationFn: async () => {
      // Save first so what gets published is exactly what is on screen.
      await adminPolicyService.saveDraft(slug, payload())
      return adminPolicyService.publish(slug, effectiveAt)
    },
    onSuccess: (data) => { setPublishOpen(false); toast.success(data.message); refresh() },
    onError: (error) => { setPublishOpen(false); onError('Could not publish this version.')(error) },
  })

  const discard = useMutation({
    mutationFn: () => adminPolicyService.discard(slug),
    onSuccess: (data) => { setDiscardOpen(false); toast.success(data.message); refresh() },
    onError: onError('Could not discard the draft.'),
  })

  const setSection = (index, patch) => setForm((current) => ({ ...current, sections: current.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)) }))
  const moveSection = (index, delta) => setForm((current) => {
    const sections = [...current.sections]
    const target = index + delta
    if (target < 0 || target >= sections.length) return current
    ;[sections[index], sections[target]] = [sections[target], sections[index]]
    return { ...current, sections }
  })
  const removeSection = (index) => setForm((current) => ({ ...current, sections: current.sections.filter((_, i) => i !== index) }))
  const addSection = () => setForm((current) => ({ ...current, sections: [...current.sections, { id: '', title: '', body: '' }] }))

  const submitPublish = () => {
    if (!form.change_note.trim()) {
      setErrors({ change_note: 'Describe what changed — it is shown in the list of versions.' })
      setMode('edit')
      return
    }
    setPublishOpen(true)
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-950">{policy.title}</h2>
            <Badge variant="pending">Draft · version {draft.version}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Readers still see the current version. {draft.updated_at ? `Draft last saved ${formatWhen(draft.updated_at)}.` : ''}
          </p>
        </div>
        <div className="flex gap-1" role="tablist" aria-label="Editor mode">
          {[['edit', PenLine, 'Write'], ['preview', Eye, 'Preview']].map(([value, icon, label]) => (
            <Button key={value} size="sm" variant={mode === value ? 'navy' : 'ghost'} icon={icon} role="tab" aria-selected={mode === value} onClick={() => setMode(value)}>{label}</Button>
          ))}
        </div>
      </div>

      {mode === 'preview' ? (
        <PolicyPreview version={{ ...payload(), sections: form.sections }} office={office} className="mt-5" />
      ) : (
        <div className="mt-5 space-y-5">
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
            Plain text: a blank line starts a new paragraph, “- ” starts a bullet, <strong>**bold**</strong> for emphasis.
            Office details fill in automatically from Office info: {tokens.map((token) => <code key={token} className="mx-0.5 rounded bg-white px-1 py-0.5 text-[11px] text-slate-800">{token}</code>)}
          </p>

          <Field label="Summary box (optional)" hint="A short note shown above the first section, e.g. a Filipino summary.">
            <input value={form.summary.title} onChange={(e) => setForm((c) => ({ ...c, summary: { ...c.summary, title: e.target.value.slice(0, 60) } }))} disabled={!canEdit} placeholder="Heading, e.g. Buod (Filipino)" aria-label="Summary heading" className={inputClass} />
            <textarea value={form.summary.body} onChange={(e) => setForm((c) => ({ ...c, summary: { ...c.summary, body: e.target.value.slice(0, 1500) } }))} disabled={!canEdit} rows={3} placeholder="Leave empty for no summary box." aria-label="Summary text" className={inputClass} />
          </Field>

          <ol className="space-y-4">
            {form.sections.map((section, index) => (
              <li key={index} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Section {index + 1}</span>
                  {canEdit && (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label={`Move section ${index + 1} up`} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => moveSection(index, 1)} disabled={index === form.sections.length - 1} aria-label={`Move section ${index + 1} down`} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" onClick={() => removeSection(index)} disabled={form.sections.length === 1} aria-label={`Remove section ${index + 1}`} className="rounded-md p-1 text-red-500 hover:bg-red-50 disabled:opacity-30"><X className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
                <Field label="Heading" max={TITLE_MAX} count={section.title.length} error={errors[`sections.${index}.title`]} className="mt-2">
                  <input value={section.title} onChange={(e) => setSection(index, { title: e.target.value.slice(0, TITLE_MAX) })} disabled={!canEdit} aria-label={`Section ${index + 1} heading`} className={inputClass} />
                </Field>
                <Field label="Text" max={BODY_MAX} count={section.body.length} error={errors[`sections.${index}.body`]} className="mt-3">
                  <textarea value={section.body} onChange={(e) => setSection(index, { body: e.target.value.slice(0, BODY_MAX) })} disabled={!canEdit} rows={Math.min(14, Math.max(4, section.body.split('\n').length + 1))} aria-label={`Section ${index + 1} text`} className={`${inputClass} font-mono text-[13px] leading-6`} />
                </Field>
              </li>
            ))}
          </ol>
          {canEdit && <Button variant="outline" size="sm" icon={Plus} onClick={addSection} disabled={form.sections.length >= 30}>Add a section</Button>}

          <Field label="What changed?" error={errors.change_note} hint="Required to publish. Shown to readers in the list of versions, e.g. “Named a Data Protection Officer.”" max={200} count={form.change_note.length}>
            <input value={form.change_note} onChange={(e) => { setForm((c) => ({ ...c, change_note: e.target.value.slice(0, 200) })); setErrors((c) => ({ ...c, change_note: undefined })) }} disabled={!canEdit} aria-label="What changed" className={inputClass} />
          </Field>
          {errors.sections && <p className="text-sm font-semibold text-red-600">{errors.sections}</p>}
        </div>
      )}

      {canEdit && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Button variant="ghost" size="sm" icon={Trash2} className="text-red-600 hover:bg-red-50" onClick={() => setDiscardOpen(true)}>Discard draft</Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon={Save} loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>Save draft</Button>
            <Button variant="navy" icon={Send} onClick={submitPublish}>Publish…</Button>
          </div>
        </div>
      )}

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Publish version {draft.version}?</DialogTitle>
            <DialogDescription>
              It replaces the {policy.title} shown to everyone from the effective date. Published versions can’t be edited — a later change is a new version.
            </DialogDescription>
          </DialogHeader>
          <Field label="Effective date" hint="Today, or a later date to give readers notice. Until then the page shows the current version with a notice.">
            <input type="date" value={effectiveAt} min={todayInput()} onChange={(e) => setEffectiveAt(e.target.value)} aria-label="Effective date" className={inputClass} />
          </Field>
          {errors.effective_at && <p className="text-xs font-semibold text-red-600">{errors.effective_at}</p>}
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><strong>What changed:</strong> {form.change_note}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)} disabled={publish.isPending}>Cancel</Button>
            <Button variant="navy" icon={Send} loading={publish.isPending} disabled={!effectiveAt} onClick={() => publish.mutate()}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard this draft?"
        description="Your unpublished changes to this policy are deleted. The published versions are not affected."
        confirmLabel="Discard draft"
        busy={discard.isPending}
        onConfirm={() => discard.mutate()}
      />
    </Card>
  )
}

/** The policy text as readers will see it. */
function PolicyPreview({ version, office, className = '' }) {
  return (
    <div className={`rounded-2xl border border-[#0A192F]/10 bg-[#F8F7F2] p-5 sm:p-8 ${className}`}>
      {version.summary?.body && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <p className="font-bold">{version.summary.title || 'Summary'}</p>
          <RichText text={version.summary.body} office={office} className="mt-1 space-y-2" />
        </div>
      )}
      {version.sections.map((section, index) => (
        <section key={`${index}-${section.id}`} className="border-b border-[#0A192F]/10 py-6 first:pt-0 last:border-0">
          <h3 className="text-lg font-extrabold tracking-tight text-[#0A192F]"><span className="mr-2 text-[#B45309]">{index + 1}.</span>{section.title || 'Untitled section'}</h3>
          <RichText text={section.body} office={office} className="mt-3 space-y-3 text-sm leading-7 text-slate-700" />
        </section>
      ))}
    </div>
  )
}
