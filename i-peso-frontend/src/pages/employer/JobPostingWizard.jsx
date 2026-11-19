import { createElement, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  History,
  GraduationCap,
  Loader2,
  MapPin,
  Plus,
  ShieldAlert,
  Sparkles,
  Target,
  UsersRound,
  X,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import AIOccupationMapper from '@/components/form/AIOccupationMapper'
import EducationLevelSelect, { educationBackendValueToRank, educationRankToBackendValue } from '@/components/form/EducationLevelSelect'
import { mappingFromVacancy } from '@/components/form/broadFields'
import { useAuthStore } from '@/stores/authStore'
import ExperienceTimeFrame from '@/components/form/ExperienceTimeFrame'
import SkillTaxonomyTags from '@/components/form/SkillTaxonomyTags'
import SmartSuggestionInput from '@/components/form/SmartSuggestionInput'
import PsgcCascade from '@/pages/employer/components/PsgcCascade'
import AddressPicker from '@/components/maps/AddressPicker'
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

const jobTitleSuggestions = [
  { label: 'Accounting Staff', value: 'Accounting Staff', helper: 'Standard office and finance role title.' },
  { label: 'Cashier', value: 'Cashier', helper: 'Common retail and customer transaction role.' },
  { label: 'Data Encoder', value: 'Data Encoder', helper: 'Cleaner than mixed titles like encoder/admin/data staff.' },
  { label: 'Delivery Rider', value: 'Delivery Rider', helper: 'Standard transport and logistics title.' },
  { label: 'Web Developer', value: 'Web Developer', helper: 'Use this before choosing the matching occupation anchor.' },
  { label: 'Production Operator', value: 'Production Operator', helper: 'Common manufacturing role title.' },
]

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
  occupation_mapping: null,
  general_term: '',
  broad_field_key: '',
  anchor_code: '',
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
  soft_skills: [],
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

const DRAFT_PREFIX = 'ipeso.jobDraft.'

/** Unfinished posts are kept in this browser only: a convenience, not a record. */
function readDraft(key) {
  try {
    const draft = JSON.parse(window.localStorage.getItem(key) ?? 'null')
    return draft?.form ? draft : null
  } catch {
    return null
  }
}

function writeDraft(key, form, step) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ form, step, savedAt: new Date().toISOString() }))
    return true
  } catch {
    return false
  }
}

function clearDraft(key) {
  try { window.localStorage.removeItem(key) } catch { /* storage blocked: nothing to clear */ }
}

const formatTime = (iso) => new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

export default function JobPostingWizard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const duplicateFrom = searchParams.get('from')
  const userId = useAuthStore((state) => state.user?.id)
  const draftKey = `${DRAFT_PREFIX}${userId ?? 'me'}`

  // A copy of another vacancy takes precedence over a saved draft.
  const [initialDraft] = useState(() => (duplicateFrom ? null : readDraft(draftKey)))
  const [step, setStep] = useState(initialDraft?.step ?? 1)
  const [form, setForm] = useState(() => (initialDraft ? { ...initialForm, ...initialDraft.form } : initialForm))
  const [notice, setNotice] = useState(() => (initialDraft ? { kind: 'draft', savedAt: initialDraft.savedAt } : null))
  const [draftSavedAt, setDraftSavedAt] = useState(initialDraft?.savedAt ?? null)
  const published = useRef(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Duplicate: load the source vacancy once and pre-fill everything but the deadline.
  useEffect(() => {
    if (!duplicateFrom) return undefined
    let cancelled = false
    employerService.getVacancy(duplicateFrom)
      .then((vacancy) => {
        if (cancelled) return
        setForm(formFromVacancy(vacancy))
        setStep(1)
        setNotice({ kind: 'copy', title: vacancy.job_title })
      })
      .catch(() => { if (!cancelled) setNotice({ kind: 'copyFailed' }) })
    return () => { cancelled = true }
  }, [duplicateFrom])

  // Autosave a moment after the last change. Nothing is stored for an untouched form.
  useEffect(() => {
    if (published.current || JSON.stringify(form) === JSON.stringify(initialForm)) return undefined
    const timer = window.setTimeout(() => {
      if (!published.current && writeDraft(draftKey, form, step)) setDraftSavedAt(new Date().toISOString())
    }, 800)
    return () => window.clearTimeout(timer)
  }, [form, step, draftKey])

  const startOver = () => {
    clearDraft(draftKey)
    setForm(initialForm)
    setStep(1)
    setErrors({})
    setServerError('')
    setNotice(null)
    setDraftSavedAt(null)
    if (duplicateFrom) navigate('/employer/post-job', { replace: true })
  }

  const currentStep = steps[step - 1]
  const progressPercent = ((step - 1) / (steps.length - 1)) * 100

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
      if (!form.general_term) nextErrors.general_term = 'Select the broad occupation field for matching.'
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
      if (form.required_skills.length > 15) nextErrors.required_skills = 'Select up to 15 required hard skills.'
      if (form.soft_skills.length > 10) nextErrors.soft_skills = 'Select up to 10 preferred soft skills.'
    }

    if (targetStep === 4) {
      if (!form.preferred_gender) nextErrors.preferred_gender = 'Select preferred gender.'
      if (form.minimum_age !== '' && (Number(form.minimum_age) < 18 || Number(form.minimum_age) > 100)) {
        nextErrors.minimum_age = 'Minimum age must be from 18 to 100.'
      }
      if (form.maximum_age !== '' && (Number(form.maximum_age) < 18 || Number(form.maximum_age) > 100)) {
        nextErrors.maximum_age = 'Maximum age must be from 18 to 100.'
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

  const openPreview = () => {
    if (!validate(5)) return
    setShowPreview(true)
  }

  const submit = async () => {
    if (!validate(5)) return

    setSaving(true)
    setServerError('')

    try {
      await employerService.createVacancy(buildPayload(form))
      published.current = true
      clearDraft(draftKey)
      navigate('/employer/vacancies')
    } catch (error) {
      const responseErrors = error.response?.data?.errors ?? {}
      setErrors(Object.fromEntries(Object.entries(responseErrors).map(([key, messages]) => [key, messages?.[0] ?? 'Invalid value.'])))
      setServerError(error.response?.data?.message ?? 'Unable to publish the job vacancy.')
      setShowPreview(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-[1100px] space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[32px] sm:leading-10">Post a job</h1>
            <p className="mt-1 max-w-[70ch] text-[15px] leading-6 text-slate-600">
              Five short steps. The occupation, location and skills you pick decide which job seekers see this vacancy first, and you preview it before it goes live.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/employer/vacancies')}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-900 hover:text-brand-navy"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </header>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold text-brand-navy">Step {step} of {steps.length}: {currentStep.title}</p>
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
                          ? 'border-blue-900 bg-brand-navy text-white shadow-sm'
                          : complete
                            ? 'border-[#c4d9f7] bg-[#e8f0fc] text-brand-navy'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                      aria-current={active ? 'step' : undefined}
                    >
                      {complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      <span className="mt-1 hidden text-[10px] font-bold sm:block">{item.shortTitle}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-navy transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {notice && (
            <div className="mx-5 mt-5 flex flex-col gap-3 rounded-xl border border-[#c4d9f7] bg-[#e8f0fc] px-4 py-3 text-sm text-brand-navy sm:mx-7 sm:flex-row sm:items-center sm:justify-between" role="status">
              <p className="flex items-start gap-2">
                {createElement(notice.kind === 'draft' ? History : Copy, { className: 'mt-0.5 h-4 w-4 shrink-0', 'aria-hidden': true })}
                <span>
                  {notice.kind === 'draft' && <>Picked up where you left off. This draft was last saved {formatTime(notice.savedAt)}.</>}
                  {notice.kind === 'copy' && <>Copied from &ldquo;{notice.title}&rdquo;. Check each step and set a new application deadline before publishing.</>}
                  {notice.kind === 'copyFailed' && <>That vacancy couldn&apos;t be copied. You can still fill in the post from scratch.</>}
                </span>
              </p>
              {notice.kind !== 'copyFailed' && (
                <button type="button" onClick={startOver} className="shrink-0 self-start rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-navy underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:self-auto">
                  Start over
                </button>
              )}
            </div>
          )}

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
              />
            )}
            {step === 3 && <QualificationsStep form={form} errors={errors} update={update} />}
            {step === 4 && <DemographicPreferencesStep form={form} errors={errors} change={change} />}
            {step === 5 && <CompensationDetailsStep form={form} errors={errors} change={change} update={update} />}
          </div>

          <footer className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4  sm:px-7">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-900 hover:text-brand-navy disabled:pointer-events-none disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {draftSavedAt && (
              <p className="hidden flex-1 text-center text-xs text-slate-500 sm:block" aria-live="polite">
                Draft saved on this device, {formatTime(draftSavedAt)}
              </p>
            )}

            {step < steps.length ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-navy px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0f2d56]"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={openPreview}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-navy px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0f2d56] disabled:pointer-events-none disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                Review &amp; Publish
              </button>
            )}
          </footer>
        </section>

        <Dialog open={showPreview} onOpenChange={(open) => !open && setShowPreview(false)}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review before publishing</DialogTitle>
              <DialogDescription>Confirm the posting details. Publishing makes this vacancy visible to job seekers and available for matching.</DialogDescription>
            </DialogHeader>
            <PreviewBody form={form} />
            <MatchEstimate generalTerm={form.general_term} city={form.city_municipality} />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowPreview(false)}>Keep editing</Button>
              <Button variant="success" icon={CheckCircle2} onClick={submit} disabled={saving}>
                {saving ? 'Publishing…' : 'Confirm & publish'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        <div className="md:col-span-2">
          <SmartSuggestionInput
            label="Job Title"
            name="job_title"
            value={form.job_title}
            onChange={change}
            placeholder="e.g. Accounting Staff"
            maxLength={255}
            error={errors.job_title}
            options={jobTitleSuggestions}
            helper="Use standardized role titles first, then map the exact occupation in the next step."
            required
          />
        </div>

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

function AlgorithmAnchorsStep({ form, errors, update, setLocation }) {
  const setOccupationMapping = (mapping) => {
    update('occupation_mapping', mapping)
    update('occupation_id', null)
    update('occupation', null)
    update('psoc_code', mapping?.psocCode ?? '')
    update('general_term', mapping?.anchorCode || mapping?.broadFieldKey || '')
    update('broad_field_key', mapping?.broadFieldKey ?? '')
    update('anchor_code', mapping?.anchorCode ?? '')
  }

  return (
    <StepShell
      icon={Target}
      title="Algorithm Anchors"
      description="Standard occupation and PSGC location data become the strongest anchors for matching, referrals, and analytics."
    >
      <div className="space-y-6">
        <div>
          <AIOccupationMapper
            mode="employer"
            value={form.occupation_mapping}
            defaultInputText={form.job_title}
            onChange={setOccupationMapping}
            placeholder="e.g. Accounting Staff, Cashier, React Developer, Auto Mechanic"
          />
          {errors.general_term && <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.general_term}</p>}
          <MatchEstimate generalTerm={form.general_term} city={form.city_municipality} className="mt-3" />
        </div>

        <div>
          <AddressPicker
            title="Job Location / PSGC"
            province={form.province}
            provinceCode={form.province_code}
            city={form.city_municipality}
            cityCode={form.city_code}
            barangay={form.barangay}
            barangayCode={form.barangay_code}
            street={form.specific_address}
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={(location) => {
              setLocation({
                province: location.province,
                province_code: location.province_code,
                city: location.city,
                city_code: location.city_code,
                barangay: location.barangay,
                barangay_code: location.barangay_code,
              })
              update('specific_address', location.street)
              update('latitude', location.latitude)
              update('longitude', location.longitude)
              update('location_accuracy', location.location_accuracy)
              update('google_place_id', location.google_place_id)
            }}
          />
          {(errors.province || errors.city_municipality || errors.barangay) && (
            <p className="mt-1.5 text-xs font-semibold text-red-600">
              {errors.province || errors.city_municipality || errors.barangay}
            </p>
          )}
          <div className="mt-3 rounded-lg border border-[#c4d9f7] bg-[#e8f0fc] p-3 text-sm text-brand-navy">
            <strong>Privacy Notice:</strong> This work location will appear to job seekers as the job site and will be used for nearby job matching.
          </div>
        </div>
      </div>
    </StepShell>
  )
}

function QualificationsStep({ form, errors, update }) {
  const [aiSkills, setAiSkills] = useState({ technical: [], soft: [] })
  const jobTitle = form.job_title.trim()
  const vacancyAnchor = form.occupation_mapping?.broadField || form.occupation_mapping?.fieldName || null

  useEffect(() => {
    if (!jobTitle) {
      setAiSkills({ technical: [], soft: [] })
      return
    }

    let cancelled = false

    employerService
      .suggestJobPosting({
        job_title: jobTitle,
        vacancy_anchor: vacancyAnchor,
        existing_technical_skills: form.required_skills,
        existing_soft_skills: form.soft_skills,
      })
      .then(({ data }) => {
        if (cancelled) return
        setAiSkills({ technical: data?.suggested_technical_skills ?? [], soft: data?.suggested_soft_skills ?? [] })
      })
      .catch((err) => {
        if (cancelled) return
        // The AI draft can fail (unconfigured/unavailable) while the
        // backend still resolved this job title against the same skill
        // catalog job seekers see — those ride along on the error response
        // under catalog_skills so this step isn't stuck with nothing
        // connected to the job title just because the LLM call failed.
        const fallback = err.response?.data?.catalog_skills
        setAiSkills({ technical: fallback?.technical ?? [], soft: fallback?.soft ?? [] })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobTitle, vacancyAnchor])

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

      <p className="mt-6 text-sm font-bold text-slate-700">Skills for {form.job_title || 'this role'}</p>

      <div className="mt-3 grid gap-5 lg:grid-cols-2">
        <SkillTaxonomyTags
          label="Required Hard Skills"
          required
          mode="employer"
          category="technical"
          output="names"
          value={form.required_skills}
          onChange={(values) => update('required_skills', values)}
          placeholder="Type a required hard skill"
          error={errors.required_skills}
          limit={15}
          contextualSuggestions={aiSkills.technical}
        />

        <SkillTaxonomyTags
          label="Preferred Soft Skills"
          mode="employer"
          category="soft"
          output="names"
          value={form.soft_skills}
          onChange={(values) => update('soft_skills', values)}
          placeholder="Type a preferred soft skill"
          error={errors.soft_skills}
          limit={10}
          contextualSuggestions={aiSkills.soft}
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
            min="18"
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
            min={form.minimum_age || '18'}
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

function CompensationDetailsStep({ form, errors, change, update }) {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const runAiAssist = async () => {
    if (!form.job_title.trim()) {
      setAiError('Add a job title in step 1 before drafting with AI.')
      return
    }

    setAiLoading(true)
    setAiError('')
    try {
      const { data } = await employerService.suggestJobPosting({
        job_title: form.job_title,
        vacancy_anchor: form.occupation_mapping?.broadField || form.occupation_mapping?.fieldName || null,
        additional_context: null,
        existing_technical_skills: form.required_skills,
        existing_soft_skills: form.soft_skills,
        preferred_gender: form.preferred_gender || null,
        minimum_age: form.minimum_age === '' ? null : Number(form.minimum_age),
        maximum_age: form.maximum_age === '' ? null : Number(form.maximum_age),
      })

      const responsibilities = (data?.responsibilities ?? []).map((item) => `- ${item}`).join('\n')
      update('job_description', [data?.job_summary, responsibilities && `Key responsibilities:\n${responsibilities}`].filter(Boolean).join('\n\n'))
    } catch (err) {
      setAiError(err.response?.data?.message ?? 'AI could not draft a job posting right now. You can still write it manually below.')
    } finally {
      setAiLoading(false)
    }
  }

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
          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-navy focus:ring-blue-900/20"
        />
        <span>
          <span className="block text-sm font-bold text-slate-900">Hide exact salary from public posting</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">Applicants will see a public salary privacy label while PESO keeps the structured posting data.</span>
        </span>
      </label>

      <div className="mt-6">
        <Field label="Draft clear duties for applicants and for better skill matching." required error={errors.job_description}>
          <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={runAiAssist}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8f0fc] px-3 py-2 text-xs font-bold text-brand-navy ring-1 ring-[#c4d9f7] transition hover:bg-[#e8f0fc] focus:outline-none focus:ring-2 focus:ring-[#2563b8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {aiLoading ? 'Drafting…' : 'Smart Draft Responsibilities'}
            </button>
          </div>
          {aiError && <p className="mb-2 text-xs font-semibold text-red-600">{aiError}</p>}
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
        <div className="rounded-xl border border-[#c4d9f7] bg-[#e8f0fc] px-4 py-3 text-sm leading-6 text-brand-navy">
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
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fc] text-brand-navy">
          {createElement(icon, { className: 'h-5 w-5' })}
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
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

/**
 * Rough reach of the post while it's being written: seekers with a finished
 * profile who prefer the same occupation field (and how many live in the
 * job's city). The real match score is computed when the post goes live.
 */
function MatchEstimate({ generalTerm, city, className = '' }) {
  const estimate = useQuery({
    queryKey: ['employerMatchEstimate', generalTerm, city || ''],
    queryFn: () => employerService.getMatchEstimate({ generalTerm, city }),
    enabled: Boolean(generalTerm),
    staleTime: 5 * 60_000,
    retry: false,
  })

  if (!generalTerm || estimate.isError) return null

  const data = estimate.data
  return (
    <div className={`flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 ${className}`} aria-live="polite">
      <span className="mt-0.5 rounded-lg bg-[#e8f0fc] p-1.5 text-brand-navy">
        <UsersRound className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="text-sm">
        {estimate.isLoading && <p className="text-slate-500">Counting job seekers in this field…</p>}
        {data && data.same_field > 0 && (
          <p className="font-semibold text-slate-800">
            {data.same_field.toLocaleString()} likely {data.same_field === 1 ? 'match' : 'matches'}
            {data.same_field_nearby !== null && city ? `, ${data.same_field_nearby.toLocaleString()} in ${city}` : ''}
          </p>
        )}
        {data && data.same_field === 0 && <p className="font-semibold text-slate-800">No likely matches yet</p>}
        {data && (
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {data.same_field > 0
              ? 'Job seekers with a finished profile who prefer this occupation field. Anyone who scores 80% or more against the full post is notified when you publish.'
              : 'No job seeker with a finished profile has chosen this field yet. Your post still shows to anyone who searches for it.'}
          </p>
        )}
      </div>
    </div>
  )
}

function PreviewBody({ form }) {
  const location = [form.barangay, form.city_municipality, form.province].filter(Boolean).join(', ')
  const salary = form.hide_salary
    ? 'Hidden from public posting'
    : form.salary_min
      ? `₱${Number(form.salary_min).toLocaleString()}${form.salary_max ? ` – ₱${Number(form.salary_max).toLocaleString()}` : ''} / month`
      : '—'
  const ageRange = form.minimum_age || form.maximum_age
    ? `${form.minimum_age || '—'} to ${form.maximum_age || '—'}`
    : 'No age preference'
  const description = form.job_description || '—'

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
      <PreviewRow label="Position" value={`${form.job_title || '—'}, ${form.vacancies_count} opening${Number(form.vacancies_count) === 1 ? '' : 's'}`} />
      <PreviewRow label="Employment" value={`${form.employment_type}, ${form.work_setup}`} />
      <PreviewRow label="Location" value={location || '—'} full />
      {form.specific_address && <PreviewRow label="Specific address" value={form.specific_address} full />}
      <PreviewRow label="Minimum education" value={form.minimum_education || '—'} />
      <PreviewRow label="Experience" value={yearsToExperienceLevel(form.required_years_experience)} />
      <PreviewRow label="Required hard skills" value={form.required_skills.length ? form.required_skills.join(', ') : '—'} full />
      <PreviewRow label="Preferred soft skills" value={form.soft_skills.length ? form.soft_skills.join(', ') : '—'} full />
      <PreviewRow label="Preferred gender" value={form.preferred_gender} />
      <PreviewRow label="Age range" value={ageRange} />
      <PreviewRow label="Salary" value={salary} />
      <PreviewRow label="Application deadline" value={form.application_deadline || '—'} />
      <PreviewRow label="Description" value={description} full />
    </dl>
  )
}

function PreviewRow({ label, value, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-semibold text-slate-400">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  )
}

function regionFromProvinceCode(provinceCode) {
  return regionByProvincePrefix[String(provinceCode ?? '').slice(0, 2)] ?? ''
}

function yearsToExperienceLevel(yearsValue) {
  const years = Number(yearsValue || 0)
  if (years <= 0) return 'No Experience Required'
  if (years === 1) return '1 Year'
  return `${years} Years`
}

/** A saved vacancy as a fresh, unpublished form: same role, new deadline. */
function formFromVacancy(vacancy) {
  const mapping = mappingFromVacancy(vacancy)
  const text = (value) => value ?? ''
  return {
    ...initialForm,
    job_title: text(vacancy.job_title),
    vacancies_count: vacancy.vacancies_count ?? 1,
    employment_type: vacancy.employment_type || initialForm.employment_type,
    work_setup: vacancy.work_setup || initialForm.work_setup,
    occupation_id: vacancy.occupation_id ?? null,
    occupation_mapping: mapping,
    general_term: mapping?.anchorCode || text(vacancy.general_term),
    broad_field_key: mapping?.broadFieldKey ?? '',
    anchor_code: mapping?.anchorCode ?? '',
    psoc_code: mapping?.psocCode ?? '',
    region: text(vacancy.region),
    province: text(vacancy.province),
    province_code: text(vacancy.province_code),
    city_municipality: text(vacancy.city_municipality),
    city_code: text(vacancy.city_code),
    barangay: text(vacancy.barangay),
    barangay_code: text(vacancy.barangay_code),
    specific_address: text(vacancy.specific_address),
    latitude: vacancy.latitude ?? null,
    longitude: vacancy.longitude ?? null,
    google_place_id: vacancy.google_place_id ?? null,
    minimum_education_rank: educationBackendValueToRank(vacancy.minimum_education) || initialForm.minimum_education_rank,
    minimum_education: vacancy.minimum_education || initialForm.minimum_education,
    required_years_experience: Math.round((vacancy.minimum_experience_months ?? 0) / 12),
    required_skills: Array.isArray(vacancy.required_skills) ? vacancy.required_skills : [],
    soft_skills: Array.isArray(vacancy.soft_skills) ? vacancy.soft_skills : [],
    preferred_gender: vacancy.preferred_gender || 'Any',
    minimum_age: vacancy.minimum_age ?? '',
    maximum_age: vacancy.maximum_age ?? '',
    salary_min: vacancy.salary_min == null ? '' : Number(vacancy.salary_min),
    salary_max: vacancy.salary_max == null ? '' : Number(vacancy.salary_max),
    hide_salary: Boolean(vacancy.hide_salary),
    job_description: text(vacancy.job_description),
    application_deadline: '',
  }
}

function buildPayload(form) {
  return {
    occupation_id: form.occupation_id || null,
    general_term: form.general_term || form.anchor_code || form.broad_field_key || null,
    broad_field_key: form.broad_field_key || null,
    anchor_code: form.anchor_code || form.general_term || null,
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
    minimum_experience_months: Number(form.required_years_experience || 0) * 12,
    required_skills: form.required_skills,
    soft_skills: form.soft_skills,
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
