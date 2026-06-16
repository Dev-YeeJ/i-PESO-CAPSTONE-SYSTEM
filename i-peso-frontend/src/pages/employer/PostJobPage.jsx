import { createElement, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AlertBox, Badge, Button, Card, CardHeader } from '@/components/ui'
import OccupationCombobox from '@/components/form/OccupationCombobox'
import PsgcCascade from '@/pages/employer/components/PsgcCascade'
import * as employerService from '@/services/employerService'

const steps = [
  { number: 1, label: 'Job Details', description: 'Role and assignment' },
  { number: 2, label: 'Qualifications', description: 'Matching and compensation' },
  { number: 3, label: 'Review & Publish', description: 'Deadline and confirmation' },
]

const regions = [
  'National Capital Region (NCR)',
  'Cordillera Administrative Region (CAR)',
  'Region I - Ilocos Region',
  'Region II - Cagayan Valley',
  'Region III - Central Luzon',
  'Region IV-A - CALABARZON',
  'MIMAROPA Region',
  'Region V - Bicol Region',
  'Region VI - Western Visayas',
  'Negros Island Region',
  'Region VII - Central Visayas',
  'Region VIII - Eastern Visayas',
  'Region IX - Zamboanga Peninsula',
  'Region X - Northern Mindanao',
  'Region XI - Davao Region',
  'Region XII - SOCCSKSARGEN',
  'Region XIII - Caraga',
  'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)',
]

const employmentTypes = [
  'Permanent/Regular',
  'Contractual',
  'Project-Based',
  'Seasonal',
  'Part-Time',
  'Freelance',
]

const educationLevels = [
  'High School Graduate',
  'College Undergraduate',
  'College Graduate',
  'TVET/Vocational Graduate',
  'Post-Graduate',
]

const experienceLevels = [
  'No Experience Required',
  '1-3 Years',
  '3-5 Years',
  '5+ Years',
]

const initialForm = {
  occupation: null,
  occupation_id: null,
  job_title: '',
  job_description: '',
  vacancies_count: 1,
  employment_type: 'Permanent/Regular',
  work_setup: 'On-Site',
  region: 'Region I - Ilocos Region',
  province: '',
  province_code: '',
  city_municipality: '',
  city_code: '',
  barangay: '',
  barangay_code: '',
  specific_address: '',
  minimum_education: 'High School Graduate',
  target_courses: [],
  experience_level: 'No Experience Required',
  required_skills: [],
  soft_skills: [],
  required_certifications: [],
  salary_type: 'Monthly',
  salary_min: '',
  salary_max: '',
  hide_salary: false,
  benefits: [],
  application_deadline: '',
  open_to_pwds: false,
  open_to_senior_citizens: false,
  spes_tupad_eligible: false,
  status: 'active',
}

export default function PostJobPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)

  const location = useMemo(
    () => [form.specific_address, form.barangay, form.city_municipality, form.province].filter(Boolean).join(', '),
    [form],
  )

  const update = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const change = (event) => {
    const { name, type, checked, value } = event.target
    update(name, type === 'checkbox' ? checked : value)
  }

  const validateStep = (targetStep) => {
    const nextErrors = {}

    if (targetStep === 1) {
      if (!form.occupation_id) nextErrors.occupation_id = 'Select a standardized occupation.'
      if (!form.job_description.trim()) nextErrors.job_description = 'Job description is required.'
      if (Number(form.vacancies_count) < 1) nextErrors.vacancies_count = 'Enter at least one vacancy.'
      if (!form.region) nextErrors.region = 'Region is required.'
      if (!form.province) nextErrors.province = 'Province is required.'
      if (!form.city_municipality) nextErrors.city_municipality = 'City or municipality is required.'
      if (!form.barangay) nextErrors.barangay = 'Barangay is required.'
    }

    if (targetStep === 2) {
      if (!form.required_skills.length) nextErrors.required_skills = 'Add at least one hard skill.'
      if (!form.hide_salary && (form.salary_min === '' || form.salary_max === '')) {
        nextErrors.salary = 'Enter the minimum and maximum salary, or choose to hide it.'
      }
      if (!form.hide_salary && Number(form.salary_max) < Number(form.salary_min)) {
        nextErrors.salary = 'Maximum salary must be equal to or greater than minimum salary.'
      }
    }

    if (targetStep === 3 && !form.application_deadline) {
      nextErrors.application_deadline = 'Application deadline is required.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const next = () => {
    if (!validateStep(step)) return
    setStep((current) => Math.min(current + 1, 3))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const back = () => {
    setErrors({})
    setStep((current) => Math.max(current - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (status) => {
    if (!validateStep(3)) return

    setSaving(true)
    setServerError('')
    setErrors({})

    try {
      await employerService.createVacancy({
        ...form,
        status,
        vacancies_count: Number(form.vacancies_count),
        salary_min: form.hide_salary || form.salary_min === '' ? null : Number(form.salary_min),
        salary_max: form.hide_salary || form.salary_max === '' ? null : Number(form.salary_max),
      })
      navigate('/employer/vacancies')
    } catch (requestError) {
      const responseErrors = requestError.response?.data?.errors ?? {}
      setErrors(Object.fromEntries(Object.entries(responseErrors).map(([key, messages]) => [key, messages[0]])))
      setServerError(requestError.response?.data?.message ?? 'Unable to create the job vacancy.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="portal-page">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="portal-eyebrow">Recruitment Management</p>
          <h1 className="portal-title mt-1">Create Job Vacancy</h1>
          <p className="portal-subtitle">Build a complete, match-ready opportunity for local job seekers.</p>
        </div>
        <Button variant="ghost" icon={X} onClick={() => navigate('/employer/vacancies')}>Cancel posting</Button>
      </div>

      <Card padding="sm">
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((item) => {
            const active = item.number === step
            const complete = item.number < step

            return (
              <button
                key={item.number}
                type="button"
                onClick={() => item.number < step && setStep(item.number)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  active
                    ? 'border-amber-400 bg-amber-50'
                    : complete
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                  active ? 'bg-brand-gold text-brand-navy' : complete ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {complete ? <Check className="h-4 w-4" /> : item.number}
                </span>
                <span>
                  <strong className="block text-sm text-slate-900">{item.label}</strong>
                  <span className="text-xs text-slate-500">{item.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      {serverError && <AlertBox variant="danger" title="Job post could not be saved">{serverError}</AlertBox>}

      {step === 1 && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card>
              <CardHeader title="Basic Job Information" subtitle="Describe the opportunity using clear and recognizable employment terms." />
              <div className="space-y-5">
                <Field label="Job title" required error={errors.occupation_id}>
                  <OccupationCombobox
                    selected={form.occupation}
                    onChange={(occupation) => {
                      update('occupation', occupation)
                      update('occupation_id', occupation?.id ?? null)
                      update('job_title', occupation?.title ?? '')
                    }}
                    limit={1}
                    placeholder="Search by job title or PSOC code"
                    error={errors.occupation_id}
                  />
                </Field>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Number of vacancies" required error={errors.vacancies_count}>
                    <input name="vacancies_count" type="number" min="1" max="10000" value={form.vacancies_count} onChange={change} className="portal-input" />
                  </Field>
                  <Field label="Employment type" required>
                    <select name="employment_type" value={form.employment_type} onChange={change} className="portal-input">
                      {employmentTypes.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="Work setup" required>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {['On-Site', 'Remote', 'Hybrid'].map((option) => (
                      <ChoiceCard key={option} selected={form.work_setup === option} onClick={() => update('work_setup', option)}>
                        {option}
                      </ChoiceCard>
                    ))}
                  </div>
                </Field>

                <Field label="Job description" required error={errors.job_description} hint="Describe responsibilities, daily tasks, and expected outcomes.">
                  <textarea
                    name="job_description"
                    value={form.job_description}
                    onChange={change}
                    rows={8}
                    className="portal-input resize-y leading-6"
                    placeholder="What will the employee do? What outcomes are expected in this role?"
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <CardHeader title="Location and Assignment" subtitle="Structured PSGC location data powers accurate local job matching." />
              <div className="space-y-5">
                <Field label="Region" required error={errors.region}>
                  <select name="region" value={form.region} onChange={change} className="portal-input">
                    <option value="">Select region</option>
                    {regions.map((region) => <option key={region}>{region}</option>)}
                  </select>
                </Field>

                <PsgcCascade
                  province={form.province}
                  provinceCode={form.province_code}
                  city={form.city_municipality}
                  cityCode={form.city_code}
                  barangay={form.barangay}
                  barangayCode={form.barangay_code}
                  onChange={({
                    province,
                    province_code,
                    city,
                    city_code,
                    barangay,
                    barangay_code,
                  }) => {
                    setForm((current) => ({
                      ...current,
                      province,
                      province_code,
                      city_municipality: city,
                      city_code,
                      barangay,
                      barangay_code,
                    }))
                    setErrors((current) => ({
                      ...current,
                      province: undefined,
                      city_municipality: undefined,
                      barangay: undefined,
                    }))
                  }}
                />
                {(errors.province || errors.city_municipality || errors.barangay) && (
                  <p className="text-xs font-semibold text-red-600">
                    {errors.province || errors.city_municipality || errors.barangay}
                  </p>
                )}

                <Field label="Specific address or landmark" hint="Optional">
                  <input
                    name="specific_address"
                    value={form.specific_address}
                    onChange={change}
                    className="portal-input"
                    placeholder="Building, street, or nearby landmark"
                  />
                </Field>
              </div>
            </Card>
          </div>

          <GuidanceCard
            icon={MapPin}
            title="Why exact location matters"
            points={[
              'Improves city and barangay-level matching',
              'Helps PESO identify local hiring demand',
              'Reduces unsuitable applicant referrals',
              'Supports location-based labor analytics',
            ]}
          />
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card>
              <CardHeader title="Qualifications" subtitle="These structured requirements feed the job matching engine." />
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Minimum educational attainment" required>
                    <select name="minimum_education" value={form.minimum_education} onChange={change} className="portal-input">
                      {educationLevels.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </Field>
                  <Field label="Required experience" required>
                    <select name="experience_level" value={form.experience_level} onChange={change} className="portal-input">
                      {experienceLevels.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </Field>
                </div>

                <TagInput
                  label="Target courses or degrees"
                  hint="Optional"
                  placeholder="Type a course and press Enter"
                  values={form.target_courses}
                  onChange={(values) => update('target_courses', values)}
                />
                <TagInput
                  label="Hard skills required"
                  required
                  error={errors.required_skills}
                  placeholder="e.g. Laravel, Data Entry, Welding"
                  values={form.required_skills}
                  onChange={(values) => update('required_skills', values)}
                />
                <TagInput
                  label="Soft skills"
                  hint="Optional"
                  placeholder="e.g. Communication, Leadership"
                  values={form.soft_skills}
                  onChange={(values) => update('soft_skills', values)}
                />
                <TagInput
                  label="Required licenses or certifications"
                  hint="Optional"
                  placeholder="e.g. TESDA NC II, PRC License"
                  values={form.required_certifications}
                  onChange={(values) => update('required_certifications', values)}
                />
              </div>
            </Card>

            <Card>
              <CardHeader title="Compensation and Benefits" subtitle="Transparent compensation helps job seekers make informed applications." />
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-3">
                  <Field label="Salary type" required>
                    <select name="salary_type" value={form.salary_type} onChange={change} className="portal-input">
                      {['Monthly', 'Daily', 'Hourly'].map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </Field>
                  <Field label="Minimum salary" required={!form.hide_salary}>
                    <input name="salary_min" type="number" min="0" value={form.salary_min} onChange={change} disabled={form.hide_salary} className="portal-input disabled:bg-slate-100" placeholder="0.00" />
                  </Field>
                  <Field label="Maximum salary" required={!form.hide_salary}>
                    <input name="salary_max" type="number" min="0" value={form.salary_max} onChange={change} disabled={form.hide_salary} className="portal-input disabled:bg-slate-100" placeholder="0.00" />
                  </Field>
                </div>
                {errors.salary && <p className="text-xs font-semibold text-red-600">{errors.salary}</p>}

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input name="hide_salary" type="checkbox" checked={form.hide_salary} onChange={change} className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-navy" />
                  <span>
                    <strong className="block text-sm text-slate-900">Hide salary from applicants</strong>
                    <span className="text-xs text-slate-500">The vacancy will display “Depends on Qualifications.”</span>
                  </span>
                </label>

                <TagInput
                  label="Benefits and perks"
                  hint="Optional"
                  placeholder="e.g. HMO, Free Meals, Overtime Pay"
                  values={form.benefits}
                  onChange={(values) => update('benefits', values)}
                />
              </div>
            </Card>
          </div>

          <GuidanceCard
            icon={Sparkles}
            title="Better matching data"
            points={[
              'Use only skills essential to the role',
              'Welcome fresh graduates when experience is unnecessary',
              'List recognized licenses and TESDA certifications',
              'Avoid requirements unrelated to actual job duties',
            ]}
          />
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <Card>
              <CardHeader title="Posting Logistics" subtitle="Set the application window and optional inclusion indicators." />
              <div className="space-y-5">
                <Field label="Application deadline" required error={errors.application_deadline} hint="The vacancy automatically closes after this date.">
                  <input
                    name="application_deadline"
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={form.application_deadline}
                    onChange={change}
                    className="portal-input"
                  />
                </Field>

                <div>
                  <p className="portal-label">Special targeting <span className="text-xs font-normal text-slate-400">(optional)</span></p>
                  <div className="mt-2 grid gap-3 md:grid-cols-3">
                    <CheckCard name="open_to_pwds" checked={form.open_to_pwds} onChange={change}>Open to PWDs</CheckCard>
                    <CheckCard name="open_to_senior_citizens" checked={form.open_to_senior_citizens} onChange={change}>Open to Senior Citizens</CheckCard>
                    <CheckCard name="spes_tupad_eligible" checked={form.spes_tupad_eligible} onChange={change}>SPES/TUPAD Eligible</CheckCard>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Review Vacancy" subtitle="Confirm the information before publishing it to job seekers." />
              <div className="space-y-6">
                <ReviewGroup title="Job details" icon={BriefcaseBusiness}>
                  <ReviewItem label="Job title" value={form.job_title} />
                  <ReviewItem label="Employment" value={`${form.employment_type} · ${form.work_setup}`} />
                  <ReviewItem label="Openings" value={`${form.vacancies_count} vacancy${Number(form.vacancies_count) === 1 ? '' : 'ies'}`} />
                  <ReviewItem label="Assignment" value={location || 'Not completed'} />
                </ReviewGroup>

                <ReviewGroup title="Qualifications" icon={GraduationCap}>
                  <ReviewItem label="Education" value={form.minimum_education} />
                  <ReviewItem label="Experience" value={form.experience_level} />
                  <ReviewTags label="Hard skills" values={form.required_skills} />
                  <ReviewTags label="Certifications" values={form.required_certifications} />
                </ReviewGroup>

                <ReviewGroup title="Compensation" icon={Banknote}>
                  <ReviewItem
                    label="Salary"
                    value={form.hide_salary
                      ? 'Depends on Qualifications'
                      : `PHP ${Number(form.salary_min || 0).toLocaleString()} - ${Number(form.salary_max || 0).toLocaleString()} ${form.salary_type.toLowerCase()}`}
                  />
                  <ReviewTags label="Benefits" values={form.benefits} />
                  <ReviewItem label="Deadline" value={form.application_deadline || 'Not selected'} />
                </ReviewGroup>
              </div>
            </Card>
          </div>

          <Card
            hero
            heroContent={(
              <>
                <ShieldCheck className="h-8 w-8 text-brand-gold" />
                <h2 className="mt-4 text-xl font-black">Ready to reach local talent?</h2>
                <p className="mt-2 text-sm leading-6 text-blue-100">Your structured vacancy data will support matching, referrals, and PESO labor-market analytics.</p>
              </>
            )}
          >
            <div className="space-y-3">
              <PublishCheck complete={Boolean(form.job_title && form.job_description)}>Job information complete</PublishCheck>
              <PublishCheck complete={Boolean(form.province && form.city_municipality && form.barangay)}>PSGC assignment complete</PublishCheck>
              <PublishCheck complete={form.required_skills.length > 0}>Matching skills provided</PublishCheck>
              <PublishCheck complete={Boolean(form.application_deadline)}>Application deadline set</PublishCheck>
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
              <Button className="w-full" icon={CheckCircle2} disabled={saving} onClick={() => submit('active')}>
                {saving ? 'Publishing...' : 'Publish Vacancy'}
              </Button>
              <Button className="w-full" variant="outline" disabled={saving} onClick={() => submit('draft')}>
                Save as Draft
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-200 pt-5">
        <Button variant="ghost" icon={ArrowLeft} disabled={step === 1} onClick={back}>Back</Button>
        {step < 3 && <Button icon={ArrowRight} onClick={next}>Continue</Button>}
      </div>
    </div>
  )
}

function Field({ label, required, hint, error, children }) {
  return (
    <label className="block">
      <span className="portal-label">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
        {hint && <span className="ml-1 text-xs font-normal normal-case tracking-normal text-slate-400">({hint})</span>}
      </span>
      <span className="mt-2 block">{children}</span>
      {error && <span className="mt-1.5 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  )
}

function ChoiceCard({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
        selected ? 'border-brand-navy bg-brand-navy text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
      }`}
    >
      {children}
    </button>
  )
}

function TagInput({ label, required, hint, placeholder, values, onChange, error }) {
  const [input, setInput] = useState('')

  const add = () => {
    const items = input
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item && !values.some((value) => value.toLowerCase() === item.toLowerCase()))

    if (items.length) onChange([...values, ...items])
    setInput('')
  }

  return (
    <div>
      <p className="portal-label">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
        {hint && <span className="ml-1 text-xs font-normal normal-case tracking-normal text-slate-400">({hint})</span>}
      </p>
      <div className={`mt-2 rounded-xl border bg-white p-2 focus-within:ring-2 ${
        error ? 'border-red-300 focus-within:ring-red-100' : 'border-slate-300 focus-within:border-blue-400 focus-within:ring-blue-500/20'
      }`}>
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span key={value} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {value}
              <button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`Remove ${value}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault()
                add()
              }
              if (event.key === 'Backspace' && !input && values.length) {
                onChange(values.slice(0, -1))
              }
            }}
            onBlur={add}
            className="min-w-52 flex-1 border-0 px-2 py-1.5 text-sm outline-none"
            placeholder={values.length ? 'Add another...' : placeholder}
          />
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
      <p className="mt-1 text-xs text-slate-400">Press Enter or comma to add each item.</p>
    </div>
  )
}

function CheckCard({ name, checked, onChange, children }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-bold transition ${
      checked ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'
    }`}>
      <input name={name} type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
      {children}
    </label>
  )
}

function GuidanceCard({ icon, title, points }) {
  return (
    <Card
      className="h-fit"
      hero
      heroContent={(
        <>
          {createElement(icon, { className: 'h-8 w-8 text-brand-gold' })}
          <h2 className="mt-4 text-xl font-black">{title}</h2>
        </>
      )}
    >
      <div className="space-y-3">
        {points.map((point) => (
          <div key={point} className="flex gap-2 text-sm leading-6 text-slate-600">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
            {point}
          </div>
        ))}
      </div>
    </Card>
  )
}

function ReviewGroup({ title, icon, children }) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-lg bg-slate-100 p-2 text-brand-navy">
          {createElement(icon, { className: 'h-4 w-4' })}
        </span>
        <h3 className="font-black text-slate-900">{title}</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function ReviewItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value || 'Not provided'}</p>
    </div>
  )
}

function ReviewTags({ label, values }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.length
          ? values.map((value) => <Badge key={value} variant="matched" icon={false}>{value}</Badge>)
          : <span className="text-sm text-slate-500">None specified</span>}
      </div>
    </div>
  )
}

function PublishCheck({ complete, children }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${
        complete ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
      }`}>
        {complete ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <span className={complete ? 'font-semibold text-slate-700' : 'text-slate-500'}>{children}</span>
    </div>
  )
}
