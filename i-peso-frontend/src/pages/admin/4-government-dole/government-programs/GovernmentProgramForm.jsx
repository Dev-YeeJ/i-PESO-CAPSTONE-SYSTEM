import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, FileUp, Loader2, Save } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import OccupationCombobox from '@/components/form/OccupationCombobox'
import SkillTaxonomyTags from '@/components/form/SkillTaxonomyTags'
import { PROGRAM_CATEGORIES, PROGRAM_STATUSES } from '@/components/government-programs/programConstants'
import PageHeader from '@/pages/admin/_components/PageHeader'
import governmentProgramService from '@/services/governmentProgramService'

const steps = ['Program Overview', 'Eligibility & Skills', 'Schedule & Publishing']
const emptyForm = {
  program_name: '', category: 'tech_voc_training', short_description: '', description: '', target_beneficiaries: '',
  eligibility_requirements: '', required_documents: '', skills: [], target_industry: '', target_occupation: null,
  venue: '', location_address: '', start_date: '', end_date: '', application_deadline: '', total_slots: 0,
  program_status: 'draft', visibility: 'public', contact_person: '', contact_email: '', contact_phone: '', attachment: null,
}

const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10'

export default function GovernmentProgramForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const title = id ? 'Edit Government Program' : 'Create Government Program'

  useEffect(() => {
    if (!id) return
    governmentProgramService.adminProgram(id).then((program) => {
      setForm({
        ...emptyForm,
        ...program,
        program_status: program.status,
        eligibility_requirements: listToText(program.eligibility_requirements),
        required_documents: listToText(program.required_documents),
        skills: program.skills ?? [],
        target_occupation: program.target_occupation,
        attachment: null,
      })
    }).catch(() => toast.error('Unable to load the program.')).finally(() => setLoading(false))
  }, [id])

  const update = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }
  const change = (event) => update(event.target.name, event.target.value)

  const validateStep = (target) => {
    const next = {}
    if (target === 0) {
      if (!form.program_name.trim()) next.program_name = 'Program title is required.'
      if (!form.category) next.category = 'Choose a program category.'
      if (!form.description.trim()) next.description = 'Full description is required.'
    }
    if (target === 1 && form.category === 'tech_voc_training' && form.skills.length === 0) {
      next.skills = 'Add at least one skill taught by this training.'
    }
    if (target === 2) {
      if (form.start_date && form.end_date && form.end_date < form.start_date) next.end_date = 'End date cannot be before start date.'
      if (Number(form.total_slots) < 0) next.total_slots = 'Slots cannot be negative.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async () => {
    if (!validateStep(2)) return
    setSaving(true)
    setErrors({})
    const payload = {
      ...form,
      target_occupation_id: form.target_occupation?.id ?? null,
      eligibility_requirements: textToList(form.eligibility_requirements),
      required_documents: textToList(form.required_documents),
      skills: form.skills.map((skill) => ({
        skill_id: skill.skill_id ?? skill.id ?? null,
        name: skill.name ?? skill.skill_name,
        type: skill.type ?? 'taught',
      })),
      total_slots: Number(form.total_slots || 0),
    }
    delete payload.target_occupation

    try {
      if (id) await governmentProgramService.updateProgram(id, payload)
      else await governmentProgramService.createProgram(payload)
      toast.success(id ? 'Program updated.' : 'Program created.')
      navigate('/admin/government-programs')
    } catch (requestError) {
      const serverErrors = requestError.response?.data?.errors ?? {}
      setErrors(Object.fromEntries(Object.entries(serverErrors).map(([key, value]) => [key, value?.[0] ?? 'Invalid value.'])))
      toast.error(requestError.response?.data?.message ?? 'Unable to save the program.')
    } finally {
      setSaving(false)
    }
  }

  const canContinue = useMemo(() => !loading && !saving, [loading, saving])
  if (loading) return <div className="py-16 text-center text-sm font-semibold text-slate-500">Loading program...</div>

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="Programs Center" title={title} subtitle="Use structured program data so eligibility, recommendations, and reporting stay consistent." />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50">
          {steps.map((label, index) => (
            <button key={label} type="button" onClick={() => index < step && setStep(index)} className={`min-h-16 border-r border-slate-200 px-3 py-3 text-xs font-extrabold last:border-r-0 sm:text-sm ${index === step ? 'bg-blue-900 text-white' : index < step ? 'bg-blue-50 text-blue-800' : 'text-slate-400'}`}>
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-current">{index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-7">
          {step === 0 && <OverviewStep form={form} errors={errors} change={change} />}
          {step === 1 && <EligibilityStep form={form} errors={errors} change={change} update={update} />}
          {step === 2 && <PublishingStep form={form} errors={errors} change={change} update={update} />}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
          <button type="button" onClick={() => step === 0 ? navigate('/admin/government-programs') : setStep((current) => current - 1)} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50">
            <ArrowLeft className="h-4 w-4" /> {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 2 ? (
            <button type="button" onClick={() => validateStep(step) && setStep((current) => current + 1)} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Continue <ArrowRight className="h-4 w-4" /></button>
          ) : (
            <button type="button" onClick={save} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-black text-blue-950 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {id ? 'Save Changes' : 'Create Program'}</button>
          )}
        </div>
      </section>
    </div>
  )
}

function OverviewStep({ form, errors, change }) {
  return (
    <div className="space-y-5">
      <StepHeading title="Program Overview" text="Define what PESO is offering and who the program is designed to serve." />
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Program Title" required error={errors.program_name}><input name="program_name" value={form.program_name} onChange={change} className={inputClass} /></Field>
        <Field label="Category" required error={errors.category}><select name="category" value={form.category} onChange={change} className={inputClass}>{PROGRAM_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></Field>
      </div>
      <Field label="Short Description" hint="Shown on browse cards. Maximum 500 characters." error={errors.short_description}><textarea name="short_description" value={form.short_description ?? ''} onChange={change} rows={2} maxLength={500} className={inputClass} /></Field>
      <Field label="Full Description" required error={errors.description}><textarea name="description" value={form.description} onChange={change} rows={6} className={inputClass} /></Field>
      <Field label="Target Beneficiaries" error={errors.target_beneficiaries}><textarea name="target_beneficiaries" value={form.target_beneficiaries ?? ''} onChange={change} rows={3} className={inputClass} /></Field>
    </div>
  )
}

function EligibilityStep({ form, errors, change, update }) {
  return (
    <div className="space-y-5">
      <StepHeading title="Eligibility & Skills" text="Link the program to the same occupation and skills taxonomy used by Smart Matching." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Eligibility Requirements" hint="Enter one requirement per line." error={errors.eligibility_requirements}><textarea name="eligibility_requirements" value={form.eligibility_requirements} onChange={change} rows={7} className={inputClass} /></Field>
        <Field label="Required Documents" hint="Enter one document per line." error={errors.required_documents}><textarea name="required_documents" value={form.required_documents} onChange={change} rows={7} className={inputClass} /></Field>
      </div>
      <SkillTaxonomyTags value={form.skills} onChange={(skills) => update('skills', skills)} output="objects" mode="employer" category="technical" label="Skills Taught or Targeted" placeholder="Search training skills" error={errors.skills} limit={30} />
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Target Industry" error={errors.target_industry}><input name="target_industry" value={form.target_industry ?? ''} onChange={change} className={inputClass} placeholder="e.g. Construction and Manufacturing" /></Field>
        <div><label className="text-sm font-bold text-slate-700">Target Occupation</label><div className="mt-1.5"><OccupationCombobox selected={form.target_occupation} onChange={(occupation) => update('target_occupation', occupation)} placeholder="Search a target occupation" /></div></div>
      </div>
    </div>
  )
}

function PublishingStep({ form, errors, change, update }) {
  return (
    <div className="space-y-5">
      <StepHeading title="Schedule & Publishing" text="Set the enrollment window, delivery details, capacity, and public contact information." />
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Start Date" error={errors.start_date}><input type="date" name="start_date" value={form.start_date ?? ''} onChange={change} className={inputClass} /></Field>
        <Field label="End Date" error={errors.end_date}><input type="date" name="end_date" value={form.end_date ?? ''} onChange={change} className={inputClass} /></Field>
        <Field label="Application Deadline" error={errors.application_deadline}><input type="date" name="application_deadline" value={form.application_deadline ?? ''} onChange={change} className={inputClass} /></Field>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Venue" error={errors.venue}><input name="venue" value={form.venue ?? ''} onChange={change} className={inputClass} /></Field>
        <Field label="Location Address" error={errors.location_address}><input name="location_address" value={form.location_address ?? ''} onChange={change} className={inputClass} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Total Slots" hint="Use 0 for open capacity." error={errors.total_slots}><input type="number" min="0" name="total_slots" value={form.total_slots} onChange={change} className={inputClass} /></Field>
        <Field label="Status" required error={errors.program_status}><select name="program_status" value={form.program_status} onChange={change} className={inputClass}>{PROGRAM_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></Field>
        <Field label="Visibility" required error={errors.visibility}><select name="visibility" value={form.visibility} onChange={change} className={inputClass}><option value="public">Public</option><option value="internal">Internal</option></select></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Contact Person" error={errors.contact_person}><input name="contact_person" value={form.contact_person ?? ''} onChange={change} className={inputClass} /></Field>
        <Field label="Contact Email" error={errors.contact_email}><input type="email" name="contact_email" value={form.contact_email ?? ''} onChange={change} className={inputClass} /></Field>
        <Field label="Contact Phone" error={errors.contact_phone}><input name="contact_phone" value={form.contact_phone ?? ''} onChange={change} className={inputClass} /></Field>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
        <FileUp className="h-5 w-5 text-blue-900" />
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-800">Program form or attachment</span><span className="block truncate text-xs text-slate-500">{form.attachment?.name ?? 'PDF, Office document, or image up to 10 MB'}</span></span>
        <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(event) => update('attachment', event.target.files?.[0] ?? null)} />
      </label>
      {errors.attachment && <p className="text-xs font-semibold text-red-600">{errors.attachment}</p>}
    </div>
  )
}

function StepHeading({ title, text }) { return <div><h2 className="text-lg font-black text-slate-950">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></div> }
function Field({ label, required, hint, error, children }) { return <label className="block"><span className="text-sm font-bold text-slate-700">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>{hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}{children}{error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}</label> }
function textToList(value) { return String(value ?? '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean) }
function listToText(value) { return Array.isArray(value) ? value.map((item) => typeof item === 'string' ? item : item.label ?? '').filter(Boolean).join('\n') : '' }
