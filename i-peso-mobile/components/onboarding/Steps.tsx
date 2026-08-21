import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme'
import { seekerService, type AiSuggestionItem, type OccupationClassificationSuggestion, type SkillOption } from '@/services/seekerService'
import { Combobox } from './Combobox'
import { AddressSearchField } from './AddressSearchField'
import type { GeocodedLocation } from '@/services/seekerService'
import {
  Choice,
  ChoiceGroup,
  Field,
  InfoNote,
  RepeatableSection,
  SelectField,
  ToggleGroup,
  collapsedFieldError,
  fieldError,
  type ServerErrors,
} from './formPrimitives'
import {
  newEligibility,
  newLanguage,
  newOccupationPref,
  newSkill,
  newTraining,
  newWorkExperience,
} from './payloads'
import { newEducation } from './types'
import type {
  OccupationPrefEntry,
  Step1Value,
  Step2Value,
  Step3Value,
  Step4Value,
  Step5Value,
  Step6Value,
  Step7Value,
} from './types'

const ALLOWED_SKILL_SOURCES = ['dole', 'esco', 'user_added', 'occupation_recommended', 'system']

function normalizeCatalogSkillSource(source?: string) {
  return source && ALLOWED_SKILL_SOURCES.includes(source) ? source : 'system'
}

function AiSuggestChips({ items, onAdd, addedNames }: { items: AiSuggestionItem[]; onAdd: (item: AiSuggestionItem) => void; addedNames: string[] }) {
  return (
    <View style={styles.aiChipRow}>
      {items.map((item) => {
        const added = addedNames.some((n) => n.trim().toLowerCase() === item.name.toLowerCase())
        return (
          <TouchableOpacity key={item.name} disabled={added} onPress={() => onAdd(item)} style={[styles.aiChip, added && styles.aiChipAdded]} activeOpacity={0.85}>
            <Text style={[styles.aiChipText, added && styles.aiChipTextAdded]}>{added ? `✓ ${item.name}` : `+ ${item.name}`}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function OccupationAiSuggestions({ value, onAdd }: { value: Step3Value; onAdd: (item: AiSuggestionItem) => void }) {
  const [opened, setOpened] = useState(false)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<AiSuggestionItem[]>([])
  const [notice, setNotice] = useState('')

  const fetchSuggestions = async () => {
    setLoading(true)
    setNotice('')
    const result = await seekerService.getAiProfileSuggestions({
      work_type_preference: value.work_type_preference,
      target_job_description: description.trim() || undefined,
      preferred_occupations: value.occupation_preferences
        .filter((p) => p.raw_job_title.trim())
        .map((p) => ({ title: p.raw_job_title, general_term: p.general_term ?? undefined })),
    })
    setLoading(false)
    if (result?.occupations?.length) {
      setSuggestions(result.occupations)
    } else {
      setSuggestions([])
      setNotice('AI suggestions are unavailable right now — you can still type job titles manually above.')
    }
  }

  if (!opened) {
    return (
      <TouchableOpacity onPress={() => setOpened(true)} style={styles.aiToggle} activeOpacity={0.85}>
        <Text style={styles.aiToggleText}>Need ideas? Ask AI</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.aiPanel}>
      <Field label="Describe your ideal job (optional)" value={description} onChangeText={setDescription} placeholder="e.g. Something in customer service, entry level" multiline autoCapitalize="sentences" />
      <TouchableOpacity onPress={fetchSuggestions} disabled={loading} style={styles.aiFetchBtn} activeOpacity={0.85}>
        <Text style={styles.aiFetchBtnText}>{loading ? 'Thinking...' : 'Get AI Suggestions'}</Text>
      </TouchableOpacity>
      {loading ? <ActivityIndicator color={colors.info} style={styles.aiLoading} /> : null}
      {notice ? <Text style={styles.aiNotice}>{notice}</Text> : null}
      {suggestions.length ? (
        <AiSuggestChips items={suggestions} addedNames={value.occupation_preferences.map((p) => p.raw_job_title)} onAdd={onAdd} />
      ) : null}
    </View>
  )
}

function SkillAiSuggestions({ category, currentSkills, onAdd }: { category: 'technical' | 'soft'; currentSkills: string[]; onAdd: (item: AiSuggestionItem) => void }) {
  const [opened, setOpened] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<AiSuggestionItem[]>([])
  const [notice, setNotice] = useState('')

  const fetchSuggestions = async () => {
    setLoading(true)
    setNotice('')
    const result = await seekerService.getAiProfileSuggestions({
      technical_skills: category === 'technical' ? currentSkills : undefined,
      soft_skills: category === 'soft' ? currentSkills : undefined,
    })
    setLoading(false)
    const list = category === 'technical' ? result?.technical_skills : result?.soft_skills
    if (list?.length) {
      setSuggestions(list)
    } else {
      setSuggestions([])
      setNotice('AI suggestions are unavailable right now.')
    }
    setOpened(true)
  }

  if (!opened) {
    return (
      <TouchableOpacity onPress={fetchSuggestions} disabled={loading} style={styles.aiToggle} activeOpacity={0.85}>
        <Text style={styles.aiToggleText}>{loading ? 'Thinking...' : 'Suggest skills with AI'}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.aiPanel}>
      {notice ? <Text style={styles.aiNotice}>{notice}</Text> : null}
      {suggestions.length ? <AiSuggestChips items={suggestions} addedNames={currentSkills} onAdd={onAdd} /> : null}
      <TouchableOpacity onPress={fetchSuggestions} disabled={loading} style={styles.aiRefreshBtn} activeOpacity={0.85}>
        <Text style={styles.aiToggleText}>{loading ? 'Thinking...' : 'Refresh suggestions'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const SUFFIX_OPTIONS = ['', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V'].map((v) => ({ label: v || 'None', value: v }))

// Mirrors i-peso-frontend's SeekerOnboarding.jsx RELIGION_OPTIONS exactly (label text, not
// just the value slugs) — this is the constant the website's dropdown itself renders from.
const RELIGION_OPTIONS = [
  { value: 'roman_catholic', label: 'Roman Catholic' },
  { value: 'islam', label: 'Islam' },
  { value: 'iglesia_ni_cristo', label: 'Iglesia ni Cristo' },
  { value: 'aglipayan', label: 'Aglipayan (Philippine Independent Church)' },
  { value: 'evangelical', label: 'Evangelical / Born Again' },
  { value: 'seventh_day_adventist', label: 'Seventh-day Adventist' },
  { value: 'jehovah_witness', label: "Jehovah's Witness" },
  { value: 'buddhist', label: 'Buddhist' },
  { value: 'hindu', label: 'Hindu' },
  { value: 'jewish', label: 'Jewish' },
  { value: 'agnostic_atheist', label: 'Agnostic / Atheist' },
  { value: 'declined', label: 'Declined to answer' },
  { value: 'other', label: 'Other (please specify)' },
]

// Mirrors web's DISABILITY_OPTIONS exactly.
const DISABILITY_OPTIONS = [
  { value: 'visual', label: 'Visual' },
  { value: 'hearing', label: 'Hearing' },
  { value: 'speech', label: 'Speech' },
  { value: 'mental', label: 'Mental/Intellectual' },
  { value: 'physical', label: 'Physical' },
  { value: 'others', label: 'Others (specify)' },
  { value: 'none', label: 'No Disability' },
]

// Mirrors web's SELF_EMPLOYED_TYPES exactly.
const SELF_EMPLOYED_OPTIONS = [
  { value: 'fisherman_fisherfolk', label: 'Fisherman/Fisherfolk' },
  { value: 'vendor_retailer', label: 'Vendor/Retailer' },
  { value: 'home_based_worker', label: 'Home-based Worker' },
  { value: 'transport', label: 'Transport/Courier' },
  { value: 'domestic_worker', label: 'Domestic Worker' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'artisan_craft_worker', label: 'Artisan/Craft Worker' },
  { value: 'others', label: 'Others (specify)' },
]

// Mirrors web's UNEMPLOYMENT_REASONS exactly.
const UNEMPLOYMENT_REASON_OPTIONS = [
  { value: 'fresh_graduate', label: 'New Entrant / Fresh Graduate' },
  { value: 'finished_contract', label: 'Finished Contract' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'retired', label: 'Retired' },
  { value: 'terminated_local', label: 'Terminated/Laid off (Local)' },
  { value: 'terminated_abroad', label: 'Terminated/Laid off Abroad' },
  { value: 'terminated_calamity', label: 'Terminated due to Calamity' },
  { value: 'others', label: 'Others (specify)' },
]

// Mirrors web's LANGUAGES list exactly (display case). The backend lowercases the value
// server-side regardless (SeekerController::saveStep4), so sending Title Case here is safe.
const LANGUAGE_OPTIONS = [
  'English', 'Filipino', 'Cebuano', 'Ilocano', 'Hiligaynon', 'Bikol', 'Waray',
  'Pangasinan', 'Kapampangan', 'Maranao', 'Maguindanao', 'Tausug', 'Mandarin',
  'Spanish', 'Japanese', 'Korean', 'Arabic', 'French', 'German', 'Others',
]
const EDUCATION_LEVEL_OPTIONS = [
  { label: 'Elementary', value: 'elementary' },
  { label: 'High School', value: 'secondary_non_k12' },
  { label: 'Junior High (K12)', value: 'secondary_k12' },
  { label: 'Senior High', value: 'senior_high_strand' },
  { label: 'Vocational', value: 'vocational' },
  { label: 'College', value: 'tertiary' },
  { label: 'Graduate Studies', value: 'graduate_studies' },
]
const COURSE_REQUIRED_LEVELS = ['tertiary', 'senior_high_strand', 'vocational', 'graduate_studies']

// Mirrors web's EMPLOYMENT_STATUS_OPTIONS (per work-experience row) exactly.
const WORK_EMPLOYMENT_STATUS_OPTIONS = [
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

// Mirrors the backend's regex:/^\d{2}-\d{2}-\d{2}-\d{3}-\d{5}$/ (14 digits, grouped 2-2-2-3-5)
function formatHouseholdId4ps(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 14)
  const groupLengths = [2, 2, 2, 3, 5]
  let formatted = ''
  let cursor = 0
  for (const length of groupLengths) {
    if (cursor >= digits.length) break
    formatted += (formatted ? '-' : '') + digits.slice(cursor, cursor + length)
    cursor += length
  }
  return formatted
}

function SubLabel({ children }: { children: string }) {
  return <Text style={styles.subLabel}>{children}</Text>
}

// height_ft on the wire is decimal feet (backend: between:2.5,8.5) — the UI
// collects it as a feet/inches pair and converts, per the NSRP form's units.
const FEET_OPTIONS = [2, 3, 4, 5, 6, 7, 8].map((f) => ({ label: `${f} ft`, value: String(f) }))
const INCH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ label: `${i} in`, value: String(i) }))

function feetInchesFromDecimal(decimalFeet: string): { feet: number; inches: number } {
  const parsed = Number(decimalFeet)
  if (!Number.isFinite(parsed) || parsed <= 0) return { feet: 5, inches: 0 }
  const feet = Math.floor(parsed)
  const inches = Math.round((parsed - feet) * 12)
  return inches >= 12 ? { feet: feet + 1, inches: 0 } : { feet, inches }
}

function decimalFromFeetInches(feet: number, inches: number): string {
  return String(Math.round((feet + inches / 12) * 100) / 100)
}

// Web uses a native <input type="date"> — a select-only calendar widget, not free typing.
// Mobile has no native date picker installed, so this mirrors that "select, don't type"
// intent with the same Year/Month/Day dropdown pattern already used for Height (Feet/Inches),
// avoiding a new native dependency (and the rebuild it would require) for one field.
const DOB_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOB_MONTH_OPTIONS = DOB_MONTH_NAMES.map((name, i) => ({ label: name, value: String(i + 1).padStart(2, '0') }))
const DOB_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => ({ label: d, value: d }))
// Newest-eligible-year first (must be ≥15 years old today) down to 100 years back.
const DOB_YEAR_OPTIONS = Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - 15 - i))
  .map((y) => ({ label: y, value: y }))

function dobPartsFromString(value: string): { year: string; month: string; day: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  return match ? { year: match[1], month: match[2], day: match[3] } : { year: '', month: '', day: '' }
}

function dobStringFromParts(year: string, month: string, day: string): string {
  return year && month && day ? `${year}-${month}-${day}` : ''
}

// Owns Year/Month/Day as local state, seeded once from `value` — NOT re-derived from
// `value` on every render. Writing the combined date only happens once all three parts
// are picked (dobStringFromParts returns '' otherwise), so deriving from `value` directly
// made every single-part selection appear to immediately reset, since the still-incomplete
// combined string parses back to all-empty. Local state keeps each dropdown's own
// selection visible regardless of whether the other two are filled in yet.
function DateOfBirthField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  const [parts, setParts] = useState(() => dobPartsFromString(value))

  const update = (next: Partial<{ year: string; month: string; day: string }>) => {
    const merged = { ...parts, ...next }
    setParts(merged)
    onChange(dobStringFromParts(merged.year, merged.month, merged.day))
  }

  return (
    <>
      <SubLabel>Date of Birth *</SubLabel>
      <View style={styles.choiceRow}>
        <View style={styles.choiceRowItem}>
          <SelectField label="Year" required options={DOB_YEAR_OPTIONS} value={parts.year} onChange={(v) => update({ year: v })} />
        </View>
        <View style={styles.choiceRowItem}>
          <SelectField label="Month" required options={DOB_MONTH_OPTIONS} value={parts.month} onChange={(v) => update({ month: v })} />
        </View>
        <View style={styles.choiceRowItem}>
          <SelectField label="Day" required options={DOB_DAY_OPTIONS} value={parts.day} onChange={(v) => update({ day: v })} />
        </View>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </>
  )
}

// ── Step 1: Personal, Address, Disability ─────────────────────────────────

export function Step1Personal({ value, onChange, errors }: { value: Step1Value; onChange: (v: Step1Value) => void; errors?: ServerErrors }) {
  const set = <K extends keyof Step1Value>(key: K, val: Step1Value[K]) => onChange({ ...value, [key]: val })

  const toggleDisability = (option: string) => {
    if (option === 'none') {
      set('disabilities', ['none'])
      return
    }
    const withoutNone = value.disabilities.filter((d) => d !== 'none')
    const next = withoutNone.includes(option) ? withoutNone.filter((d) => d !== option) : [...withoutNone, option]
    set('disabilities', next.length ? next : ['none'])
  }

  return (
    <>
      <Field label="First Name" required value={value.first_name} onChangeText={(v) => set('first_name', v)} error={fieldError(errors, 'first_name')} />
      <Field label="Middle Name" value={value.middle_name} onChangeText={(v) => set('middle_name', v)} error={fieldError(errors, 'middle_name')} />
      <Field label="Last Name" required value={value.last_name} onChangeText={(v) => set('last_name', v)} error={fieldError(errors, 'last_name')} />
      <SelectField label="Suffix" options={SUFFIX_OPTIONS} value={value.suffix} onChange={(v) => set('suffix', v)} placeholder="None" />
      <DateOfBirthField value={value.date_of_birth} onChange={(v) => set('date_of_birth', v)} error={fieldError(errors, 'date_of_birth')} />
      <SelectField label="Sex" required placeholder="Select sex" options={[{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }]} value={value.sex} onChange={(v) => set('sex', v)} />
      <SelectField label="Civil Status" required placeholder="Select status" options={['Single', 'Married', 'Widowed', 'Separated'].map((v) => ({ label: v, value: v.toLowerCase() }))} value={value.civil_status} onChange={(v) => set('civil_status', v)} />
      <SelectField label="Religion" required placeholder="Select religion" options={RELIGION_OPTIONS} value={value.religion} onChange={(v) => set('religion', v)} />
      {value.religion === 'other' ? (
        <Field label="Specify Religion" required value={value.religion_other} onChangeText={(v) => set('religion_other', v)} error={fieldError(errors, 'religion_other')} />
      ) : null}
      {(() => {
        const height = feetInchesFromDecimal(value.height_ft)
        const setHeight = (feet: number, inches: number) => set('height_ft', decimalFromFeetInches(feet, inches))
        return (
          <>
            {/* Mirrors web's single "Height" FormField (help: "Select feet and inches")
                wrapping both a Feet and an Inches selector, rather than two separate fields. */}
            <SubLabel>Height *</SubLabel>
            <View style={styles.choiceRow}>
              <View style={styles.choiceRowItem}>
                <SelectField label="Feet" required options={FEET_OPTIONS} value={String(height.feet)} onChange={(v) => setHeight(Number(v), height.inches)} />
              </View>
              <View style={styles.choiceRowItem}>
                <SelectField label="Inches" required options={INCH_OPTIONS} value={String(height.inches)} onChange={(v) => setHeight(height.feet, Number(v))} />
              </View>
            </View>
            <Text style={styles.helperText}>Select feet and inches</Text>
          </>
        )
      })()}
      {fieldError(errors, 'height_ft') ? <Text style={styles.errorText}>{fieldError(errors, 'height_ft')}</Text> : null}
      <Field label="TIN (Tax Identification No.)" value={value.tin} onChangeText={(v) => set('tin', v)} keyboardType="number-pad" error={fieldError(errors, 'tin')} />

      <SubLabel>Present Address</SubLabel>
      <Text style={styles.addressHint}>Search and select your complete Philippine address, or use your current location.</Text>
      <AddressSearchField
        onAddressSelected={(place: GeocodedLocation) => {
          onChange({
            ...value,
            address_province: place.province_name || value.address_province,
            address_municipality_city: place.city_name || value.address_municipality_city,
            address_barangay: place.barangay_name || value.address_barangay,
            address_house_street: [place.house_number, place.street].filter(Boolean).join(' ').trim() || value.address_house_street,
          })
        }}
      />
      <Field label="Province" required value={value.address_province} onChangeText={(v) => set('address_province', v)} error={fieldError(errors, 'address_province')} />
      <Field label="City / Municipality" required value={value.address_municipality_city} onChangeText={(v) => set('address_municipality_city', v)} error={fieldError(errors, 'address_municipality_city')} />
      <Field label="Barangay" required value={value.address_barangay} onChangeText={(v) => set('address_barangay', v)} error={fieldError(errors, 'address_barangay')} />
      <Field label="House No. / Street" required value={value.address_house_street} onChangeText={(v) => set('address_house_street', v)} error={fieldError(errors, 'address_house_street')} />

      <SubLabel>Disability Disclosure</SubLabel>
      <View style={styles.choiceGrid}>
        {DISABILITY_OPTIONS.map((option) => (
          <Choice key={option.value} label={option.label} active={value.disabilities.includes(option.value)} onPress={() => toggleDisability(option.value)} />
        ))}
      </View>
      {value.disabilities.includes('others') ? (
        <Field label="Specify Disability" required value={value.disability_specification} onChangeText={(v) => set('disability_specification', v)} error={fieldError(errors, 'disability_specification')} />
      ) : null}
      {fieldError(errors, 'disabilities') ? <Text style={styles.errorText}>{fieldError(errors, 'disabilities')}</Text> : null}
    </>
  )
}

// ── Step 2: Employment Status, OFW, 4Ps ───────────────────────────────────

export function Step2Employment({ value, onChange, errors }: { value: Step2Value; onChange: (v: Step2Value) => void; errors?: ServerErrors }) {
  const set = <K extends keyof Step2Value>(key: K, val: Step2Value[K]) => onChange({ ...value, [key]: val })
  const employed = value.employment_status === 'employed'
  const unemployed = value.employment_status === 'unemployed'
  const selfEmployed = employed && value.employment_type === 'self_employed'

  return (
    <>
      <ChoiceGroup label="Current Employment Status" required columns={false} options={[{ label: 'Unemployed', value: 'unemployed' }, { label: 'Employed', value: 'employed' }]} value={value.employment_status} onChange={(v) => set('employment_status', v)} error={fieldError(errors, 'employment_status')} />

      {employed ? (
        <>
          <ChoiceGroup label="Employment Type" columns={false} options={[{ label: 'Wage employed', value: 'wage_employed' }, { label: 'Self-employed', value: 'self_employed' }]} value={value.employment_type} onChange={(v) => set('employment_type', v)} />
          {selfEmployed ? (
            <>
              <SelectField label="Self-employed Type" options={SELF_EMPLOYED_OPTIONS} value={value.self_employed_type} onChange={(v) => set('self_employed_type', v)} error={fieldError(errors, 'self_employed_type')} />
              {value.self_employed_type === 'others' ? (
                <Field label="Specify" value={value.self_employed_type_others} onChangeText={(v) => set('self_employed_type_others', v)} error={fieldError(errors, 'self_employed_type_others')} />
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {unemployed ? (
        <>
          <Field label="Months Unemployed" keyboardType="number-pad" value={value.unemployment_months} onChangeText={(v) => set('unemployment_months', v)} error={fieldError(errors, 'unemployment_months')} />
          <SelectField label="Reason" options={UNEMPLOYMENT_REASON_OPTIONS} value={value.unemployment_reason} onChange={(v) => set('unemployment_reason', v)} error={fieldError(errors, 'unemployment_reason')} />
          {value.unemployment_reason === 'others' ? (
            <Field label="Specify Reason" value={value.unemployment_reason_others} onChangeText={(v) => set('unemployment_reason_others', v)} error={fieldError(errors, 'unemployment_reason_others')} />
          ) : null}
          {value.unemployment_reason === 'terminated_abroad' ? (
            <Field label="Country" value={value.unemployment_terminated_country} onChangeText={(v) => set('unemployment_terminated_country', v)} error={fieldError(errors, 'unemployment_terminated_country')} />
          ) : null}
        </>
      ) : null}

      <SubLabel>OFW Status</SubLabel>
      <ToggleGroup label="Are you a current OFW?" value={value.is_ofw} onChange={(v) => set('is_ofw', v)} />
      {value.is_ofw ? <Field label="OFW Country" required value={value.ofw_country} onChangeText={(v) => set('ofw_country', v)} error={fieldError(errors, 'ofw_country')} /> : null}
      <ToggleGroup label="Are you a former OFW?" value={value.is_former_ofw} onChange={(v) => set('is_former_ofw', v)} />
      {value.is_former_ofw ? (
        <>
          <Field label="Former OFW Country" required value={value.former_ofw_country} onChangeText={(v) => set('former_ofw_country', v)} error={fieldError(errors, 'former_ofw_country')} />
          <Field label="Return Date" required placeholder="YYYY-MM-DD" value={value.former_ofw_return_date} onChangeText={(v) => set('former_ofw_return_date', v)} error={fieldError(errors, 'former_ofw_return_date')} />
        </>
      ) : null}

      <SubLabel>4Ps Beneficiary</SubLabel>
      <ToggleGroup label="Are you a 4Ps beneficiary?" value={value.is_4ps_beneficiary} onChange={(v) => set('is_4ps_beneficiary', v)} />
      {value.is_4ps_beneficiary ? (
        <Field
          label="4Ps Household ID"
          required
          placeholder="00-00-00-000-00000"
          keyboardType="number-pad"
          value={value.household_id_4ps}
          onChangeText={(v) => set('household_id_4ps', formatHouseholdId4ps(v))}
          error={fieldError(errors, 'household_id_4ps')}
        />
      ) : null}
    </>
  )
}

// ── Step 3: Preferences and Occupations ───────────────────────────────────

export function Step3Preferences({ value, onChange, errors }: { value: Step3Value; onChange: (v: Step3Value) => void; errors?: ServerErrors }) {
  const set = <K extends keyof Step3Value>(key: K, val: Step3Value[K]) => onChange({ ...value, [key]: val })

  return (
    <>
      <ChoiceGroup label="Preferred Work Type" required columns={false} options={[{ label: 'Full-time', value: 'full_time' }, { label: 'Part-time', value: 'part_time' }]} value={value.work_type_preference} onChange={(v) => set('work_type_preference', v)} />
      <ChoiceGroup label="Preferred Work Location" required columns={false} options={[{ label: 'Local', value: 'local' }, { label: 'Overseas', value: 'overseas' }]} value={value.preferred_work_location} onChange={(v) => set('preferred_work_location', v)} />

      <RepeatableSection
        title="Preferred Locations"
        hint="Add up to 3 preferred cities or provinces."
        items={value.preferred_locations_details}
        minItems={1}
        addLabel="Add location"
        onAdd={() => value.preferred_locations_details.length < 3 && set('preferred_locations_details', [...value.preferred_locations_details, ''])}
        onRemove={(i) => set('preferred_locations_details', value.preferred_locations_details.filter((_, idx) => idx !== i))}
        renderItem={(i) => (
          <Field
            label={`Location ${i + 1}`}
            value={value.preferred_locations_details[i]}
            onChangeText={(v) => {
              const next = [...value.preferred_locations_details]
              next[i] = v
              set('preferred_locations_details', next)
            }}
            error={fieldError(errors, `preferred_locations_details.${i}`)}
          />
        )}
      />
      {fieldError(errors, 'preferred_locations_details') ? <Text style={styles.errorText}>{fieldError(errors, 'preferred_locations_details')}</Text> : null}

      <RepeatableSection
        title="Preferred Occupations"
        hint="Add up to 3 desired job titles."
        items={value.occupation_preferences}
        minItems={1}
        addLabel="Add occupation"
        onAdd={() => value.occupation_preferences.length < 3 && set('occupation_preferences', [...value.occupation_preferences, newOccupationPref()])}
        onRemove={(i) => set('occupation_preferences', value.occupation_preferences.filter((_, idx) => idx !== i))}
        renderItem={(i) => (
          <Combobox<OccupationClassificationSuggestion>
            label={`Job Title ${i + 1}`}
            placeholder="e.g. Administrative Assistant"
            value={value.occupation_preferences[i].raw_job_title}
            onChangeText={(v) => {
              const next = [...value.occupation_preferences]
              next[i] = { ...next[i], raw_job_title: v, occupation_id: null, general_term: null, source: 'manual' }
              set('occupation_preferences', next)
            }}
            onSelect={(item) => {
              const next = [...value.occupation_preferences]
              next[i] = item.occupation_id
                ? { raw_job_title: item.occupation_title, occupation_id: item.occupation_id, general_term: null, source: item.source }
                : { raw_job_title: item.occupation_title, occupation_id: null, general_term: item.general_term ?? null, source: item.source }
              set('occupation_preferences', next)
            }}
            search={async (q) => (await seekerService.classifyOccupation(q)).suggestions}
            renderLabel={(item) => item.occupation_title}
            renderSubLabel={(item) => item.broad_field || item.role_function}
            keyExtractor={(item) => `${item.source}:${item.occupation_id ?? item.occupation_title}`}
          />
        )}
      />
      {/* Backend keys occupation errors by occupation_ids or occupation_preferences.<index>.<field> —
          collapsed onto one message here rather than rendered per-index. */}
      {collapsedFieldError(errors, ['occupation_ids', 'occupation_preferences']) ? (
        <Text style={styles.errorText}>{collapsedFieldError(errors, ['occupation_ids', 'occupation_preferences'])}</Text>
      ) : null}

      <OccupationAiSuggestions
        value={value}
        onAdd={(item) => {
          const entry: OccupationPrefEntry = { raw_job_title: item.name, occupation_id: null, general_term: null, source: 'ai' }
          const emptySlotIndex = value.occupation_preferences.findIndex((p) => !p.raw_job_title.trim() && !p.occupation_id)
          if (emptySlotIndex >= 0) {
            const next = [...value.occupation_preferences]
            next[emptySlotIndex] = entry
            set('occupation_preferences', next)
          } else if (value.occupation_preferences.length < 3) {
            set('occupation_preferences', [...value.occupation_preferences, entry])
          }
        }}
      />
    </>
  )
}

// ── Step 4: Languages ──────────────────────────────────────────────────────

export function Step4Languages({ value, onChange, errors }: { value: Step4Value; onChange: (v: Step4Value) => void; errors?: ServerErrors }) {
  const set = (languages: Step4Value['languages']) => onChange({ languages })

  return (
    <RepeatableSection
      title="Languages & Dialects"
      hint="Select each language you can use and mark which skills apply."
      items={value.languages}
      minItems={1}
      addLabel="Add language"
      onAdd={() => set([...value.languages, newLanguage()])}
      onRemove={(i) => set(value.languages.filter((_, idx) => idx !== i))}
      renderItem={(i) => {
        const lang = value.languages[i]
        const update = (patch: Partial<typeof lang>) => {
          const next = [...value.languages]
          next[i] = { ...lang, ...patch }
          set(next)
        }
        return (
          <>
            <ChoiceGroup label="Language" options={LANGUAGE_OPTIONS.map((l) => ({ label: l, value: l }))} value={lang.language} onChange={(v) => update({ language: v })} error={fieldError(errors, `languages.${i}.language`)} />
            {lang.language === 'others' ? (
              <Field label="Specify Language" value={lang.language_other} onChangeText={(v) => update({ language_other: v })} error={fieldError(errors, `languages.${i}.language_other`)} />
            ) : null}
            <Text style={styles.subLabel}>Proficiency</Text>
            <View style={styles.choiceGrid}>
              <Choice label="Read" active={lang.can_read} onPress={() => update({ can_read: !lang.can_read })} />
              <Choice label="Write" active={lang.can_write} onPress={() => update({ can_write: !lang.can_write })} />
              <Choice label="Speak" active={lang.can_speak} onPress={() => update({ can_speak: !lang.can_speak })} />
              <Choice label="Understand" active={lang.can_understand} onPress={() => update({ can_understand: !lang.can_understand })} />
            </View>
          </>
        )
      }}
    />
  )
}

// ── Step 5: Education & Skills ─────────────────────────────────────────────

function SkillListEditor({
  title,
  hint,
  items,
  onChange,
  max,
  category,
}: {
  title: string
  hint: string
  items: Step5Value['hardSkills']
  onChange: (items: Step5Value['hardSkills']) => void
  max: number
  category: 'technical' | 'soft'
}) {
  return (
    <>
      <RepeatableSection
        title={title}
        hint={hint}
        items={items}
        addLabel="Add skill"
        onAdd={() => items.length < max && onChange([...items, newSkill()])}
        onRemove={(i) => onChange(items.filter((_, idx) => idx !== i))}
        emptyLabel="No skills added yet."
        renderItem={(i) => {
          const skill = items[i]
          const update = (patch: Partial<typeof skill>) => {
            const next = [...items]
            next[i] = { ...skill, ...patch }
            onChange(next)
          }
          return (
            <>
              <Combobox<SkillOption>
                label="Skill name"
                value={skill.name}
                onChangeText={(v) => update({ name: v, source: 'user_added', is_official: false })}
                onSelect={(item) => update({ name: item.name, source: normalizeCatalogSkillSource(item.source), is_official: item.source === 'dole' })}
                search={(q) => seekerService.searchSkills(q, category)}
                renderLabel={(item) => item.name}
                keyExtractor={(item) => String(item.id)}
                placeholder="e.g. MS Excel"
              />
              <ChoiceGroup label="Proficiency" columns={false} options={[{ label: 'Beginner', value: 'beginner' }, { label: 'Intermediate', value: 'intermediate' }, { label: 'Expert', value: 'expert' }]} value={skill.proficiency} onChange={(v) => update({ proficiency: v })} />
            </>
          )
        }}
      />
      <SkillAiSuggestions
        category={category}
        currentSkills={items.map((s) => s.name)}
        onAdd={(item) => {
          if (items.length >= max) return
          onChange([...items, { name: item.name, proficiency: 'intermediate', source: 'system', is_official: false, is_recommended: true }])
        }}
      />
    </>
  )
}

export function Step5Education({ value, onChange, errors }: { value: Step5Value; onChange: (v: Step5Value) => void; errors?: ServerErrors }) {
  const setEducations = (educations: Step5Value['educations']) => onChange({ ...value, educations })

  return (
    <>
      <RepeatableSection
        title="Education Background"
        hint="Add every education record, from highest to earliest."
        items={value.educations}
        minItems={1}
        addLabel="Add education"
        onAdd={() => setEducations([...value.educations, newEducation()])}
        onRemove={(i) => setEducations(value.educations.filter((_, idx) => idx !== i))}
        renderItem={(i) => {
          const edu = value.educations[i]
          const update = (patch: Partial<typeof edu>) => {
            const next = [...value.educations]
            next[i] = { ...edu, ...patch }
            setEducations(next)
          }
          const requiresCourse = COURSE_REQUIRED_LEVELS.includes(edu.level)

          return (
            <>
              <ChoiceGroup label="Level" required options={EDUCATION_LEVEL_OPTIONS} value={edu.level} onChange={(v) => update({ level: v })} error={fieldError(errors, `educations.${i}.level`)} />
              <Field label="Institution" required value={edu.institution_name} onChangeText={(v) => update({ institution_name: v })} error={fieldError(errors, `educations.${i}.institution_name`)} />
              {requiresCourse ? (
                <Field label="Course / Strand / Program" required value={edu.course_strand} onChangeText={(v) => update({ course_strand: v })} error={fieldError(errors, `educations.${i}.course_strand`)} />
              ) : null}
              <ChoiceGroup label="Completion Status" required columns={false} options={[{ label: 'Graduated', value: 'graduated' }, { label: 'Undergraduate', value: 'undergraduate' }, { label: 'Currently studying', value: 'currently_studying' }]} value={edu.completion_status} onChange={(v) => update({ completion_status: v })} />
              <Field label="Year Started" required keyboardType="number-pad" value={edu.year_started} onChangeText={(v) => update({ year_started: v })} error={fieldError(errors, `educations.${i}.year_started`)} />
              {edu.completion_status === 'graduated' ? (
                <Field label="Year Graduated" required keyboardType="number-pad" value={edu.year_graduated} onChangeText={(v) => update({ year_graduated: v })} error={fieldError(errors, `educations.${i}.year_graduated`)} />
              ) : null}
              {edu.completion_status === 'undergraduate' ? (
                <>
                  <Field label="Level Reached" required value={edu.undergrad_level_reached} onChangeText={(v) => update({ undergrad_level_reached: v })} error={fieldError(errors, `educations.${i}.undergrad_level_reached`)} />
                  <Field label="Year Last Attended" required keyboardType="number-pad" value={edu.undergrad_year_last_attended} onChangeText={(v) => update({ undergrad_year_last_attended: v })} error={fieldError(errors, `educations.${i}.undergrad_year_last_attended`)} />
                </>
              ) : null}
              {edu.completion_status === 'currently_studying' ? (
                <Field label="Expected Year of Graduation" keyboardType="number-pad" value={edu.expected_year_graduated} onChangeText={(v) => update({ expected_year_graduated: v })} error={fieldError(errors, `educations.${i}.expected_year_graduated`)} />
              ) : null}
            </>
          )
        }}
      />
      {fieldError(errors, 'educations') ? <Text style={styles.errorText}>{fieldError(errors, 'educations')}</Text> : null}

      <SkillListEditor title="Hard / Technical Skills" hint="Up to 20 skills, combined with DOLE standard skills." items={value.hardSkills} onChange={(hardSkills) => onChange({ ...value, hardSkills })} max={20} category="technical" />
      {fieldError(errors, 'technical_skills') ? <Text style={styles.errorText}>{fieldError(errors, 'technical_skills')}</Text> : null}

      <SkillListEditor title="Soft Skills" hint="Up to 10 interpersonal skills." items={value.soft_skills} onChange={(soft_skills) => onChange({ ...value, soft_skills })} max={10} category="soft" />
      {fieldError(errors, 'soft_skills') ? <Text style={styles.errorText}>{fieldError(errors, 'soft_skills')}</Text> : null}
    </>
  )
}

// ── Step 6: Training & Eligibility ────────────────────────────────────────

export function Step6Training({ value, onChange, errors }: { value: Step6Value; onChange: (v: Step6Value) => void; errors?: ServerErrors }) {
  const setTrainings = (trainings: Step6Value['trainings']) => onChange({ ...value, trainings })
  const setEligibilities = (eligibilities: Step6Value['eligibilities']) => onChange({ ...value, eligibilities })

  return (
    <>
      <InfoNote>Optional. Leave blank if you have no training or license yet.</InfoNote>

      <RepeatableSection
        title="Vocational / Technical Trainings"
        items={value.trainings}
        addLabel="Add training"
        onAdd={() => setTrainings([...value.trainings, newTraining()])}
        onRemove={(i) => setTrainings(value.trainings.filter((_, idx) => idx !== i))}
        renderItem={(i) => {
          const t = value.trainings[i]
          const update = (patch: Partial<typeof t>) => {
            const next = [...value.trainings]
            next[i] = { ...t, ...patch }
            setTrainings(next)
          }
          return (
            <>
              <Field label="Course" required value={t.course} onChangeText={(v) => update({ course: v })} error={fieldError(errors, `trainings.${i}.course`)} />
              <Field label="Training Institution" value={t.training_institution} onChangeText={(v) => update({ training_institution: v })} error={fieldError(errors, `trainings.${i}.training_institution`)} />
              <Field label="Hours of Training" keyboardType="number-pad" value={t.hours_of_training} onChangeText={(v) => update({ hours_of_training: v })} error={fieldError(errors, `trainings.${i}.hours_of_training`)} />
              <Field label="Skills Acquired" multiline value={t.skills_acquired} onChangeText={(v) => update({ skills_acquired: v })} error={fieldError(errors, `trainings.${i}.skills_acquired`)} />
              <Field label="Certificates Received" multiline value={t.certificates_received} onChangeText={(v) => update({ certificates_received: v })} error={fieldError(errors, `trainings.${i}.certificates_received`)} />
            </>
          )
        }}
      />

      <RepeatableSection
        title="Professional Eligibility / Licenses"
        items={value.eligibilities}
        addLabel="Add eligibility"
        onAdd={() => setEligibilities([...value.eligibilities, newEligibility()])}
        onRemove={(i) => setEligibilities(value.eligibilities.filter((_, idx) => idx !== i))}
        renderItem={(i) => {
          const e = value.eligibilities[i]
          const update = (patch: Partial<typeof e>) => {
            const next = [...value.eligibilities]
            next[i] = { ...e, ...patch }
            setEligibilities(next)
          }
          return (
            <>
              <ChoiceGroup label="Type" columns={false} options={[{ label: 'Civil Service', value: 'civil_service' }, { label: 'Professional License', value: 'professional_license' }]} value={e.type} onChange={(v) => update({ type: v })} />
              <Field label="Name" required value={e.name} onChangeText={(v) => update({ name: v })} error={fieldError(errors, `eligibilities.${i}.name`)} />
              <Field label="Date Taken" placeholder="YYYY-MM-DD" value={e.date_taken} onChangeText={(v) => update({ date_taken: v })} error={fieldError(errors, `eligibilities.${i}.date_taken`)} />
              <Field label="Valid Until" placeholder="YYYY-MM-DD" value={e.valid_until} onChangeText={(v) => update({ valid_until: v })} error={fieldError(errors, `eligibilities.${i}.valid_until`)} />
            </>
          )
        }}
      />
    </>
  )
}

// ── Step 7: Work Experience ────────────────────────────────────────────────

export function Step7Experience({ value, onChange, errors }: { value: Step7Value; onChange: (v: Step7Value) => void; errors?: ServerErrors }) {
  const set = (work_experiences: Step7Value['work_experiences']) => onChange({ work_experiences })

  return (
    <>
      <InfoNote>Optional. Leave blank if you are a first-time job seeker.</InfoNote>
      <RepeatableSection
        title="Work Experience"
        items={value.work_experiences}
        addLabel="Add experience"
        onAdd={() => set([...value.work_experiences, newWorkExperience()])}
        onRemove={(i) => set(value.work_experiences.filter((_, idx) => idx !== i))}
        renderItem={(i) => {
          const w = value.work_experiences[i]
          const update = (patch: Partial<typeof w>) => {
            const next = [...value.work_experiences]
            next[i] = { ...w, ...patch }
            set(next)
          }
          return (
            <>
              <Field label="Company Name" required value={w.company_name} onChangeText={(v) => update({ company_name: v })} error={fieldError(errors, `work_experiences.${i}.company_name`)} />
              <Field label="Company Address" value={w.company_address} onChangeText={(v) => update({ company_address: v })} error={fieldError(errors, `work_experiences.${i}.company_address`)} />
              <Field label="Position" required value={w.position} onChangeText={(v) => update({ position: v })} error={fieldError(errors, `work_experiences.${i}.position`)} />
              <Field label="Responsibilities" multiline value={w.responsibilities} onChangeText={(v) => update({ responsibilities: v })} error={fieldError(errors, `work_experiences.${i}.responsibilities`)} />
              <ChoiceGroup label="Employment Status" options={WORK_EMPLOYMENT_STATUS_OPTIONS} value={w.employment_status} onChange={(v) => update({ employment_status: v })} />
              <Field label="Start Date" placeholder="YYYY-MM-DD" value={w.start_date} onChangeText={(v) => update({ start_date: v })} error={fieldError(errors, `work_experiences.${i}.start_date`)} />
              <ToggleGroup label="Currently employed here?" value={w.currently_employed} onChange={(v) => update({ currently_employed: v, end_date: v ? '' : w.end_date })} />
              {!w.currently_employed ? (
                <Field label="End Date" placeholder="YYYY-MM-DD" value={w.end_date} onChangeText={(v) => update({ end_date: v })} error={fieldError(errors, `work_experiences.${i}.end_date`)} />
              ) : null}
              <Field label="Number of Months" keyboardType="number-pad" value={w.number_of_months} onChangeText={(v) => update({ number_of_months: v })} error={fieldError(errors, `work_experiences.${i}.number_of_months`)} />
            </>
          )
        }}
      />
    </>
  )
}

const styles = StyleSheet.create({
  subLabel: { marginTop: spacing.sm, marginBottom: spacing.sm, color: colors.primary, fontSize: typography.title, fontFamily: typography.family.bold },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  choiceRow: { flexDirection: 'row', gap: spacing.md },
  choiceRowItem: { flex: 1 },
  helperText: { marginTop: -spacing.sm, marginBottom: spacing.md, color: colors.subtle, fontSize: typography.small },
  addressHint: { marginTop: -spacing.xs, marginBottom: spacing.sm, color: colors.subtle, fontSize: typography.small, lineHeight: 16 },
  errorText: { marginTop: -spacing.sm, marginBottom: spacing.md, color: colors.danger, fontSize: typography.small, fontFamily: typography.family.medium },
  aiToggle: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.infoBorder, backgroundColor: colors.infoBackground, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.lg },
  aiToggleText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  aiPanel: { borderWidth: 1, borderColor: colors.infoBorder, backgroundColor: colors.infoBackground, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg },
  aiFetchBtn: { alignSelf: 'flex-start', backgroundColor: colors.info, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.xs },
  aiFetchBtnText: { color: colors.white, fontSize: typography.small, fontFamily: typography.family.bold },
  aiRefreshBtn: { alignSelf: 'flex-start', marginTop: spacing.sm },
  aiLoading: { marginTop: spacing.md },
  aiNotice: { marginTop: spacing.sm, color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
  aiChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  aiChip: { borderWidth: 1, borderColor: colors.info, backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  aiChipAdded: { borderColor: colors.successBorder, backgroundColor: colors.successBackground },
  aiChipText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  aiChipTextAdded: { color: colors.success },
})
