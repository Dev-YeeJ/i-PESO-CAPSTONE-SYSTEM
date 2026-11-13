import { createElement, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ExternalLink, History, Monitor, RotateCcw, Save, Smartphone, Undo2 } from 'lucide-react'
import { Button, Card, ConfirmDialog } from '@/components/ui'
import { adminSiteContentService } from '@/services/siteContentService'
import { FEATURE_ICONS, LANDING_LIMITS, LANDING_SECTIONS } from '@/components/site-content/siteContentDefaults'
import { FeatureCardContent, HeroBadgeIcon, HeroHeadlineContent, HeroHighlights, HeroSubheadlineContent } from '@/components/site-content/LandingBlocks'
import { Field, MoreSection, ReadOnlyNote, SectionHistoryDialog } from './SiteContentBits'
import { apiMessage, changedKeys, fieldErrorsOf, formatWhen, inputClass, isConflict, sameValue } from './formStyles'

const KEYS = ['hero_badge', 'headline_lead', 'headline_highlight', 'headline_tail', 'subheadline', 'highlights', 'features_eyebrow', 'features_heading', 'features', 'footer_tagline', 'show_sections']

/** Fields under "More options" — used to open it when one of them has an error. */
const MORE_KEYS = ['hero_badge', 'highlights', 'features_eyebrow', 'features_heading', 'features', 'footer_tagline']

export default function LandingTab({ section, canEdit }) {
  return <LandingForm key={section.version} section={section} canEdit={canEdit} />
}

function LandingForm({ section, canEdit }) {
  const queryClient = useQueryClient()
  const saved = section.values
  const defaults = section.defaults
  const [form, setForm] = useState(saved)
  const [errors, setErrors] = useState({})
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
    queryClient.invalidateQueries({ queryKey: ['admin-site-content-revisions', 'landing'] })
  }
  const onError = (error) => {
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
    setResetOpen(false)
    setHistoryOpen(false)
    toast.success(data.message ?? 'Saved. Undo any time from History.')
    refresh()
  }

  const save = useMutation({ mutationFn: () => adminSiteContentService.save('landing', form, section.version), onSuccess: onSaved, onError })
  const resetAll = useMutation({ mutationFn: () => adminSiteContentService.reset('landing', null, section.version), onSuccess: onSaved, onError })
  const restore = useMutation({ mutationFn: (revision) => adminSiteContentService.restore('landing', revision.id, section.version), onSuccess: onSaved, onError })

  const text = (field, limit, { multiline = false, label } = {}) => (
    <Field label={label ?? section.labels[field]} max={limit} count={(form[field] ?? '').length} error={err(field)}>
      {createElement(multiline ? 'textarea' : 'input', {
        value: form[field] ?? '',
        onChange: (e) => set(field, e.target.value.slice(0, limit)),
        disabled: !canEdit,
        rows: multiline ? 2 : undefined,
        'aria-label': section.labels[field],
        className: inputClass,
      })}
    </Field>
  )

  const moreHasError = Object.keys(errors).some((key) => MORE_KEYS.some((k) => key.startsWith(`values.${k}`)))

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Landing page</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">The words on the home page and which sections show. The design stays as it is.</p>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" icon={ExternalLink} to="/" target="_blank">Open</Button>
            <Button size="sm" variant="ghost" icon={History} onClick={() => setHistoryOpen(true)}>History</Button>
          </div>
        </div>
        {!canEdit && <div className="mt-4"><ReadOnlyNote>You can view the landing page text but not change it.</ReadOnlyNote></div>}

        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {text('headline_lead', LANDING_LIMITS.headline_lead, { label: 'Headline' })}
            {text('headline_highlight', LANDING_LIMITS.headline_highlight, { label: 'Highlighted words' })}
            {text('headline_tail', LANDING_LIMITS.headline_tail, { label: 'Second line' })}
          </div>
          {text('subheadline', LANDING_LIMITS.subheadline, { multiline: true, label: 'Sub-headline' })}

          <fieldset>
            <legend className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Sections shown</legend>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {LANDING_SECTIONS.map((item) => (
                <label key={item.key} className="flex items-center gap-2 text-sm text-slate-800" title={item.help}>
                  <input
                    type="checkbox"
                    checked={form.show_sections?.[item.key] ?? true}
                    onChange={(e) => set('show_sections', { ...(form.show_sections ?? {}), [item.key]: e.target.checked })}
                    disabled={!canEdit}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <MoreSection summary="badge, highlights, feature cards, footer" forceOpen={moreHasError}>
          <div className="space-y-4">
            {text('hero_badge', LANDING_LIMITS.hero_badge)}
            <Field label={section.labels.highlights} error={err('highlights') ?? err('highlights.0') ?? err('highlights.1') ?? err('highlights.2')}>
              <div className="grid gap-2 sm:grid-cols-3">
                {form.highlights.map((value, index) => (
                  <input key={index} value={value ?? ''} onChange={(e) => setHighlight(index, e.target.value.slice(0, LANDING_LIMITS.highlight))} disabled={!canEdit} aria-label={`Highlight ${index + 1}`} className={inputClass} />
                ))}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              {text('features_eyebrow', LANDING_LIMITS.features_eyebrow)}
              {text('features_heading', LANDING_LIMITS.features_heading)}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {form.features.map((feature, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Card {index + 1}</span>
                    <select value={feature.icon} onChange={(e) => setFeature(index, { icon: e.target.value })} disabled={!canEdit} aria-label={`Card ${index + 1} icon`} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs">
                      {Object.entries(FEATURE_ICONS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                    </select>
                  </div>
                  <input value={feature.title ?? ''} onChange={(e) => setFeature(index, { title: e.target.value.slice(0, LANDING_LIMITS.feature_title) })} disabled={!canEdit} aria-label={`Card ${index + 1} title`} placeholder="Title" className={inputClass} />
                  <textarea value={feature.body ?? ''} onChange={(e) => setFeature(index, { body: e.target.value.slice(0, LANDING_LIMITS.feature_body) })} disabled={!canEdit} rows={2} aria-label={`Card ${index + 1} text`} placeholder="Text" className={inputClass} />
                  {(err(`features.${index}.title`) || err(`features.${index}.body`)) && <p className="mt-1 text-xs font-semibold text-red-600">{err(`features.${index}.title`) ?? err(`features.${index}.body`)}</p>}
                </div>
              ))}
            </div>
            {text('footer_tagline', LANDING_LIMITS.footer_tagline)}
          </div>
        </MoreSection>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            {section.updated_at ? `Last saved ${formatWhen(section.updated_at)}${section.updated_by ? ` by ${section.updated_by}` : ''}.` : 'Showing the original text.'}
          </p>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {!sameValue(form, defaults) && section.version > 0 && <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setResetOpen(true)}>Use the original text</Button>}
              {dirty.length > 0 && <Button variant="ghost" size="sm" icon={Undo2} onClick={() => { setForm(saved); setErrors({}) }}>Discard</Button>}
              <Button variant="navy" icon={Save} loading={save.isPending} disabled={dirty.length === 0} onClick={() => save.mutate()}>Save</Button>
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-3 2xl:sticky 2xl:top-6 2xl:self-start">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Live preview</p>
          <div role="radiogroup" aria-label="Preview size" className="flex rounded-lg bg-slate-100 p-0.5">
            {[['desktop', Monitor, 'Desktop'], ['phone', Smartphone, 'Phone']].map(([value, icon, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={device === value}
                onClick={() => setDevice(value)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${device === value ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {createElement(icon, { className: 'h-3.5 w-3.5', 'aria-hidden': true })} {label}
              </button>
            ))}
          </div>
        </div>
        <LandingPreview landing={form} device={device} />
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Go back to the original landing page text?"
        description="Every slot returns to the wording i-PESO shipped with. You can undo this from History."
        confirmLabel="Use the original text"
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
