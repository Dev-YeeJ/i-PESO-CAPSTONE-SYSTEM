import { createElement, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  GraduationCap,
  Loader2,
  MapPin,
  ShieldAlert,
  Target,
  UsersRound,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EducationLevelSelect, { educationRankToBackendValue } from '@/components/form/EducationLevelSelect'
import ExperienceTimeFrame from '@/components/form/ExperienceTimeFrame'
import PsocCombobox from '@/components/form/PsocCombobox'
import SkillTaxonomyTags from '@/components/form/SkillTaxonomyTags'
import PsgcCascade from '@/pages/employer/components/PsgcCascade'
import * as employerService from '@/services/employerService'

const steps = [
  { number: 1, title: 'Basic Information', shortTitle: 'Basic', icon: BriefcaseBusiness },
  { number: 2, title: 'Algorithm Anchors', shortTitle: 'Anchors', icon: Target },
  { number: 3, title: 'Candidate Qualifications', shortTitle: 'Qualifications', icon: GraduationCap },
  { number: 4, title: 'Demographic Preferences', shortTitle: 'Preferences', icon: UsersRound },
  { number: 5, title: 'Compensation & Details', shortTitle: 'Details', icon: CircleDollarSign },
]

const natureOfWorkOptions = [
  { label: 'Permanent', value: 'Permanent/Regular' },
  { label: 'Contractual', value: 'Contractual' },
  { label: 'Part-Time', value: 'Part-Time' },
  { label: 'Freelance', value: 'Freelance' },
]

const workArrangementOptions = [
  { label: 'On-site', value: 'On-Site' },
  { label: 'WFH', value: 'Remote' },
  { label: 'Hybrid', value: 'Hybrid' },
]

const genderOptions = ['Any', 'Male', 'Female']

const regionByProvincePrefix = {
  '01': 'Region I - Ilocos Region',
  '02': 'Region II - Cagayan Valley',
  '03': 'Region III - Central Luzon',
  '04': 'Region IV-A - CALABARZON',
  '05': 'Region V - Bicol Region',
  '06': 'Region VI - Western Visayas',
  '07': 'Region VII - Central Visayas',
  '08': 'Region VIII - Eastern Visayas',
  '09': 'Region IX - Zamboanga Peninsula',
  10: 'Region X - Northern Mindanao',
  11: 'Region XI - Davao Region',
  12: 'Region XII - SOCCSKSARGEN',
  13: 'National Capital Region (NCR)',
  14: 'Cordillera Administrative Region (CAR)',
  15: 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)',
  16: 'Region XIII - Caraga',
  17: 'MIMAROPA Region',
  18: 'Negros Island Region',
}

const initialForm = {
  job_title: '',
  vacancies_count: 1,
  employment_type: 'Permanent/Regular',
  work_setup: 'On-Site',
  occupation: null,
  occupation_id: null,
  psoc_code: '',
  region: '',
  province: '',
  province_code: '',
  city_municipality: '',
  city_code: '',
  barangay: '',
  barangay_code: '',
  specific_address: '',
  latitude: null,
  longitude: null,
  google_place_id: null,
  minimum_education_rank: 2,
  minimum_education: 'High School Graduate',
  required_years_experience: 0,
  required_skills: [],
  preferred_gender: 'Any',
  minimum_age: '',
  maximum_age: '',
  salary_min: '',
  salary_max: '',
  hide_salary: false,
  job_description: '',
  application_deadline: '',
}

const inputClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'
const selectClass = `${inputClass} appearance-none`

export default function JobPostingWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)

  const currentStep = steps[step - 1]
  const progressPercent = ((step - 1) / (steps.length - 1)) * 100

  const locationSummary = useMemo(
    () => [form.specific_address, form.barangay, form.city_municipality, form.province].filter(Boolean).join(', '),
    [form.specific_address, form.barangay, form.city_municipality, form.province],
  )

  const update = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setServerError('')
  }

  const change = (event) => {
    const { name, type, checked, value } = event.target
    update(name, type === 'checkbox' ? checked : value)
  }

  const setLocation = ({
    province,
    province_code,
    city,
    city_code,
    barangay,
    barangay_code,
  }) => {
    setForm((current) => ({
      ...current,
      region: regionFromProvinceCode(province_code),
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
    setServerError('')
  }

  const validate = (targetStep) => {
    const nextErrors = {}

    if (targetStep === 1) {
      if (!form.job_title.trim()) nextErrors.job_title = 'Job title is required.'
      if (!form.vacancies_count || Number(form.vacancies_count) < 1) {
        nextErrors.vacancies_count = 'Enter at least one vacancy.'
      }
      if (!form.employment_type) nextErrors.employment_type = 'Select nature of work.'
      if (!form.work_setup) nextErrors.work_setup = 'Select work arrangement.'
    }

    if (targetStep === 2) {
      if (!form.occupation_id || !form.psoc_code) nextErrors.occupation_id = 'Select a preferred occupation / PSOC anchor.'
      if (!form.province) nextErrors.province = 'Select province.'
      if (!form.city_municipality) nextErrors.city_municipality = 'Select city or municipality.'
      if (!form.barangay) nextErrors.barangay = 'Select barangay.'
    }

    if (targetStep === 3) {
      if (!form.minimum_education_rank) nextErrors.minimum_education = 'Select minimum educational attainment.'
      if (form.required_years_experience === '' || Number(form.required_years_experience) < 0) {
        nextErrors.required_years_experience = 'Enter 0 or higher.'
      }
      if (!form.required_skills.length) nextErrors.required_skills = 'Add at least one required hard skill.'
    }

    if (targetStep === 4) {
      if (!form.preferred_gender) nextErrors.preferred_gender = 'Select preferred gender.'
      if (form.minimum_age !== '' && (Number(form.minimum_age) < 15 || Number(form.minimum_age) > 100)) {
        nextErrors.minimum_age = 'Minimum age must be from 15 to 100.'
      }
      if (form.maximum_age !== '' && (Number(form.maximum_age) < 15 || Number(form.maximum_age) > 100)) {
        nextErrors.maximum_age = 'Maximum age must be from 15 to 100.'
      }
      if (
        form.minimum_age !== ''
        && form.maximum_age !== ''
        && Number(form.maximum_age) < Number(form.minimum_age)
      ) {
        nextErrors.maximum_age = 'Maximum age must be greater than or equal to minimum age.'
      }
    }

    if (targetStep === 5) {
      if (!form.hide_salary && form.salary_min === '') nextErrors.salary_min = 'Minimum salary is required.'
      if (!form.hide_salary && form.salary_max === '') nextErrors.salary_max = 'Maximum salary is required.'
      if (
        !form.hide_salary
        && form.salary_min !== ''
        && form.salary_max !== ''
        && Number(form.salary_max) < Number(form.salary_min)
      ) {
        nextErrors.salary_max = 'Maximum salary must be equal to or greater than minimum salary.'
      }
      if (!form.job_description.trim()) nextErrors.job_description = 'Job description is required.'
      if (!form.application_deadline) nextErrors.application_deadline = 'Application deadline is required.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const goNext = () => {
    if (!validate(step)) return
    setStep((current) => Math.min(current + 1, steps.length))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setErrors({})
    setServerError('')
    setStep((current) => Math.max(current - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async () => {
    if (!validate(5)) return

    setSaving(true)
    setServerError('')

    try {
      await employerService.createVacancy(buildPayload(form))
      navigate('/employer/vacancies')
    } catch (error) {
      const responseErrors = error.response?.data?.errors ?? {}
      setErrors(Object.fromEntries(Object.entries(responseErrors).map(([key, messages]) => [key, messages?.[0] ?? 'Invalid value.'])))
      setServerError(error.response?.data?.message ?? 'Unable to publish the job vacancy.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full bg-slate-50 px-3 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Recruitment Management</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Create Job Posting</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Build a DOLE-compliant, match-ready vacancy with structured occupation, location, and skill data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/employer/vacancies')}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-900 hover:text-blue-900"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </header>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold text-blue-900">Step {step} of {steps.length}: {currentStep.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Complete each step to publish a clean, searchable vacancy.</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {steps.map((item) => {
                  const Icon = item.icon
                  const active = item.number === step
                  const complete = item.number < step

                  return (
                    <button
                      key={item.number}
                      type="button"
                      onClick={() => {
                        if (item.number < step) setStep(item.number)
                      }}
                      className={`flex min-h-14 min-w-0 flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition ${
                        active
                          ? 'border-blue-900 bg-blue-900 text-white shadow-sm'
                          : complete
                            ? 'border-blue-200 bg-blue-50 text-blue-800'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                      aria-current={active ? 'step' : undefined}
                    >
                      {complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      <span className="mt-1 hidden text-[10px] font-black sm:block">{item.shortTitle}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-900 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {serverError && (
            <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:mx-7">
              {serverError}
            </div>
          )}

          <div className="px-5 py-6 sm:px-7 sm:py-7">
            {step === 1 && <BasicInformationStep form={form} errors={errors} change={change} />}
            {step === 2 && (
              <AlgorithmAnchorsStep
                form={form}
                errors={errors}
                update={update}
                setLocation={setLocation}
                locationSummary={locationSummary}
              />
            )}
            {step === 3 && <QualificationsStep form={form} errors={errors} update={update} />}
            {step === 4 && <DemographicPreferencesStep form={form} errors={errors} change={change} />}
            {step === 5 && <CompensationDetailsStep form={form} errors={errors} change={change} />}
          </div>

          <footer className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-900 hover:text-blue-900 disabled:pointer-events-none disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {step < steps.length ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:pointer-events-none disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving ? 'Publishing...' : 'Publish Job'}
              </button>
            )}
          </footer>
        </section>
      </div>
    </div>
  )
}

function BasicInformationStep({ form, errors, change }) {
  return (
    <StepShell
      icon={BriefcaseBusiness}
      title="Basic Information"
      description="Capture the employer-facing role basics first. These fields are intentionally compact so posting starts quickly."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Job Title" required error={errors.job_title} className="md:col-span-2">
          <input
            name="job_title"
            value={form.job_title}
            onChange={change}
            className={inputClass}
            placeholder="e.g. Accounting Staff"
            maxLength={255}
          />
        </Field>

        <Field label="Number of Vacancies" required error={errors.vacancies_count}>
          <input
            name="vacancies_count"
            type="number"
            min="1"
            max="10000"
            value={form.vacancies_count}
            onChange={change}
            className={inputClass}
          />
        </Field>

        <Field label="Nature of Work" required error={errors.employment_type}>
          <select name="employment_type" value={form.employment_type} onChange={change} className={selectClass}>
            {natureOfWorkOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Work Arrangement" required error={errors.work_setup}>
          <select name="work_setup" value={form.work_setup} onChange={change} className={selectClass}>
            {workArrangementOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>
      </div>
    </StepShell>
  )
}

function AlgorithmAnchorsStep({ form, errors, update, setLocation, locationSummary }) {
  return (
    <StepShell
      icon={Target}
      title="Algorithm Anchors"
      description="Standard occupation and PSGC location data become the strongest anchors for matching, referrals, and analytics."
    >
      <div className="space-y-6">
        <Field label="Preferred Occupation / PSOC" required error={errors.occupation_id}>
          <PsocCombobox
            value={form.psoc_code}
            selected={form.occupation}
            onChange={(psocCode, occupation) => {
              update('psoc_code', psocCode)
              update('occupation', occupation)
              update('occupation_id', occupation?.id ?? null)
            }}
            limit={50}
            placeholder="Search occupation title or PSOC code"
            error={errors.occupation_id}
          />
        </Field>

        <div>
          <p className="text-sm font-bold text-slate-700">Job Location / PSGC <span className="text-red-500">*</span></p>
          <div className="mt-2">
            <PsgcCascade
              province={form.province}
              provinceCode={form.province_code}
              city={form.city_municipality}
              cityCode={form.city_code}
              barangay={form.barangay}
              barangayCode={form.barangay_code}
              onChange={setLocation}
            />
          </div>
          {(errors.province || errors.city_municipality || errors.barangay) && (
            <p className="mt-1.5 text-xs font-semibold text-red-600">
              {errors.province || errors.city_municipality || errors.barangay}
            </p>
          )}
        </div>

        <Field label="Specific Address / Landmark" required={false}>
          <input
            name="specific_address"
            value={form.specific_address}
            onChange={(event) => update('specific_address', event.target.value)}
            className={inputClass}
            placeholder="Building, street, floor, or nearby landmark"
            maxLength={255}
          />
        </Field>

        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-900">Map Pin Location</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Google Maps Lat/Lng picker placeholder. The system can still geocode from the PSGC address during publishing.
                </p>
              </div>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500">
              {form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : 'No pin selected'}
            </span>
          </div>
          {locationSummary && <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">{locationSummary}</p>}
        </div>
      </div>
    </StepShell>
  )
}

function QualificationsStep({ form, errors, update }) {
  return (
    <StepShell
      icon={GraduationCap}
      title="Candidate Qualifications"
      description="Keep requirements measurable and directly related to the actual work so matching stays fair and accurate."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <EducationLevelSelect
          label="Minimum Educational Attainment"
          required
          value={form.minimum_education_rank}
          onChange={(rank, option) => {
            update('minimum_education_rank', rank)
            update('minimum_education', option?.backendValue ?? '')
          }}
          error={errors.minimum_education}
        />

        <ExperienceTimeFrame
          mode="employer"
          label="Required Years of Experience"
          required
          value={form.required_years_experience}
          onChange={(years) => update('required_years_experience', years)}
          error={errors.required_years_experience}
        />
      </div>

      <div className="mt-6">
        <SkillTaxonomyTags
          label="Required Hard Skills"
          required
          mode="employer"
          category="technical"
          output="names"
          value={form.required_skills}
          onChange={(values) => update('required_skills', values)}
          placeholder="Search a required hard skill"
          error={errors.required_skills}
        />
      </div>
    </StepShell>
  )
}

function DemographicPreferencesStep({ form, errors, change }) {
  return (
    <StepShell
      icon={UsersRound}
      title="Demographic Preferences"
      description="Use only when the preference is legally relevant to the duties of the position."
    >
      <div className="grid gap-5 md:grid-cols-3">
        <Field label="Preferred Gender" required error={errors.preferred_gender}>
          <select name="preferred_gender" value={form.preferred_gender} onChange={change} className={selectClass}>
            {genderOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </Field>

        <Field label="Minimum Age" required={false} error={errors.minimum_age}>
          <input
            name="minimum_age"
            type="number"
            min="15"
            max="100"
            value={form.minimum_age}
            onChange={change}
            className={inputClass}
            placeholder="Optional"
          />
        </Field>

        <Field label="Maximum Age" required={false} error={errors.maximum_age}>
          <input
            name="maximum_age"
            type="number"
            min="15"
            max="100"
            value={form.maximum_age}
            onChange={change}
            className={inputClass}
            placeholder="Optional"
          />
        </Field>
      </div>

      <div className="mt-5 rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-700">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Notice: By specifying age or gender preferences, you confirm this position qualifies for a Bona Fide Occupational Qualification (BFOQ) exception under DOLE guidelines and R.A. 10911.</p>
        </div>
      </div>
    </StepShell>
  )
}

function CompensationDetailsStep({ form, errors, change }) {
  return (
    <StepShell
      icon={CircleDollarSign}
      title="Compensation & Details"
      description="Finish with salary visibility, responsibilities, and the application deadline."
    >
      <div>
        <p className="text-sm font-bold text-slate-700">
          Salary Range
          {!form.hide_salary && <span className="ml-1 text-red-500">*</span>}
        </p>
        <div className="mt-2 grid gap-5 md:grid-cols-2">
          <input
            name="salary_min"
            type="number"
            min="0"
            value={form.salary_min}
            onChange={change}
            disabled={form.hide_salary}
            className={`${inputClass} mt-0`}
            placeholder="Minimum salary"
            aria-label="Minimum salary"
          />
          <input
            name="salary_max"
            type="number"
            min="0"
            value={form.salary_max}
            onChange={change}
            disabled={form.hide_salary}
            className={`${inputClass} mt-0`}
            placeholder="Maximum salary"
            aria-label="Maximum salary"
          />
        </div>
        {(errors.salary_min || errors.salary_max) && (
          <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.salary_min || errors.salary_max}</p>
        )}
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <input
          name="hide_salary"
          type="checkbox"
          checked={form.hide_salary}
          onChange={change}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900/20"
        />
        <span>
          <span className="block text-sm font-bold text-slate-900">Hide exact salary from public posting</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">Applicants will see a public salary privacy label while PESO keeps the structured posting data.</span>
        </span>
      </label>

      <div className="mt-6">
        <Field label="Job Description & Responsibilities" required error={errors.job_description}>
          <textarea
            name="job_description"
            value={form.job_description}
            onChange={change}
            rows={9}
            className={`${inputClass} resize-y leading-6`}
            placeholder="Rich Text Editor placeholder: summarize responsibilities, daily duties, reporting lines, and expected outcomes."
            maxLength={10000}
          />
        </Field>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1fr)_280px] md:items-end">
        <Field label="Application Deadline" required error={errors.application_deadline}>
          <input
            name="application_deadline"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={form.application_deadline}
            onChange={change}
            className={inputClass}
          />
        </Field>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
          <div className="flex items-start gap-2">
            <CalendarDays className="mt-1 h-4 w-4 shrink-0" />
            <p>The vacancy automatically closes after this date and can be excluded from active matching.</p>
          </div>
        </div>
      </div>
    </StepShell>
  )
}

function StepShell({ icon, title, description, children }) {
  return (
    <div>
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-900">
          {createElement(icon, { className: 'h-5 w-5' })}
        </span>
        <div>
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function Field({ label, required = true, error, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-bold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  )
}

function regionFromProvinceCode(provinceCode) {
  return regionByProvincePrefix[String(provinceCode ?? '').slice(0, 2)] ?? ''
}

function yearsToExperienceLevel(yearsValue) {
  const years = Number(yearsValue || 0)
  if (years <= 0) return 'No Experience Required'
  if (years <= 3) return '1-3 Years'
  if (years <= 5) return '3-5 Years'
  return '5+ Years'
}

function buildPayload(form) {
  return {
    occupation_id: form.occupation_id,
    job_title: form.job_title.trim().replace(/\s+/g, ' '),
    employment_type: form.employment_type,
    work_setup: form.work_setup,
    region: form.region || regionFromProvinceCode(form.province_code),
    province: form.province,
    province_code: form.province_code || null,
    city_municipality: form.city_municipality,
    city_code: form.city_code || null,
    barangay: form.barangay,
    barangay_code: form.barangay_code || null,
    specific_address: form.specific_address.trim().replace(/\s+/g, ' ') || null,
    latitude: form.latitude,
    longitude: form.longitude,
    google_place_id: form.google_place_id,
    job_description: form.job_description.trim(),
    vacancies_count: Number(form.vacancies_count),
    minimum_education: educationRankToBackendValue(form.minimum_education_rank) || form.minimum_education,
    target_courses: [],
    experience_level: yearsToExperienceLevel(form.required_years_experience),
    required_skills: form.required_skills,
    soft_skills: [],
    required_certifications: [],
    salary_type: 'Monthly',
    salary_min: form.hide_salary || form.salary_min === '' ? null : Number(form.salary_min),
    salary_max: form.hide_salary || form.salary_max === '' ? null : Number(form.salary_max),
    hide_salary: Boolean(form.hide_salary),
    benefits: [],
    application_deadline: form.application_deadline,
    preferred_gender: form.preferred_gender,
    minimum_age: form.minimum_age === '' ? null : Number(form.minimum_age),
    maximum_age: form.maximum_age === '' ? null : Number(form.maximum_age),
    open_to_pwds: false,
    open_to_senior_citizens: false,
    spes_tupad_eligible: false,
    status: 'active',
  }
}
