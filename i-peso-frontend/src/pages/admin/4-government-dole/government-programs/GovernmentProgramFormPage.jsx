import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { LoadingSkeleton } from '@/components/ui'
import { PROGRAM_CATEGORIES, PROGRAM_STATUSES } from '@/components/government-programs/programConstants'
import EligibilityRulesBuilder from '@/components/government-programs/EligibilityRulesBuilder'
import governmentProgramService from '@/services/governmentProgramService'

const BLANK = {
  program_name: '', category: 'other', short_description: '', description: '', target_beneficiaries: '',
  start_date: '', end_date: '', application_deadline: '', total_slots: 0,
  program_status: 'open', visibility: 'public',
  venue: '', location_address: '', contact_person: '', contact_email: '', contact_phone: '',
  eligibility_requirements: [], required_documents: [], eligibility_rules: [],
}

const toStringList = (items = []) => items.map((item) => (typeof item === 'string' ? item : item?.label ?? '')).filter(Boolean)

export default function GovernmentProgramFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(BLANK)
  const [attachment, setAttachment] = useState(null)
  const [loading, setLoading] = useState(!!id)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    governmentProgramService.adminProgram(id)
      .then((program) => {
        setForm({
          ...BLANK,
          ...program,
          program_name: program.program_name ?? program.title ?? '',
          program_status: program.status ?? 'open',
          total_slots: program.total_slots ?? 0,
          eligibility_requirements: toStringList(program.eligibility_requirements),
          required_documents: toStringList(program.required_documents),
          eligibility_rules: Array.isArray(program.eligibility_rules) ? program.eligibility_rules : [],
        })
      })
      .catch(() => toast.error('Unable to load the program.'))
      .finally(() => setLoading(false))
  }, [id])

  const set = useCallback((name, value) => setForm((f) => ({ ...f, [name]: value })), [])
  const handleChange = useCallback((e) => set(e.target.name, e.target.value), [set])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const rules = (form.eligibility_rules ?? [])
        .filter((rule) => rule.field)
        .map((rule) => ({ ...rule, weight: rule.weight === '' || rule.weight == null ? 1 : Number(rule.weight) }))

      const payload = {
        ...form,
        total_slots: Number(form.total_slots) || 0,
        eligibility_requirements: toStringList(form.eligibility_requirements),
        required_documents: toStringList(form.required_documents),
        eligibility_rules: rules,
        ...(attachment ? { attachment } : {}),
      }

      if (id) await governmentProgramService.updateProgram(id, payload)
      else await governmentProgramService.createProgram(payload)

      toast.success(id ? 'Program updated.' : 'Program created.')
      navigate('/admin/government-programs')
    } catch (err) {
      const message = err.response?.data?.message
        ?? Object.values(err.response?.data?.errors ?? {})[0]?.[0]
        ?? 'Failed to save the program.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }, [id, form, attachment, navigate])

  if (loading) return <div className="space-y-6"><LoadingSkeleton variant="text" rows={1} className="max-w-xs" /><LoadingSkeleton variant="card" rows={4} /></div>

  return (
    <div className="space-y-6">
      <PageHeader title={id ? 'Edit Government Program' : 'Create Government Program'} subtitle="Publish a program announcement and define who is eligible." />
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Program details">
          <Field label="Program name" required>
            <input name="program_name" value={form.program_name} onChange={handleChange} required className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" required>
              <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
                {PROGRAM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Target beneficiaries">
              <input name="target_beneficiaries" value={form.target_beneficiaries} onChange={handleChange} className={inputCls} />
            </Field>
          </div>
          <Field label="Short description">
            <input name="short_description" value={form.short_description} onChange={handleChange} maxLength={500} className={inputCls} />
          </Field>
          <Field label="Full description" required>
            <textarea name="description" value={form.description} onChange={handleChange} required rows={5} className={inputCls} />
          </Field>
        </Card>

        <Card title="Schedule & capacity">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Start date"><input type="date" name="start_date" value={form.start_date ?? ''} onChange={handleChange} className={inputCls} /></Field>
            <Field label="End date"><input type="date" name="end_date" value={form.end_date ?? ''} onChange={handleChange} className={inputCls} /></Field>
            <Field label="Application deadline"><input type="date" name="application_deadline" value={form.application_deadline ?? ''} onChange={handleChange} className={inputCls} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Total slots (0 = open capacity)" required>
              <input type="number" name="total_slots" min="0" value={form.total_slots} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Status" required>
              <select name="program_status" value={form.program_status} onChange={handleChange} className={inputCls}>
                {PROGRAM_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Visibility" required>
              <select name="visibility" value={form.visibility} onChange={handleChange} className={inputCls}>
                <option value="public">Public (visible to seekers)</option>
                <option value="internal">Internal (admin only)</option>
              </select>
            </Field>
          </div>
        </Card>

        <Card title="Location & contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Venue"><input name="venue" value={form.venue ?? ''} onChange={handleChange} className={inputCls} /></Field>
            <Field label="Location address"><input name="location_address" value={form.location_address ?? ''} onChange={handleChange} className={inputCls} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Contact person"><input name="contact_person" value={form.contact_person ?? ''} onChange={handleChange} className={inputCls} /></Field>
            <Field label="Contact email"><input type="email" name="contact_email" value={form.contact_email ?? ''} onChange={handleChange} className={inputCls} /></Field>
            <Field label="Contact phone"><input name="contact_phone" value={form.contact_phone ?? ''} onChange={handleChange} className={inputCls} /></Field>
          </div>
          <Field label="Attachment (PDF/DOC/image, optional)">
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} className="text-sm" />
          </Field>
        </Card>

        <Card title="Requirements (shown to applicants)" subtitle="Free-text checklist displayed on the program page.">
          <StringList items={form.eligibility_requirements} onChange={(v) => set('eligibility_requirements', v)} placeholder="e.g. Resident of Urdaneta City" addLabel="Add requirement" />
        </Card>

        <Card title="Required documents">
          <StringList items={form.required_documents} onChange={(v) => set('required_documents', v)} placeholder="e.g. Barangay certificate" addLabel="Add document" />
        </Card>

        <Card title="Eligibility rules (scoring)" subtitle="These power the automatic eligibility badge and score seekers see. Required rules gate eligibility.">
          <EligibilityRulesBuilder rules={form.eligibility_rules} onChange={(v) => set('eligibility_rules', v)} />
        </Card>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/admin/government-programs')} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700">Cancel</button>
          <button type="submit" disabled={submitting} className="rounded-lg bg-blue-900 px-6 py-2.5 text-sm font-black text-white disabled:bg-slate-300">
            {submitting ? 'Saving…' : id ? 'Update program' : 'Create program'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500'

function Card({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-black text-slate-950">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-700">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
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
          <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} className="rounded-lg border border-red-200 bg-red-50 px-3 text-red-600 hover:bg-red-100">
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
