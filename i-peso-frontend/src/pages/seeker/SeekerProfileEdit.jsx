import { createElement, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  GraduationCap,
  Languages,
  Loader2,
  MapPin,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
} from 'lucide-react'
import SeekerSkillsForm from '@/components/form/SeekerSkillsForm'
import ExperienceTimeFrame from '@/components/form/ExperienceTimeFrame'
import PsgcCascade from '@/pages/employer/components/PsgcCascade'
import CertificateUploadModal from './components/CertificateUploadModal'
import {
  getSeekerProfile,
  saveSeekerProfileStep,
} from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'
const selectClass = inputClass
const labelClass = 'block text-xs font-black uppercase tracking-wide text-slate-500'
const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'

const SECTION_TABS = [
  { id: 'identity', label: 'Identity & Address', icon: UserCheck },
  { id: 'employment', label: 'Employment Status', icon: ShieldCheck },
  { id: 'preferences', label: 'Job Preferences', icon: Sparkles },
  { id: 'education', label: 'Education & Skills', icon: GraduationCap },
  { id: 'training', label: 'Trainings & Certificates', icon: Award },
  { id: 'languages', label: 'Languages', icon: Languages },
  { id: 'work', label: 'Work Experience', icon: BriefcaseBusiness },
]

const RELIGION_OPTIONS = [
  { value: 'roman_catholic', label: 'Roman Catholic' },
  { value: 'islam', label: 'Islam' },
  { value: 'iglesia_ni_cristo', label: 'Iglesia ni Cristo' },
  { value: 'aglipayan', label: 'Aglipayan' },
  { value: 'evangelical', label: 'Evangelical / Born Again' },
  { value: 'seventh_day_adventist', label: 'Seventh-day Adventist' },
  { value: 'jehovah_witness', label: "Jehovah's Witness" },
  { value: 'buddhist', label: 'Buddhist' },
  { value: 'hindu', label: 'Hindu' },
  { value: 'jewish', label: 'Jewish' },
  { value: 'agnostic_atheist', label: 'Agnostic / Atheist' },
  { value: 'declined', label: 'Declined to answer' },
  { value: 'other', label: 'Other' },
]

const EDUCATION_LEVELS = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'secondary_non_k12', label: 'High School / Non-K-12' },
  { value: 'secondary_k12', label: 'Junior High School / K-12' },
  { value: 'senior_high_strand', label: 'Senior High School' },
  { value: 'vocational', label: 'Vocational / Technical' },
  { value: 'tertiary', label: 'College / Tertiary' },
  { value: 'graduate_studies', label: 'Graduate Studies' },
]

const EDUC_ATTAINMENT_OPTIONS = [
  'Elementary Graduate',
  'High School Graduate',
  'Senior High School Graduate',
  'Vocational / Technical',
  'College Undergraduate',
  'College Graduate',
  "Master's Degree",
  'Doctorate',
]

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contractual', label: 'Contractual' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'project_based', label: 'Project-based' },
  { value: 'casual', label: 'Casual' },
  { value: 'probationary', label: 'Probationary' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'internship', label: 'Internship' },
  { value: 'ojt', label: 'OJT / On-the-Job Training' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'self_employed', label: 'Self-Employed' },
]

const LANGUAGE_OPTIONS = [
  'english',
  'filipino',
  'ilocano',
  'pangasinan',
  'cebuano',
  'hiligaynon',
  'bikol',
  'waray',
  'kapampangan',
  'mandarin',
  'japanese',
  'korean',
  'arabic',
  'others',
]

const DISABILITY_OPTIONS = [
  { value: 'none', label: 'No Disability' },
  { value: 'visual', label: 'Visual' },
  { value: 'hearing', label: 'Hearing' },
  { value: 'speech', label: 'Speech' },
  { value: 'mental', label: 'Mental' },
  { value: 'physical', label: 'Physical' },
  { value: 'others', label: 'Others' },
]

const TRAINING_COURSE_OPTIONS = [
  'Automotive Servicing NC II',
  'Barista NC II',
  'Bookkeeping NC III',
  'Bread and Pastry Production NC II',
  'Caregiving NC II',
  'Computer Systems Servicing NC II',
  'Contact Center Services NC II',
  'Cookery NC II',
  'Driving NC II',
  'Electrical Installation and Maintenance NC II',
  'Food and Beverage Services NC II',
  'Housekeeping NC II',
  'Shielded Metal Arc Welding NC II',
  'Visual Graphic Design NC III',
]

const CERTIFICATE_OPTIONS = [
  'Certificate of Attendance',
  'Certificate of Completion',
  'Certificate of Competency',
  'National Certificate I',
  'National Certificate II',
  'National Certificate III',
  'National Certificate IV',
]

export default function SeekerProfileEdit() {
  const navigate = useNavigate()
  const updateUser = useAuthStore((state) => state.updateUser)
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [errors, setErrors] = useState({})
  const [uploadOpen, setUploadOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(() => sectionFromHash())

  useEffect(() => {
    let active = true
    getSeekerProfile()
      .then((result) => {
        if (!active) return
        setProfile(result)
        setForm(buildProfileEditForm(result))
        updateUser({ name: fullName(result) })
      })
      .catch((error) => toast.error(error.response?.data?.message ?? 'Unable to load your profile.'))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [updateUser])

  const completionItems = useMemo(() => {
    if (!form) return []

    return [
      { label: 'Identity', done: Boolean(form.identity.first_name && form.identity.last_name && form.identity.date_of_birth) },
      { label: 'Address', done: Boolean(form.identity.address_province && form.identity.address_municipality_city && form.identity.address_barangay) },
      { label: 'Job preferences', done: Boolean(form.preferences.work_type_preference && form.preferences.preferred_locations_text) },
      { label: 'Education', done: form.education.educations.length > 0 },
      { label: 'Skills', done: form.education.skills.length > 0 },
      { label: 'Training/certificates', done: form.training.trainings.length > 0 || profile?.certificates?.length > 0 },
      { label: 'Work history', done: form.work.work_experiences.length > 0 },
    ]
  }, [form, profile?.certificates?.length])

  const setSection = (section) => {
    setActiveSection(section)
    window.history.replaceState(null, '', `#${section}`)
  }

  const updateSection = (section, patch) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        ...patch,
      },
    }))
    setErrors({})
  }

  const updateListItem = (section, key, index, patch) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: current[section][key].map((item, itemIndex) => (
          itemIndex === index ? { ...item, ...patch } : item
        )),
      },
    }))
    setErrors({})
  }

  const addListItem = (section, key, item) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: [...current[section][key], item],
      },
    }))
  }

  const removeListItem = (section, key, index) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: current[section][key].filter((_, itemIndex) => itemIndex !== index),
      },
    }))
  }

  const save = async (section, step, payloadBuilder) => {
    setSaving(section)
    setErrors({})
    try {
      await saveSeekerProfileStep(step, payloadBuilder())
      const refreshed = await getSeekerProfile()
      setProfile(refreshed)
      setForm(buildProfileEditForm(refreshed))
      updateUser({ name: fullName(refreshed), profile_completed: refreshed.profile_completed })
      toast.success('Profile section updated.')
    } catch (error) {
      const nextErrors = error.response?.data?.errors ?? {}
      setErrors(flattenErrors(nextErrors))
      toast.error(error.response?.data?.message ?? 'Unable to save this section.')
    } finally {
      setSaving(null)
    }
  }

  if (loading || !form) {
    return <div className="py-20 text-center text-sm text-slate-500">Loading profile editor...</div>
  }

  return (
    <div className="-mx-4 -mt-8 bg-slate-50 pb-12 sm:-mx-6">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => navigate('/seeker/profile')}
              className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900"
            >
              <ArrowLeft className="h-4 w-4" /> Back to profile
            </button>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Profile Maintenance</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">Update your NSRP profile data</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              This screen is for maintaining your completed profile. It saves directly to your NSRP profile records without restarting the first-time job seeker registration flow.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Profile readiness</p>
            <p className="mt-1 text-2xl font-black text-blue-800">{completionItems.filter((item) => item.done).length}/{completionItems.length}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <nav className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              {SECTION_TABS.map(({ id, label, icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    activeSection === id
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800'
                  }`}
                >
                  {createElement(icon, { className: 'h-4 w-4' })}
                  {label}
                </button>
              ))}
            </nav>

            <section className={cardClass}>
              <p className="text-sm font-black text-slate-900">Data quality checklist</p>
              <div className="mt-3 space-y-2">
                {completionItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                    <span className={item.done ? 'font-semibold text-slate-700' : 'text-slate-500'}>{item.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <main className="space-y-6">
            {activeSection === 'identity' && (
              <SectionCard
                icon={UserCheck}
                title="Identity & Present Address"
                subtitle="Keep core NSRP identity and location data clean for PESO verification and job matching."
                onSave={() => save('identity', 1, () => buildStep1Payload(form.identity))}
                saving={saving === 'identity'}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput label="First name" value={form.identity.first_name} error={errors.first_name} onChange={(value) => updateSection('identity', { first_name: value })} />
                  <TextInput label="Last name" value={form.identity.last_name} error={errors.last_name} onChange={(value) => updateSection('identity', { last_name: value })} />
                  <TextInput label="Middle name" value={form.identity.middle_name} onChange={(value) => updateSection('identity', { middle_name: value })} />
                  <SelectInput label="Suffix" value={form.identity.suffix} onChange={(value) => updateSection('identity', { suffix: value })} options={['', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V'].map((value) => ({ value, label: value || 'None' }))} />
                  <TextInput label="Date of birth" type="date" value={form.identity.date_of_birth} error={errors.date_of_birth} onChange={(value) => updateSection('identity', { date_of_birth: value })} />
                  <SelectInput label="Sex" value={form.identity.sex} error={errors.sex} onChange={(value) => updateSection('identity', { sex: value })} options={[{ value: '', label: 'Select sex' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
                  <SelectInput label="Civil status" value={form.identity.civil_status} error={errors.civil_status} onChange={(value) => updateSection('identity', { civil_status: value })} options={[
                    { value: '', label: 'Select status' },
                    { value: 'single', label: 'Single' },
                    { value: 'married', label: 'Married' },
                    { value: 'widowed', label: 'Widowed' },
                    { value: 'separated', label: 'Separated' },
                  ]} />
                  <SelectInput label="Religion" value={form.identity.religion} error={errors.religion} onChange={(value) => updateSection('identity', { religion: value })} options={[{ value: '', label: 'Select religion' }, ...RELIGION_OPTIONS]} />
                  {form.identity.religion === 'other' && (
                    <TextInput label="Specify religion" value={form.identity.religion_other} error={errors.religion_other} onChange={(value) => updateSection('identity', { religion_other: value })} />
                  )}
                  <TextInput label="Height in feet" type="number" step="0.01" value={form.identity.height_ft} error={errors.height_ft} onChange={(value) => updateSection('identity', { height_ft: value })} />
                  <TextInput label="TIN (optional)" value={form.identity.tin} onChange={(value) => updateSection('identity', { tin: value })} />
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-700" />
                    <p className="text-sm font-black text-slate-900">Present Address</p>
                  </div>
                  <PsgcCascade
                    province={form.identity.address_province}
                    provinceCode={form.identity.address_province_code}
                    city={form.identity.address_municipality_city}
                    cityCode={form.identity.address_city_code}
                    barangay={form.identity.address_barangay}
                    barangayCode={form.identity.address_barangay_code}
                    onChange={(location) => updateSection('identity', {
                      address_province: location.province,
                      address_province_code: location.province_code,
                      address_municipality_city: location.city,
                      address_city_code: location.city_code,
                      address_barangay: location.barangay,
                      address_barangay_code: location.barangay_code,
                    })}
                  />
                  <div className="mt-4">
                    <TextInput label="House no. / street / purok" value={form.identity.address_house_street} error={errors.address_house_street} onChange={(value) => updateSection('identity', { address_house_street: value })} />
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-black text-slate-900">Disability status</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {DISABILITY_OPTIONS.map((option) => {
                      const checked = form.identity.disabilities.includes(option.value)
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateSection('identity', { disabilities: toggleDisability(form.identity.disabilities, option.value) })}
                          className={`rounded-full border px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            checked ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {checked ? 'Checked ' : ''}{option.label}
                        </button>
                      )
                    })}
                  </div>
                  {form.identity.disabilities.includes('others') && (
                    <div className="mt-3">
                      <TextInput label="Disability specification" value={form.identity.disability_specification} error={errors.disability_specification} onChange={(value) => updateSection('identity', { disability_specification: value })} />
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {activeSection === 'employment' && (
              <SectionCard
                icon={ShieldCheck}
                title="Employment Status"
                subtitle="This preserves the government NSRP employment classification while keeping the UI simple."
                onSave={() => save('employment', 2, () => buildStep2Payload(form.employment))}
                saving={saving === 'employment'}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectInput label="Current status" value={form.employment.employment_status} error={errors.employment_status} onChange={(value) => updateSection('employment', { employment_status: value })} options={[
                    { value: '', label: 'Select status' },
                    { value: 'employed', label: 'Employed' },
                    { value: 'unemployed', label: 'Unemployed' },
                  ]} />
                  {form.employment.employment_status === 'employed' && (
                    <SelectInput label="Employment type" value={form.employment.employment_type} error={errors.employment_type} onChange={(value) => updateSection('employment', { employment_type: value })} options={[
                      { value: '', label: 'Select type' },
                      { value: 'wage_employed', label: 'Wage-employed' },
                      { value: 'self_employed', label: 'Self-employed' },
                    ]} />
                  )}
                  {form.employment.employment_type === 'self_employed' && (
                    <SelectInput label="Self-employed category" value={form.employment.self_employed_type} error={errors.self_employed_type} onChange={(value) => updateSection('employment', { self_employed_type: value })} options={[
                      { value: '', label: 'Select category' },
                      { value: 'vendor_retailer', label: 'Vendor / Retailer' },
                      { value: 'transport', label: 'Transport' },
                      { value: 'freelancer', label: 'Freelancer' },
                      { value: 'home_based_worker', label: 'Home-based worker' },
                      { value: 'others', label: 'Others' },
                    ]} />
                  )}
                  {form.employment.employment_status === 'unemployed' && (
                    <>
                      <TextInput label="Months unemployed" type="number" value={form.employment.unemployment_months} error={errors.unemployment_months} onChange={(value) => updateSection('employment', { unemployment_months: value })} />
                      <SelectInput label="Reason for unemployment" value={form.employment.unemployment_reason} error={errors.unemployment_reason} onChange={(value) => updateSection('employment', { unemployment_reason: value })} options={[
                        { value: '', label: 'Select reason' },
                        { value: 'fresh_graduate', label: 'Fresh graduate' },
                        { value: 'finished_contract', label: 'Finished contract' },
                        { value: 'resigned', label: 'Resigned' },
                        { value: 'retired', label: 'Retired' },
                        { value: 'terminated_local', label: 'Terminated local' },
                        { value: 'terminated_abroad', label: 'Terminated abroad' },
                        { value: 'terminated_calamity', label: 'Terminated due to calamity' },
                        { value: 'others', label: 'Others' },
                      ]} />
                    </>
                  )}
                  <ToggleInput label="Currently OFW" checked={form.employment.is_ofw} onChange={(checked) => updateSection('employment', { is_ofw: checked })} />
                  {form.employment.is_ofw && <TextInput label="OFW country" value={form.employment.ofw_country} error={errors.ofw_country} onChange={(value) => updateSection('employment', { ofw_country: value })} />}
                  <ToggleInput label="Former OFW" checked={form.employment.is_former_ofw} onChange={(checked) => updateSection('employment', { is_former_ofw: checked })} />
                  {form.employment.is_former_ofw && <TextInput label="Former OFW country" value={form.employment.former_ofw_country} error={errors.former_ofw_country} onChange={(value) => updateSection('employment', { former_ofw_country: value })} />}
                  {form.employment.is_former_ofw && <TextInput label="Return date" type="date" value={form.employment.former_ofw_return_date} error={errors.former_ofw_return_date} onChange={(value) => updateSection('employment', { former_ofw_return_date: value })} />}
                  <ToggleInput label="4Ps beneficiary" checked={form.employment.is_4ps_beneficiary} onChange={(checked) => updateSection('employment', { is_4ps_beneficiary: checked })} />
                  {form.employment.is_4ps_beneficiary && <TextInput label="4Ps household ID" value={form.employment.household_id_4ps} error={errors.household_id_4ps} onChange={(value) => updateSection('employment', { household_id_4ps: value })} />}
                </div>
              </SectionCard>
            )}

            {activeSection === 'preferences' && (
              <SectionCard
                icon={Sparkles}
                title="Job Preferences"
                subtitle="Update preferred roles and locations without going back to registration."
                onSave={() => save('preferences', 3, () => buildStep3Payload(form.preferences))}
                saving={saving === 'preferences'}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectInput label="Work type preference" value={form.preferences.work_type_preference} error={errors.work_type_preference} onChange={(value) => updateSection('preferences', { work_type_preference: value })} options={[
                    { value: '', label: 'Select work type' },
                    { value: 'full_time', label: 'Full-time' },
                    { value: 'part_time', label: 'Part-time' },
                  ]} />
                  <SelectInput label="Preferred work location" value={form.preferences.preferred_work_location} error={errors.preferred_work_location} onChange={(value) => updateSection('preferences', { preferred_work_location: value })} options={[
                    { value: '', label: 'Select location scope' },
                    { value: 'local', label: 'Local' },
                    { value: 'overseas', label: 'Overseas' },
                  ]} />
                </div>
                <div className="mt-4">
                  <TextArea label="Preferred locations, one per line" rows={3} value={form.preferences.preferred_locations_text} error={errors.preferred_locations_details} onChange={(value) => updateSection('preferences', { preferred_locations_text: value })} />
                </div>
                <div className="mt-5 space-y-3">
                  <ArrayHeader title="Preferred occupation titles" onAdd={() => addListItem('preferences', 'occupation_preferences', emptyOccupationPreference())} addLabel="Add title" />
                  {form.preferences.occupation_preferences.map((occupation, index) => (
                    <div key={occupation.local_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex gap-3">
                        <TextInput label={`Occupation ${index + 1}`} value={occupation.label} error={errors.occupation_preferences} onChange={(value) => updateListItem('preferences', 'occupation_preferences', index, {
                          label: value,
                          raw_job_title: value,
                          occupation_id: null,
                          general_term: null,
                          source: 'manual',
                        })} />
                        <button type="button" onClick={() => removeListItem('preferences', 'occupation_preferences', index)} className="mt-7 rounded-xl bg-red-50 px-3 text-red-600 hover:bg-red-100" aria-label="Remove occupation">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs leading-5 text-slate-500">Unknown job titles are allowed here. PESO/admin can standardize them later while your raw title remains saved.</p>
                </div>
              </SectionCard>
            )}

            {activeSection === 'education' && (
              <SectionCard
                icon={GraduationCap}
                title="Education & Skills"
                subtitle="These records power matching, profile strength, and the resume studio."
                onSave={() => save('education', 5, () => buildStep5Payload(form.education))}
                saving={saving === 'education'}
              >
                <div className="mb-5 grid gap-4 md:grid-cols-2">
                  <SelectInput label="Educational attainment" value={form.education.educ_attainment} onChange={(value) => updateSection('education', { educ_attainment: value })} options={[{ value: '', label: 'Auto infer from records' }, ...EDUC_ATTAINMENT_OPTIONS.map((value) => ({ value, label: value }))]} />
                  <ToggleInput label="Currently in school" checked={form.education.currently_in_school} onChange={(checked) => updateSection('education', { currently_in_school: checked })} />
                </div>
                <div className="space-y-3">
                  <ArrayHeader title="Education records" onAdd={() => addListItem('education', 'educations', emptyEducation())} addLabel="Add education" />
                  {form.education.educations.map((education, index) => (
                    <div key={education.local_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <SelectInput label="Level" value={education.level} onChange={(value) => updateListItem('education', 'educations', index, { level: value })} options={[{ value: '', label: 'Select level' }, ...EDUCATION_LEVELS]} />
                        <SelectInput label="Status" value={education.completion_status} onChange={(value) => updateListItem('education', 'educations', index, { completion_status: value })} options={[
                          { value: 'graduated', label: 'Graduated' },
                          { value: 'undergraduate', label: 'Undergraduate / Did not finish' },
                          { value: 'currently_studying', label: 'Currently studying' },
                        ]} />
                        <TextInput label="School / Institution" value={education.institution_name} onChange={(value) => updateListItem('education', 'educations', index, { institution_name: value })} />
                        <TextInput label="Course / Strand / Program" value={education.course_strand} onChange={(value) => updateListItem('education', 'educations', index, { course_strand: value })} />
                        <TextInput label="Year started" type="number" value={education.year_started} onChange={(value) => updateListItem('education', 'educations', index, { year_started: value })} />
                        {education.completion_status === 'graduated' && <TextInput label="Year graduated" type="number" value={education.year_graduated} onChange={(value) => updateListItem('education', 'educations', index, { year_graduated: value })} />}
                        {education.completion_status === 'undergraduate' && <TextInput label="Level reached" value={education.undergrad_level_reached} onChange={(value) => updateListItem('education', 'educations', index, { undergrad_level_reached: value })} />}
                        {education.completion_status === 'undergraduate' && <TextInput label="Year last attended" type="number" value={education.undergrad_year_last_attended} onChange={(value) => updateListItem('education', 'educations', index, { undergrad_year_last_attended: value })} />}
                        {education.completion_status === 'currently_studying' && <TextInput label="Current level" value={education.current_level} onChange={(value) => updateListItem('education', 'educations', index, { current_level: value })} />}
                        {education.completion_status === 'currently_studying' && <TextInput label="Expected graduation year" type="number" value={education.expected_year_graduated} onChange={(value) => updateListItem('education', 'educations', index, { expected_year_graduated: value })} />}
                      </div>
                      <button type="button" onClick={() => removeListItem('education', 'educations', index)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100">
                        <Trash2 className="h-4 w-4" /> Remove education
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <SeekerSkillsForm
                    value={form.education.skills}
                    preferredOccupations={form.preferences.occupation_preferences}
                    onChange={(skills) => updateSection('education', { skills })}
                    error={errors.technical_skills || errors.soft_skills}
                  />
                </div>
              </SectionCard>
            )}

            {activeSection === 'training' && (
              <SectionCard
                icon={Award}
                title="Trainings, Eligibility & E-Certificates"
                subtitle="Training records come from the NSRP registration inputs. Certificate files are optional proof attachments."
                onSave={() => save('training', 6, () => buildStep6Payload(form.training))}
                saving={saving === 'training'}
              >
                <div className="space-y-4">
                  <ArrayHeader title="Training records" onAdd={() => addListItem('training', 'trainings', emptyTraining())} addLabel="Add training" />
                  {form.training.trainings.map((training, index) => (
                    <div key={training.local_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <DatalistInput label="Course / Training" value={training.course} options={TRAINING_COURSE_OPTIONS} onChange={(value) => updateListItem('training', 'trainings', index, { course: value })} />
                        <TextInput label="Training institution" value={training.training_institution} onChange={(value) => updateListItem('training', 'trainings', index, { training_institution: value })} />
                        <TextInput label="Hours of training" type="number" value={training.hours_of_training} onChange={(value) => updateListItem('training', 'trainings', index, { hours_of_training: value })} />
                        <DatalistInput label="Certificate received" value={training.certificates_received} options={CERTIFICATE_OPTIONS} onChange={(value) => updateListItem('training', 'trainings', index, { certificates_received: value })} />
                        <div className="md:col-span-2">
                          <TextArea label="Skills acquired" rows={2} value={training.skills_acquired} onChange={(value) => updateListItem('training', 'trainings', index, { skills_acquired: value })} />
                        </div>
                      </div>
                      <button type="button" onClick={() => removeListItem('training', 'trainings', index)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100">
                        <Trash2 className="h-4 w-4" /> Remove training
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-4">
                  <ArrayHeader title="Licenses and eligibilities" onAdd={() => addListItem('training', 'eligibilities', emptyEligibility())} addLabel="Add eligibility" />
                  {form.training.eligibilities.map((eligibility, index) => (
                    <div key={eligibility.local_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <SelectInput label="Type" value={eligibility.type} onChange={(value) => updateListItem('training', 'eligibilities', index, { type: value })} options={[
                          { value: '', label: 'Select type' },
                          { value: 'civil_service', label: 'Civil Service' },
                          { value: 'professional_license', label: 'Professional License' },
                        ]} />
                        <TextInput label="Name" value={eligibility.name} onChange={(value) => updateListItem('training', 'eligibilities', index, { name: value })} />
                        <TextInput label="Date taken" type="date" value={eligibility.date_taken} onChange={(value) => updateListItem('training', 'eligibilities', index, { date_taken: value })} />
                        <TextInput label="Valid until" type="date" value={eligibility.valid_until} onChange={(value) => updateListItem('training', 'eligibilities', index, { valid_until: value })} />
                      </div>
                      <button type="button" onClick={() => removeListItem('training', 'eligibilities', index)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100">
                        <Trash2 className="h-4 w-4" /> Remove eligibility
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">Certificate proof files</p>
                      <p className="mt-1 text-sm text-slate-600">Upload scanned certificates only as supporting evidence. Training records above remain the main NSRP source.</p>
                    </div>
                    <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800">
                      <Plus className="h-4 w-4" /> Upload proof
                    </button>
                  </div>
                  {profile?.certificates?.length > 0 && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {profile.certificates.map((certificate) => (
                        <div key={certificate.certificate_id} className="rounded-xl border border-blue-100 bg-white p-3">
                          <p className="font-bold text-slate-900">{certificate.title}</p>
                          <p className="text-sm text-slate-500">{certificate.issuing_body || certificate.original_filename}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {activeSection === 'languages' && (
              <SectionCard
                icon={Languages}
                title="Languages & Dialects"
                subtitle="Record what the seeker can read, write, speak, or understand."
                onSave={() => save('languages', 4, () => buildStep4Payload(form.languages))}
                saving={saving === 'languages'}
              >
                <div className="space-y-3">
                  <ArrayHeader title="Language records" onAdd={() => addListItem('languages', 'languages', emptyLanguage())} addLabel="Add language" />
                  {form.languages.languages.map((language, index) => (
                    <div key={language.local_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
                        <SelectInput label="Language" value={language.language} onChange={(value) => updateListItem('languages', 'languages', index, { language: value })} options={[{ value: '', label: 'Select language' }, ...LANGUAGE_OPTIONS.map((value) => ({ value, label: titleCase(value) }))]} />
                        {language.language === 'others' ? <TextInput label="Other language" value={language.language_other} onChange={(value) => updateListItem('languages', 'languages', index, { language_other: value })} /> : <div />}
                        <button type="button" onClick={() => removeListItem('languages', 'languages', index)} className="rounded-xl bg-red-50 px-3 py-2.5 text-red-600 hover:bg-red-100" aria-label="Remove language">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {['can_read', 'can_write', 'can_speak', 'can_understand'].map((ability) => (
                          <label key={ability} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(language[ability])}
                              onChange={(event) => updateListItem('languages', 'languages', index, { [ability]: event.target.checked })}
                              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                            />
                            {ability.replace('can_', '').replace('understand', 'understand')}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {activeSection === 'work' && (
              <SectionCard
                icon={BriefcaseBusiness}
                title="Work Experience"
                subtitle="Maintain work history and resume-ready responsibilities in one place."
                onSave={() => save('work', 7, () => buildStep7Payload(form.work))}
                saving={saving === 'work'}
              >
                <div className="space-y-4">
                  <ArrayHeader title="Work experience records" onAdd={() => addListItem('work', 'work_experiences', emptyExperience())} addLabel="Add experience" />
                  {form.work.work_experiences.map((experience, index) => (
                    <div key={experience.local_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <TextInput label="Company" value={experience.company_name} onChange={(value) => updateListItem('work', 'work_experiences', index, { company_name: value })} />
                        <TextInput label="Position" value={experience.position} onChange={(value) => updateListItem('work', 'work_experiences', index, { position: value })} />
                        <TextInput label="Company address" value={experience.company_address} onChange={(value) => updateListItem('work', 'work_experiences', index, { company_address: value })} />
                        <SelectInput label="Employment status" value={experience.employment_status} onChange={(value) => updateListItem('work', 'work_experiences', index, { employment_status: value })} options={[{ value: '', label: 'Select status' }, ...EMPLOYMENT_STATUS_OPTIONS]} />
                        <div className="md:col-span-2">
                          <ExperienceTimeFrame
                            mode="seeker"
                            label="Experience dates"
                            value={experience}
                            onChange={(next) => updateListItem('work', 'work_experiences', index, next)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <TextArea label="Responsibilities / resume bullets" rows={4} value={experience.responsibilities} onChange={(value) => updateListItem('work', 'work_experiences', index, { responsibilities: value })} />
                        </div>
                      </div>
                      <button type="button" onClick={() => removeListItem('work', 'work_experiences', index)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100">
                        <Trash2 className="h-4 w-4" /> Remove experience
                      </button>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </main>
        </div>
      </div>

      <CertificateUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={({ certificate }) => {
          setProfile((current) => ({
            ...current,
            certificates: [certificate, ...(current?.certificates ?? [])],
          }))
          toast.success('Certificate proof uploaded.')
        }}
      />
    </div>
  )
}

function SectionCard({ icon, title, subtitle, children, onSave, saving }) {
  return (
    <section className={cardClass}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            {createElement(icon, { className: 'h-5 w-5' })}
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={Boolean(saving)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Section'}
        </button>
      </div>
      {children}
    </section>
  )
}

function TextInput({ label, value, onChange, type = 'text', error, ...props }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </label>
  )
}

function DatalistInput({ label, value, onChange, options }) {
  const listId = `list-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input value={value ?? ''} list={listId} onChange={(event) => onChange(event.target.value)} className={inputClass} />
      <datalist id={listId}>
        {options.map((option) => <option key={option} value={option} />)}
      </datalist>
    </label>
  )
}

function SelectInput({ label, value, onChange, options, error }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={`${selectClass} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}>
        {options.map((option) => <option key={`${label}-${option.value}`} value={option.value}>{option.label}</option>)}
      </select>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </label>
  )
}

function TextArea({ label, value, onChange, rows = 3, error }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <textarea value={value ?? ''} rows={rows} onChange={(event) => onChange(event.target.value)} className={`${inputClass} min-h-24 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`} />
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </label>
  )
}

function ToggleInput({ label, checked, onChange }) {
  return (
    <label className="mt-7 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700">
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700" />
      {label}
    </label>
  )
}

function ArrayHeader({ title, onAdd, addLabel }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <button type="button" onClick={onAdd} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100">
        <Plus className="h-4 w-4" /> {addLabel}
      </button>
    </div>
  )
}

function buildProfileEditForm(profile) {
  return {
    identity: buildIdentity(profile),
    employment: {
      employment_status: profile.employment_status ?? '',
      employment_type: profile.employment_type ?? '',
      self_employed_type: profile.self_employed_type ?? '',
      self_employed_type_others: profile.self_employed_type_others ?? '',
      unemployment_months: valueOrEmpty(profile.unemployment_months),
      unemployment_reason: profile.unemployment_reason ?? '',
      unemployment_reason_others: profile.unemployment_reason_others ?? '',
      unemployment_terminated_country: profile.unemployment_terminated_country ?? '',
      is_ofw: Boolean(profile.is_ofw),
      ofw_country: profile.ofw_country ?? '',
      is_former_ofw: Boolean(profile.is_former_ofw),
      former_ofw_country: profile.former_ofw_country ?? '',
      former_ofw_return_date: dateOnly(profile.former_ofw_return_date),
      is_4ps_beneficiary: Boolean(profile.is_4ps_beneficiary),
      household_id_4ps: profile.household_id_4ps ?? '',
    },
    preferences: {
      work_type_preference: profile.work_type_preference ?? '',
      preferred_work_location: profile.preferred_work_location ?? '',
      preferred_locations_text: (profile.preferred_locations_details ?? []).join('\n'),
      occupation_preferences: (profile.occupations ?? []).map(normalizeOccupationPreference),
    },
    education: {
      educ_attainment: profile.educ_attainment ?? '',
      currently_in_school: Boolean(profile.currently_in_school),
      educations: (profile.educations ?? []).map(normalizeEducation),
      skills: [
        ...(profile.dole_skills ?? []).map((name) => skillForForm(name, 'hard', true)),
        ...(profile.technical_skills ?? []).map((name) => skillForForm(name, 'hard', false)),
        ...(profile.soft_skills ?? []).map((name) => skillForForm(name, 'soft', false)),
      ],
    },
    training: {
      trainings: (profile.trainings ?? []).map(normalizeTraining),
      eligibilities: (profile.eligibilities ?? []).map(normalizeEligibility),
    },
    languages: {
      languages: (profile.languages ?? []).map(normalizeLanguage),
    },
    work: {
      work_experiences: (profile.work_experiences ?? []).map(normalizeExperience),
    },
  }
}

function buildIdentity(profile) {
  const validReligions = new Set(RELIGION_OPTIONS.map((option) => option.value))
  const religion = validReligions.has(profile.religion) ? profile.religion : (profile.religion ? 'other' : '')
  const disabilities = (profile.disabilities ?? []).map((item) => item.disability_type).filter(Boolean)

  return {
    first_name: profile.first_name ?? '',
    middle_name: profile.middle_name ?? '',
    last_name: profile.last_name ?? '',
    suffix: profile.suffix ?? '',
    date_of_birth: dateOnly(profile.date_of_birth),
    sex: profile.sex ?? '',
    civil_status: profile.civil_status ?? '',
    religion,
    religion_other: religion === 'other' ? profile.religion : '',
    height_ft: valueOrEmpty(profile.height_ft),
    tin: profile.tin ?? '',
    address_house_street: profile.address_house_street ?? '',
    address_barangay: profile.address_barangay ?? '',
    address_municipality_city: profile.address_municipality_city ?? '',
    address_province: profile.address_province ?? '',
    address_province_code: profile.address_province_code ?? '',
    address_city_code: profile.address_city_code ?? '',
    address_barangay_code: profile.address_barangay_code ?? '',
    latitude: profile.latitude ?? null,
    longitude: profile.longitude ?? null,
    location_accuracy: profile.location_accuracy ?? null,
    google_place_id: profile.google_place_id ?? null,
    disabilities: disabilities.length ? disabilities : ['none'],
    disability_specification: (profile.disabilities ?? []).find((item) => item.disability_specification)?.disability_specification ?? '',
  }
}

function buildStep1Payload(identity) {
  return {
    ...identity,
    religion_other: identity.religion === 'other' ? identity.religion_other : null,
    disabilities: identity.disabilities.length ? identity.disabilities : ['none'],
    disability_specification: identity.disabilities.includes('others') ? identity.disability_specification : null,
    height_ft: identity.height_ft === '' ? '' : Number(identity.height_ft),
  }
}

function buildStep2Payload(employment) {
  return {
    ...employment,
    unemployment_months: employment.unemployment_months === '' ? null : Number(employment.unemployment_months),
  }
}

function buildStep3Payload(preferences) {
  return {
    work_type_preference: preferences.work_type_preference,
    preferred_work_location: preferences.preferred_work_location,
    preferred_locations_details: splitLines(preferences.preferred_locations_text).slice(0, 3),
    occupation_preferences: preferences.occupation_preferences.slice(0, 3).map((occupation) => ({
      occupation_id: occupation.occupation_id || null,
      general_term: occupation.occupation_id ? null : (occupation.general_term || null),
      raw_job_title: occupation.occupation_id || occupation.general_term ? null : cleanText(occupation.raw_job_title || occupation.label),
      source: occupation.occupation_id || occupation.general_term ? null : (occupation.source || 'manual'),
    })),
  }
}

function buildStep4Payload(languageSection) {
  return {
    languages: languageSection.languages.map((language) => ({
      language: language.language,
      language_other: language.language === 'others' ? language.language_other : null,
      can_read: Boolean(language.can_read),
      can_write: Boolean(language.can_write),
      can_speak: Boolean(language.can_speak),
      can_understand: Boolean(language.can_understand),
    })),
  }
}

function buildStep5Payload(education) {
  const hardSkills = education.skills.filter((skill) => skill.type === 'hard')

  return {
    educ_attainment: education.educ_attainment || null,
    currently_in_school: Boolean(education.currently_in_school || education.educations.some((item) => item.completion_status === 'currently_studying')),
    educations: education.educations.map(cleanEducation),
    dole_skills: hardSkills.filter((skill) => skill.is_dole).map(serializeSkill),
    technical_skills: hardSkills.filter((skill) => !skill.is_dole).map(serializeSkill),
    soft_skills: education.skills.filter((skill) => skill.type === 'soft').map(serializeSkill),
  }
}

function buildStep6Payload(trainingSection) {
  return {
    trainings: trainingSection.trainings.map((training) => ({
      course: cleanText(training.course),
      hours_of_training: training.hours_of_training === '' ? null : Number(training.hours_of_training),
      training_institution: nullableText(training.training_institution),
      skills_acquired: nullableText(training.skills_acquired),
      certificates_received: nullableText(training.certificates_received),
    })),
    eligibilities: trainingSection.eligibilities.map((eligibility) => ({
      type: eligibility.type,
      name: cleanText(eligibility.name),
      date_taken: eligibility.date_taken || null,
      valid_until: eligibility.valid_until || null,
    })),
  }
}

function buildStep7Payload(work) {
  return {
    work_experiences: work.work_experiences.map((experience) => ({
      company_name: cleanText(experience.company_name),
      company_address: nullableText(experience.company_address),
      occupation_id: experience.occupation_id || null,
      position: cleanText(experience.position),
      start_date: experience.start_date || null,
      end_date: experience.currently_employed ? null : (experience.end_date || null),
      currently_employed: Boolean(experience.currently_employed),
      number_of_months: experience.number_of_months === '' ? null : Number(experience.number_of_months ?? 0),
      employment_status: experience.employment_status || null,
      responsibilities: nullableText(experience.responsibilities),
    })),
  }
}

function normalizeOccupationPreference(occupation, index) {
  return {
    local_id: stableLocalId('occupation', index),
    occupation_id: occupation.occupation_id ?? occupation.id ?? null,
    general_term: occupation.general_term ?? null,
    raw_job_title: occupation.raw_job_title ?? occupation.preferred_occupation ?? '',
    source: occupation.status === 'ai_generated' ? 'ai_generated' : 'manual',
    label: occupation.title ?? occupation.occupation_title ?? occupation.general_term ?? occupation.raw_job_title ?? '',
  }
}

function normalizeEducation(education, index) {
  return {
    local_id: stableLocalId('education', index),
    level: normalizeEducationLevel(education.level),
    institution_name: education.institution_name ?? '',
    course_strand: education.course_strand ?? '',
    completion_status: education.completion_status ?? (education.year_graduated ? 'graduated' : 'undergraduate'),
    year_started: valueOrEmpty(education.year_started),
    year_graduated: valueOrEmpty(education.year_graduated),
    expected_year_graduated: valueOrEmpty(education.expected_year_graduated),
    undergrad_level_reached: education.undergrad_level_reached ?? '',
    undergrad_year_last_attended: valueOrEmpty(education.undergrad_year_last_attended),
    current_level: education.current_level ?? '',
  }
}

function normalizeTraining(training, index) {
  return {
    local_id: stableLocalId('training', index),
    course: training.course ?? '',
    hours_of_training: valueOrEmpty(training.hours_of_training),
    training_institution: training.training_institution ?? '',
    skills_acquired: training.skills_acquired ?? '',
    certificates_received: training.certificates_received ?? '',
  }
}

function normalizeEligibility(eligibility, index) {
  return {
    local_id: stableLocalId('eligibility', index),
    type: eligibility.type ?? '',
    name: eligibility.name ?? '',
    date_taken: dateOnly(eligibility.date_taken),
    valid_until: dateOnly(eligibility.valid_until),
  }
}

function normalizeLanguage(language, index) {
  return {
    local_id: stableLocalId('language', index),
    language: language.language ?? '',
    language_other: language.language_other ?? '',
    can_read: Boolean(language.can_read),
    can_write: Boolean(language.can_write),
    can_speak: Boolean(language.can_speak),
    can_understand: Boolean(language.can_understand),
  }
}

function normalizeExperience(experience, index) {
  return {
    local_id: stableLocalId('experience', index),
    occupation_id: experience.occupation_id ?? null,
    company_name: experience.company_name ?? '',
    company_address: experience.company_address ?? '',
    position: experience.position ?? '',
    start_date: dateOnly(experience.start_date),
    end_date: dateOnly(experience.end_date),
    currently_employed: Boolean(experience.currently_employed),
    number_of_months: valueOrEmpty(experience.number_of_months),
    employment_status: experience.employment_status ?? '',
    responsibilities: experience.responsibilities ?? '',
  }
}

function emptyOccupationPreference() {
  return { local_id: cryptoId(), occupation_id: null, general_term: null, raw_job_title: '', source: 'manual', label: '' }
}

function emptyEducation() {
  return {
    local_id: cryptoId(),
    level: 'tertiary',
    institution_name: '',
    course_strand: '',
    completion_status: 'graduated',
    year_started: '',
    year_graduated: '',
    expected_year_graduated: '',
    undergrad_level_reached: '',
    undergrad_year_last_attended: '',
    current_level: '',
  }
}

function emptyTraining() {
  return { local_id: cryptoId(), course: '', hours_of_training: '', training_institution: '', skills_acquired: '', certificates_received: '' }
}

function emptyEligibility() {
  return { local_id: cryptoId(), type: '', name: '', date_taken: '', valid_until: '' }
}

function emptyLanguage() {
  return { local_id: cryptoId(), language: 'english', language_other: '', can_read: true, can_write: false, can_speak: true, can_understand: true }
}

function emptyExperience() {
  return { local_id: cryptoId(), occupation_id: null, company_name: '', company_address: '', position: '', start_date: '', end_date: '', currently_employed: false, number_of_months: 0, employment_status: '', responsibilities: '' }
}

function cleanEducation(education) {
  return {
    level: normalizeEducationLevel(education.level),
    institution_name: cleanText(education.institution_name),
    course_strand: nullableText(education.course_strand),
    completion_status: education.completion_status,
    year_started: numberOrNull(education.year_started),
    year_graduated: education.completion_status === 'graduated' ? numberOrNull(education.year_graduated) : null,
    expected_year_graduated: education.completion_status === 'currently_studying' ? numberOrNull(education.expected_year_graduated) : null,
    undergrad_level_reached: education.completion_status === 'undergraduate' ? nullableText(education.undergrad_level_reached) : null,
    undergrad_year_last_attended: education.completion_status === 'undergraduate' ? numberOrNull(education.undergrad_year_last_attended) : null,
    current_level: education.completion_status === 'currently_studying' ? nullableText(education.current_level) : null,
  }
}

function serializeSkill(skill) {
  return {
    skill_id: skill.skill_id ?? null,
    name: skill.name,
    source: skill.source ?? (skill.is_dole ? 'dole' : 'system'),
    is_official: Boolean(skill.is_official ?? skill.is_dole),
    is_recommended: Boolean(skill.is_recommended),
  }
}

function skillForForm(name, type, isDole) {
  return {
    name,
    type,
    is_dole: isDole,
    source: isDole ? 'dole' : 'system',
    is_official: true,
  }
}

function toggleDisability(current, value) {
  if (value === 'none') return ['none']
  const withoutNone = current.filter((item) => item !== 'none')
  return withoutNone.includes(value)
    ? withoutNone.filter((item) => item !== value)
    : [...withoutNone, value]
}

function normalizeEducationLevel(level) {
  if (level === 'senior_high') return 'senior_high_strand'
  if (level === 'graduate') return 'graduate_studies'
  return level ?? ''
}

function flattenErrors(errorBag) {
  return Object.fromEntries(
    Object.entries(errorBag).map(([key, value]) => [key, Array.isArray(value) ? value[0] : String(value)]),
  )
}

function fullName(profile) {
  return [profile.first_name, profile.middle_name, profile.last_name, profile.suffix].filter(Boolean).join(' ')
}

function splitLines(value) {
  return String(value ?? '').split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean)
}

function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function nullableText(value) {
  const cleaned = cleanText(value)
  return cleaned || null
}

function numberOrNull(value) {
  return value === '' || value === null || value === undefined ? null : Number(value)
}

function valueOrEmpty(value) {
  return value === null || value === undefined ? '' : String(value)
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : ''
}

function titleCase(value) {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function stableLocalId(prefix, index) {
  return `${prefix}-${index}-${Date.now()}`
}

function cryptoId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function sectionFromHash() {
  const section = window.location.hash.replace('#', '')
  return SECTION_TABS.some((item) => item.id === section) ? section : 'identity'
}
