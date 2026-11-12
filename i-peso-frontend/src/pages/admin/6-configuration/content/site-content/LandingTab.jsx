import { createElement, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ExternalLink, History, Monitor, RotateCcw, Save, Smartphone, Undo2 } from 'lucide-react'
import { Button, Card, ConfirmDialog } from '@/components/ui'
import { adminSiteContentService } from '@/services/siteContentService'
import { FEATURE_ICONS, LANDING_LIMITS } from '@/components/site-content/siteContentDefaults'
import { FeatureCardContent, HeroBadgeIcon, HeroHeadlineContent, HeroHighlights, HeroSubheadlineContent } from '@/components/site-content/LandingBlocks'
import { ChangesDialog, Field, ReadOnlyNote, SectionHistoryDialog } from './SiteContentBits'
import { apiMessage, changedKeys, fieldErrorsOf, formatWhen, inputClass, isConflict, sameValue } from './formStyles'

const KEYS = ['hero_badge', 'headline_lead', 'headline_highlight', 'headline_tail', 'subheadline', 'highlights', 'features_eyebrow', 'features_heading', 'features', 'footer_tagline']

export default function LandingTab({ section, canEdit }) {
  return <LandingForm key={section.version} section={section} canEdit={canEdit} />
}

function LandingForm({ section, canEdit }) {
  const queryClient = useQueryClient()
  const saved = section.values
  const defaults = section.defaults
  const [form, setForm] = useState(saved)
  const [errors, setErrors] = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [device, setDevice] = useState('desktop')

  const dirty = changedKeys(saved, form, KEYS)
  const err = (key) => errors[`values.${key}`]

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const setHighlight = (index, value) => set('highlights', form.highlights.map((h, i) => (i === index ? value : h)))
  const setFeature = (index, patch) => set('features', form.features.map((f, i) => (i === index ? { ...f, ...patch } : f)))

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-site-content'] })
    queryClient.invalidateQueries({ queryKey: ['site-content'] })
  }
  const onError = (error) => {
    setConfirmOpen(false)
    setResetOpen(false)
    if (isConflict(error)) {
      toast.error(apiMessage(error, 'Someone else saved changes. Reloading.'))
      refresh()
      return
    }
    const fieldErrors = fieldErrorsOf(error)
    if (fieldErrors) setErrors(fieldErrors)
    toast.error(apiMessage(error, 'Could not save the landing page text.'))
  }
  const onSaved = (data) => {
    setConfirmOpen(false)
    setResetOpen(false)
    setHistoryOpen(false)
    toast.success(data.message)
    refresh()
    queryClient.invalidateQueries({ queryKey: ['admin-site-content-revisions', 'landing'] })
  }

  const save = useMutation({ mutationFn: () => adminSiteContentService.save('landing', form, section.version), onSuccess: onSaved, onError })
  const resetAll = useMutation({ mutationFn: () => adminSiteContentService.reset('landing', null, section.version), onSuccess: onSaved, onError })
  const restore = useMutation({ mutationFn: (revision) => adminSiteContentService.restore('landing', revision.id, section.version), onSuccess: onSaved, onError })

  const defaultButton = (field) =>
    canEdit && !sameValue(form[field], defaults[field]) ? (
      <button type="button" onClick={() => set(field, defaults[field])} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand-navy hover:underline">
        <RotateCcw className="h-3 w-3" aria-hidden="true" /> Use the original text
      </button>
    ) : null

  const text = (field, limit, props = {}) => (
    <Field label={section.labels[field]} max={limit} count={(form[field] ?? '').length} error={err(field)}>
      {createElement(props.multiline ? 'textarea' : 'input', {
        value: form[field] ?? '',
        onChange: (e) => set(field, e.target.value.slice(0, limit)),
        disabled: !canEdit,
        rows: props.multiline ? 3 : undefined,
        'aria-label': section.labels[field],
        className: inputClass,
      })}
      {defaultButton(field)}
    </Field>
  )

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Landing page text</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Change the words in fixed places. The layout, colours and buttons stay as designed; the limits keep the text fitting on phones.
            </p>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" icon={ExternalLink} to="/" target="_blank">Open</Button>
            <Button size="sm" variant="ghost" icon={History} onClick={() => setHistoryOpen(true)}>History</Button>
          </div>
        </div>
        {!canEdit && <div className="mt-4"><ReadOnlyNote>You can view the landing page text but not change it.</ReadOnlyNote></div>}

        <fieldset className="mt-5 space-y-4">
          <legend className="text-sm font-black text-slate-950">Hero</legend>
          {text('hero_badge', LANDING_LIMITS.hero_badge)}
          <div className="grid gap-4 sm:grid-cols-2">
            {text('headline_lead', LANDING_LIMITS.headline_lead)}
            {text('headline_highlight', LANDING_LIMITS.headline_highlight)}
          </div>
          {text('headline_tail', LANDING_LIMITS.headline_tail)}
          {text('subheadline', LANDING_LIMITS.subheadline, { multiline: true })}
          <Field label={section.labels.highlights} error={err('highlights') ?? err('highlights.0') ?? err('highlights.1') ?? err('highlights.2')} hint={`Three short phrases, up to ${LANDING_LIMITS.highlight} characters each.`}>
            <div className="grid gap-2 sm:grid-cols-3">
              {form.highlights.map((value, index) => (
                <input key={index} value={value ?? ''} onChange={(e) => setHighlight(index, e.target.value.slice(0, LANDING_LIMITS.highlight))} disabled={!canEdit} aria-label={`Highlight ${index + 1}`} className={inputClass} />
              ))}
            </div>
            {defaultButton('highlights')}
          </Field>
        </fieldset>

        <fieldset className="mt-6 space-y-4 border-t border-slate-100 pt-5">
          <legend className="sr-only">Features</legend>
          <p className="text-sm font-black text-slate-950">“What you get” section</p>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            {text('features_eyebrow', LANDING_LIMITS.features_eyebrow)}
            {text('features_heading', LANDING_LIMITS.features_heading)}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {form.features.map((feature, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Card {index + 1}</span>
                  <select
                    value={feature.icon}
                    onChange={(e) => setFeature(index, { icon: e.target.value })}
                    disabled={!canEdit}
                    aria-label={`Card ${index + 1} icon`}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    {Object.entries(FEATURE_ICONS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                  </select>
                </div>
                <Field label="Title" max={LANDING_LIMITS.feature_title} count={feature.title?.length ?? 0} error={err(`features.${index}.title`)} className="mt-2">
                  <input value={feature.title ?? ''} onChange={(e) => setFeature(index, { title: e.target.value.slice(0, LANDING_LIMITS.feature_title) })} disabled={!canEdit} aria-label={`Card ${index + 1} title`} className={inputClass} />
                </Field>
                <Field label="Text" max={LANDING_LIMITS.feature_body} count={feature.body?.length ?? 0} error={err(`features.${index}.body`)} className="mt-2">
                  <textarea value={feature.body ?? ''} onChange={(e) => setFeature(index, { body: e.target.value.slice(0, LANDING_LIMITS.feature_body) })} disabled={!canEdit} rows={3} aria-label={`Card ${index + 1} text`} className={inputClass} />
                </Field>
              </div>
            ))}
          </div>
          {defaultButton('features')}
        </fieldset>

        <fieldset className="mt-6 border-t border-slate-100 pt-5">
          <legend className="sr-only">Footer</legend>
          {text('footer_tagline', LANDING_LIMITS.footer_tagline)}
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            {section.updated_at ? `Last saved ${formatWhen(section.updated_at)}${section.updated_by ? ` by ${section.updated_by}` : ''}.` : 'Showing the original text — nothing changed yet.'}
          </p>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {section.version > 0 && <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setResetOpen(true)}>Reset all</Button>}
              {dirty.length > 0 && <Button variant="ghost" size="sm" icon={Undo2} onClick={() => { setForm(saved); setErrors({}) }}>Discard changes</Button>}
              <Button variant="navy" icon={Save} disabled={dirty.length === 0} onClick={() => setConfirmOpen(true)}>
                Save{dirty.length ? ` (${dirty.length})` : ''}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-3 2xl:sticky 2xl:top-6 2xl:self-start">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Live preview</p>
          <div role="radiogroup" aria-label="Preview size" className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {[['desktop', Monitor, 'Desktop'], ['phone', Smartphone, 'Phone']].map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={device === value}
                onClick={() => setDevice(value)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${device === value ? 'bg-brand-navy text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {createElement(Icon, { className: 'h-3.5 w-3.5', 'aria-hidden': true })} {label}
              </button>
            ))}
          </div>
        </div>
        <LandingPreview landing={form} device={device} />
      </div>

      <ChangesDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Update the landing page?"
        changes={dirty.map((key) => ({ key, label: section.labels[key], before: saved[key], after: form[key] }))}
        busy={save.isPending}
        onConfirm={() => save.mutate()}
      />
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset all landing page text?"
        description="Every slot goes back to the original wording. You can undo this from History."
        confirmLabel="Reset to original"
        variant="navy"
        busy={resetAll.isPending}
        onConfirm={() => resetAll.mutate()}
      />
      <SectionHistoryDialog sectionKey="landing" open={historyOpen} onOpenChange={setHistoryOpen} canEdit={canEdit} busy={restore.isPending} onRestore={(revision) => restore.mutate(revision)} />
    </div>
  )
}

/** The hero and feature cards as visitors see them, at desktop or phone width. */
function LandingPreview({ landing, device }) {
  const phone = device === 'phone'
  return (
    <div className={`mx-auto overflow-hidden rounded-2xl border border-slate-300 bg-[#0A192F] text-white shadow-lg ${phone ? 'max-w-[375px]' : 'w-full'}`} aria-label="Landing page preview">
      <div className={`flex flex-col items-center px-5 text-center ${phone ? 'py-10' : 'py-12'}`}>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/30 px-4 py-2 text-[11px] font-medium text-slate-300">
          <HeroBadgeIcon className="h-3.5 w-3.5 text-yellow-500" /> {landing.hero_badge}
        </span>
        <h3 className={`mt-6 font-extrabold leading-tight tracking-tight ${phone ? 'text-3xl' : 'text-4xl'}`}>
          <HeroHeadlineContent landing={landing} />
        </h3>
        <p className={`mt-4 max-w-xl leading-relaxed text-slate-400 ${phone ? 'text-sm' : 'text-base'}`}>
          <HeroSubheadlineContent landing={landing} />
        </p>
        <div className={`mt-6 flex gap-3 ${phone ? 'w-full flex-col' : ''}`} aria-hidden="true">
          <span className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900">Find Jobs</span>
          <span className="rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-slate-900">Post Jobs</span>
        </div>
        <HeroHighlights landing={landing} className={`mt-6 flex flex-wrap justify-center text-xs font-medium text-slate-400 ${phone ? 'gap-3' : 'gap-6'}`} />
      </div>
      <div className="border-t border-white/5 bg-[#0D1F38] px-5 py-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-yellow-400">{landing.features_eyebrow}</p>
        <p className="mt-2 text-xl font-extrabold tracking-tight">{landing.features_heading}</p>
        <div className={`mt-5 grid gap-3 ${phone ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {landing.features.map((feature, index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <FeatureCardContent feature={feature} />
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/5 bg-[#071122] px-5 py-4 text-[11px] text-slate-500">{landing.footer_tagline} · Pangasinan, Philippines</div>
    </div>
  )
}
