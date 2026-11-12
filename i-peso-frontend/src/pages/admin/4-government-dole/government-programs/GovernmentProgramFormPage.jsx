import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  Info,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { LoadingSkeleton } from '@/components/ui'
import { PROGRAM_CATEGORIES, categoryLabel } from '@/components/government-programs/programConstants'
import governmentProgramService from '@/services/governmentProgramService'

const steps = [
  { number: 1, title: 'Program', shortTitle: 'Program', icon: ClipboardList },
  { number: 2, title: 'Schedule & Capacity', shortTitle: 'Schedule', icon: CalendarDays },
  { number: 3, title: 'Eligibility & Location', shortTitle: 'Details', icon: Sparkles },
]

const BLANK = {
  program_name: '', category: 'other', description: '',
  application_deadline: '', total_slots: 0, location_address: '',
  visibility: 'public',
  eligibility_requirements: [],
  age_restriction_enabled: false, age_min: '', age_max: '',
}

const toStringList = (items = []) => (Array.isArray(items) ? items : [])
  .filter((item) => !(item && typeof item === 'object' && item.type === 'age_range'))
  .map((item) => (typeof item === 'string' ? item : item?.label ?? ''))
  .filter(Boolean)

const ageRuleFor = (rules = []) => (Array.isArray(rules) ? rules : []).find((rule) => rule?.field === 'age')

const ageRecommendation = (min, max) => {
  if (min === '' || max === '') return ''
  if (Number(max) >= 200) return `At least ${min} years old`
  return Number(min) === Number(max)
    ? `Age ${min} years old`
    : `${min} to ${max} years old`
}

export default function GovernmentProgramFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(BLANK)
  const [attachment, setAttachment] = useState(null)
  const [presets, setPresets] = useState({})
  const [loading, setLoading] = useState(!!id)
  const [submitting, setSubmitting] = useState(false)

  const currentStep = steps[step - 1]
  const progressPercent = ((step - 1) / (steps.length - 1)) * 100

  useEffect(() => {
    governmentProgramService.adminProgramPresets()
      .then(setPresets)
      .catch(() => {
        setPresets({})
        toast.error('Unable to load program recommendations. You can still add requirements manually.')
      })
  }, [])

  useEffect(() => {
    if (!id) return
    governmentProgramService.adminProgram(id)
      .then((program) => {
        setForm({
          ...BLANK,
          ...program,
          program_name: program.program_name ?? program.title ?? '',
          total_slots: program.total_slots ?? 0,
          visibility: 'public',
          eligibility_rules: undefined,
          eligibility_requirements: toStringList(program.eligibility_requirements),
          age_restriction_enabled: !!ageRuleFor(program.eligibility_rules),
          age_min: ageRuleFor(program.eligibility_rules)?.min ?? '',
          age_max: ageRuleFor(program.eligibility_rules)?.max ?? '',
        })
      })
      .catch(() => toast.error('Unable to load the program.'))
      .finally(() => setLoading(false))
  }, [id])

  const set = useCallback((name, value) => setForm((f) => ({ ...f, [name]: value })), [])
  const handleChange = useCallback((e) => set(e.target.name, e.target.value), [set])

  // Category changes update the automatic age defaults without clearing
  // batch-specific requirements, schedule, slots, attachment or location.
  const applyPreset = useCallback((category) => {
    const preset = presets[category]
    const ageRule = ageRuleFor(preset?.eligibility_rules)
    setForm((current) => ({
      ...current,
      category,
      ...(!id && preset?.description !== undefined ? { description: preset.description } : {}),
      age_restriction_enabled: preset ? !!ageRule : null,
      age_min: ageRule?.min ?? '',
      age_max: ageRule?.max ?? '',
    }))
  }, [presets, id])

  const validate = useCallback((target) => {
    if (target >= 1 && !form.program_name.trim()) {
      toast.error('Program name is required.')
      setStep(1)
      return false
    }
    if (target >= 2 && !form.description.trim()) {
      toast.error('A full description is required.')
      setStep(1)
      return false
    }
    if (target >= 2 && form.application_deadline && form.application_deadline < localDateString()) {
      toast.error('Application deadline cannot be in the past.')
      setStep(2)
      return false
    }
    if (target >= 3) {
      if (form.age_restriction_enabled && (
        form.age_min === '' || form.age_max === '' ||
        !Number.isInteger(Number(form.age_min)) || !Number.isInteger(Number(form.age_max)) ||
        Number(form.age_min) < 0 || Number(form.age_max) > 200 ||
        Number(form.age_min) > Number(form.age_max)
      )) {
        toast.error('Enter a valid age range where the maximum is not less than the minimum.')
        setStep(3)
        return false
      }
    }
    return true
  }, [form.program_name, form.description, form.application_deadline, form.age_restriction_enabled, form.age_min, form.age_max])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!validate(3)) return

    setSubmitting(true)
    try {
      const payload = {
        ...form,
        total_slots: Number(form.total_slots) || 0,
        eligibility_requirements: toStringList(form.eligibility_requirements),
        age_min: form.age_restriction_enabled ? Number(form.age_min) : '',
        age_max: form.age_restriction_enabled ? Number(form.age_max) : '',
        ...(form.age_restriction_enabled == null ? {} : { age_restriction_enabled: form.age_restriction_enabled }),
        ...(attachment ? { attachment } : {}),
      }

      if (id) await governmentProgramService.updateProgram(id, payload)
      else await governmentProgramService.createProgram(payload)

      toast.success(id ? 'Program updated.' : 'Program published.')
      navigate('/admin/government-programs')
    } catch (err) {
      const message = err.response?.data?.message
        ?? Object.values(err.response?.data?.errors ?? {})[0]?.[0]
        ?? 'Failed to save the program.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }, [id, form, attachment, navigate, validate])

  const next = () => { if (validate(step + 1)) setStep((s) => Math.min(s + 1, steps.length)) }
  const back = () => setStep((s) => Math.max(s - 1, 1))

  if (loading) return <div className="space-y-6"><LoadingSkeleton variant="text" rows={1} className="max-w-xs" /><LoadingSkeleton variant="card" rows={4} /></div>

  return (
    <div className="space-y-6">
      <PageHeader
        title={id ? 'Edit Government Program' : 'Post a Government Program'}
        subtitle="Choose a program category, review its smart recommendations, and confirm the requirements for this batch."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-blue-900">Step {step} of {steps.length}: {currentStep.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">All posted programs are public announcements. Job seekers review eligibility and apply in person at PESO.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {steps.map((s) => (
                  <button
                    key={s.number}
                    type="button"
                    onClick={() => (s.number < step || validate(s.number)) && setStep(s.number)}
                    className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold transition ${
                      s.number === step ? 'bg-blue-50 text-blue-900' : s.number < step ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {s.number < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                    {s.shortTitle}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-900 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="px-5 py-6 sm:px-7">
            {step === 1 && (
              <div className="space-y-4">
                <Field label="Program type" required>
                  <select
                    name="category"
                    value={form.category}
                    onChange={(e) => applyPreset(e.target.value)}
                    className={inputCls}
                  >
                    {PROGRAM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>

                {id && (
                  <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>Changing the type updates category recommendations and automatic eligibility criteria. Review all batch-specific details before saving.</p>
                  </div>
                )}

                <Field label="Program name" required>
                  <input name="program_name" value={form.program_name} onChange={handleChange} required placeholder="e.g. SPES Summer Batch 2026" className={inputCls} />
                </Field>
                <Field label="Full description" required>
                  <textarea name="description" value={form.description ?? ''} onChange={handleChange} required rows={6} className={inputCls} />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Application deadline" hint="Optional. If set, it must be today or a future date.">
                    <input type="date" name="application_deadline" min={localDateString()} value={form.application_deadline ?? ''} onChange={handleChange} className={inputCls} />
                  </Field>
                  <Field label="Total slots" hint="0 means open capacity." required>
                    <input type="number" name="total_slots" min="0" value={form.total_slots} onChange={handleChange} className={inputCls} />
                  </Field>
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Programs are always public to job seekers. A past deadline is not allowed; programs with no deadline remain open until their status is changed.</p>
                </div>
                <div>
                  <Field label="Attachment (optional)" hint="PDF, DOC, XLS, or image; maximum 10 MB. Uploading a new file replaces the current attachment.">
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} className="text-sm" />
                  </Field>
                  {attachment && <p className="mt-2 text-xs font-medium text-emerald-700">Selected: {attachment.name} ({formatFileSize(attachment.size)})</p>}
                  {!attachment && id && form.has_attachment && <p className="mt-2 text-xs text-slate-500">An attachment is already saved. Leave this empty to keep it.</p>}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Recommendations are a starting point, not an official eligibility decision. Check this batch against current DOLE guidance and the Urdaneta City PESO Citizen&apos;s Charter. PESO verifies eligibility in person.</p>
                </div>

                <Group title="Age eligibility" subtitle="The displayed age requirement and seeker estimate update automatically when you change this range.">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!form.age_restriction_enabled}
                      onChange={(e) => set('age_restriction_enabled', e.target.checked)}
                    />
                    This batch has an age restriction
                  </label>
                  {form.age_restriction_enabled && (
                    <>
                      <div className="mt-3 grid max-w-sm gap-3 sm:grid-cols-2">
                        <Field label="Minimum age" required>
                          <input type="number" min="0" max="200" value={form.age_min} onChange={(e) => set('age_min', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Maximum age" required>
                          <input type="number" min="0" max="200" value={form.age_max} onChange={(e) => set('age_max', e.target.value)} className={inputCls} />
                        </Field>
                      </div>
                      <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900">
                        Job seeker requirement: {ageRecommendation(form.age_min, form.age_max) || 'Enter both ages'}
                      </p>
                    </>
                  )}
                </Group>

                <Group title="Smart recommendations" subtitle={`Suggested checks for ${categoryLabel(form.category)}. Review each one against the current program rules, then add only those that apply.`}>
                  {(presets[form.category]?.eligibility_requirements ?? []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(presets[form.category]?.eligibility_requirements ?? []).map((suggestion) => {
                        const alreadyAdded = form.eligibility_requirements.includes(suggestion)
                        return (
                          <button
                            key={suggestion}
                            type="button"
                            disabled={alreadyAdded}
                            onClick={() => set('eligibility_requirements', [...form.eligibility_requirements, suggestion])}
                            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 disabled:cursor-default disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-800"
                          >
                            {alreadyAdded ? 'Added: ' : '+ '}{suggestion}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No category-specific suggestions are available. Add only requirements confirmed for this batch.</p>
                  )}
                  <div className="mt-4">
                    <Field label="Requirements for this batch" hint="Only the items listed here will be shown to job seekers.">
                      <StringList items={form.eligibility_requirements} onChange={(v) => set('eligibility_requirements', v)} placeholder="e.g. Resident of Urdaneta City" addLabel="Add requirement" />
                    </Field>
                  </div>
                </Group>

                <p className="text-xs leading-5 text-slate-500">Eligibility estimates compare the seeker&apos;s known profile data with the selected program category criteria. Criteria are scored equally; missing profile data is shown as unknown. The estimate is advisory, and PESO makes the final decision.</p>

                <Group title="Program location" subtitle="Where job seekers should go for the in-person orientation, assessment, or application. Leave blank to use the PESO Office, Urdaneta City Hall.">
                  <Field label="Location or service point">
                    <input name="location_address" value={form.location_address ?? ''} onChange={handleChange} maxLength={1000} placeholder="e.g. PESO Office, Urdaneta City Hall" className={inputCls} />
                  </Field>
                </Group>
              </div>
            )}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:px-7">
            <button
              type="button"
              onClick={step === 1 ? () => navigate('/admin/government-programs') : back}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-blue-900 hover:text-blue-900"
            >
              <ArrowLeft className="h-4 w-4" /> {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {step < steps.length ? (
              <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-6 py-2.5 text-sm font-black text-white hover:bg-blue-800">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-6 py-2.5 text-sm font-black text-white disabled:bg-slate-300">
                {submitting ? 'Saving…' : id ? 'Update program' : 'Publish program'}
              </button>
            )}
          </footer>
        </section>
      </form>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500'

function localDateString() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function formatFileSize(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function Group({ title, subtitle, children }) {
  return (
    <section>
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-700">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

function StringList({ items = [], onChange, placeholder, addLabel }) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={item}
            onChange={(e) => onChange(items.map((v, i) => (i === index ? e.target.value : v)))}
            placeholder={placeholder}
            className={inputCls}
          />
          <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} className="rounded-lg border border-red-200 bg-red-50 px-3 text-red-600 hover:bg-red-100" aria-label="Remove">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ''])} className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700">
        <Plus className="h-4 w-4" /> {addLabel}
      </button>
    </div>
  )
}
