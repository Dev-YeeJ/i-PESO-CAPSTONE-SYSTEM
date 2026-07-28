import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme'
import { seekerService, type AiSuggestionItem, type OccupationOption, type SkillOption } from '@/services/seekerService'
import { Combobox } from './Combobox'
import {
  Choice,
  ChoiceGroup,
  Field,
  InfoNote,
  RepeatableSection,
  ToggleGroup,
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
const RELIGION_OPTIONS = [
  'roman_catholic', 'islam', 'iglesia_ni_cristo', 'aglipayan', 'evangelical',
  'seventh_day_adventist', 'jehovah_witness', 'buddhist', 'hindu', 'jewish',
  'agnostic_atheist', 'declined', 'other',
].map((v) => ({ label: v.replace(/_/g, ' '), value: v }))
const DISABILITY_OPTIONS = ['visual', 'hearing', 'speech', 'mental', 'physical', 'others', 'none']
const SELF_EMPLOYED_OPTIONS = [
  'fisherman_fisherfolk', 'vendor_retailer', 'home_based_worker', 'transport',
  'domestic_worker', 'freelancer', 'artisan_craft_worker', 'others',
].map((v) => ({ label: v.replace(/_/g, ' '), value: v }))
const UNEMPLOYMENT_REASON_OPTIONS = [
  'fresh_graduate', 'finished_contract', 'resigned', 'retired',
  'terminated_local', 'terminated_abroad', 'terminated_calamity', 'others',
].map((v) => ({ label: v.replace(/_/g, ' '), value: v }))
const LANGUAGE_OPTIONS = [
  'english', 'filipino', 'cebuano', 'ilocano', 'hiligaynon', 'bikol', 'waray',
  'pangasinan', 'kapampangan', 'maranao', 'maguindanao', 'tausug', 'mandarin',
  'spanish', 'japanese', 'korean', 'arabic', 'french', 'german', 'others',
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
const WORK_EMPLOYMENT_STATUS_OPTIONS = [
  'permanent', 'contractual', 'part_time', 'project_based', 'casual', 'probationary',
  'temporary', 'seasonal', 'internship', 'ojt', 'freelance', 'self_employed',
].map((v) => ({ label: v.replace(/_/g, ' '), value: v }))

function SubLabel({ children }: { children: string }) {
  return <Text style={styles.subLabel}>{children}</Text>
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
      <ChoiceGroup label="Suffix" options={SUFFIX_OPTIONS} value={value.suffix} onChange={(v) => set('suffix', v)} />
      <Field label="Date of Birth" required placeholder="YYYY-MM-DD" value={value.date_of_birth} onChangeText={(v) => set('date_of_birth', v)} error={fieldError(errors, 'date_of_birth')} />
      <ChoiceGroup label="Sex" required columns={false} options={[{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }]} value={value.sex} onChange={(v) => set('sex', v)} />
      <ChoiceGroup label="Civil Status" required options={['single', 'married', 'widowed', 'separated'].map((v) => ({ label: v, value: v }))} value={value.civil_status} onChange={(v) => set('civil_status', v)} />
      <ChoiceGroup label="Religion" required options={RELIGION_OPTIONS} value={value.religion} onChange={(v) => set('religion', v)} />
      {value.religion === 'other' ? (
        <Field label="Specify Religion" required value={value.religion_other} onChangeText={(v) => set('religion_other', v)} error={fieldError(errors, 'religion_other')} />
      ) : null}
      <Field label="Height (ft)" required placeholder="e.g. 5.4" keyboardType="decimal-pad" value={value.height_ft} onChangeText={(v) => set('height_ft', v)} error={fieldError(errors, 'height_ft')} />
      <Field label="TIN (optional)" value={value.tin} onChangeText={(v) => set('tin', v)} keyboardType="number-pad" error={fieldError(errors, 'tin')} />

      <SubLabel>Present Address</SubLabel>
      <Field label="Province" required value={value.address_province} onChangeText={(v) => set('address_province', v)} error={fieldError(errors, 'address_province')} />
      <Field label="City / Municipality" required value={value.address_municipality_city} onChangeText={(v) => set('address_municipality_city', v)} error={fieldError(errors, 'address_municipality_city')} />
      <Field label="Barangay" required value={value.address_barangay} onChangeText={(v) => set('address_barangay', v)} error={fieldError(errors, 'address_barangay')} />
      <Field label="House No. / Street" required value={value.address_house_street} onChangeText={(v) => set('address_house_street', v)} error={fieldError(errors, 'address_house_street')} />

      <SubLabel>Disability Disclosure</SubLabel>
      <View style={styles.choiceGrid}>
        {DISABILITY_OPTIONS.map((option) => (
          <Choice key={option} label={option} active={value.disabilities.includes(option)} onPress={() => toggleDisability(option)} />
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
              <ChoiceGroup label="Self-employed Type" options={SELF_EMPLOYED_OPTIONS} value={value.self_employed_type} onChange={(v) => set('self_employed_type', v)} error={fieldError(errors, 'self_employed_type')} />
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
          <ChoiceGroup label="Reason" options={UNEMPLOYMENT_REASON_OPTIONS} value={value.unemployment_reason} onChange={(v) => set('unemployment_reason', v)} error={fieldError(errors, 'unemployment_reason')} />
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
        <Field label="4Ps Household ID" required placeholder="00-00-00-000-00000" value={value.household_id_4ps} onChangeText={(v) => set('household_id_4ps', v)} error={fieldError(errors, 'household_id_4ps')} />
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
          <Combobox<OccupationOption>
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
              next[i] = { raw_job_title: item.title, occupation_id: item.id, general_term: item.general_term ?? null, source: 'catalog' }
              set('occupation_preferences', next)
            }}
            search={(q) => seekerService.searchOccupations(q)}
            renderLabel={(item) => item.title}
            renderSubLabel={(item) => item.general_term || item.broad_category}
            keyExtractor={(item) => String(item.id)}
            error={fieldError(errors, `occupation_preferences.${i}.raw_job_title`)}
          />
        )}
      />
      {fieldError(errors, 'occupation_preferences') ? <Text style={styles.errorText}>{fieldError(errors, 'occupation_preferences')}</Text> : null}

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
  subLabel: { marginTop: spacing.sm, marginBottom: spacing.sm, color: colors.primary, fontSize: typography.title, fontWeight: typography.bold },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  errorText: { marginTop: -spacing.sm, marginBottom: spacing.md, color: colors.danger, fontSize: typography.small, fontWeight: typography.medium },
  aiToggle: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.infoBorder, backgroundColor: colors.infoBackground, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.lg },
  aiToggleText: { color: colors.info, fontSize: typography.small, fontWeight: typography.bold },
  aiPanel: { borderWidth: 1, borderColor: colors.infoBorder, backgroundColor: colors.infoBackground, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg },
  aiFetchBtn: { alignSelf: 'flex-start', backgroundColor: colors.info, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.xs },
  aiFetchBtnText: { color: colors.white, fontSize: typography.small, fontWeight: typography.bold },
  aiRefreshBtn: { alignSelf: 'flex-start', marginTop: spacing.sm },
  aiLoading: { marginTop: spacing.md },
  aiNotice: { marginTop: spacing.sm, color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
  aiChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  aiChip: { borderWidth: 1, borderColor: colors.info, backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  aiChipAdded: { borderColor: colors.successBorder, backgroundColor: colors.successBackground },
  aiChipText: { color: colors.info, fontSize: typography.small, fontWeight: typography.semibold },
  aiChipTextAdded: { color: colors.success },
})
