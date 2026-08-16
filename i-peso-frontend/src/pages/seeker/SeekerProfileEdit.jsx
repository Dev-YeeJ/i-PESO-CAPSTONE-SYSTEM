import { createElement, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  FileUp,
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
import OccupationCombobox from '@/components/form/OccupationCombobox'
import PreferredLocationsField from '@/components/form/PreferredLocationsField'
import SearchableTextInput from '@/components/form/SearchableTextInput'
import SingleAddressInput from '@/components/form/SingleAddressInput'
import AddressPicker from '@/components/maps/AddressPicker'
import SeekerSkillsForm from '@/components/form/SeekerSkillsForm'
import EducationBackgroundEditor from '@/components/form/EducationBackgroundEditor'
import ExperienceTimeFrame from '@/components/form/ExperienceTimeFrame'
import CertificateUploadModal from './components/CertificateUploadModal'
import {
  deleteCertificate,
  getCertificateFile,
  getSeekerProfile,
  saveSeekerProfileStep,
} from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'
import { Button, LoadingSkeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { serializeOccupationPreferences } from '@/utils/seekerProfilePayloads'
import { ISO_COUNTRIES } from '@/data/jobPreferenceVocabularies'
import {
  COMPANY_SUGGESTIONS,
  ELIGIBILITY_NAME_OPTIONS,
  MONTH_DURATION_OPTIONS,
  TRAINING_COURSE_OPTIONS,
  TRAINING_HOUR_OPTIONS,
  TRAINING_INSTITUTION_OPTIONS,
} from '@/data/seekerProfileVocabularies'
import { resolveAddressSuggestion } from '@/services/geoService'

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'
const selectClass = inputClass
const labelClass = 'block text-xs font-black uppercase tracking-wide text-slate-500'
const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'

const SECTION_TABS = [
  { id: 'identity', label: 'Identity', icon: UserCheck },
  { id: 'address', label: 'Address & GPS', icon: MapPin },
  { id: 'employment', label: 'Employment Status', icon: ShieldCheck },
  { id: 'preferences', label: 'Job Preferences', icon: Sparkles },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'skills', label: 'Skills', icon: Sparkles },
  { id: 'training', label: 'Trainings', icon: Award },
  { id: 'certificates', label: 'Certificates', icon: FileUp },
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
  'maranao',
  'maguindanao',
  'tausug',
  'mandarin',
  'spanish',
  'japanese',
  'korean',
  'arabic',
  'french',
  'german',
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

export default function SeekerProfileEdit() {
  const navigate = useNavigate()
  const updateUser = useAuthStore((state) => state.updateUser)
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [errors, setErrors] = useState({})
  const [uploadOpen, setUploadOpen] = useState(false)
  const [openingCertificate, setOpeningCertificate] = useState(null)
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

  const save = async (section, step, payloadBuilder, validate = null) => {
    setErrors({})
    const payload = payloadBuilder()
    const clientErrors = validate?.(payload) ?? {}
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors)
      toast.error('Please correct the highlighted fields before saving.')
      return
    }

    setSaving(section)
    try {
      await saveSeekerProfileStep(step, payload)
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

  const viewCertificate = async (certificate) => {
    setOpeningCertificate(certificate.certificate_id)
    try {
      const file = await getCertificateFile(certificate.certificate_id)
      const url = URL.createObjectURL(file)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error) {
      toast.error(error.response?.data?.message ?? 'Unable to open certificate proof.')
    } finally {
      setOpeningCertificate(null)
    }
  }

  const [pendingDeleteCert, setPendingDeleteCert] = useState(null)

  const confirmDeleteCert = async () => {
    const certificate = pendingDeleteCert
    if (!certificate) return
    setPendingDeleteCert(null)

    try {
      await deleteCertificate(certificate.certificate_id)
      setProfile((current) => ({
        ...current,
        certificates: current.certificates.filter((item) => item.certificate_id !== certificate.certificate_id),
      }))
      toast.success('Certificate deleted.')
    } catch (error) {
      toast.error(error.response?.data?.message ?? 'Unable to delete certificate.')
    }
  }

  const resolveSelectedAddress = async (place) => {
    try {
      const result = await resolveAddressSuggestion(place)
      updateSection('identity', {
        address_province: result.province?.name ?? result.provinceName ?? form.identity.address_province,
        address_province_code: result.province?.code ?? '',
        address_municipality_city: result.city?.name ?? result.cityName ?? form.identity.address_municipality_city,
        address_city_code: result.city?.code ?? '',
        address_barangay: result.barangay?.name ?? result.barangayName ?? form.identity.address_barangay,
        address_barangay_code: result.barangay?.code ?? '',
        address_house_street: result.houseStreet ?? form.identity.address_house_street,
        latitude: result.lat,
        longitude: result.lng,
        location_accuracy: result.accuracy,
        google_place_id: result.placeId,
      })
      toast.success(result.isComplete ? 'Address selected and verified.' : 'Address selected. Complete any missing official fields below.')
    } catch {
      toast.error('The selected address could not be matched. Please complete the official fields below.')
    }
  }

  if (loading || !form) {
    return <div className="mx-auto max-w-5xl space-y-6 px-4 py-6"><LoadingSkeleton variant="text" rows={2} className="max-w-md" /><LoadingSkeleton variant="card" rows={4} /></div>
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50 pb-12">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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

        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
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

          </aside>

          <main className="min-w-0 space-y-5">
            {activeSection === 'identity' && (
              <SectionCard
                icon={UserCheck}
                title="Identity"
                subtitle="Keep core NSRP identity data consistent with job seeker onboarding."
                onSave={() => save('identity', 1, () => buildStep1Payload(form.identity), validateIdentity)}
                saving={saving === 'identity'}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput label="Surname" value={form.identity.last_name} error={errors.last_name} onChange={(value) => updateSection('identity', { last_name: value })} />
                  <TextInput label="First Name" value={form.identity.first_name} error={errors.first_name} onChange={(value) => updateSection('identity', { first_name: value })} />
                  <TextInput label="Middle Initial (optional)" value={form.identity.middle_name} error={errors.middle_name} onChange={(value) => updateSection('identity', { middle_name: value })} />
                  <SelectInput label="Suffix" value={form.identity.suffix} onChange={(value) => updateSection('identity', { suffix: value })} options={['', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V'].map((value) => ({ value, label: value || 'None' }))} />
                  <TextInput label="Date of Birth" type="date" max={minimumBirthDate()} value={form.identity.date_of_birth} error={errors.date_of_birth} onChange={(value) => updateSection('identity', { date_of_birth: value })} />
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
                  <TextInput label="TIN (optional)" value={form.identity.tin} onChange={(value) => {
                    const digits = String(value ?? '').replace(/\D/g, '').slice(0, 12)
                    const parts = []
                    for (let i = 0; i < digits.length; i += 3) parts.push(digits.slice(i, i + 3))
                    updateSection('identity', { tin: parts.join('-') })
                  }} />
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
                onSave={() => save('employment', 2, () => buildStep2Payload(form.employment), validateEmployment)}
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
                      { value: 'fisherman_fisherfolk', label: 'Fisherman / Fisherfolk' },
                      { value: 'vendor_retailer', label: 'Vendor / Retailer' },
                      { value: 'transport', label: 'Transport' },
                      { value: 'domestic_worker', label: 'Domestic Worker' },
                      { value: 'freelancer', label: 'Freelancer' },
                      { value: 'home_based_worker', label: 'Home-based worker' },
                      { value: 'artisan_craft_worker', label: 'Artisan / Craft Worker' },
                      { value: 'others', label: 'Others' },
                    ]} />
                  )}
                  {form.employment.self_employed_type === 'others' && (
                    <TextInput label="Specify self-employed category" value={form.employment.self_employed_type_others} error={errors.self_employed_type_others} onChange={(value) => updateSection('employment', { self_employed_type_others: value })} />
                  )}
                  {form.employment.employment_status === 'unemployed' && (
                    <>
                      <TextInput type="number" label="Months unemployed" value={form.employment.unemployment_months} error={errors.unemployment_months} onChange={(value) => updateSection('employment', { unemployment_months: value })} />
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
                      {form.employment.unemployment_reason === 'others' && (
                        <TextInput label="Specify unemployment reason" value={form.employment.unemployment_reason_others} error={errors.unemployment_reason_others} onChange={(value) => updateSection('employment', { unemployment_reason_others: value })} />
                      )}
                      {form.employment.unemployment_reason === 'terminated_abroad' && (
                        <SearchableTextInput label="Country where employment ended" value={form.employment.unemployment_terminated_country} options={ISO_COUNTRIES.map((country) => country.name)} error={errors.unemployment_terminated_country} placeholder="Type or select a country" onChange={(value) => updateSection('employment', { unemployment_terminated_country: value })} />
                      )}
                    </>
                  )}
                  <ToggleInput label="Currently OFW" checked={form.employment.is_ofw} onChange={(checked) => updateSection('employment', { is_ofw: checked })} />
                  {form.employment.is_ofw && <SearchableTextInput label="OFW country" value={form.employment.ofw_country} options={ISO_COUNTRIES.map((country) => country.name)} error={errors.ofw_country} placeholder="Type or select a country" onChange={(value) => updateSection('employment', { ofw_country: value })} />}
                  <ToggleInput label="Former OFW" checked={form.employment.is_former_ofw} onChange={(checked) => updateSection('employment', { is_former_ofw: checked })} />
                  {form.employment.is_former_ofw && <SearchableTextInput label="Former OFW country" value={form.employment.former_ofw_country} options={ISO_COUNTRIES.map((country) => country.name)} error={errors.former_ofw_country} placeholder="Type or select a country" onChange={(value) => updateSection('employment', { former_ofw_country: value })} />}
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
                onSave={() => save('preferences', 3, () => buildStep3Payload(form.preferences), validatePreferences)}
                saving={saving === 'preferences'}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectInput label="Work type preference" value={form.preferences.work_type_preference} error={errors.work_type_preference} onChange={(value) => updateSection('preferences', { work_type_preference: value })} options={[
                    { value: '', label: 'Select work type' },
                    { value: 'full_time', label: 'Full-time' },
                    { value: 'part_time', label: 'Part-time' },
                  ]} />
                  <SelectInput label="Preferred work location" value={form.preferences.preferred_work_location} error={errors.preferred_work_location} onChange={(value) => updateSection('preferences', { preferred_work_location: value, preferred_locations_text: '' })} options={[
                    { value: '', label: 'Select location scope' },
                    { value: 'local', label: 'Local' },
                    { value: 'overseas', label: 'Overseas' },
                  ]} />
                </div>
                <div className="mt-4">
                  <PreferredLocationsField
                    scope={form.preferences.preferred_work_location}
                    value={splitLines(form.preferences.preferred_locations_text)}
                    error={errors.preferred_locations_details}
                    onChange={(locations) => updateSection('preferences', { preferred_locations_text: locations.join('\n') })}
                  />
                </div>
                <div className="mt-5">
                  <label className={labelClass}>Preferred occupation titles</label>
                  <div className="mt-2">
                    <OccupationCombobox
                      selected={form.preferences.occupation_preferences}
                      multiple
                      limit={3}
                      onChange={(occupation_preferences) => updateSection('preferences', { occupation_preferences })}
                      placeholder="Type a specific job title (e.g. Teacher, Cashier, React Developer)"
                      error={errors.occupation_preferences || errors.preferred_occupations}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Uses the same standardized title matching and broad-field classification as onboarding.</p>
                </div>
              </SectionCard>
            )}

            {activeSection === 'education' && (
              <SectionCard
                icon={GraduationCap}
                title="Education"
                subtitle="Keep the same education records and completion logic used during onboarding."
                onSave={() => save('education', 5, () => buildStep5Payload(form.education), validateEducationAndSkills)}
                saving={saving === 'education'}
              >
                <div className="mb-5 grid gap-4 md:grid-cols-2">
                  <SelectInput label="Educational attainment" value={form.education.educ_attainment} onChange={(value) => updateSection('education', { educ_attainment: value })} options={[{ value: '', label: 'Auto infer from records' }, ...EDUC_ATTAINMENT_OPTIONS.map((value) => ({ value, label: value }))]} />
                  <ToggleInput label="Currently in school" checked={form.education.currently_in_school} onChange={(checked) => updateSection('education', { currently_in_school: checked })} />
                </div>
                <EducationBackgroundEditor
                  form={form.education}
                  errors={errors}
                  onChange={(event) => updateSection('education', { [event.target.name]: event.target.value })}
                />
              </SectionCard>
            )}

            {activeSection === 'address' && (
              <SectionCard
                icon={MapPin}
                title="Address & GPS"
                subtitle="Maintain the present address and map coordinates used for nearby job matching."
                onSave={() => save('address', 1, () => buildStep1Payload(form.identity), validateIdentity)}
                saving={saving === 'address'}
              >
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <SingleAddressInput
                    label="Search present address"
                    value={[
                      form.identity.address_house_street,
                      form.identity.address_barangay,
                      form.identity.address_municipality_city,
                      form.identity.address_province,
                    ].filter(Boolean).join(', ')}
                    placeholder="Search house, street, barangay, or city"
                    onAddressParsed={(address) => updateSection('identity', {
                      address_house_street: address.street || form.identity.address_house_street,
                      address_barangay: address.barangay || form.identity.address_barangay,
                      address_municipality_city: address.city || form.identity.address_municipality_city,
                      address_province: address.province || form.identity.address_province,
                    })}
                    onPlaceResolved={resolveSelectedAddress}
                  />
                  <p className="mb-4 mt-2 text-xs text-slate-500">Select an address suggestion, then verify its official PSGC fields and GPS coordinates below.</p>
                  <AddressPicker
                    title="Present Address"
                    province={form.identity.address_province}
                    provinceCode={form.identity.address_province_code}
                    city={form.identity.address_municipality_city}
                    cityCode={form.identity.address_city_code}
                    barangay={form.identity.address_barangay}
                    barangayCode={form.identity.address_barangay_code}
                    street={form.identity.address_house_street}
                    latitude={form.identity.latitude}
                    longitude={form.identity.longitude}
                    location_accuracy={form.identity.location_accuracy}
                    google_place_id={form.identity.google_place_id}
                    onChange={(location) => updateSection('identity', {
                      address_province: location.province,
                      address_province_code: location.province_code,
                      address_municipality_city: location.city,
                      address_city_code: location.city_code,
                      address_barangay: location.barangay,
                      address_barangay_code: location.barangay_code,
                      address_house_street: location.street,
                      latitude: location.latitude,
                      longitude: location.longitude,
                      location_accuracy: location.location_accuracy,
                      google_place_id: location.google_place_id,
                    })}
                  />
                  {errors.address_province && <p className="mt-2 text-xs font-semibold text-red-600">{errors.address_province}</p>}
                  {errors.address_municipality_city && <p className="mt-1 text-xs font-semibold text-red-600">{errors.address_municipality_city}</p>}
                  {errors.address_barangay && <p className="mt-1 text-xs font-semibold text-red-600">{errors.address_barangay}</p>}
                  {errors.address_house_street && <p className="mt-1 text-xs font-semibold text-red-600">{errors.address_house_street}</p>}
                </div>
              </SectionCard>
            )}

            {activeSection === 'skills' && (
              <SectionCard
                icon={Sparkles}
                title="Skills"
                subtitle="Maintain hard and soft skills without mixing them into education records."
                onSave={() => save('skills', 5, () => buildStep5Payload(form.education), validateEducationAndSkills)}
                saving={saving === 'skills'}
              >
                <div>
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
                onSave={() => save('training', 6, () => buildStep6Payload(form.training), validateTraining)}
                saving={saving === 'training'}
              >
                <div className="space-y-4">
                  <ArrayHeader title="Training records" onAdd={() => addListItem('training', 'trainings', emptyTraining())} addLabel="Add training" />
                  {form.training.trainings.map((training, index) => (
                    <div key={training.local_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <SearchableTextInput label="Course / Training" value={training.course} error={errors[`trainings.${index}.course`]} options={TRAINING_COURSE_OPTIONS} placeholder="Type or select a training course" onChange={(value) => updateListItem('training', 'trainings', index, { course: value })} />
                        <SearchableTextInput label="Training institution" value={training.training_institution} options={TRAINING_INSTITUTION_OPTIONS} placeholder="Type or select an institution" onChange={(value) => updateListItem('training', 'trainings', index, { training_institution: value })} />
                        <TextInput type="number" label="Hours of training" value={training.hours_of_training} error={errors[`trainings.${index}.hours_of_training`]} onChange={(value) => updateListItem('training', 'trainings', index, { hours_of_training: value })} />
                        <TextInput label="Certificate received" value={training.certificates_received} onChange={(value) => updateListItem('training', 'trainings', index, { certificates_received: value })} />
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
                        <SelectInput label="Type" value={eligibility.type} error={errors[`eligibilities.${index}.type`]} onChange={(value) => updateListItem('training', 'eligibilities', index, { type: value })} options={[
                          { value: '', label: 'Select type' },
                          { value: 'civil_service', label: 'Civil Service' },
                          { value: 'professional_license', label: 'Professional License' },
                        ]} />
                        <SearchableTextInput label="Name" value={eligibility.name} error={errors[`eligibilities.${index}.name`]} options={ELIGIBILITY_NAME_OPTIONS} placeholder="Type or select eligibility" onChange={(value) => updateListItem('training', 'eligibilities', index, { name: value })} />
                        <TextInput label="Date taken" type="date" value={eligibility.date_taken} onChange={(value) => updateListItem('training', 'eligibilities', index, { date_taken: value })} />
                        <TextInput label="Valid until" type="date" value={eligibility.valid_until} error={errors[`eligibilities.${index}.valid_until`]} onChange={(value) => updateListItem('training', 'eligibilities', index, { valid_until: value })} />
                      </div>
                      <button type="button" onClick={() => removeListItem('training', 'eligibilities', index)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100">
                        <Trash2 className="h-4 w-4" /> Remove eligibility
                      </button>
                    </div>
                  ))}
                </div>

              </SectionCard>
            )}

            {activeSection === 'certificates' && (
              <SectionCard
                icon={FileUp}
                title="Certificates"
                subtitle="Create complete credential records with privately stored proof files."
              >
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">Private certificate vault</p>
                      <p className="mt-1 text-sm text-slate-600">Certificates may stand alone or be linked to one of your saved training records.</p>
                    </div>
                    <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800">
                      <Plus className="h-4 w-4" /> Add Certificate
                    </button>
                  </div>
                  {profile?.certificates?.length > 0 && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {profile.certificates.map((certificate) => (
                        <CertificateRecordCard
                          key={certificate.certificate_id}
                          certificate={certificate}
                          opening={openingCertificate === certificate.certificate_id}
                          onView={() => viewCertificate(certificate)}
                          onDelete={() => setPendingDeleteCert(certificate)}
                        />
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
                onSave={() => save('languages', 4, () => buildStep4Payload(form.languages), validateLanguages)}
                saving={saving === 'languages'}
              >
                <div className="space-y-3">
                  <ArrayHeader title="Language records" onAdd={() => addListItem('languages', 'languages', emptyLanguage())} addLabel="Add language" />
                  {form.languages.languages.map((language, index) => (
                    <div key={language.local_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
                        <SelectInput label="Language" value={language.language} error={errors[`languages.${index}.language`]} onChange={(value) => updateListItem('languages', 'languages', index, { language: value })} options={[{ value: '', label: 'Select language' }, ...LANGUAGE_OPTIONS.map((value) => ({ value, label: titleCase(value) }))]} />
                        {language.language === 'others' ? <TextInput label="Other language" value={language.language_other} error={errors[`languages.${index}.language_other`]} onChange={(value) => updateListItem('languages', 'languages', index, { language_other: value })} /> : <div />}
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
                      {errors[`languages.${index}.proficiency`] && <p className="mt-2 text-xs font-semibold text-red-600">{errors[`languages.${index}.proficiency`]}</p>}
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
                onSave={() => save('work', 7, () => buildStep7Payload(form.work), validateWorkExperience)}
                saving={saving === 'work'}
              >
                <div className="space-y-4">
                  <ArrayHeader title="Work experience records" onAdd={() => addListItem('work', 'work_experiences', emptyExperience())} addLabel="Add experience" />
                  {form.work.work_experiences.map((experience, index) => (
                    <div key={experience.local_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <SearchableTextInput label="Company" value={experience.company_name} error={errors[`work_experiences.${index}.company_name`]} options={COMPANY_SUGGESTIONS} placeholder="Search company or enter a custom name" onChange={(value) => updateListItem('work', 'work_experiences', index, { company_name: value })} />
                        <TextInput label="Position" value={experience.position} error={errors[`work_experiences.${index}.position`]} onChange={(value) => updateListItem('work', 'work_experiences', index, { position: value })} />
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
        trainings={profile?.trainings ?? []}
        onClose={() => setUploadOpen(false)}
        onUploaded={(certificate) => {
          if (!certificate?.certificate_id) return
          setProfile((current) => ({
            ...current,
            certificates: [certificate, ...(current?.certificates ?? [])],
          }))
        }}
      />

      {pendingDeleteCert && (
        <Dialog open onOpenChange={(open) => !open && setPendingDeleteCert(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete certificate?</DialogTitle>
              <DialogDescription>
                &ldquo;{pendingDeleteCert.title}&rdquo; will be removed from your certificate vault. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPendingDeleteCert(null)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDeleteCert}>Delete certificate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
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
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={Boolean(saving)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Section'}
          </button>
        )}
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
    location_accuracy: identity.location_accuracy,
    google_place_id: identity.google_place_id,
  }
}

function validateIdentity(identity) {
  const errors = {}
  const requiredTextFields = {
    last_name: 'Surname is required.',
    first_name: 'First name is required.',
    date_of_birth: 'Date of birth is required.',
    sex: 'Sex is required.',
    civil_status: 'Civil status is required.',
    religion: 'Religion is required.',
    height_ft: 'Height is required.',
    address_province: 'Province is required.',
    address_municipality_city: 'City or municipality is required.',
    address_barangay: 'Barangay is required.',
    address_house_street: 'House, street, or purok is required.',
  }

  Object.entries(requiredTextFields).forEach(([field, message]) => {
    if (!String(identity[field] ?? '').trim()) errors[field] = message
  })

  if (identity.date_of_birth && calculateAge(identity.date_of_birth) < 15) {
    errors.date_of_birth = 'You must be at least 15 years old.'
  }
  const height = Number(identity.height_ft)
  if (identity.height_ft !== '' && (!Number.isFinite(height) || height < 2.5 || height > 8.5)) {
    errors.height_ft = 'Height must be between 2.5 and 8.5 feet.'
  }
  if (identity.religion === 'other' && !String(identity.religion_other ?? '').trim()) {
    errors.religion_other = 'Please specify your religion.'
  }
  if (identity.disabilities?.includes('others') && !String(identity.disability_specification ?? '').trim()) {
    errors.disability_specification = 'Please specify the disability.'
  }

  return errors
}

function validateEmployment(employment) {
  const errors = {}
  if (!employment.employment_status) errors.employment_status = 'Select your current employment status.'
  if (employment.employment_status === 'employed' && !employment.employment_type) errors.employment_type = 'Select your employment type.'
  if (employment.employment_type === 'self_employed' && !employment.self_employed_type) errors.self_employed_type = 'Select a self-employed category.'
  if (employment.self_employed_type === 'others' && !cleanText(employment.self_employed_type_others)) errors.self_employed_type_others = 'Specify the self-employed category.'
  if (employment.employment_status === 'unemployed') {
    if (employment.unemployment_months === null || employment.unemployment_months === '' || Number(employment.unemployment_months) < 0) errors.unemployment_months = 'Enter the number of months unemployed.'
    if (!employment.unemployment_reason) errors.unemployment_reason = 'Select a reason for unemployment.'
  }
  if (employment.unemployment_reason === 'others' && !cleanText(employment.unemployment_reason_others)) errors.unemployment_reason_others = 'Specify the unemployment reason.'
  if (employment.unemployment_reason === 'terminated_abroad' && !cleanText(employment.unemployment_terminated_country)) errors.unemployment_terminated_country = 'Enter the country where employment ended.'
  if (employment.is_ofw && !cleanText(employment.ofw_country)) errors.ofw_country = 'Enter the OFW country.'
  if (employment.is_former_ofw && !cleanText(employment.former_ofw_country)) errors.former_ofw_country = 'Enter the former OFW country.'
  if (employment.is_former_ofw && !employment.former_ofw_return_date) errors.former_ofw_return_date = 'Enter the return date.'
  if (employment.is_4ps_beneficiary && !/^\d{2}-\d{2}-\d{2}-\d{3}-\d{5}$/.test(employment.household_id_4ps ?? '')) errors.household_id_4ps = 'Use the format 00-00-00-000-00000.'
  return errors
}

function validatePreferences(preferences) {
  const errors = {}
  if (!preferences.work_type_preference) errors.work_type_preference = 'Select a preferred type of work.'
  if (!preferences.preferred_work_location) errors.preferred_work_location = 'Select a preferred work location.'
  if (!preferences.preferred_locations_details?.length) errors.preferred_locations_details = 'Select at least one preferred location.'
  if (!preferences.occupation_preferences?.length) errors.occupation_preferences = 'Select at least one preferred occupation.'
  return errors
}

function validateLanguages(payload) {
  const errors = {}
  if (!payload.languages.length) errors.languages = 'Add at least one language or dialect.'
  payload.languages.forEach((language, index) => {
    if (!language.language) errors[`languages.${index}.language`] = 'Select a language.'
    if (language.language === 'others' && !cleanText(language.language_other)) errors[`languages.${index}.language_other`] = 'Specify the language or dialect.'
    if (!language.can_read && !language.can_write && !language.can_speak && !language.can_understand) errors[`languages.${index}.proficiency`] = 'Select at least one proficiency.'
  })
  return errors
}

function validateEducationAndSkills(payload) {
  const errors = {}
  if (!payload.educations.length) errors.educations = 'Add at least one education record.'
  if (![...payload.dole_skills, ...payload.technical_skills, ...payload.soft_skills].length) errors.technical_skills = 'Select at least one hard or soft skill.'
  return errors
}

function validateTraining(payload) {
  const errors = {}
  payload.trainings.forEach((training, index) => {
    if (!training.course) errors[`trainings.${index}.course`] = 'Enter the course or training.'
    if (training.hours_of_training !== null && training.hours_of_training < 1) errors[`trainings.${index}.hours_of_training`] = 'Training hours must be at least 1.'
  })
  payload.eligibilities.forEach((eligibility, index) => {
    if (!eligibility.type) errors[`eligibilities.${index}.type`] = 'Select the eligibility type.'
    if (!eligibility.name) errors[`eligibilities.${index}.name`] = 'Enter the eligibility or license name.'
    if (eligibility.date_taken && eligibility.valid_until && eligibility.valid_until < eligibility.date_taken) errors[`eligibilities.${index}.valid_until`] = 'Validity date cannot be earlier than the date taken.'
  })
  return errors
}

function validateWorkExperience(payload) {
  const errors = {}
  payload.work_experiences.forEach((experience, index) => {
    if (!experience.company_name) errors[`work_experiences.${index}.company_name`] = 'Enter the company name.'
    if (!experience.position) errors[`work_experiences.${index}.position`] = 'Enter the job title.'
    if (!experience.currently_employed && experience.start_date && experience.end_date && experience.end_date < experience.start_date) errors[`work_experiences.${index}.end_date`] = 'End date cannot be earlier than start date.'
  })
  return errors
}

function calculateAge(value) {
  const birthDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(birthDate.getTime())) return 0
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDifference = today.getMonth() - birthDate.getMonth()
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age -= 1
  return age
}

function minimumBirthDate() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 15)
  return date.toISOString().slice(0, 10)
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
    occupation_preferences: serializeOccupationPreferences(preferences.occupation_preferences),
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
    broad_field: occupation.broad_field ?? null,
    role_function: occupation.role_function ?? null,
    confidence: occupation.confidence ?? null,
    raw_job_title: occupation.raw_job_title ?? occupation.preferred_occupation ?? '',
    source: occupation.source ?? (occupation.status === 'ai_generated' ? 'ai_generated' : 'manual'),
    occupation_title: occupation.title ?? occupation.occupation_title ?? occupation.general_term ?? occupation.raw_job_title ?? '',
  }
}

function normalizeEducation(education, index) {
  return {
    local_id: stableLocalId('education', index),
    attainment_level: education.attainment_level ?? inferProfileAttainmentLevel(education),
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

function CertificateRecordCard({ certificate, opening, onView, onDelete }) {
  const expired = certificate.expires_at && certificate.expires_at < new Date().toISOString().slice(0, 10)

  return (
    <article className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-amber-100 p-2 text-amber-700"><Award className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-900">{certificate.title}</p>
          <p className="mt-0.5 text-sm text-slate-500">{certificate.issuing_body}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{certificateCategory(certificate.category)}</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Verified by Upload</span>
            <span className={`rounded-full px-2.5 py-1 ${expired ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
              {expired ? 'Expired' : certificate.expires_at ? `Expires ${formatCertificateDate(certificate.expires_at)}` : 'No expiration'}
            </span>
          </div>
        </div>
      </div>
      <dl className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
        <div><dt className="inline font-bold">Issued: </dt><dd className="inline">{formatCertificateDate(certificate.issued_at)}</dd></div>
        {certificate.credential_number && <div><dt className="inline font-bold">Credential no.: </dt><dd className="inline break-all">{certificate.credential_number}</dd></div>}
        {certificate.training && <div><dt className="inline font-bold">Related training: </dt><dd className="inline">{certificate.training.course}</dd></div>}
        {certificate.description && <div><dt className="inline font-bold">Remarks: </dt><dd className="inline">{certificate.description}</dd></div>}
        <div><dt className="inline font-bold">Proof file: </dt><dd className="inline break-all">{certificate.original_filename}</dd></div>
      </dl>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onView} disabled={opening} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60"><Eye className="h-4 w-4" />{opening ? 'Opening…' : 'View proof'}</button>
        <button type="button" onClick={onDelete} className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100" aria-label={`Delete ${certificate.title}`}><Trash2 className="h-4 w-4" /></button>
      </div>
    </article>
  )
}

function certificateCategory(category) {
  return ({
    training_certificate: 'Training Certificate',
    tesda_nc_certificate: 'TESDA / NC Certificate',
    professional_certificate: 'Professional Certificate',
    seminar_certificate: 'Seminar Certificate',
    workshop_certificate: 'Workshop Certificate',
    employment_certificate: 'Employment Certificate',
    academic_certificate: 'Academic Certificate',
    other: 'Other',
  })[category] ?? 'Legacy Certificate'
}

function formatCertificateDate(value) {
  if (!value) return 'Not specified'
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return String(value)
  return new Date(year, month - 1, day).toLocaleDateString()
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
    attainment_level: education.attainment_level || inferProfileAttainmentLevel(education),
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

function inferProfileAttainmentLevel(education) {
  const level = normalizeEducationLevel(education.level)
  const graduated = education.completion_status === 'graduated' || Boolean(education.year_graduated)
  if (level === 'elementary') return graduated ? 'elementary_graduate' : 'elementary_undergraduate'
  if (level === 'vocational') return 'vocational'
  if (level === 'tertiary') return graduated ? 'college_graduate' : 'college_undergraduate'
  if (level === 'graduate_studies') return 'post_graduate'
  if (level === 'senior_high_strand') return graduated ? 'senior_high_graduate' : 'senior_high_undergraduate'
  if (['secondary_non_k12', 'secondary_k12'].includes(level)) {
    return graduated ? 'high_school_graduate' : 'high_school_undergraduate'
  }
  return ''
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
