// src/pages/auth/onboarding/SeekerOnboarding.jsx
// Digitizes the NSRP Form 1 (National Skills Registration Program)
// Department of Labor and Employment — Job Seeker Registration Form
import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import OnboardingShell from '@/components/auth/OnboardingShell'
import { seekerRegistrationSteps } from '@/components/auth/registrationJourneys'
import OccupationCombobox from '@/components/form/OccupationCombobox'
import SingleAddressInput from '@/components/form/SingleAddressInput'
import {
  ISO_COUNTRIES,
  SOFT_SKILL_SUGGESTIONS,
  TECHNICAL_SKILL_SUGGESTIONS,
} from '@/data/jobPreferenceVocabularies'
import { searchSkills } from '@/services/skillService'
// ── Add these imports at the top of SeekerOnboarding.jsx ──

import { getProvinces, getCitiesByProvince, getBarangaysByCity } from '@/services/psgcServices'
import {
  detectAddress,
  geocodeAddress,
  resolveAddressSuggestion,
} from '@/services/geoService'

// ── Constants ─────────────────────────────────────────────────────────────

const EDUC_OPTIONS = [
  'Elementary Graduate', 'High School Graduate',
  'Senior High School Graduate', 'Vocational / Technical',
  'College Undergraduate', 'College Graduate',
  "Master's Degree", 'Doctorate',
]

const EDUC_ATTAINMENT_RANK = {
  'Elementary Graduate'         : 1,
  'High School Graduate'        : 2,
  'Senior High School Graduate' : 3,
  'Vocational / Technical'      : 4,
  'College Undergraduate'       : 5,
  'College Graduate'            : 6,
  "Master's Degree"             : 7,
  'Doctorate'                   : 8,
}

const SUFFIX_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'Jr.', label: 'Jr.' },
  { value: 'Sr.', label: 'Sr.' },
  { value: 'II', label: 'II' },
  { value: 'III', label: 'III' },
  { value: 'IV', label: 'IV' },
  { value: 'V', label: 'V' },
]

const RELIGION_OPTIONS = [
  { value: '', label: 'Select religion' },
  { value: 'roman_catholic', label: 'Roman Catholic' },
  { value: 'islam', label: 'Islam' },
  { value: 'iglesia_ni_cristo', label: 'Iglesia ni Cristo' },
  { value: 'aglipayan', label: 'Aglipayan (Philippine Independent Church)' },
  { value: 'evangelical', label: 'Evangelical / Born Again' },
  { value: 'seventh_day_adventist', label: 'Seventh-day Adventist' },
  { value: 'jehovah_witness', label: 'Jehovah\'s Witness' },
  { value: 'buddhist', label: 'Buddhist' },
  { value: 'hindu', label: 'Hindu' },
  { value: 'jewish', label: 'Jewish' },
  { value: 'agnostic_atheist', label: 'Agnostic / Atheist' },
  { value: 'declined', label: 'Declined to answer' },
  { value: 'other', label: 'Other (please specify)' },
]

// Helper function to calculate age
const calculateAge = (birthDate) => {
  if (!birthDate) return 0
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// Helper to capitalize proper names
const capitalizeName = (str) => {
  if (!str) return ''
  return str
    .split(/(\s+)/)
    .map((part) => (
      /^\s+$/.test(part)
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ))
    .join('')
}

const inferEducationalAttainment = (educations = []) => {
  const inferred = educations
    .map((education) => {
      if (!education?.level) return null

      const completionStatus = education.completion_status || (education.year_graduated ? 'graduated' : 'undergraduate')
      const isGraduated = completionStatus === 'graduated'
      const normalizedCourse = String(education.course_strand ?? '').toLowerCase()

      switch (education.level) {
        case 'elementary':
          return isGraduated ? 'Elementary Graduate' : null
        case 'secondary_non_k12':
          return isGraduated ? 'High School Graduate' : null
        case 'secondary_k12':
        case 'senior_high_strand':
          return isGraduated ? 'Senior High School Graduate' : null
        case 'tertiary':
          return isGraduated ? 'College Graduate' : 'College Undergraduate'
        case 'graduate_studies':
          if (!isGraduated) return null
          return /\b(phd|ph\.d|doctor|doctorate|juris doctor)\b/i.test(normalizedCourse)
            ? 'Doctorate'
            : "Master's Degree"
        default:
          return null
      }
    })
    .filter(Boolean)

  if (!inferred.length) return ''

  return inferred.sort((left, right) => (
    (EDUC_ATTAINMENT_RANK[right] || 0) - (EDUC_ATTAINMENT_RANK[left] || 0)
  ))[0]
}

const format4PsHouseholdId = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 14)
  const groups = [2, 2, 2, 3, 5]
  const parts = []
  let offset = 0

  for (const size of groups) {
    const part = digits.slice(offset, offset + size)
    if (!part) break
    parts.push(part)
    offset += size
  }

  return parts.join('-')
}

const isComplete4PsHouseholdId = (value) => /^\d{2}-\d{2}-\d{2}-\d{3}-\d{5}$/.test(value ?? '')

const DISABILITY_OPTIONS = [
  { value: 'visual',   label: 'Visual' },
  { value: 'hearing',  label: 'Hearing' },
  { value: 'speech',   label: 'Speech' },
  { value: 'mental',   label: 'Mental/Intellectual' },
  { value: 'physical', label: 'Physical' },
  { value: 'others',   label: 'Others (specify)' },
  { value: 'none',     label: 'No Disability' },
]

const SELF_EMPLOYED_TYPES = [
  { value: 'fisherman_fisherfolk',  label: 'Fisherman/Fisherfolk' },
  { value: 'vendor_retailer',       label: 'Vendor/Retailer' },
  { value: 'home_based_worker',     label: 'Home-based Worker' },
  { value: 'transport',             label: 'Transport/Courier' },
  { value: 'domestic_worker',       label: 'Domestic Worker' },
  { value: 'freelancer',            label: 'Freelancer' },
  { value: 'artisan_craft_worker',  label: 'Artisan/Craft Worker' },
  { value: 'others',                label: 'Others (specify)' },
]

const UNEMPLOYMENT_REASONS = [
  { value: 'fresh_graduate',      label: 'New Entrant / Fresh Graduate' },
  { value: 'finished_contract',   label: 'Finished Contract' },
  { value: 'resigned',            label: 'Resigned' },
  { value: 'retired',             label: 'Retired' },
  { value: 'terminated_local',    label: 'Terminated/Laid off (Local)' },
  { value: 'terminated_abroad',   label: 'Terminated/Laid off Abroad' },
  { value: 'terminated_calamity', label: 'Terminated due to Calamity' },
  { value: 'others',              label: 'Others (specify)' },
]

const LANGUAGES = [
  'English',
  'Filipino',
  'Cebuano',
  'Ilocano',
  'Hiligaynon',
  'Bikol',
  'Waray',
  'Pangasinan',
  'Kapampangan',
  'Maranao',
  'Maguindanao',
  'Tausug',
  'Mandarin',
  'Spanish',
  'Japanese',
  'Korean',
  'Arabic',
  'Others',
]

const EDUCATION_LEVELS = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'secondary_non_k12', label: 'Secondary (Non-K12)' },
  { value: 'secondary_k12', label: 'Secondary (K-12)' },
  { value: 'senior_high_strand', label: 'Senior High Strand' },
  { value: 'tertiary', label: 'Tertiary/College' },
  { value: 'graduate_studies', label: 'Graduate Studies/Post-graduate' },
]

const OTHER_SKILLS = [
  { value: 'auto_mechanic', label: 'Auto Mechanic' },
  { value: 'beautician', label: 'Beautician' },
  { value: 'carpentry', label: 'Carpentry Work' },
  { value: 'computer_literate', label: 'Computer Literate' },
  { value: 'domestic_chores', label: 'Domestic Chores' },
  { value: 'driver', label: 'Driver' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'embroidery', label: 'Embroidery' },
  { value: 'gardening', label: 'Gardening' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'painter_artist', label: 'Painter/Artist' },
  { value: 'painting_jobs', label: 'Painting Jobs' },
  { value: 'photography', label: 'Photography' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'sewing_dresses', label: 'Sewing Dresses' },
  { value: 'stenography', label: 'Stenography' },
  { value: 'tailoring', label: 'Tailoring' },
]

const ELIGIBILITY_TYPES = [
  { value: 'civil_service', label: 'Civil Service Exam/Eligibility' },
  { value: 'professional_license', label: 'Professional License (PRC)' },
]

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contractual', label: 'Contractual' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'probationary', label: 'Probationary' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'seasonal', label: 'Seasonal' },
]

const STEPS = [
  { num: 1, label: 'Personal Info',  icon: '👤', section: 'I' },
  { num: 2, label: 'Employment',     icon: '💼', section: 'II' },
  { num: 3, label: 'Job Preference', icon: '🎯', section: 'III' },
  { num: 4, label: 'Language',       icon: '🌐', section: 'IV' },
  { num: 5, label: 'Education',      icon: '🎓', section: 'V' },
  { num: 6, label: 'Training & Elig.', icon: '📜', section: 'VI' },
  { num: 7, label: 'Work Experience', icon: '💪', section: 'VII' },
]

// ── Reusable sub-components ───────────────────────────────────────────────

const SectionHeader = ({ icon, title, subtitle }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px', padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
    <span style={{ fontSize: '20px' }}>{icon}</span>
    <div>
      <p style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: 0 }}>{title}</p>
      {subtitle && <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0', lineHeight: '1.4' }}>{subtitle}</p>}
    </div>
  </div>
)

const FormField = ({ label, required = true, error, children, help }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '5px' }}>
      {label}
      {required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
    </label>
    {children}
    {help && !error && <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{help}</p>}
    {error && (
      <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        ⚠ {error}
      </p>
    )}
  </div>
)

const inputStyle = (hasError) => ({
  width: '100%', boxSizing: 'border-box',
  padding: '10px 13px', fontSize: '13px',
  color: '#0f172a', backgroundColor: '#ffffff',
  border: `1px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
  borderRadius: '8px', outline: 'none',
  transition: 'border-color 0.15s',
})

const selectStyle = (hasError) => ({
  ...inputStyle(hasError),
  cursor: 'pointer',
})

const HeightInput = ({ value, error, onChange }) => {
  const totalInches = value === '' || value == null
    ? null
    : Math.round(Number(value) * 12)
  const feet = totalInches == null ? '' : Math.floor(totalInches / 12)
  const inches = totalInches == null ? '' : totalInches % 12
  const inchOptions = Array.from({ length: 12 }, (_, option) => option)
    .filter((option) => feet !== 2 || option >= 6)
    .filter((option) => feet !== 8 || option <= 6)

  const updateHeight = (nextFeet, nextInches) => {
    if (nextFeet === '' || nextInches === '') {
      onChange({ target: { name: 'height_ft', value: '' } })
      return
    }

    onChange({
      target: {
        name: 'height_ft',
        value: ((Number(nextFeet) * 12 + Number(nextInches)) / 12).toFixed(2),
      },
    })
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        aria-label="Height feet"
        value={feet}
        onChange={(event) => {
          const nextFeet = Number(event.target.value)
          const nextInches = inches === ''
            ? (nextFeet === 2 ? 6 : 0)
            : Math.min(Math.max(inches, nextFeet === 2 ? 6 : 0), nextFeet === 8 ? 6 : 11)
          updateHeight(event.target.value, nextInches)
        }}
        style={selectStyle(!!error)}
      >
        <option value="">Feet</option>
        {[2, 3, 4, 5, 6, 7, 8].map((option) => (
          <option key={option} value={option}>{option} ft</option>
        ))}
      </select>
      <select
        aria-label="Height inches"
        value={inches}
        onChange={(event) => updateHeight(feet, event.target.value)}
        style={selectStyle(!!error)}
        disabled={feet === ''}
      >
        <option value="">Inches</option>
        {inchOptions.map((option) => (
          <option key={option} value={option}>{option} in</option>
        ))}
      </select>
    </div>
  )
}

// ── Step Progress Indicator ───────────────────────────────────────────────

const StepIndicator = ({ current, completed }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
    {STEPS.map((step, idx) => {
      const isActive    = step.num === current
      const isCompleted = completed.includes(step.num)
      const isLast      = idx === STEPS.length - 1

      return (
        <div key={step.num} style={{ display: 'flex', alignItems: 'center', flex: isLast ? 0 : 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isCompleted ? '16px' : '14px',
              fontWeight: '700',
              backgroundColor: isCompleted ? '#dcfce7' : isActive ? '#0f172a' : '#f1f5f9',
              color: isCompleted ? '#15803d' : isActive ? '#ffffff' : '#94a3b8',
              border: isCompleted ? '2px solid #86efac' : isActive ? '2px solid #0f172a' : '2px solid #e2e8f0',
              transition: 'all 0.3s',
            }}>
              {isCompleted ? '✓' : step.num}
            </div>
            <span style={{
              fontSize: '10px', fontWeight: '600',
              color: isActive ? '#0f172a' : isCompleted ? '#15803d' : '#94a3b8',
              whiteSpace: 'nowrap', letterSpacing: '0.2px',
            }}>
              {step.label}
            </span>
          </div>

          {!isLast && (
            <div style={{
              flex: 1, height: '2px', margin: '0 4px 20px',
              backgroundColor: isCompleted ? '#86efac' : '#e2e8f0',
              transition: 'background-color 0.3s',
            }} />
          )}
        </div>
      )
    })}
  </div>
)

// ── STEP 1: Personal Information ──────────────────────────────────────────

// ── Step1 component — replaces the existing one ──────────────────────────
const Step1 = ({ form, errors, onChange, user, onGpsDetect, onAddressSelect, gpsState }) => {
  return (
    <div>
      <SectionHeader
        icon="👤"
        title="I. PERSONAL INFORMATION"
        subtitle="As required by DOLE NSRP Form 1 — September 2020"
      />

      {/* Pre-filled info banner */}
      <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', color: '#15803d', marginBottom: '8px' }}>✓ Pre-filled from your registration</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {[
            { label: 'Email',  value: user?.email },
            { label: 'Mobile', value: user?.mobile_number },
          ].map((item) => (
            <div key={item.label}>
              <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', margin: 0 }}>{item.value || 'N/A'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Name row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FormField label="Surname" error={errors.last_name}>
          <input style={inputStyle(!!errors.last_name)} name="last_name"
            value={form.last_name ?? ''} onChange={onChange} placeholder="dela Cruz" />
        </FormField>
        <FormField label="First Name" error={errors.first_name}>
          <input style={inputStyle(!!errors.first_name)} name="first_name"
            value={form.first_name ?? ''} onChange={onChange} placeholder="Juan" />
        </FormField>
        <FormField label="Middle Name" required={false} error={errors.middle_name}>
          <input style={inputStyle(!!errors.middle_name)} name="middle_name"
            value={form.middle_name ?? ''} onChange={onChange} placeholder="Santos" />
        </FormField>
        <FormField label="Suffix" required={false} error={errors.suffix}>
          <select style={selectStyle(!!errors.suffix)} name="suffix"
            value={form.suffix ?? ''} onChange={onChange}>
            {SUFFIX_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FormField>
      </div>

      {/* Personal details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FormField label="Date of Birth" error={errors.date_of_birth}>
          <input type="date" style={inputStyle(!!errors.date_of_birth)} name="date_of_birth"
            value={form.date_of_birth ?? ''} onChange={onChange}
            max={new Date().toISOString().split('T')[0]} />
        </FormField>
        <FormField label="Sex" error={errors.sex}>
          <select style={selectStyle(!!errors.sex)} name="sex"
            value={form.sex ?? ''} onChange={onChange}>
            <option value="">Select sex</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </FormField>
        <FormField label="Civil Status" error={errors.civil_status}>
          <select style={selectStyle(!!errors.civil_status)} name="civil_status"
            value={form.civil_status ?? ''} onChange={onChange}>
            <option value="">Select status</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="widowed">Widowed</option>
            <option value="separated">Separated</option>
          </select>
        </FormField>
        <FormField label="Religion" error={errors.religion}>
          <select style={selectStyle(!!errors.religion)} name="religion"
            value={form.religion ?? ''} onChange={onChange}>
            {RELIGION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FormField>
        {form.religion === 'other' && (
          <FormField label="Please specify your religion" error={errors.religion_other}>
            <input style={inputStyle(!!errors.religion_other)} name="religion_other"
              value={form.religion_other ?? ''} onChange={onChange} placeholder="Specify your religion" />
          </FormField>
        )}
        <FormField label="Height" error={errors.height_ft} help="Select feet and inches">
          <HeightInput value={form.height_ft} error={errors.height_ft} onChange={onChange} />
        </FormField>
        <FormField label="TIN (Tax Identification No.)" required={false} error={errors.tin}>
          <input style={inputStyle(!!errors.tin)} name="tin"
            value={form.tin ?? ''} onChange={onChange} placeholder="Optional" />
        </FormField>
      </div>



      {/* ── ADDRESS SECTION ── */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginBottom: '4px' }}>
        <AddressSection
          form={form}
          errors={errors}
          onChange={onChange}
          gpsState={gpsState}
          onGpsDetect={onGpsDetect}
          onAddressSelect={onAddressSelect}
        />
      </div>

      {/* Disability Section */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginBottom: '4px' }}>
        <SectionHeader icon="♿" title="DISABILITY STATUS" subtitle="Check all that apply. Select 'No Disability' if none." />
      </div>

      <FormField label="Disability" error={errors.disabilities}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {DISABILITY_OPTIONS.map((opt) => {
            const checked = (form.disabilities ?? []).includes(opt.value)
            return (
              <label
                key={opt.value}
                style={{
                  display        : 'flex',
                  alignItems     : 'center',
                  gap            : '8px',
                  padding        : '8px 10px',
                  borderRadius   : '8px',
                  border         : `1px solid ${checked ? '#bfdbfe' : '#e2e8f0'}`,
                  backgroundColor: checked ? '#eff6ff' : '#fafafa',
                  cursor         : 'pointer',
                  fontSize       : '13px',
                  color          : checked ? '#1d4ed8' : '#374151',
                  fontWeight     : checked ? '600' : '400',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const current = form.disabilities ?? []
                    let next
                    if (opt.value === 'none') {
                      next = e.target.checked ? ['none'] : []
                    } else {
                      next = e.target.checked
                        ? [...current.filter((v) => v !== 'none'), opt.value]
                        : current.filter((v) => v !== opt.value)
                    }
                    onChange({ target: { name: 'disabilities', value: next } })
                    if (opt.value === 'others' && !e.target.checked) {
                      onChange({ target: { name: 'disability_specification', value: '' } })
                    }
                  }}
                  style={{ accentColor: '#1d4ed8' }}
                />
                {opt.label}
              </label>
            )
          })}
        </div>
      </FormField>

      {(form.disabilities ?? []).includes('others') && (
        <FormField label="Please specify disability" error={errors.disability_specification}>
          <input
            style={inputStyle(!!errors.disability_specification)}
            name="disability_specification"
            value={form.disability_specification ?? ''}
            onChange={onChange}
            placeholder="Specify disability type"
          />
        </FormField>
      )}
    </div>
  )
}

// ── STEP 2: Employment Status ─────────────────────────────────────────────

const Step2 = ({ form, errors, onChange }) => (
  <div>
    <SectionHeader
      icon="💼"
      title="II. EMPLOYMENT STATUS / TYPE"
      subtitle="Indicate your current work situation and OFW status"
    />

    {/* Employed / Unemployed */}
    <FormField label="Current Employment Status" error={errors.employment_status}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          { value: 'employed',   label: '✓ Employed' },
          { value: 'unemployed', label: '✗ Unemployed' },
        ].map((opt) => {
          const active = form.employment_status === opt.value
          return (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', border: `2px solid ${active ? '#1d4ed8' : '#e2e8f0'}`, backgroundColor: active ? '#eff6ff' : '#fafafa', cursor: 'pointer', fontSize: '13px', fontWeight: active ? '700' : '400', color: active ? '#1d4ed8' : '#374151' }}>
              <input type="radio" name="employment_status" value={opt.value} checked={active}
                onChange={onChange} style={{ accentColor: '#1d4ed8' }} />
              {opt.label}
            </label>
          )
        })}
      </div>
    </FormField>

    {/* Employed sub-section */}
    {form.employment_status === 'employed' && (
      <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', color: '#15803d', marginBottom: '12px' }}>EMPLOYMENT TYPE</p>
        <FormField label="Type" error={errors.employment_type}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { value: 'wage_employed', label: 'Wage Employed' },
              { value: 'self_employed', label: 'Self-Employed' },
            ].map((opt) => {
              const active = form.employment_type === opt.value
              return (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${active ? '#86efac' : '#d1fae5'}`, backgroundColor: active ? '#dcfce7' : '#f0fdf4', cursor: 'pointer', fontSize: '12px', fontWeight: active ? '700' : '400', color: '#15803d' }}>
                  <input type="radio" name="employment_type" value={opt.value} checked={active} onChange={onChange} style={{ accentColor: '#15803d' }} />
                  {opt.label}
                </label>
              )
            })}
          </div>
        </FormField>

        {form.employment_type === 'self_employed' && (
          <>
            <FormField label="Type of Self-Employment" error={errors.self_employed_type}>
              <select style={selectStyle(!!errors.self_employed_type)} name="self_employed_type"
                value={form.self_employed_type ?? ''} onChange={onChange}>
                <option value="">Select type</option>
                {SELF_EMPLOYED_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            {form.self_employed_type === 'others' && (
              <FormField label="Please specify" error={errors.self_employed_type_others}>
                <input style={inputStyle(!!errors.self_employed_type_others)} name="self_employed_type_others"
                  value={form.self_employed_type_others ?? ''} onChange={onChange} />
              </FormField>
            )}
          </>
        )}
      </div>
    )}

    {/* Unemployed sub-section */}
    {form.employment_status === 'unemployed' && (
      <div style={{ padding: '16px', backgroundColor: '#fff7ed', borderRadius: '12px', border: '1px solid #fed7aa', marginBottom: '16px' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', color: '#92400e', marginBottom: '12px' }}>UNEMPLOYMENT DETAILS</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Months Unemployed" error={errors.unemployment_months} help="Enter 0 if less than 1 month">
            <input type="number" style={inputStyle(!!errors.unemployment_months)} name="unemployment_months"
              value={form.unemployment_months ?? ''} onChange={onChange} min="0" placeholder="0" />
          </FormField>
          <FormField label="Reason" error={errors.unemployment_reason}>
            <select style={selectStyle(!!errors.unemployment_reason)} name="unemployment_reason"
              value={form.unemployment_reason ?? ''} onChange={onChange}>
              <option value="">Select reason</option>
              {UNEMPLOYMENT_REASONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormField>
        </div>
        {form.unemployment_reason === 'others' && (
          <FormField label="Specify reason" error={errors.unemployment_reason_others}>
            <input style={inputStyle(!!errors.unemployment_reason_others)} name="unemployment_reason_others"
              value={form.unemployment_reason_others ?? ''} onChange={onChange} />
          </FormField>
        )}
        {form.unemployment_reason === 'terminated_abroad' && (
          <FormField label="Country" error={errors.unemployment_terminated_country}>
            <SearchableSingleSelect
              name="unemployment_terminated_country"
              value={form.unemployment_terminated_country}
              onChange={onChange}
              options={ISO_COUNTRIES.map((country) => country.name)}
              placeholder="Type or select a country"
              error={errors.unemployment_terminated_country}
            />
          </FormField>
        )}
      </div>
    )}

    {/* OFW Section */}
    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '8px' }}>
      <SectionHeader icon="✈️" title="OFW STATUS" subtitle="Overseas Filipino Worker information" />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
      {/* Is OFW */}
      <FormField label="Are you currently an OFW?" error={errors.is_ofw}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(({ v, l }) => {
            const active = form.is_ofw === v || form.is_ofw === String(v)
            return (
              <label key={l} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px', borderRadius: '8px', border: `1px solid ${active ? '#bfdbfe' : '#e2e8f0'}`, backgroundColor: active ? '#eff6ff' : '#fafafa', cursor: 'pointer', fontSize: '12px', fontWeight: active ? '700' : '400', color: active ? '#1d4ed8' : '#374151' }}>
                <input type="radio" name="is_ofw" value={String(v)} checked={form.is_ofw === v || form.is_ofw === String(v)}
                  onChange={(e) => onChange({ target: { name: 'is_ofw', value: e.target.value === 'true' } })}
                  style={{ accentColor: '#1d4ed8' }} />
                {l}
              </label>
            )
          })}
        </div>
      </FormField>

      {/* Is Former OFW */}
      <FormField label="Have you worked abroad before?" error={errors.is_former_ofw}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(({ v, l }) => {
            const active = form.is_former_ofw === v || form.is_former_ofw === String(v)
            return (
              <label key={l} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px', borderRadius: '8px', border: `1px solid ${active ? '#bfdbfe' : '#e2e8f0'}`, backgroundColor: active ? '#eff6ff' : '#fafafa', cursor: 'pointer', fontSize: '12px', fontWeight: active ? '700' : '400', color: active ? '#1d4ed8' : '#374151' }}>
                <input type="radio" name="is_former_ofw" value={String(v)} checked={form.is_former_ofw === v || form.is_former_ofw === String(v)}
                  onChange={(e) => onChange({ target: { name: 'is_former_ofw', value: e.target.value === 'true' } })}
                  style={{ accentColor: '#1d4ed8' }} />
                {l}
              </label>
            )
          })}
        </div>
      </FormField>
    </div>

    {(form.is_ofw === true || form.is_ofw === 'true') && (
      <FormField label="Country of Employment" error={errors.ofw_country}>
        <SearchableSingleSelect
          name="ofw_country"
          value={form.ofw_country}
          onChange={onChange}
          options={ISO_COUNTRIES.map((country) => country.name)}
          placeholder="Type or select a country"
          error={errors.ofw_country}
        />
      </FormField>
    )}

    {(form.is_former_ofw === true || form.is_former_ofw === 'true') && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FormField label="Last Country of Employment" error={errors.former_ofw_country}>
          <SearchableSingleSelect
            name="former_ofw_country"
            value={form.former_ofw_country}
            onChange={onChange}
            options={ISO_COUNTRIES.map((country) => country.name)}
            placeholder="Type or select a country"
            error={errors.former_ofw_country}
          />
        </FormField>
        <FormField label="Date Returned to Philippines" error={errors.former_ofw_return_date}>
          <input type="date" style={inputStyle(!!errors.former_ofw_return_date)} name="former_ofw_return_date"
            value={form.former_ofw_return_date ?? ''} onChange={onChange} max={new Date().toISOString().split('T')[0]} />
        </FormField>
      </div>
    )}

    {/* 4Ps */}
    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '8px' }}>
      <SectionHeader icon="🏛️" title="4Ps BENEFICIARY" subtitle="Pantawid Pamilyang Pilipino Program" />
    </div>

    <FormField label="Are you a 4Ps beneficiary?" error={errors.is_4ps_beneficiary}>
      <div style={{ display: 'flex', gap: '10px' }}>
        {[{ v: true, l: '✓ Yes, I am a 4Ps beneficiary' }, { v: false, l: '✗ No' }].map(({ v, l }) => {
          const active = form.is_4ps_beneficiary === v || form.is_4ps_beneficiary === String(v)
          return (
            <label key={l} style={{ flex: v ? 2 : 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${active ? '#bfdbfe' : '#e2e8f0'}`, backgroundColor: active ? '#eff6ff' : '#fafafa', cursor: 'pointer', fontSize: '12px', fontWeight: active ? '700' : '400', color: active ? '#1d4ed8' : '#374151' }}>
              <input type="radio" name="is_4ps_beneficiary" value={String(v)} checked={form.is_4ps_beneficiary === v || form.is_4ps_beneficiary === String(v)}
                onChange={(e) => onChange({ target: { name: 'is_4ps_beneficiary', value: e.target.value === 'true' } })}
                style={{ accentColor: '#1d4ed8' }} />
              {l}
            </label>
          )
        })}
      </div>
    </FormField>

    {(form.is_4ps_beneficiary === true || form.is_4ps_beneficiary === 'true') && (
      <FormField label="4Ps Household ID" error={errors.household_id_4ps}>
        <input
          style={inputStyle(!!errors.household_id_4ps)}
          name="household_id_4ps"
          value={form.household_id_4ps ?? ''}
          onChange={onChange}
          placeholder="00-00-00-000-00000"
          inputMode="numeric"
          autoComplete="off"
          maxLength={18}
          aria-describedby="household-id-4ps-hint"
        />
        <p id="household-id-4ps-hint" style={{ margin: '6px 0 0', color: '#64748b', fontSize: '11px' }}>
          Enter the 14-digit household ID. Dashes are added automatically.
        </p>
      </FormField>
    )}
  </div>
)

// ── STEP 3: Job Preferences ───────────────────────────────────────────────

const PreferenceTags = ({ items, onRemove }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: items.length ? '10px' : 0 }}>
    {items.map((item) => (
      <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 9px', borderRadius: '999px', backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '11px', fontWeight: '700' }}>
        {item}
        <button type="button" onClick={() => onRemove(item)} aria-label={`Remove ${item}`} style={{ border: 0, background: 'transparent', color: '#1d4ed8', cursor: 'pointer', padding: 0, fontWeight: '900' }}>x</button>
      </span>
    ))}
  </div>
)

const normalizeChoice = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase()

const SearchableSingleSelect = ({ name, value, onChange, options, placeholder, error }) => {
  const [open, setOpen] = useState(false)
  const normalizedValue = normalizeChoice(value)
  const matches = options
    .filter((option) => normalizeChoice(option).includes(normalizedValue))
    .slice(0, 8)

  const select = (option) => {
    onChange({ target: { name, value: option } })
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        style={inputStyle(!!error)}
        name={name}
        value={value ?? ''}
        onChange={(event) => {
          onChange(event)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
      />
      {open && matches.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 30, top: 'calc(100% + 4px)', left: 0, right: 0, maxHeight: '220px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '10px', backgroundColor: '#fff', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)' }}>
          {matches.map((option) => (
            <button key={option} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => select(option)} style={{ width: '100%', padding: '10px 12px', border: 0, borderBottom: '1px solid #f1f5f9', background: '#fff', color: '#334155', cursor: 'pointer', textAlign: 'left', fontSize: '12px' }}>
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const SearchableMultiSelect = ({ options, selected, onChange, placeholder, limit = 3, error }) => {
  const [query, setQuery] = useState('')
  const pendingSelections = useRef(new Set())
  const search = query.trim().toLowerCase()
  const selectedKeys = new Set(selected.map(normalizeChoice))
  const matches = search
    ? options.filter((option) => option.toLowerCase().includes(search) && !selectedKeys.has(normalizeChoice(option))).slice(0, 8)
    : []

  const add = (option) => {
    const key = normalizeChoice(option)
    if (selected.length >= limit || selectedKeys.has(key) || pendingSelections.current.has(key)) return
    pendingSelections.current.add(key)
    onChange([...selected, option])
    setQuery('')
    setTimeout(() => pendingSelections.current.delete(key), 300)
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          style={inputStyle(!!error)}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={selected.length >= limit ? `Maximum of ${limit} selected` : placeholder}
          disabled={selected.length >= limit}
          autoComplete="off"
        />
        {matches.length > 0 && (
          <div style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0, maxHeight: '220px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '10px', backgroundColor: '#fff', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)' }}>
            {matches.map((option) => (
              <button key={option} type="button" onClick={() => add(option)} style={{ width: '100%', padding: '10px 12px', border: 0, borderBottom: '1px solid #f1f5f9', background: '#fff', color: '#334155', cursor: 'pointer', textAlign: 'left', fontSize: '12px' }}>
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
      <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '11px' }}>{selected.length} of {limit} selected</p>
    </div>
  )
}

const Step3 = ({ form, errors, onChange }) => {
  const [provinceCode, setProvinceCode] = useState('')
  const [provinceOptions, setProvinceOptions] = useState([])
  const [cityOptions, setCityOptions] = useState([])
  const [cityLoading, setCityLoading] = useState(false)

  useEffect(() => {
    getProvinces().then(setProvinceOptions).catch(() => setProvinceOptions([]))
  }, [])

  useEffect(() => {
    if (!provinceCode) return
    getCitiesByProvince(provinceCode)
      .then(setCityOptions)
      .catch(() => setCityOptions([]))
      .finally(() => setCityLoading(false))
  }, [provinceCode])

  const occupations = form.preferred_occupations ?? []
  const locations = form.preferred_locations_details ?? []
  const setField = (name, value) => onChange({ target: { name, value } })
  const selectedProvince = provinceOptions.find((province) => province.code === provinceCode)

  const addLocalLocation = (cityCode) => {
    const city = cityOptions.find((option) => option.code === cityCode)
    if (!city || !selectedProvince || locations.length >= 3) return
    const label = `${city.name}, ${selectedProvince.name}`
    if (!locations.includes(label)) setField('preferred_locations_details', [...locations, label])
  }

  return (
    <div>
      <SectionHeader icon="🎯" title="III. JOB PREFERENCE" subtitle="Select specific standardized occupations and your preferred work locations" />

      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '10px' }}>
          Preferred Occupation <span style={{ color: '#ef4444' }}>*</span>
          <span style={{ fontSize: '11px', fontWeight: '400', color: '#94a3b8', marginLeft: '6px' }}>(at least 1, up to 3)</span>
        </p>
        <OccupationCombobox
          selected={occupations}
          onChange={(value) => setField('preferred_occupations', value)}
          multiple
          limit={3}
          searchLimit={50}
          minimumQueryLength={2}
          placeholder="Search a specific job title or classification code"
          error={errors.preferred_occupations}
        />
        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '7px', lineHeight: '1.5' }}>
          Search official and international job titles from PSOC, O*NET, and ESCO. Select the exact occupation you want; local aliases such as &quot;sekyu&quot; and &quot;kasambahay&quot; are also supported.
        </p>
        {errors.preferred_occupations && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px' }}>{errors.preferred_occupations}</p>}
      </div>

      <FormField label="Preferred Type of Work" error={errors.work_type_preference}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[{ value: 'part_time', label: 'Part-time' }, { value: 'full_time', label: 'Full-time' }].map((opt) => {
            const active = form.work_type_preference === opt.value
            return (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', border: `2px solid ${active ? '#1d4ed8' : '#e2e8f0'}`, backgroundColor: active ? '#eff6ff' : '#fafafa', cursor: 'pointer', fontSize: '13px', fontWeight: active ? '700' : '400', color: active ? '#1d4ed8' : '#374151' }}>
                <input type="radio" name="work_type_preference" value={opt.value} checked={active} onChange={onChange} style={{ accentColor: '#1d4ed8' }} />
                {opt.label}
              </label>
            )
          })}
        </div>
      </FormField>

      <FormField label="Preferred Work Location" error={errors.preferred_work_location}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[{ value: 'local', label: 'Local (Philippines)' }, { value: 'overseas', label: 'Overseas' }].map((opt) => {
            const active = form.preferred_work_location === opt.value
            return (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', border: `2px solid ${active ? '#1d4ed8' : '#e2e8f0'}`, backgroundColor: active ? '#eff6ff' : '#fafafa', cursor: 'pointer', fontSize: '13px', fontWeight: active ? '700' : '400', color: active ? '#1d4ed8' : '#374151' }}>
                <input type="radio" name="preferred_work_location" value={opt.value} checked={active} onChange={(event) => {
                  onChange(event)
                  setField('preferred_locations_details', [])
                  setProvinceCode('')
                }} style={{ accentColor: '#1d4ed8' }} />
                {opt.label}
              </label>
            )
          })}
        </div>
      </FormField>

      {form.preferred_work_location && (
        <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '14px', marginTop: '4px' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
            Select preferred {form.preferred_work_location === 'local' ? 'cities or municipalities' : 'countries'} (up to 3):
          </p>
          <PreferenceTags items={locations} onRemove={(item) => setField('preferred_locations_details', locations.filter((value) => value !== item))} />
          {form.preferred_work_location === 'local' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select style={selectStyle(false)} value={provinceCode} onChange={(event) => {
                const code = event.target.value
                setProvinceCode(code)
                setCityOptions([])
                setCityLoading(Boolean(code))
              }} disabled={locations.length >= 3}>
                <option value="">Select province</option>
                {provinceOptions.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
              </select>
              <select style={selectStyle(false)} value="" onChange={(event) => addLocalLocation(event.target.value)} disabled={!provinceCode || cityLoading || locations.length >= 3}>
                <option value="">{cityLoading ? 'Loading...' : 'Select city/municipality'}</option>
                {cityOptions.map((city) => <option key={city.code} value={city.code}>{city.name}</option>)}
              </select>
            </div>
          ) : (
            <SearchableMultiSelect
              options={ISO_COUNTRIES.map((country) => country.name)}
              selected={locations}
              onChange={(value) => setField('preferred_locations_details', value)}
              placeholder="Search country, e.g. Japan"
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── STEP 4: Language Proficiency ──────────────────────────────────────────

const Step4 = ({ form, onChange, errors }) => {
  const [languageQuery, setLanguageQuery] = useState('')
  const getLangKey = (lang, skill) => `lang_${lang.toLowerCase()}_${skill}`
  const visibleLanguages = LANGUAGES.filter((language) =>
    language.toLowerCase().includes(languageQuery.trim().toLowerCase())
  )
  const selectedLanguageCount = LANGUAGES.filter((language) =>
    ['read', 'write', 'speak', 'understand'].some((skill) => form[getLangKey(language, skill)])
  ).length
  const setAllProficiencies = (language, checked) => {
    for (const skill of ['read', 'write', 'speak', 'understand']) {
      onChange({ target: { name: getLangKey(language, skill), value: checked } })
    }
  }

  return (
    <div>
      <SectionHeader
        icon="🌐"
        title="IV. LANGUAGE / DIALECT PROFICIENCY"
        subtitle="Check all applicable skills per language (NSRP Form 1, Section III)"
      />

      {errors.languages && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#b91c1c' }}>
          ⚠ {errors.languages}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input
          value={languageQuery}
          onChange={(event) => setLanguageQuery(event.target.value)}
          placeholder="Search language or Philippine dialect"
          style={{ ...inputStyle(false), maxWidth: '360px' }}
        />
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>
          {selectedLanguageCount} selected
        </span>
      </div>

      {/* Language table */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflowX: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(4, minmax(58px, 1fr)) 74px', minWidth: '680px', backgroundColor: '#1d4ed8', padding: '10px 14px', gap: '4px' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#fff', margin: 0 }}>LANGUAGE / DIALECT</p>
          {['READ', 'WRITE', 'SPEAK', 'UNDERSTAND'].map((h) => (
            <p key={h} style={{ fontSize: '11px', fontWeight: '700', color: '#bfdbfe', margin: 0, textAlign: 'center' }}>{h}</p>
          ))}
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#bfdbfe', margin: 0, textAlign: 'center' }}>ALL</p>
        </div>

        {/* Rows */}
        {visibleLanguages.map((lang, idx) => {
          const isOthers  = lang === 'Others'
          const otherKey  = 'lang_other_name'
          const isEven    = idx % 2 === 0
          const othersSelected = form[`lang_others_read`] || form[`lang_others_write`] || form[`lang_others_speak`] || form[`lang_others_understand`]
          const hasError   = isOthers && othersSelected && !form[otherKey]?.trim()
          const allChecked = ['read', 'write', 'speak', 'understand'].every((skill) => !!form[getLangKey(lang, skill)])

          return (
            <div key={lang}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(4, minmax(58px, 1fr)) 74px', minWidth: '680px', padding: '10px 14px', gap: '4px', alignItems: 'center', backgroundColor: isEven ? '#f8fafc' : '#fff', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  {isOthers ? (
                    <input
                      style={{ ...inputStyle(hasError), padding: '6px 10px', fontSize: '12px' }}
                      name={otherKey}
                      value={form[otherKey] ?? ''}
                      onChange={onChange}
                      placeholder="Specify language"
                    />
                  ) : (
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: 0 }}>{lang}</p>
                  )}
                </div>
                {['read', 'write', 'speak', 'understand'].map((skill) => {
                  const key     = getLangKey(lang, skill)
                  const checked = !!form[key]
                  return (
                    <div key={skill} style={{ display: 'flex', justifyContent: 'center' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => onChange({ target: { name: key, value: e.target.checked } })}
                        style={{ width: '18px', height: '18px', accentColor: '#1d4ed8', cursor: 'pointer' }}
                      />
                    </div>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setAllProficiencies(lang, !allChecked)}
                  style={{
                    justifySelf: 'center',
                    border: `1px solid ${allChecked ? '#93c5fd' : '#cbd5e1'}`,
                    borderRadius: '7px',
                    padding: '5px 8px',
                    backgroundColor: allChecked ? '#dbeafe' : '#fff',
                    color: allChecked ? '#1d4ed8' : '#64748b',
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {allChecked ? 'Clear' : 'All'}
                </button>
              </div>
              {hasError && (
                <p style={{ fontSize: '11px', color: '#ef4444', padding: '4px 14px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ⚠ Please specify the language
                </p>
              )}
            </div>
          )
        })}
        {visibleLanguages.length === 0 && (
          <p style={{ margin: 0, padding: '18px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
            No language found. Use “Others” to enter another language or dialect.
          </p>
        )}
      </div>

      <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', lineHeight: '1.5' }}>
        Select only the abilities you can use. “All” marks read, write, speak, and understand for that language.
      </p>
    </div>
  )
}

// ── Handles all address dropdown state including API loading ──────────────

const SelectDropdown = ({ label, name, codeName, codeValue, options, loading, disabled, dimmed, error, onChange, placeholder }) => (
  <FormField label={label} error={error}>
    <div style={{ position: 'relative', opacity: dimmed ? 0.55 : 1, transition: 'opacity 0.2s' }}>
      <select
        style={{
          ...selectStyle(!!error),
          opacity: disabled || loading ? 0.7 : 1,
          paddingRight: '36px',
        }}
        value={codeValue ?? ''}
        disabled={disabled || loading}
        onChange={(e) => {
          const selected = options.find((o) => o.code === e.target.value)
          // Fire two changes: the code (for API cascade) and the name (for display/storage)
          onChange({ target: { name: codeName, value: e.target.value } })
          onChange({ target: { name,           value: selected?.name ?? '' } })
        }}
      >
        <option value="">
          {loading ? 'Loading…' : disabled ? placeholder : `Select ${label.toLowerCase()}`}
        </option>
        {options.map((o) => (
          <option key={o.code} value={o.code}>{o.name}</option>
        ))}
      </select>
      {loading && (
        <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'inline-block', width: '14px', height: '14px', border: '2px solid #e2e8f0', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      )}
    </div>
  </FormField>
)

const AddressSection = ({ form, errors, onChange, gpsState, onGpsDetect, onAddressSelect }) => {
  const [provinces,  setProvinces]  = useState([])
  const [cities,     setCities]     = useState([])
  const [barangays,  setBarangays]  = useState([])
  const [loadingProv, setLoadingProv] = useState(false)
  const [loadingCity, setLoadingCity] = useState(false)
  const [loadingBrgy, setLoadingBrgy] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [showOfficialFields, setShowOfficialFields] = useState(false)
  const [addressDisplayValue, setAddressDisplayValue] = useState('')
  const [apiError,   setApiError]   = useState(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const houseStreetRef = useRef(null)

  const guideAddressCompletion = (matched) => {
    const needsCompletion = !matched?.isComplete
    setShowOfficialFields(needsCompletion)
    if (needsCompletion) setFocusRequest((request) => request + 1)
  }

  const handleAddressParsed = (address) => {
    if (address.street) {
      onChange({ target: { name: 'address_house_street', value: address.street } })
    }
  }

  const handlePlaceResolved = async (place) => {
    setIsLocating(true)

    try {
      const matched = await onAddressSelect(place)
      if (matched) {
        guideAddressCompletion(matched)
      }
    } finally {
      setIsLocating(false)
    }
  }

  const handleCurrentLocation = async () => {
    const matched = await onGpsDetect()
    if (!matched) return

    setAddressDisplayValue(
      matched.displayName
      || [
        matched.houseStreet,
        matched.barangay?.name,
        matched.city?.name,
        matched.province?.name,
      ].filter(Boolean).join(', ')
    )
    guideAddressCompletion(matched)
  }

  useEffect(() => {
    if (!focusRequest || !showOfficialFields) return undefined

    const frame = window.requestAnimationFrame(() => houseStreetRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [focusRequest, showOfficialFields])

  // ── Load provinces on mount ───────────────────────────────────────────
  useEffect(() => {
    let isMounted = true
    // Loading state starts with the request initiated by this mount effect.
    setLoadingProv(true)
    setApiError(null)
    getProvinces()
      .then((data) => { if (isMounted) setProvinces(data) })
      .catch(() => { if (isMounted) setApiError('Failed to load provinces. Please check your internet connection.') })
      .finally(() => { if (isMounted) setLoadingProv(false) })
    return () => { isMounted = false }
  }, [])

  // ── Load cities when province changes ────────────────────────────────
  useEffect(() => {
    let isMounted = true
    if (!form.address_province_code) {
      // Reset dependent options when the parent selection is cleared.
      setCities([])
      setBarangays([])
      return
    }
    setLoadingCity(true)
    setCities([])
    setBarangays([])
    getCitiesByProvince(form.address_province_code)
      .then((data) => { if (isMounted) setCities(data) })
      .catch(() => { if (isMounted) setApiError('Failed to load cities. Please try again.') })
      .finally(() => { if (isMounted) setLoadingCity(false) })
    return () => { isMounted = false }
  }, [form.address_province_code])

  // ── Load barangays when city changes ─────────────────────────────────
  useEffect(() => {
    let isMounted = true
    if (!form.address_city_code) {
      // Reset dependent options when the parent selection is cleared.
      setBarangays([])
      return
    }
    setLoadingBrgy(true)
    setBarangays([])
    getBarangaysByCity(form.address_city_code)
      .then((data) => { if (isMounted) setBarangays(data) })
      .catch(() => { if (isMounted) setApiError('Failed to load barangays. Please try again.') })
      .finally(() => { if (isMounted) setLoadingBrgy(false) })
    return () => { isMounted = false }
  }, [form.address_city_code])

  const hasCompleteOfficialLocation = Boolean(
    form.address_province_code && form.address_city_code && form.address_barangay_code
  )
  const hasPartialOfficialLocation = Boolean(
    !hasCompleteOfficialLocation
    && (form.address_province || form.address_municipality_city || form.address_barangay)
  )
  const gpsMissingFields = gpsState.success
    ? [
        !form.address_province_code && 'province',
        !form.address_city_code && 'city',
        !form.address_barangay_code && 'barangay',
        !form.address_house_street?.trim() && 'houseStreet',
      ].filter(Boolean)
    : []
  const gpsNeedsCompletion = gpsState.success && gpsMissingFields.length > 0
  const gpsCityName = form.address_city_code
    ? (form.address_municipality_city || gpsState.cityName)
    : null
  const needsProvince = gpsMissingFields.includes('province')
  const needsCity = gpsMissingFields.includes('city')
  const needsBarangay = gpsMissingFields.includes('barangay')
  const needsHouseStreet = gpsMissingFields.includes('houseStreet')
  const completionInstruction = [
    needsProvince && 'select your Province',
    needsCity && 'select your Municipality / City',
    needsBarangay && 'select your specific Barangay',
    needsHouseStreet && 'enter your exact Street/House No.',
  ].filter(Boolean).join(' and ')
  const manualFieldsVisible = showOfficialFields || Boolean(
    errors.address_house_street
    || errors.address_province
    || errors.address_municipality_city
    || errors.address_barangay
  )

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Present address</p>
        <p style={{ fontSize: '11px', color: '#64748b', margin: '3px 0 0' }}>
          Search and select your complete Philippine address.
        </p>
      </div>

      <div>
        <SingleAddressInput
          label=""
          value={addressDisplayValue}
          onAddressParsed={handleAddressParsed}
          onPlaceResolved={handlePlaceResolved}
          placeholder="Search house, street, barangay, or city"
        />

        <div className="mt-2">
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={gpsState.loading}
            className="border-0 bg-transparent p-0 text-[11px] font-semibold text-blue-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {gpsState.loading ? 'Finding location...' : 'Use current location'}
          </button>
        </div>

        <p className="mt-2 text-[11px] text-slate-500">
          {manualFieldsVisible ? (
            <button
              type="button"
              onClick={() => setShowOfficialFields(false)}
              className="border-0 bg-transparent p-0 font-semibold text-slate-600 hover:text-blue-700 hover:underline"
            >
              Hide manual entry
            </button>
          ) : (
            <>
              Can&apos;t find your address?{' '}
              <button
                type="button"
                onClick={() => setShowOfficialFields(true)}
                className="border-0 bg-transparent p-0 font-semibold text-slate-600 hover:text-blue-700 hover:underline"
              >
                Enter manually
              </button>
            </>
          )}
        </p>
      </div>

      {apiError && (
        <p className="mt-2 text-[11px] text-red-700">{apiError}</p>
      )}

      {gpsState.error && (
        <p className="mt-2 text-[11px] text-red-700">
          {gpsState.error}
        </p>
      )}

      {gpsState.success && !gpsNeedsCompletion && (
        <p className="mt-2 text-[11px] font-semibold text-emerald-700">
          {gpsState.isComplete ? 'Location fully detected.' : 'Address details completed.'}
        </p>
      )}

      {gpsNeedsCompletion && (
        <p className="mt-2 text-[11px] font-semibold text-amber-700">
          {gpsCityName
            ? `We located your town (${gpsCityName}), but please ${completionInstruction || 'complete the missing address details'}.`
            : 'We found part of your location. Please complete the missing address details below.'}
        </p>
      )}

      {hasCompleteOfficialLocation && !manualFieldsVisible && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2">
          <div className="min-w-0">
            <p className="m-0 truncate text-xs text-emerald-800">
              {[form.address_barangay, form.address_municipality_city, form.address_province]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowOfficialFields(true)}
            className="shrink-0 border-0 bg-transparent p-1 text-xs font-semibold text-blue-700 hover:underline"
          >
            Edit
          </button>
        </div>
      )}

      {hasPartialOfficialLocation && !manualFieldsVisible && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span>Some location details need confirmation.</span>
          <button
            type="button"
            onClick={() => setShowOfficialFields(true)}
            className="shrink-0 border-0 bg-transparent p-0 font-semibold text-amber-900 hover:underline"
          >
            Complete
          </button>
        </div>
      )}

      {hasCompleteOfficialLocation && !form.address_house_street && !manualFieldsVisible && (
        <div className="mt-3">
          <FormField label="House No. / Street" error={errors.address_house_street}>
            <input
              ref={houseStreetRef}
              style={inputStyle(!!errors.address_house_street)}
              name="address_house_street"
              value={form.address_house_street ?? ''}
              onChange={onChange}
              placeholder="e.g. 123 Rizal Street, Phase 2"
              autoComplete="street-address"
            />
          </FormField>
        </div>
      )}

      {manualFieldsVisible && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="m-0 text-[11px] font-bold text-slate-600">Manual address</p>
            {form.address_province_code && form.address_city_code && form.address_barangay_code && (
              <button
                type="button"
                onClick={() => setShowOfficialFields(false)}
                className="border-0 bg-transparent p-1 text-xs font-semibold text-blue-700 hover:underline"
              >
                Done
              </button>
            )}
          </div>
          <FormField label="House No. / Street / Village" error={errors.address_house_street}>
            <input
              ref={houseStreetRef}
              style={inputStyle(!!errors.address_house_street)}
              name="address_house_street"
              value={form.address_house_street ?? ''}
              onChange={onChange}
              placeholder="e.g. 123 Rizal Street, Phase 2"
              autoComplete="street-address"
            />
          </FormField>
          <div className="grid gap-3 md:grid-cols-3">
            <SelectDropdown
              label="Province"
              name="address_province"
              codeName="address_province_code"
              value={form.address_province ?? ''}
              codeValue={form.address_province_code ?? ''}
              options={provinces}
              loading={loadingProv}
              disabled={isLocating}
              dimmed={isLocating}
              error={errors.address_province}
              onChange={onChange}
              placeholder="Select province"
            />

            <SelectDropdown
              label="Municipality / City"
              name="address_municipality_city"
              codeName="address_city_code"
              value={form.address_municipality_city ?? ''}
              codeValue={form.address_city_code ?? ''}
              options={cities}
              loading={loadingCity}
              disabled={isLocating || !form.address_province_code}
              dimmed={isLocating}
              error={errors.address_municipality_city}
              onChange={onChange}
              placeholder="Select province first"
            />

            <SelectDropdown
              label="Barangay"
              name="address_barangay"
              codeName="address_barangay_code"
              value={form.address_barangay ?? ''}
              codeValue={form.address_barangay_code ?? ''}
              options={barangays}
              loading={loadingBrgy}
              disabled={isLocating || !form.address_city_code}
              dimmed={isLocating}
              error={errors.address_barangay}
              onChange={onChange}
              placeholder="Select city first"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── STEP 5: EDUCATION & OTHER SKILLS ──────────────────────────────────────

const SkillTagInput = ({ name, value = [], suggestions, category, onChange, placeholder, color = 'blue' }) => {
  const [query, setQuery] = useState('')
  const [catalogSuggestions, setCatalogSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const normalizedValues = new Set(value.map(normalizeChoice))
  const palette = color === 'purple'
    ? { background: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' }
    : { background: '#dbeafe', text: '#1e40af', border: '#93c5fd' }
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const results = await searchSkills(query.trim(), category, 20)
        if (!cancelled) setCatalogSuggestions(results.map((result) => result.name))
      } catch {
        if (!cancelled) setCatalogSuggestions([])
      } finally {
        if (!cancelled) setLoadingSuggestions(false)
      }
    }, 180)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, category])

  const matches = [...new Set([...catalogSuggestions, ...suggestions])]
    .filter((suggestion) =>
      normalizeChoice(suggestion).includes(normalizeChoice(query))
      && !normalizedValues.has(normalizeChoice(suggestion))
    )
    .slice(0, query.trim() ? 12 : 10)

  const update = (nextValue) => onChange({ target: { name, value: nextValue } })
  const add = (rawSkill) => {
    const skill = String(rawSkill ?? '').trim().replace(/\s+/g, ' ')
    if (!skill || normalizedValues.has(normalizeChoice(skill))) return
    update([...value, skill])
    setQuery('')
  }
  const remove = (skill) => update(value.filter((item) => normalizeChoice(item) !== normalizeChoice(skill)))

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              add(query)
            }
          }}
          placeholder={placeholder}
          style={{ ...inputStyle(false), flex: 1 }}
        />
        <button type="button" onClick={() => add(query)} disabled={!query.trim()} style={{ padding: '8px 14px', border: '1px solid #bfdbfe', borderRadius: '8px', backgroundColor: query.trim() ? '#eff6ff' : '#f8fafc', color: query.trim() ? '#1d4ed8' : '#94a3b8', fontSize: '12px', fontWeight: '700', cursor: query.trim() ? 'pointer' : 'not-allowed' }}>
          Add
        </button>
      </div>

      {matches.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '9px' }}>
          {matches.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => add(suggestion)} style={{ border: '1px solid #cbd5e1', borderRadius: '999px', padding: '5px 9px', backgroundColor: '#fff', color: '#475569', fontSize: '11px', cursor: 'pointer' }}>
              + {suggestion}
            </button>
          ))}
        </div>
      )}
      {loadingSuggestions && (
        <p style={{ margin: '7px 0 0', color: '#64748b', fontSize: '10px' }}>Loading O*NET suggestions...</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: value.length ? '12px' : 0 }}>
        {value.map((skill) => (
          <span key={normalizeChoice(skill)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: palette.background, color: palette.text, border: `1px solid ${palette.border}`, padding: '6px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
            {skill}
            <button type="button" onClick={() => remove(skill)} aria-label={`Remove ${skill}`} style={{ background: 'none', border: 0, color: palette.text, cursor: 'pointer', fontSize: '15px', lineHeight: 1, padding: 0 }}>
              x
            </button>
          </span>
        ))}
      </div>
      <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: '10px' }}>
        Choose a suggestion or type your own skill. Press Enter, comma, or Add.
      </p>
    </div>
  )
}

function Step5({ form, errors, onChange, onAddEducation, onRemoveEducation, onUpdateEducation }) {
  const educationTemplate = {
    level: '',
    course_strand: '',
    year_graduated: '',
    undergrad_level_reached: '',
    undergrad_year_last_attended: '',
    completion_status: 'graduated',
  }
  const currentYear = new Date().getFullYear()
  const selectedLevels = (form.educations ?? []).map((education) => education.level).filter(Boolean)
  const availableLevels = EDUCATION_LEVELS.filter((level) => !selectedLevels.includes(level.value))
  const suggestedEducAttainment = inferEducationalAttainment(form.educations)
  const lastSuggestedAttainmentRef = useRef('')

  const getCoursePlaceholder = (level) => {
    if (level === 'senior_high_strand' || level === 'secondary_k12') return 'Track / strand'
    if (level === 'tertiary' || level === 'graduate_studies') return 'Course / degree'
    return 'Course / strand if applicable'
  }

  const getEducationMode = (education) => education.completion_status || (education.year_graduated ? 'graduated' : 'undergraduate')
  const nextEducationTemplate = {
    ...educationTemplate,
    level: availableLevels[0]?.value || '',
  }

  const setEducationMode = (index, mode) => {
    onUpdateEducation(
      'educations',
      index,
      mode === 'graduated'
        ? {
            completion_status: 'graduated',
            undergrad_level_reached: '',
            undergrad_year_last_attended: '',
          }
        : {
            completion_status: 'undergraduate',
            year_graduated: null,
          }
    )
  }

  useEffect(() => {
    if (!suggestedEducAttainment) return

    const currentAttainment = form.educ_attainment ?? ''
    const previousSuggestion = lastSuggestedAttainmentRef.current

    if (!currentAttainment || currentAttainment === previousSuggestion) {
      onChange({ target: { name: 'educ_attainment', value: suggestedEducAttainment } })
    }

    lastSuggestedAttainmentRef.current = suggestedEducAttainment
  }, [form.educ_attainment, onChange, suggestedEducAttainment])

  // ── Helper: Handle DOLE skill checkbox changes ─────────────────────────
  const handleDoleSkillChange = (skillLabel, checked) => {
    const currentDoleSkills = (form.dole_skills ?? []).slice()
    if (checked) {
      if (!currentDoleSkills.includes(skillLabel)) {
        currentDoleSkills.push(skillLabel)
      }
    } else {
      const idx = currentDoleSkills.indexOf(skillLabel)
      if (idx > -1) {
        currentDoleSkills.splice(idx, 1)
      }
    }
    onChange({ target: { name: 'dole_skills', value: currentDoleSkills } })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header: Detailed Educational Background */}
      <SectionHeader
        icon="🎓"
        title="V. DETAILED EDUCATIONAL BACKGROUND"
        subtitle="Set your highest attainment here, then add detailed school history to strengthen matching."
      />

      <div style={{ display: 'grid', gap: '12px', padding: '16px', border: '1px solid #dbeafe', borderRadius: '14px', backgroundColor: '#f8fbff' }}>
        <FormField
          label="Highest Educational Attainment"
          error={errors.educ_attainment}
          help="This education summary is used in your NSRP profile and job matching."
        >
          <select
            style={selectStyle(!!errors.educ_attainment)}
            name="educ_attainment"
            value={form.educ_attainment ?? ''}
            onChange={onChange}
          >
            <option value="">Select attainment</option>
            {EDUC_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </FormField>

        {suggestedEducAttainment && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
            <span style={{ color: '#475569' }}>
              Suggested from your education entries: <strong style={{ color: '#0f172a' }}>{suggestedEducAttainment}</strong>
            </span>
            {form.educ_attainment !== suggestedEducAttainment && (
              <button
                type="button"
                onClick={() => onChange({ target: { name: 'educ_attainment', value: suggestedEducAttainment } })}
                style={{
                  padding: '6px 10px',
                  borderRadius: '999px',
                  border: '1px solid #93c5fd',
                  backgroundColor: '#fff',
                  color: '#1d4ed8',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Use suggestion
              </button>
            )}
          </div>
        )}
      </div>

      {/* Currently in school */}
      <div style={{ display: 'grid', gap: '10px', padding: '16px', border: '1px solid #dbeafe', borderRadius: '14px', backgroundColor: '#f8fbff' }}>
        <div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Are you currently in school?</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
            This helps us interpret unfinished education entries more accurately.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { value: true, label: 'Yes, currently enrolled' },
            { value: false, label: 'No, not currently enrolled' },
          ].map((option) => {
            const active = Boolean(form.currently_in_school) === option.value
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => onChange({ target: { name: 'currently_in_school', value: option.value } })}
                style={{
                  padding: '10px 14px',
                  borderRadius: '999px',
                  border: `1px solid ${active ? '#2563eb' : '#cbd5e1'}`,
                  backgroundColor: active ? '#dbeafe' : '#fff',
                  color: active ? '#1d4ed8' : '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Education table */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#1f2937', margin: 0 }}>Education Levels</h4>
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
              Add one row per level, then complete either the graduated or undergraduate details.
            </p>
          </div>
          <span style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: '700', color: '#475569' }}>
            {selectedLevels.length} / {EDUCATION_LEVELS.length} levels added
          </span>
        </div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#fff' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Level</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Course / Strand</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Completion Details</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: '#475569', width: '50px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {form.educations?.map((edu, i) => {
                const mode = getEducationMode(edu)

                return (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>
                    <select
                      value={edu.level || ''}
                      onChange={(e) => onUpdateEducation('educations', i, { level: e.target.value })}
                      style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    >
                      <option value="">Select level</option>
                      {EDUCATION_LEVELS.map((l) => (
                        <option
                          key={l.value}
                          value={l.value}
                          disabled={selectedLevels.includes(l.value) && edu.level !== l.value}
                        >
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="text"
                      placeholder={getCoursePlaceholder(edu.level)}
                      value={edu.course_strand || ''}
                      onChange={(e) => onUpdateEducation('educations', i, { course_strand: e.target.value })}
                      style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                          { value: 'graduated', label: 'Graduated', accent: '#dbeafe', border: '#93c5fd', text: '#1d4ed8' },
                          { value: 'undergraduate', label: 'Undergraduate', accent: '#ffedd5', border: '#fdba74', text: '#c2410c' },
                        ].map((option) => {
                          const active = mode === option.value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setEducationMode(i, option.value)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '999px',
                                border: `1px solid ${active ? option.border : '#cbd5e1'}`,
                                backgroundColor: active ? option.accent : '#fff',
                                color: active ? option.text : '#475569',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                              }}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>

                      {mode === 'graduated' ? (
                        <div style={{ padding: '10px', border: '1px solid #dbeafe', borderRadius: '8px', backgroundColor: '#f8fbff' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                            Year graduated
                          </label>
                          <input
                            type="number"
                            min="1900"
                            max={currentYear}
                            placeholder="YYYY"
                            value={edu.year_graduated || ''}
                            onChange={(e) => onUpdateEducation('educations', i, { year_graduated: e.target.value || null })}
                            style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #93c5fd', borderRadius: '6px', backgroundColor: '#fff' }}
                          />
                          <p style={{ margin: '8px 0 0', fontSize: '10px', color: '#64748b' }}>
                            Enter the year you completed this level.
                          </p>
                        </div>
                      ) : (
                        <div style={{ padding: '10px', border: '1px solid #fed7aa', borderRadius: '8px', backgroundColor: '#fff7ed' }}>
                          <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: '600', color: '#9a3412' }}>
                            Undergraduate details
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="Level reached"
                              value={edu.undergrad_level_reached || ''}
                              onChange={(e) => onUpdateEducation('educations', i, { undergrad_level_reached: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '6px',
                                fontSize: '13px',
                                border: '1px solid #fdba74',
                                borderRadius: '6px',
                                backgroundColor: '#fff',
                              }}
                            />
                            <input
                              type="number"
                              min="1900"
                              max={currentYear}
                              placeholder="Last attended"
                              value={edu.undergrad_year_last_attended || ''}
                              onChange={(e) => onUpdateEducation('educations', i, { undergrad_year_last_attended: e.target.value || null })}
                              style={{
                                width: '100%',
                                padding: '6px',
                                fontSize: '13px',
                                border: '1px solid #fdba74',
                                borderRadius: '6px',
                                backgroundColor: '#fff',
                              }}
                            />
                          </div>
                          <p style={{ margin: '8px 0 0', fontSize: '10px', color: '#9a3412' }}>
                            Use this if the schooling is unfinished or still ongoing.
                          </p>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onRemoveEducation('educations', i)}
                      style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => onAddEducation('educations', nextEducationTemplate)}
          disabled={selectedLevels.length >= EDUCATION_LEVELS.length}
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            fontSize: '13px',
            color: selectedLevels.length >= EDUCATION_LEVELS.length ? '#94a3b8' : '#1d4ed8',
            backgroundColor: selectedLevels.length >= EDUCATION_LEVELS.length ? '#f8fafc' : '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            cursor: selectedLevels.length >= EDUCATION_LEVELS.length ? 'not-allowed' : 'pointer',
            fontWeight: '700',
          }}
        >
          {availableLevels[0] ? `+ Add ${availableLevels[0].label}` : '+ All levels added'}
        </button>
        {errors.educations && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px' }}>✕ {errors.educations}</p>}
      </div>

      {/* Skills Integration */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px', padding: '14px 16px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
          <span style={{ fontSize: '20px' }}>💼</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#1e40af', margin: 0 }}>SKILLS & COMPETENCIES</p>
            <p style={{ fontSize: '11px', color: '#3b82f6', margin: '2px 0 0', lineHeight: '1.4' }}>Select official DOLE vocational skills and add your professional expertise</p>
          </div>
        </div>

        {/* Official DOLE Vocational Skills */}
        <div style={{ marginBottom: '24px' }}>
          <h5 style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
            🏢 Official DOLE Vocational Skills
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {OTHER_SKILLS.map((skillOption) => {
              const doleSkillsArray = form.dole_skills ?? []
              const isChecked = doleSkillsArray.includes(skillOption.label)

              return (
                <label
                  key={skillOption.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: `1px solid ${isChecked ? '#86efac' : '#e2e8f0'}`,
                    backgroundColor: isChecked ? '#dcfce7' : '#fafafa',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleDoleSkillChange(skillOption.label, e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#15803d' }}
                  />
                  <span style={{ fontSize: '13px', color: isChecked ? '#15803d' : '#374151', fontWeight: isChecked ? '600' : '400' }}>
                    {skillOption.label}
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Specialized & Professional Skills + Soft Skills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Specialized & Professional Skills */}
          <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h5 style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
              🔧 Hard Skills (Technical & Professional)
            </h5>
            <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px' }}>
              Hard skills are teachable job abilities such as software, equipment, trades, methods, and professional knowledge.
            </p>
            <SkillTagInput
              name="technical_skills"
              value={form.technical_skills ?? []}
              suggestions={TECHNICAL_SKILL_SUGGESTIONS}
              category="technical"
              onChange={onChange}
              placeholder="Search or type a hard skill"
            />
          </div>

          {/* Interpersonal / Soft Skills */}
          <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h5 style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
              🤝 Soft Skills (Behavior & Interpersonal)
            </h5>
            <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px' }}>
              Soft skills describe how you communicate, think, adapt, organize work, lead, and collaborate.
            </p>
            <SkillTagInput
              name="soft_skills"
              value={form.soft_skills ?? []}
              suggestions={SOFT_SKILL_SUGGESTIONS}
              category="soft"
              onChange={onChange}
              placeholder="Search or type a soft skill"
              color="purple"
            />
          </div>
        </div>
        <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: '10px', textAlign: 'center' }}>
          Recognized skills are automatically saved under the correct hard or soft skill category.
        </p>
      </div>
    </div>
  )
}

// ── STEP 6: TRAININGS & ELIGIBILITIES ─────────────────────────────────────

function Step6({ form, errors, onAddTraining, onRemoveTraining, onUpdateTraining, onAddEligibility, onRemoveEligibility, onUpdateEligibility }) {
  const trainingTemplate = { course: '', hours_of_training: '', training_institution: '', skills_acquired: '', certificates_received: '' }
  const eligibilityTemplate = { type: '', name: '', date_taken: '', valid_until: '' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionHeader title="Trainings & Eligibilities" num={6} />

      {/* Trainings table */}
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>Trainings</h4>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#fff' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Course</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#475569', width: '80px' }}>Hours</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: '#475569', width: '50px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {form.trainings?.map((train, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Course name"
                        value={train.course || ''}
                        onChange={(e) => onUpdateTraining('trainings', i, { course: e.target.value })}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                      <input
                        type="text"
                        placeholder="Training institution (optional)"
                        value={train.training_institution || ''}
                        onChange={(e) => onUpdateTraining('trainings', i, { training_institution: e.target.value })}
                        style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                      <input
                        type="text"
                        placeholder="Skills acquired (optional)"
                        value={train.skills_acquired || ''}
                        onChange={(e) => onUpdateTraining('trainings', i, { skills_acquired: e.target.value })}
                        style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                      <input
                        type="text"
                        placeholder="Certificate received (optional)"
                        value={train.certificates_received || ''}
                        onChange={(e) => onUpdateTraining('trainings', i, { certificates_received: e.target.value })}
                        style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                    </div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="number"
                      placeholder="0"
                      value={train.hours_of_training || ''}
                      onChange={(e) => onUpdateTraining('trainings', i, { hours_of_training: e.target.value || null })}
                      style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onRemoveTraining('trainings', i)}
                      style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => onAddTraining('trainings', trainingTemplate)}
          style={{ marginTop: '12px', padding: '8px 12px', fontSize: '13px', color: '#1d4ed8', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
        >
          + Add Training
        </button>
      </div>

      {/* Eligibilities table */}
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>Professional Licenses & Civil Service Eligibilities</h4>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#fff' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Type</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Name</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: '#475569', width: '50px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {form.eligibilities?.map((elig, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>
                    <select
                      value={elig.type || ''}
                      onChange={(e) => onUpdateEligibility('eligibilities', i, { type: e.target.value })}
                      style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    >
                      <option value="">Select type</option>
                      {ELIGIBILITY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="License/Eligibility name"
                        value={elig.name || ''}
                        onChange={(e) => onUpdateEligibility('eligibilities', i, { name: e.target.value })}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                      <label style={{ color: '#64748b', fontSize: '10px' }}>
                        Date taken
                        <input
                          type="date"
                          value={elig.date_taken || ''}
                          onChange={(e) => onUpdateEligibility('eligibilities', i, { date_taken: e.target.value || null })}
                          style={{ width: '100%', marginTop: '3px', padding: '6px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                        />
                      </label>
                      <label style={{ color: '#64748b', fontSize: '10px' }}>
                        Valid until (optional)
                        <input
                          type="date"
                          value={elig.valid_until || ''}
                          min={elig.date_taken || undefined}
                          onChange={(e) => onUpdateEligibility('eligibilities', i, { valid_until: e.target.value || null })}
                          style={{ width: '100%', marginTop: '3px', padding: '6px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                        />
                      </label>
                    </div>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onRemoveEligibility('eligibilities', i)}
                      style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => onAddEligibility('eligibilities', eligibilityTemplate)}
          style={{ marginTop: '12px', padding: '8px 12px', fontSize: '13px', color: '#1d4ed8', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
        >
          + Add License/Eligibility
        </button>
        {errors.trainings && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px' }}>✕ {errors.trainings}</p>}
        {errors.eligibilities && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px' }}>✕ {errors.eligibilities}</p>}
      </div>
    </div>
  )
}

// ── STEP 7: WORK EXPERIENCE ────────────────────────────────────────────────

function Step7({ form, errors, onAddExperience, onRemoveExperience, onUpdateExperience }) {
  const experienceTemplate = {
    company_name: '',
    company_address: '',
    position: '',
    number_of_months: '',
    employment_status: '',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionHeader title="Work Experience" num={7} />

      {/* Work experiences table */}
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>Work Experiences</h4>
        <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 12px' }}>Optional for first-time jobseekers.</p>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#fff' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Company</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Position</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#475569', width: '80px' }}>Months</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: '#475569', width: '50px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {form.work_experiences?.map((exp, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Company name"
                        value={exp.company_name || ''}
                        onChange={(e) => onUpdateExperience('work_experiences', i, { company_name: e.target.value })}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                      <input
                        type="text"
                        placeholder="Company address (optional)"
                        value={exp.company_address || ''}
                        onChange={(e) => onUpdateExperience('work_experiences', i, { company_address: e.target.value })}
                        style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                    </div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Position"
                        value={exp.position || ''}
                        onChange={(e) => onUpdateExperience('work_experiences', i, { position: e.target.value })}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                      <select
                        value={exp.employment_status || ''}
                        onChange={(e) => onUpdateExperience('work_experiences', i, { employment_status: e.target.value || null })}
                        style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#fff' }}
                      >
                        <option value="">Employment status (optional)</option>
                        {EMPLOYMENT_STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={exp.number_of_months || ''}
                      onChange={(e) => onUpdateExperience('work_experiences', i, { number_of_months: e.target.value || null })}
                      style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onRemoveExperience('work_experiences', i)}
                      style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => onAddExperience('work_experiences', experienceTemplate)}
          style={{ marginTop: '12px', padding: '8px 12px', fontSize: '13px', color: '#1d4ed8', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
        >
          + Add Work Experience
        </button>
        {errors.work_experiences && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px' }}>✕ {errors.work_experiences}</p>}
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────

export default function SeekerOnboarding() {
  const navigate    = useNavigate()
  const user        = useAuthStore((s) => s.user)
  const updateUser  = useAuthStore((s) => s.updateUser)  // ✅ fixed: was setUser

  const [step, setStep]         = useState(1)
  const [completed, setCompleted] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError]   = useState('')
  const [errors, setErrors]       = useState({})
  const [gpsState, setGpsState] = useState({
    loading  : false,
    success  : false,
    error    : null,
    accuracy : null,
    missingFields: [],
    cityName: null,
    isComplete: false,
  })
  const cardRef = useRef(null)

  const [form, setForm] = useState({
    // Step 1
    first_name   : user?.first_name  ?? '',
    last_name    : user?.last_name   ?? '',
    middle_name  : '',
    suffix       : '',
    date_of_birth: '',
    sex          : '',
    civil_status : '',
    religion     : '',
    religion_other: '',
    height_ft    : '',
    tin          : '',
    educ_attainment: user?.educ_attainment ?? '',
    address_province: '',
    address_province_code: '',
    address_municipality_city: '',
    address_city_code: '',
    address_barangay: '',
    address_barangay_code: '',
    address_house_street: '',
    latitude: null,
    longitude: null,
    location_accuracy: null,
    google_place_id: null,
    disabilities : [],
    disability_specification: '',
    // Step 2
    employment_status: '',
    employment_type  : '',
    self_employed_type: '',
    self_employed_type_others: '',
    unemployment_months: '',
    unemployment_reason: '',
    unemployment_reason_others: '',
    unemployment_terminated_country: '',
    is_ofw        : false,
    ofw_country   : '',
    is_former_ofw : false,
    former_ofw_country: '',
    former_ofw_return_date: '',
    is_4ps_beneficiary: false,
    household_id_4ps: '',
    // Step 3
    preferred_occupations: [],
    work_type_preference: '',
    preferred_work_location: '',
    preferred_locations_details: [],
    // Step 4 (Languages - handled dynamically via lang_${key}_${skill} fields)
    // Step 5: Education & Other Skills
    currently_in_school: false,
    educations: [], // Array of { level, course_strand, year_graduated, undergrad_level_reached, undergrad_year_last_attended }
    dole_skills: [], // Array of DOLE skill strings (e.g., ['Auto Mechanic', 'Carpentry Work'])
    technical_skills: [], // Array of custom technical/hard skills
    soft_skills: [], // Array of custom soft/interpersonal skills
    // Step 6: Trainings & Eligibilities
    trainings: [], // Array of { course, hours_of_training, training_institution, skills_acquired, certificates_received }
    eligibilities: [], // Array of { type, name, date_taken, valid_until }
    // Step 7: Work Experience
    work_experiences: [], // Array of { company_name, company_address, position, number_of_months, employment_status }
  })

  const handleChange = useCallback((e) => {
    let { name, value } = e.target

    if (name === 'household_id_4ps') {
      value = format4PsHouseholdId(value)
    }
    
    // Auto-capitalize name fields
    if ((name === 'first_name' || name === 'last_name' || name === 'middle_name') && typeof value === 'string') {
      value = capitalizeName(value)
    }
    
    const manualAddressFields = [
      'address_province_code',
      'address_city_code',
      'address_barangay_code',
      'address_house_street',
    ]

    setForm((f) => {
      const dependentUpdates = {}

      if (name === 'employment_status') {
        if (value === 'employed') {
          Object.assign(dependentUpdates, {
            unemployment_months: '',
            unemployment_reason: '',
            unemployment_reason_others: '',
            unemployment_terminated_country: '',
          })
        } else {
          Object.assign(dependentUpdates, {
            employment_type: '',
            self_employed_type: '',
            self_employed_type_others: '',
          })
        }
      }
      if (name === 'employment_type' && value !== 'self_employed') {
        Object.assign(dependentUpdates, {
          self_employed_type: '',
          self_employed_type_others: '',
        })
      }
      if (name === 'self_employed_type' && value !== 'others') {
        dependentUpdates.self_employed_type_others = ''
      }
      if (name === 'unemployment_reason') {
        if (value !== 'others') dependentUpdates.unemployment_reason_others = ''
        if (value !== 'terminated_abroad') dependentUpdates.unemployment_terminated_country = ''
      }
      if (name === 'is_ofw' && !value) dependentUpdates.ofw_country = ''
      if (name === 'is_former_ofw' && !value) {
        Object.assign(dependentUpdates, {
          former_ofw_country: '',
          former_ofw_return_date: '',
        })
      }
      if (name === 'is_4ps_beneficiary' && !value) dependentUpdates.household_id_4ps = ''

      return {
        ...f,
        [name]: value,
        ...dependentUpdates,
        ...(manualAddressFields.includes(name) ? {
        latitude: null,
        longitude: null,
        location_accuracy: null,
        google_place_id: null,
      } : {}),
      }
    })
    setErrors((err) => ({ ...err, [name]: undefined }))
    setApiError('')
  }, [])

  const applyResolvedLocation = useCallback((result, replaceAddress = false) => {
    setForm((current) => {
      const updates = {
        latitude: result.lat,
        longitude: result.lng,
        location_accuracy: result.accuracy,
        google_place_id: result.placeId,
      }

      if (replaceAddress) {
        Object.assign(updates, {
          address_province_code: '',
          address_province: '',
          address_city_code: '',
          address_municipality_city: '',
          address_barangay_code: '',
          address_barangay: '',
          address_house_street: '',
        })
      }

      if (result.province) {
        updates.address_province_code = result.province.code
        updates.address_province = result.province.name
      }
      if (result.city) {
        updates.address_city_code = result.city.code
        updates.address_municipality_city = result.city.name
      }
      if (result.barangay) {
        updates.address_barangay_code = result.barangay.code
        updates.address_barangay = result.barangay.name
      }
      if (result.houseStreet && (replaceAddress || !current.address_house_street)) {
        updates.address_house_street = result.houseStreet
      }

      return { ...current, ...updates }
    })

    setErrors((current) => ({
      ...current,
      address_province: undefined,
      address_municipality_city: undefined,
      address_barangay: undefined,
      address_house_street: undefined,
    }))
  }, [])

  const handleGpsDetect = async () => {
    setGpsState({
      loading: true,
      success: false,
      error: null,
      accuracy: null,
      warnings: [],
      missingFields: [],
      cityName: null,
      isComplete: false,
    })

    try {
      const result = await detectAddress()
      applyResolvedLocation(result, true)

      // Build changes to apply to the form
      const updates = {}

      // ── Province ──────────────────────────────────────────────────────
      // Use the pre-matched PSGC object from geoService
      if (result.province) {
        updates.address_province_code = result.province.code
        updates.address_province = result.province.name
      } else if (result.provinceName) {
        console.warn('GPS province not in map:', result.provinceName)
      }

      // ── City / Municipality ────────────────────────────────────────────
      if (result.city) {
        updates.address_city_code = result.city.code
        updates.address_municipality_city = result.city.name
      }

      // ── Barangay ───────────────────────────────────────────────────────
      if (result.barangay) {
        updates.address_barangay_code = result.barangay.code
        updates.address_barangay = result.barangay.name
      }

      // ── House / Street ─────────────────────────────────────────────────
      if (result.houseStreet && !form.address_house_street) {
        updates.address_house_street = result.houseStreet
      }

      // Apply all address updates to form at once
      setForm((f) => ({ ...f, ...updates }))

      // Clear any existing address errors
      setErrors((e) => ({
        ...e,
        address_province         : undefined,
        address_municipality_city: undefined,
        address_barangay         : undefined,
        address_house_street     : undefined,
      }))

      setGpsState({
        loading : false,
        success : true,
        error   : null,
        accuracy: result.accuracy,
        warnings: result.warnings,
        missingFields: result.missingFields,
        cityName: result.city?.name ?? result.cityName,
        isComplete: result.isComplete,
      })
      return result

    } catch (errorMessage) {
      setGpsState({
        loading : false,
        success : false,
        error   : errorMessage instanceof Error ? errorMessage.message : 'Location detection failed.',
        accuracy: null,
        warnings: [],
        missingFields: [],
        cityName: null,
        isComplete: false,
      })
      return null
    }
  }

  const handleAddressSelect = async (suggestion) => {
    setGpsState({ loading: true, success: false, error: null, accuracy: null })

    try {
      const result = await resolveAddressSuggestion(suggestion, suggestion.session_token)
      applyResolvedLocation(result, true)
      if (!result.province || !result.city || result.warnings.length > 0) {
        console.warn('Google address only partially matched PSGC.', result.warnings)
      }
      setGpsState({
        loading: false,
        success: false,
        error: null,
        accuracy: null,
        warnings: result.warnings,
      })
      return result
    } catch {
      setGpsState({
        loading: false,
        success: false,
        error: 'The selected address could not be matched to PSGC. Please use the dropdowns.',
        accuracy: null,
      })
      return null
    }
  }

  // Scroll to top of card when step changes
  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  // ── Per-step validation ──────────────────────────────────────────────────
  const validateStep = (s) => {
    const e = {}

    if (s === 1) {
      if (!form.first_name?.trim())            e.first_name      = 'Required.'
      if (!form.last_name?.trim())             e.last_name       = 'Required.'
      if (!form.date_of_birth)                 e.date_of_birth   = 'Required.'
      else if (calculateAge(form.date_of_birth) < 15) e.date_of_birth = 'Must be at least 15 years old.'
      if (!form.sex)                           e.sex             = 'Required.'
      if (!form.civil_status)                  e.civil_status    = 'Required.'
      if (!form.religion?.trim())              e.religion        = 'Required.'
      if (form.religion === 'other' && !form.religion_other?.trim())
        e.religion_other = 'Please specify your religion.'
      if (!form.height_ft)                     e.height_ft       = 'Required.'
      else if (Number(form.height_ft) < 2.5 || Number(form.height_ft) > 8.5)
        e.height_ft = 'Select a height from 2 ft 6 in to 8 ft 6 in.'
      if (!form.address_province)              e.address_province = 'Required.'
      if (!form.address_municipality_city)     e.address_municipality_city = 'Required.'
      if (!form.address_barangay)              e.address_barangay = 'Required.'
      if (!form.address_house_street?.trim())  e.address_house_street = 'Required.'
      if (!form.disabilities?.length)          e.disabilities    = 'Please make a selection.'
      if (form.disabilities?.includes('others') && !form.disability_specification?.trim())
        e.disability_specification = 'Please specify the disability type.'
    }

    if (s === 2) {
      if (!form.employment_status) e.employment_status = 'Required.'
      if (form.employment_status === 'employed') {
        if (!form.employment_type) e.employment_type = 'Required.'
        if (form.employment_type === 'self_employed' && !form.self_employed_type)
          e.self_employed_type = 'Required.'
        if (form.self_employed_type === 'others' && !form.self_employed_type_others?.trim())
          e.self_employed_type_others = 'Required.'
      }
      if (form.employment_status === 'unemployed') {
        if (form.unemployment_months === '' || form.unemployment_months === undefined)
          e.unemployment_months = 'Required.'
        else if (Number(form.unemployment_months) < 0 || Number(form.unemployment_months) > 999)
          e.unemployment_months = 'Enter a value from 0 to 999.'
        if (!form.unemployment_reason) e.unemployment_reason = 'Required.'
        if (form.unemployment_reason === 'others' && !form.unemployment_reason_others?.trim())
          e.unemployment_reason_others = 'Required.'
        if (form.unemployment_reason === 'terminated_abroad' && !form.unemployment_terminated_country?.trim())
          e.unemployment_terminated_country = 'Required.'
      }
      if (form.is_ofw === '' || form.is_ofw === undefined || form.is_ofw === null)
        e.is_ofw = 'Required.'
      if ((form.is_ofw === true || form.is_ofw === 'true') && !form.ofw_country?.trim())
        e.ofw_country = 'Required.'
      if (form.is_former_ofw === '' || form.is_former_ofw === undefined || form.is_former_ofw === null)
        e.is_former_ofw = 'Required.'
      if ((form.is_former_ofw === true || form.is_former_ofw === 'true')) {
        if (!form.former_ofw_country?.trim()) e.former_ofw_country = 'Required.'
        if (!form.former_ofw_return_date)     e.former_ofw_return_date = 'Required.'
      }
      if (form.is_4ps_beneficiary === '' || form.is_4ps_beneficiary === undefined || form.is_4ps_beneficiary === null)
        e.is_4ps_beneficiary = 'Required.'
      if (form.is_4ps_beneficiary === true || form.is_4ps_beneficiary === 'true') {
        if (!form.household_id_4ps?.trim()) {
          e.household_id_4ps = 'Required.'
        } else if (!isComplete4PsHouseholdId(form.household_id_4ps)) {
          e.household_id_4ps = 'Enter the complete 14-digit 4Ps Household ID.'
        }
      }
    }

    if (s === 3) {
      if (!form.preferred_occupations?.length) e.preferred_occupations = 'Select at least one occupation.'
      if (!form.work_type_preference)          e.work_type_preference = 'Required.'
      if (!form.preferred_work_location)       e.preferred_work_location = 'Required.'
      if (form.preferred_work_location && !form.preferred_locations_details?.length)
        e.preferred_work_location = 'Select at least one preferred location.'
    }

    if (s === 4) {
      const hasLang = LANGUAGES.some((lang) =>
        ['read','write','speak','understand'].some((skill) =>
          form[`lang_${lang.toLowerCase()}_${skill}`]
        )
      )
      if (!hasLang) e.languages = 'Please indicate at least one language proficiency.'
      // Check if Others language is selected but not specified
      const othersSelected = form[`lang_others_read`] || form[`lang_others_write`] || form[`lang_others_speak`] || form[`lang_others_understand`]
      if (othersSelected && !form.lang_other_name?.trim())
        e.lang_other_name = 'Please specify the language.'
    }

    if (s === 5) {
      const currentYear = new Date().getFullYear()
      const resolvedEducAttainment = form.educ_attainment?.trim() || inferEducationalAttainment(form.educations)
      const selectedLevels = (form.educations ?? []).map((education) => education.level).filter(Boolean)
      const hasDuplicateEducationLevel = new Set(selectedLevels).size !== selectedLevels.length
      const invalidEducation = form.educations?.some((education) => {
        const completionStatus = education.completion_status || (education.year_graduated ? 'graduated' : 'undergraduate')
        const yearGraduated = education.year_graduated ? Number(education.year_graduated) : null
        const yearLastAttended = education.undergrad_year_last_attended ? Number(education.undergrad_year_last_attended) : null
        const isUndergraduate = completionStatus === 'undergraduate'

        return (
          !education.level
          || (
            completionStatus === 'graduated'
            && (
              !yearGraduated
              || yearGraduated < 1900
              || yearGraduated > currentYear
            )
          )
          || (
            isUndergraduate && (
              !education.undergrad_level_reached?.trim()
              || !yearLastAttended
              || yearLastAttended < 1900
              || yearLastAttended > currentYear
            )
          )
        )
      })
      if (!resolvedEducAttainment) e.educ_attainment = 'Select your highest educational attainment.'
      if (hasDuplicateEducationLevel) e.educations = 'Each education level can only be added once.'
      else if (invalidEducation) e.educations = 'Complete each added education row or remove it.'
    }

    if (s === 6) {
      const invalidTraining = form.trainings?.some((training) => (
        !training.course?.trim()
        || (training.hours_of_training && Number(training.hours_of_training) < 1)
      ))
      const invalidEligibility = form.eligibilities?.some((eligibility) => (
        !eligibility.type
        || !eligibility.name?.trim()
        || (eligibility.valid_until && !eligibility.date_taken)
        || (eligibility.date_taken && eligibility.date_taken > new Date().toISOString().slice(0, 10))
        || (
          eligibility.date_taken
          && eligibility.valid_until
          && eligibility.valid_until < eligibility.date_taken
        )
      ))
      if (invalidTraining) e.trainings = 'Complete each added training row or remove it.'
      if (invalidEligibility) e.eligibilities = 'Complete each added eligibility row or remove it.'
    }

    if (s === 7) {
      const invalidExperience = form.work_experiences?.some((experience) => (
        !experience.company_name?.trim()
        || !experience.position?.trim()
        || (
          experience.number_of_months
          && (
            Number(experience.number_of_months) < 0
            || Number(experience.number_of_months) > 600
          )
        )
      ))
      if (invalidExperience) e.work_experiences = 'Complete each added work experience or remove it.'
    }

    return e
  }

  // ── Array Helper Functions ───────────────────────────────────────────────

  const addArrayItem = (fieldName, newItem) => {
    setForm((f) => ({
      ...f,
      [fieldName]: [...(f[fieldName] || []), newItem],
    }))
  }

  const removeArrayItem = (fieldName, index) => {
    setForm((f) => ({
      ...f,
      [fieldName]: f[fieldName].filter((_, i) => i !== index),
    }))
  }

  const updateArrayItem = (fieldName, index, updates) => {
    setForm((f) => ({
      ...f,
      [fieldName]: f[fieldName].map((item, i) => (i === index ? { ...item, ...updates } : item)),
    }))
  }

  // ── Build API payloads ───────────────────────────────────────────────────
  const buildStep1Payload = () => ({
    first_name               : form.first_name,
    middle_name              : form.middle_name || null,
    last_name                : form.last_name,
    suffix                   : form.suffix || null,
    date_of_birth            : form.date_of_birth,
    sex                      : form.sex,
    civil_status             : form.civil_status,
   religion                 : form.religion, 
    religion_other           : form.religion === 'other' ? form.religion_other : null,
    height_ft                : parseFloat(form.height_ft),
    tin                      : form.tin || null,
    address_province         : form.address_province,
    address_municipality_city: form.address_municipality_city,
    address_barangay         : form.address_barangay,
    address_house_street     : form.address_house_street,
    address_province_code    : form.address_province_code || null,
    address_city_code        : form.address_city_code || null,
    address_barangay_code    : form.address_barangay_code || null,
    latitude                 : form.latitude,
    longitude                : form.longitude,
    location_accuracy        : form.location_accuracy,
    google_place_id          : form.google_place_id,
    disabilities             : form.disabilities,
    disability_specification : form.disability_specification || null,
  })

  const buildStep2Payload = () => ({
    employment_status               : form.employment_status,
    employment_type                 : form.employment_type || null,
    self_employed_type              : form.self_employed_type || null,
    self_employed_type_others       : form.self_employed_type_others || null,
    unemployment_months             : form.unemployment_months !== '' ? parseInt(form.unemployment_months) : null,
    unemployment_reason             : form.unemployment_reason || null,
    unemployment_reason_others      : form.unemployment_reason_others || null,
    unemployment_terminated_country : form.unemployment_terminated_country || null,
    is_ofw                          : form.is_ofw === true || form.is_ofw === 'true',
    ofw_country                     : form.ofw_country || null,
    is_former_ofw                   : form.is_former_ofw === true || form.is_former_ofw === 'true',
    former_ofw_country              : form.former_ofw_country || null,
    former_ofw_return_date          : form.former_ofw_return_date || null,
    is_4ps_beneficiary              : form.is_4ps_beneficiary === true || form.is_4ps_beneficiary === 'true',
    household_id_4ps                : form.household_id_4ps || null,
  })

  const buildStep3Payload = () => ({
    work_type_preference       : form.work_type_preference,
    preferred_work_location    : form.preferred_work_location,
    preferred_locations_details: form.preferred_locations_details ?? [],
    occupation_preferences     : (form.preferred_occupations ?? []).map((occupation) => ({
      occupation_id: occupation.is_general ? null : occupation.id,
      general_term: occupation.is_general ? occupation.general_term : null,
    })),
  })

  const buildStep4Payload = () => {
    const languages = []
    for (const lang of LANGUAGES) {
      const key = lang.toLowerCase()
      const hasAny = ['read','write','speak','understand'].some((s) => form[`lang_${key}_${s}`])
      if (hasAny) {
        languages.push({
          language        : lang.toLowerCase(),
          language_other  : lang === 'Others' ? (form.lang_other_name || null) : null,
          can_read        : !!form[`lang_${key}_read`],
          can_write       : !!form[`lang_${key}_write`],
          can_speak       : !!form[`lang_${key}_speak`],
          can_understand  : !!form[`lang_${key}_understand`],
        })
      }
    }
    return { languages }
  }

  const buildStep5Payload = () => ({
    educ_attainment    : form.educ_attainment?.trim() || inferEducationalAttainment(form.educations) || null,
    currently_in_school: form.currently_in_school,
    educations         : (form.educations || []).map((education) => ({
      level: education.level || null,
      course_strand: education.course_strand?.trim() || null,
      year_graduated: education.year_graduated || null,
      undergrad_level_reached: education.year_graduated ? null : (education.undergrad_level_reached?.trim() || null),
      undergrad_year_last_attended: education.year_graduated ? null : (education.undergrad_year_last_attended || null),
    })),
    dole_skills        : form.dole_skills || [],
    technical_skills   : form.technical_skills || [],
    soft_skills        : form.soft_skills || [],
  })

  const buildStep6Payload = () => ({
    trainings      : form.trainings || [],
    eligibilities  : form.eligibilities || [],
  })

  const buildStep7Payload = () => ({
    work_experiences : (form.work_experiences || []).map((experience) => ({
      company_name: experience.company_name,
      company_address: experience.company_address || null,
      position: experience.position,
      number_of_months: experience.number_of_months || null,
      employment_status: experience.employment_status || null,
    })),
  })

  // ── Navigation ───────────────────────────────────────────────────────────
  const handleNext = async () => {
    const errs = validateStep(step)
    if (Object.keys(errs).length) { setErrors(errs); return }

    setIsLoading(true)
    setApiError('')

    try {
      let data
      if (step === 1) {
        let payload = buildStep1Payload()

        if (payload.latitude == null || payload.longitude == null) {
          try {
            const location = await geocodeAddress([
              payload.address_house_street,
              payload.address_barangay,
              payload.address_municipality_city,
              payload.address_province,
              'Philippines',
            ].filter(Boolean).join(', '))

            if (location?.latitude != null && location?.longitude != null) {
              payload = {
                ...payload,
                latitude: location.latitude,
                longitude: location.longitude,
                google_place_id: location.place_id,
              }
              setForm((current) => ({
                ...current,
                latitude: location.latitude,
                longitude: location.longitude,
                google_place_id: location.place_id,
              }))
            }
          } catch {
            // Coordinate lookup is optional; the verified PSGC address can still be saved.
          }
        }

        data = await authService.saveStep1(payload)
      }
      if (step === 2) data = await authService.saveStep2(buildStep2Payload())
      if (step === 3) data = await authService.saveStep3(buildStep3Payload())
      if (step === 4) data = await authService.saveStep4(buildStep4Payload())
      if (step === 5) data = await authService.saveStep5(buildStep5Payload())
      if (step === 6) data = await authService.saveStep6(buildStep6Payload())
      if (step === 7) {
        data = await authService.saveStep7(buildStep7Payload())
        // Update store with completed profile
        updateUser({ ...data.user, profile_completed: true })
        navigate('/seeker/dashboard', { replace: true })
        return
      }

      // Update user in store after each step (keeps form_validation_state fresh)
      if (data?.user) updateUser(data.user)

      setCompleted((c) => [...c.filter((n) => n !== step), step])
      setStep((s) => s + 1)
      setErrors({})
    } catch (err) {
      if (err.response?.status === 422) {
        const serverErrors = err.response.data.errors ?? {}
        if (
          serverErrors.occupation_ids
          || serverErrors['occupation_ids.0']
          || serverErrors.occupation_preferences
          || serverErrors['occupation_preferences.0.occupation_id']
          || serverErrors['occupation_preferences.0.general_term']
        ) {
          serverErrors.preferred_occupations = serverErrors.occupation_preferences?.[0]
            ?? serverErrors['occupation_preferences.0.occupation_id']?.[0]
            ?? serverErrors['occupation_preferences.0.general_term']?.[0]
            ?? serverErrors.occupation_ids?.[0]
            ?? serverErrors['occupation_ids.0']?.[0]
        }
        setErrors(serverErrors)
      } else {
        setApiError(err.response?.data?.message ?? 'Failed to save. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (step > 1) { setStep((s) => s - 1); setErrors({}); setApiError('') }
  }

  const progressPct = ((step - 1) / 6) * 100

  return (
    <OnboardingShell
      eyebrow="Job seeker registration"
      title="Complete your NSRP profile"
      subtitle="National Skills Registration Program Form 1 · Department of Labor and Employment"
      progress={progressPct}
      progressLabel={`Step ${step} of ${STEPS.length} · ${STEPS[step - 1].label}`}
      maxWidth="max-w-4xl"
      role="seeker"
      steps={seekerRegistrationSteps}
      currentStep={step + 2}
    >
      <div className="seeker-onboarding">
        {/* Card */}
        <div ref={cardRef} className="registration-step-card" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 18px 45px rgba(15,23,42,0.12)', overflow: 'hidden' }}>

          {/* Progress bar */}
          <div style={{ height: '4px', backgroundColor: '#f1f5f9' }}>
            <div style={{ height: '100%', backgroundColor: '#f59e0b', width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
          </div>

          <div style={{ padding: '32px' }}>

            {/* Step Indicator */}
            <div className="lg:hidden"><StepIndicator current={step} completed={completed} /></div>

            {/* API Error */}
            {apiError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 14px', marginBottom: '20px' }}>
                <span style={{ fontSize: '14px' }}>⚠️</span>
                <p style={{ fontSize: '13px', color: '#b91c1c', margin: 0 }}>{apiError}</p>
              </div>
            )}

            {/* Step Content */}
            {step === 1 && (
              <Step1
                form={form}
                errors={errors}
                onChange={handleChange}
                user={user}
                onGpsDetect={handleGpsDetect}
                onAddressSelect={handleAddressSelect}
                gpsState={gpsState}
              />
            )}
            {step === 2 && <Step2 form={form} errors={errors} onChange={handleChange} />}
            {step === 3 && <Step3 form={form} errors={errors} onChange={handleChange} />}
            {step === 4 && <Step4 form={form} errors={errors} onChange={handleChange} />}
            {step === 5 && (
              <Step5
                form={form}
                errors={errors}
                onChange={handleChange}
                onAddEducation={addArrayItem}
                onRemoveEducation={removeArrayItem}
                onUpdateEducation={updateArrayItem}
                onAddSkill={addArrayItem}
                onRemoveSkill={removeArrayItem}
              />
            )}
            {step === 6 && (
              <Step6
                form={form}
                errors={errors}
                onAddTraining={addArrayItem}
                onRemoveTraining={removeArrayItem}
                onUpdateTraining={updateArrayItem}
                onAddEligibility={addArrayItem}
                onRemoveEligibility={removeArrayItem}
                onUpdateEligibility={updateArrayItem}
              />
            )}
            {step === 7 && (
              <Step7
                form={form}
                errors={errors}
                onAddExperience={addArrayItem}
                onRemoveExperience={removeArrayItem}
                onUpdateExperience={updateArrayItem}
              />
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={handleBack}
                disabled={step === 1 || isLoading}
                style={{ flex: 1, padding: '13px', fontSize: '14px', fontWeight: '600', color: step === 1 ? '#cbd5e1' : '#374151', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: step === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={isLoading}
                style={{ flex: 2, padding: '13px', fontSize: '14px', fontWeight: '800', color: '#0f172a', backgroundColor: isLoading ? '#fde68a' : '#f59e0b', border: '1px solid #f59e0b', borderRadius: '8px', cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s' }}
              >
                {isLoading ? (
                  <>
                    <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Saving…
                  </>
                ) : step === 7 ? (
                  '✓ Complete Profile'
                ) : (
                  `Save & Continue →`
                )}
              </button>
            </div>

          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </OnboardingShell>
  )
}

