import { createElement, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, Eye, History, Languages, PenLine, Save, Sparkles, WandSparkles, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { adminContentInsightService, adminFaqService } from '@/services/siteContentService'
import { similarQuestions } from '@/components/site-content/textSimilarity'
import RichText from '@/components/site-content/RichText'
import { FaqLink } from '@/components/site-content/HelpCenter'
import { FAQ_AUDIENCES, FAQ_TOPICS } from '@/components/site-content/siteContentDefaults'
import { Field } from './SiteContentBits'
import { apiMessage, fieldErrorsOf, formatWhen, inputClass, labelClass } from './formStyles'

const EMPTY = { question: '', answer: '', audience: 'everyone', topic: 'account', link_label: '', link_url: '' }
const QUESTION_MAX = 200
const ANSWER_MAX = 2000

/** Create or edit one FAQ. `faq` null = new. */
export default function FaqEditorSheet({ open, onOpenChange, faq, canEdit, office, initialQuestion = '', allFaqs = [] }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-2xl">
        {open && <FaqEditorBody key={faq?.id ?? `new-${initialQuestion}`} faq={faq} initialQuestion={initialQuestion} allFaqs={allFaqs} canEdit={canEdit} office={office} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}

const AI_TASKS = {
  draft_answer: { label: 'Draft answer', icon: Sparkles },
  simplify: { label: 'Simplify', icon: WandSparkles },
  translate_filipino: { label: 'Filipino version', icon: Languages },
}

function FaqEditorBody({ faq, initialQuestion, allFaqs, canEdit, office, onDone }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() => (faq ? { ...EMPTY, ...faq, link_label: faq.link_label ?? '', link_url: faq.link_url ?? '' } : { ...EMPTY, question: initialQuestion ?? '' }))
  const [suggestion, setSuggestion] = useState(null) // { task, text, note }
  const duplicates = similarQuestions(form.question, allFaqs, { excludeId: faq?.id ?? null })

  const ai = useMutation({
    mutationFn: (task) => adminContentInsightService.assist(
      task === 'draft_answer'
        ? { task, question: form.question, audience: form.audience }
        : { task, text: form.answer },
    ),
    onSuccess: (data, task) => setSuggestion({ task, text: data.suggestion, note: data.note }),
    onError: (error) => toast.error(error?.response?.data?.errors?.ai?.[0] ?? apiMessage(error, 'The AI writing helper is not available right now.')),
  })

  const applySuggestion = (mode) => {
    if (!suggestion) return
    const text = mode === 'append' ? `${form.answer.trim()}\n\n${suggestion.text}` : suggestion.text
    setForm((current) => ({ ...current, answer: text.slice(0, ANSWER_MAX) }))
    setSuggestion(null)
  }
  const [errors, setErrors] = useState({})
  const [mode, setMode] = useState('edit')
  const [showHistory, setShowHistory] = useState(false)

  const history = useQuery({
    queryKey: ['admin-faq-revisions', faq?.id],
    queryFn: () => adminFaqService.revisions(faq.id),
    enabled: Boolean(faq?.id) && showHistory,
  })

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        question: form.question,
        answer: form.answer,
        audience: form.audience,
        topic: form.topic,
        link_label: form.link_label || null,
        link_url: form.link_url || null,
      }
      return faq ? adminFaqService.update(faq.id, payload) : adminFaqService.create(payload)
    },
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] })
      queryClient.invalidateQueries({ queryKey: ['site-content'] })
      onDone()
    },
    onError: (error) => {
      const fieldErrors = fieldErrorsOf(error)
      if (fieldErrors) setErrors(fieldErrors)
      toast.error(apiMessage(error, 'Could not save the FAQ.'))
    },
  })

  const submit = () => {
    const next = {}
    if (!form.question.trim()) next.question = 'Write the question.'
    if (!form.answer.trim()) next.answer = 'Write the answer.'
    if (form.link_url && !form.link_label) next.link_label = 'Add a label for the link button.'
    if (form.link_label && !form.link_url) next.link_url = 'Add the link, or clear the label.'
    setErrors(next)
    if (Object.keys(next).length) {
      setMode('edit')
      return
    }
    save.mutate()
  }

  const audienceHelp = FAQ_AUDIENCES.find((a) => a.value === form.audience)?.help

  return (
    <>
      <SheetHeader>
        <SheetTitle>{faq ? 'Edit FAQ' : 'New FAQ'}</SheetTitle>
        <SheetDescription>
          {faq
            ? faq.is_published ? 'This FAQ is published — saving updates it on the Help pages right away.' : 'Unpublished — readers can’t see it until you publish it.'
            : 'New FAQs are saved unpublished, so you can check them before readers see them.'}
        </SheetDescription>
        <div className="mt-3 flex gap-1" role="tablist" aria-label="Editor mode">
          {[['edit', PenLine, 'Write'], ['preview', Eye, 'Preview']].map(([value, icon, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${mode === value ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {createElement(icon, { className: 'h-3.5 w-3.5', 'aria-hidden': true })} {label}
            </button>
          ))}
        </div>
      </SheetHeader>

      <SheetBody>
        {mode === 'preview' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-[15px] font-bold text-slate-900">{form.question || 'Your question'}</p>
            <RichText text={form.answer || 'Your answer'} office={office} className="mt-3 space-y-3 text-sm leading-6 text-slate-700" />
            {form.link_url && <FaqLink faq={form} className="mt-4" />}
          </div>
        ) : (
          <div className="space-y-5">
            <Field label="Question" max={QUESTION_MAX} count={form.question.length} error={errors.question}>
              <input value={form.question} onChange={(e) => set('question', e.target.value.slice(0, QUESTION_MAX))} disabled={!canEdit} className={inputClass} placeholder="e.g. Do I pay anything to register?" aria-label="Question" />
              {duplicates.length > 0 && (
                <div role="status" className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <p className="flex items-center gap-1.5 font-bold"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Looks like an FAQ you already have</p>
                  <ul className="mt-1 space-y-0.5">
                    {duplicates.map(({ faq: other }) => (
                      <li key={other.id}>“{other.question}” <span className="text-amber-700">({other.is_published ? 'published' : 'unpublished'} · {other.audience_label ?? other.audience})</span></li>
                    ))}
                  </ul>
                  <p className="mt-1">Edit that one instead, so readers get one clear answer.</p>
                </div>
              )}
            </Field>

            <Field
              label="Answer"
              max={ANSWER_MAX}
              count={form.answer.length}
              error={errors.answer}
              hint="Blank line = new paragraph · start a line with “- ” for a bullet · **bold** · links and emails become clickable."
            >
              <textarea value={form.answer} onChange={(e) => set('answer', e.target.value.slice(0, ANSWER_MAX))} disabled={!canEdit} rows={8} className={inputClass} placeholder="Write a short, direct answer." aria-label="Answer" />
            </Field>

            {canEdit && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                <p className="text-xs font-extrabold uppercase tracking-wide text-blue-900">AI writing helper</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(AI_TASKS).map(([task, meta]) => (
                    <Button
                      key={task}
                      size="sm"
                      variant="outline"
                      icon={meta.icon}
                      loading={ai.isPending && ai.variables === task}
                      disabled={ai.isPending || (task === 'draft_answer' ? form.question.trim().length < 8 : !form.answer.trim())}
                      onClick={() => ai.mutate(task)}
                    >
                      {meta.label}
                    </Button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-blue-900/70">Drafts use only what i-PESO knows — it won’t guess fees, dates or requirements. You review before saving.</p>
                {suggestion && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3" aria-label="AI suggestion">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-slate-700">{AI_TASKS[suggestion.task].label} — suggestion</p>
                      <button type="button" onClick={() => setSuggestion(null)} aria-label="Discard suggestion" className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
                    </div>
                    <RichText text={suggestion.text} office={office} className="mt-2 space-y-2 text-sm leading-6 text-slate-800" />
                    <p className="mt-2 text-[11px] text-slate-500">{suggestion.note}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button size="sm" variant="navy" onClick={() => applySuggestion('replace')}>Use this</Button>
                      {suggestion.task === 'translate_filipino' && form.answer.trim() && <Button size="sm" variant="outline" onClick={() => applySuggestion('append')}>Add below the English</Button>}
                      <Button size="sm" variant="ghost" onClick={() => setSuggestion(null)}>Discard</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <span className={labelClass}>Who it’s for</span>
              <div role="radiogroup" aria-label="Who it’s for" className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                {FAQ_AUDIENCES.map((audience) => (
                  <button
                    key={audience.value}
                    type="button"
                    role="radio"
                    aria-checked={form.audience === audience.value}
                    disabled={!canEdit}
                    onClick={() => set('audience', audience.value)}
                    className={`rounded-lg px-2 py-2 text-xs font-bold transition ${form.audience === audience.value ? 'bg-white text-brand-navy shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {audience.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">{audienceHelp}</p>
            </div>

            <Field label="Topic" error={errors.topic}>
              <select value={form.topic} onChange={(e) => set('topic', e.target.value)} disabled={!canEdit} className={inputClass} aria-label="Topic">
                {FAQ_TOPICS.map((topic) => <option key={topic.value} value={topic.value}>{topic.label}</option>)}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Field label="Link button (optional)" error={errors.link_label}>
                <input value={form.link_label} onChange={(e) => set('link_label', e.target.value.slice(0, 60))} disabled={!canEdit} className={inputClass} placeholder="See job fairs" aria-label="Link button label" />
              </Field>
              <Field label="Link" error={errors.link_url}>
                <input value={form.link_url} onChange={(e) => set('link_url', e.target.value)} disabled={!canEdit} className={inputClass} placeholder="/seeker/job-fairs or https://…" aria-label="Link" />
              </Field>
            </div>

            {faq && (
              <div className="border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowHistory((v) => !v)} className="flex items-center gap-1.5 text-xs font-bold text-brand-navy hover:underline">
                  <History className="h-3.5 w-3.5" aria-hidden="true" /> {showHistory ? 'Hide earlier versions' : 'Earlier versions'}
                </button>
                {showHistory && (
                  <ol className="mt-3 space-y-2">
                    {history.isLoading && <li className="text-xs text-slate-500">Loading…</li>}
                    {(history.data ?? []).map((revision, index) => (
                      <li key={revision.id} className="rounded-xl border border-slate-200 p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-800">{formatWhen(revision.created_at)} · {revision.author ?? 'former staff'}{index === 0 ? ' · current' : ''}</span>
                          {canEdit && index > 0 && (
                            <button
                              type="button"
                              onClick={() => { setForm((current) => ({ ...current, ...revision.value, link_label: revision.value.link_label ?? '', link_url: revision.value.link_url ?? '' })); toast('Earlier version loaded — save to keep it.') }}
                              className="font-bold text-brand-navy hover:underline"
                            >
                              Use this version
                            </button>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-slate-600">{revision.value.question}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        )}
      </SheetBody>

      <SheetFooter>
        <Button variant="outline" onClick={onDone} disabled={save.isPending}>{canEdit ? 'Cancel' : 'Close'}</Button>
        {canEdit && <Button variant="navy" icon={Save} loading={save.isPending} onClick={submit}>{faq ? 'Save FAQ' : 'Save as unpublished'}</Button>}
      </SheetFooter>
    </>
  )
}
