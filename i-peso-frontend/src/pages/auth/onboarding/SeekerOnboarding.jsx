// src/pages/auth/onboarding/SeekerOnboarding.jsx
// Digitizes the NSRP Form 1 (National Skills Registration Program)
// Department of Labor and Employment — Job Seeker Registration Form
import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
// ── Add these imports at the top of SeekerOnboarding.jsx ──

import { getProvinces, getCitiesByProvince, getBarangaysByCity } from '@/services/psgcServices'
import { detectAddress } from '@/services/geoService'

// ── Constants ─────────────────────────────────────────────────────────────

const EDUC_OPTIONS = [
  'Elementary Graduate', 'High School Graduate',
  'Senior High School Graduate', 'Vocational / Technical',
  'College Undergraduate', 'College Graduate',
  "Master's Degree", 'Doctorate',
]

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
  return str.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
}

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

const LANGUAGES = ['English', 'Filipino', 'Mandarin', 'Spanish', 'Japanese', 'Korean', 'Arabic', 'Others']

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
  { value: 'others', label: 'Others (specify)' },
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
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px', padding: '14px 16px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
    <span style={{ fontSize: '20px' }}>{icon}</span>
    <div>
      <p style={{ fontSize: '13px', fontWeight: '700', color: '#1e40af', margin: 0 }}>{title}</p>
      {subtitle && <p style={{ fontSize: '11px', color: '#3b82f6', margin: '2px 0 0', lineHeight: '1.4' }}>{subtitle}</p>}
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
  color: '#0f172a', backgroundColor: '#f8fafc',
  border: `1px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
  borderRadius: '10px', outline: 'none',
  transition: 'border-color 0.15s',
})

const selectStyle = (hasError) => ({
  ...inputStyle(hasError),
  cursor: 'pointer',
})

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
              backgroundColor: isCompleted ? '#dcfce7' : isActive ? '#1d4ed8' : '#f1f5f9',
              color: isCompleted ? '#15803d' : isActive ? '#ffffff' : '#94a3b8',
              border: isCompleted ? '2px solid #86efac' : isActive ? '2px solid #1d4ed8' : '2px solid #e2e8f0',
              transition: 'all 0.3s',
            }}>
              {isCompleted ? '✓' : step.num}
            </div>
            <span style={{
              fontSize: '10px', fontWeight: '600',
              color: isActive ? '#1d4ed8' : isCompleted ? '#15803d' : '#94a3b8',
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
const Step1 = ({ form, errors, onChange, user, onGpsDetect, gpsState }) => {
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
        <FormField label="Height (in feet)" error={errors.height_ft} help="Range: 2.5 – 8.5 ft">
          <input type="number" style={inputStyle(!!errors.height_ft)} name="height_ft"
            value={form.height_ft ?? ''} onChange={onChange}
            placeholder="e.g., 5.6" step="0.1" min="2.5" max="8.5" />
        </FormField>
        <FormField label="TIN (Tax Identification No.)" required={false} error={errors.tin}>
          <input style={inputStyle(!!errors.tin)} name="tin"
            value={form.tin ?? ''} onChange={onChange} placeholder="Optional" />
        </FormField>
      </div>

      {/* Educational Attainment */}
      <FormField label="Highest Educational Attainment" error={errors.educ_attainment}>
        <select style={selectStyle(!!errors.educ_attainment)} name="educ_attainment"
          value={form.educ_attainment ?? ''} onChange={onChange}>
          <option value="">Select attainment</option>
          {EDUC_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </FormField>

      {/* ── ADDRESS SECTION ── */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginBottom: '4px' }}>
        <AddressSection
          form={form}
          errors={errors}
          onChange={onChange}
          gpsState={gpsState}
          onGpsDetect={onGpsDetect}
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
            <input style={inputStyle(!!errors.unemployment_terminated_country)} name="unemployment_terminated_country"
              value={form.unemployment_terminated_country ?? ''} onChange={onChange} placeholder="Country of employment" />
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
        <input style={inputStyle(!!errors.ofw_country)} name="ofw_country"
          value={form.ofw_country ?? ''} onChange={onChange} placeholder="e.g., Saudi Arabia" />
      </FormField>
    )}

    {(form.is_former_ofw === true || form.is_former_ofw === 'true') && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FormField label="Last Country of Employment" error={errors.former_ofw_country}>
          <input style={inputStyle(!!errors.former_ofw_country)} name="former_ofw_country"
            value={form.former_ofw_country ?? ''} onChange={onChange} placeholder="e.g., Japan" />
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
        <input style={inputStyle(!!errors.household_id_4ps)} name="household_id_4ps"
          value={form.household_id_4ps ?? ''} onChange={onChange} placeholder="Household ID number" />
      </FormField>
    )}
  </div>
)

// ── STEP 3: Job Preferences ───────────────────────────────────────────────

const Step3 = ({ form, errors, onChange }) => (
  <div>
    <SectionHeader
      icon="🎯"
      title="III. JOB PREFERENCE"
      subtitle="Indicate your preferred occupation and work location"
    />

    {/* Preferred Occupations */}
    <div style={{ marginBottom: '20px' }}>
      <p style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '10px' }}>
        Preferred Occupation <span style={{ color: '#ef4444' }}>*</span>
        <span style={{ fontSize: '11px', fontWeight: '400', color: '#94a3b8', marginLeft: '6px' }}>(at least 1, up to 3)</span>
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[1, 2, 3].map((num) => (
          <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', minWidth: '16px' }}>{num}.</span>
            <input
              style={{ ...inputStyle(num === 1 && !!errors.occupation_1), flex: 1 }}
              name={`occupation_${num}`}
              value={form[`occupation_${num}`] ?? ''}
              onChange={onChange}
              placeholder={num === 1 ? 'e.g., Registered Nurse (required)' : `Optional occupation #${num}`}
            />
          </div>
        ))}
      </div>
      {errors.occupation_1 && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px' }}>⚠ {errors.occupation_1}</p>}
    </div>

    {/* Work Type */}
    <FormField label="Preferred Type of Work" error={errors.work_type_preference}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          { value: 'part_time', label: 'Part-time' },
          { value: 'full_time', label: 'Full-time' },
        ].map((opt) => {
          const active = form.work_type_preference === opt.value
          return (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', border: `2px solid ${active ? '#1d4ed8' : '#e2e8f0'}`, backgroundColor: active ? '#eff6ff' : '#fafafa', cursor: 'pointer', fontSize: '13px', fontWeight: active ? '700' : '400', color: active ? '#1d4ed8' : '#374151' }}>
              <input type="radio" name="work_type_preference" value={opt.value}
                checked={active} onChange={onChange} style={{ accentColor: '#1d4ed8' }} />
              {opt.label}
            </label>
          )
        })}
      </div>
    </FormField>

    {/* Preferred Work Location */}
    <FormField label="Preferred Work Location" error={errors.preferred_work_location}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          { value: 'local',    label: '🇵🇭 Local (Philippines)' },
          { value: 'overseas', label: '✈️ Overseas' },
        ].map((opt) => {
          const active = form.preferred_work_location === opt.value
          return (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', border: `2px solid ${active ? '#1d4ed8' : '#e2e8f0'}`, backgroundColor: active ? '#eff6ff' : '#fafafa', cursor: 'pointer', fontSize: '13px', fontWeight: active ? '700' : '400', color: active ? '#1d4ed8' : '#374151' }}>
              <input type="radio" name="preferred_work_location" value={opt.value}
                checked={active} onChange={onChange} style={{ accentColor: '#1d4ed8' }} />
              {opt.label}
            </label>
          )
        })}
      </div>
    </FormField>

    {/* Location details */}
    {form.preferred_work_location && (
      <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '14px', marginTop: '4px' }}>
        <p style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
          Specify preferred {form.preferred_work_location === 'local' ? 'cities/municipalities' : 'countries'} (up to 3):
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', minWidth: '16px' }}>{i + 1}.</span>
              <input
                style={{ ...inputStyle(false), flex: 1 }}
                value={(form.preferred_locations_details ?? [])[i] ?? ''}
                onChange={(e) => {
                  const locs = [...(form.preferred_locations_details ?? ['', '', ''])]
                  locs[i] = e.target.value
                  onChange({ target: { name: 'preferred_locations_details', value: locs.filter(Boolean) } })
                }}
                placeholder={form.preferred_work_location === 'local' ? 'e.g., Urdaneta City, Pangasinan' : 'e.g., Japan'}
              />
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)

// ── STEP 4: Language Proficiency ──────────────────────────────────────────

const Step4 = ({ form, onChange, errors }) => {
  const getLangKey = (lang, skill) => `lang_${lang.toLowerCase()}_${skill}`

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

      {/* Language table */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', backgroundColor: '#1d4ed8', padding: '10px 14px', gap: '4px' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#fff', margin: 0 }}>LANGUAGE / DIALECT</p>
          {['READ', 'WRITE', 'SPEAK', 'UNDERSTAND'].map((h) => (
            <p key={h} style={{ fontSize: '11px', fontWeight: '700', color: '#bfdbfe', margin: 0, textAlign: 'center' }}>{h}</p>
          ))}
        </div>

        {/* Rows */}
        {LANGUAGES.map((lang, idx) => {
          const isOthers  = lang === 'Others'
          const otherKey  = 'lang_other_name'
          const isEven    = idx % 2 === 0
          const othersSelected = form[`lang_others_read`] || form[`lang_others_write`] || form[`lang_others_speak`] || form[`lang_others_understand`]
          const hasError   = isOthers && othersSelected && !form[otherKey]?.trim()

          return (
            <div key={lang}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', padding: '10px 14px', gap: '4px', alignItems: 'center', backgroundColor: isEven ? '#f8fafc' : '#fff', borderTop: '1px solid #f1f5f9' }}>
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
              </div>
              {hasError && (
                <p style={{ fontSize: '11px', color: '#ef4444', padding: '4px 14px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ⚠ Please specify the language
                </p>
              )}
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', lineHeight: '1.5' }}>
        Check all applicable skills. At least one language with one proficiency must be selected.
      </p>
    </div>
  )
}

// ── Handles all address dropdown state including API loading ──────────────

const SelectDropdown = ({ label, name, codeName, value, codeValue, options, loading, disabled, error, onChange, placeholder }) => (
  <FormField label={label} error={error}>
    <div style={{ position: 'relative' }}>
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

const AddressSection = ({ form, errors, onChange, gpsState, onGpsDetect }) => {
  const [provinces,  setProvinces]  = useState([])
  const [cities,     setCities]     = useState([])
  const [barangays,  setBarangays]  = useState([])
  const [loadingProv, setLoadingProv] = useState(false)
  const [loadingCity, setLoadingCity] = useState(false)
  const [loadingBrgy, setLoadingBrgy] = useState(false)
  const [apiError,   setApiError]   = useState(null)

  // ── Load provinces on mount ───────────────────────────────────────────
  useEffect(() => {
    let isMounted = true
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

  return (
    <div>
      {/* Header + GPS button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>📍</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#1e40af', margin: 0 }}>PRESENT ADDRESS</p>
            <p style={{ fontSize: '11px', color: '#3b82f6', margin: '2px 0 0' }}>Complete barangay-level address — required for PESO records</p>
          </div>
        </div>

        {/* GPS Button */}
        <button
          type="button"
          onClick={onGpsDetect}
          disabled={gpsState.loading || loadingProv}
          style={{
            display        : 'flex',
            alignItems     : 'center',
            gap            : '7px',
            padding        : '9px 16px',
            fontSize       : '12px',
            fontWeight     : '600',
            color          : gpsState.success ? '#15803d' : '#1d4ed8',
            backgroundColor: gpsState.success ? '#dcfce7' : gpsState.error ? '#fff7ed' : '#eff6ff',
            border         : `1px solid ${gpsState.success ? '#86efac' : gpsState.error ? '#fed7aa' : '#bfdbfe'}`,
            borderRadius   : '10px',
            cursor         : (gpsState.loading || loadingProv) ? 'not-allowed' : 'pointer',
            opacity        : (gpsState.loading || loadingProv) ? 0.7 : 1,
            transition     : 'all 0.2s',
            whiteSpace     : 'nowrap',
            flexShrink     : 0,
          }}
        >
          {gpsState.loading ? (
            <>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #93c5fd', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Detecting location…
            </>
          ) : gpsState.success ? (
            <>✓ Location detected — re-detect</>
          ) : (
            <>📡 Auto-fill via GPS</>
          )}
        </button>
      </div>

      {/* API load error */}
      {apiError && (
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}>
          <span>⚠️</span>
          <p style={{ fontSize: '12px', color: '#b91c1c', margin: 0 }}>{apiError}</p>
        </div>
      )}

      {/* GPS error */}
      {gpsState.error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}>
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '600', margin: '0 0 2px' }}>Location Detection Failed</p>
            <p style={{ fontSize: '11px', color: '#dc2626', margin: 0, lineHeight: '1.5' }}>{gpsState.error}</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' }}>Please fill in your address using the dropdowns below.</p>
          </div>
        </div>
      )}

      {/* GPS success + warnings */}
      {gpsState.success && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', color: '#15803d', fontWeight: '600', margin: '0 0 4px' }}>
            ✅ Location detected
            <span style={{ fontSize: '11px', fontWeight: '400', color: '#64748b', marginLeft: '6px' }}>±{gpsState.accuracy}m accuracy</span>
          </p>
          <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
            Dropdowns have been auto-selected. Please verify each field.
          </p>
          {gpsState.warnings?.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: '16px' }}>
              {gpsState.warnings.map((w, i) => (
                <li key={i} style={{ fontSize: '11px', color: '#92400e', lineHeight: '1.5' }}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Dropdowns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

        <SelectDropdown
          label="Province"
          name="address_province"
          codeName="address_province_code"
          value={form.address_province ?? ''}
          codeValue={form.address_province_code ?? ''}
          options={provinces}
          loading={loadingProv}
          disabled={false}
          error={errors.address_province}
          onChange={onChange}
          placeholder="Select province first"
        />

        <SelectDropdown
          label="Municipality / City"
          name="address_municipality_city"
          codeName="address_city_code"
          value={form.address_municipality_city ?? ''}
          codeValue={form.address_city_code ?? ''}
          options={cities}
          loading={loadingCity}
          disabled={!form.address_province_code}
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
          disabled={!form.address_city_code}
          error={errors.address_barangay}
          onChange={onChange}
          placeholder="Select city first"
        />

        <FormField label="House No. / Street / Village" error={errors.address_house_street}>
          <input
            style={inputStyle(!!errors.address_house_street)}
            name="address_house_street"
            value={form.address_house_street ?? ''}
            onChange={onChange}
            placeholder="123 Main Street"
          />
        </FormField>

      </div>
    </div>
  )
}

// ── STEP 5: EDUCATION & OTHER SKILLS ──────────────────────────────────────

function Step5({ form, errors, onChange, onAddEducation, onRemoveEducation, onUpdateEducation }) {
  const educationTemplate = { level: '', course_strand: '', year_graduated: '', undergrad_level_reached: '', undergrad_year_last_attended: '' }
  const techSkillsInputRef = useRef(null)
  const softSkillsInputRef = useRef(null)

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

  // ── Helper: Handle tag/pill input for technical skills ─────────────────
  const handleTechKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = e.target.value.trim()
      if (val) {
        const current = (form.technical_skills ?? []).slice()
        // Avoid duplicates
        if (!current.some((s) => s.toLowerCase() === val.toLowerCase())) {
          current.push(val)
          onChange({ target: { name: 'technical_skills', value: current } })
        }
        e.target.value = ''
      }
    }
  }

  // ── Helper: Handle tag/pill input for soft skills ──────────────────────
  const handleSoftKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = e.target.value.trim()
      if (val) {
        const current = (form.soft_skills ?? []).slice()
        // Avoid duplicates
        if (!current.some((s) => s.toLowerCase() === val.toLowerCase())) {
          current.push(val)
          onChange({ target: { name: 'soft_skills', value: current } })
        }
        e.target.value = ''
      }
    }
  }

  // ── Helper: Remove technical skill pill ──────────────────────────────────
  const removeTechSkill = (idx) => {
    const current = (form.technical_skills ?? []).slice()
    current.splice(idx, 1)
    onChange({ target: { name: 'technical_skills', value: current } })
  }

  // ── Helper: Remove soft skill pill ───────────────────────────────────────
  const removeSoftSkill = (idx) => {
    const current = (form.soft_skills ?? []).slice()
    current.splice(idx, 1)
    onChange({ target: { name: 'soft_skills', value: current } })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header: Detailed Educational Background */}
      <SectionHeader
        icon="🎓"
        title="V. DETAILED EDUCATIONAL BACKGROUND"
        subtitle="Optional: Add your school history here. Your highest attainment is already saved in Step 1"
      />

      {/* Currently in school */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.currently_in_school ?? false}
            onChange={(e) => onChange({ target: { name: 'currently_in_school', value: e.target.checked } })}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Currently enrolled in school</span>
        </label>
      </div>

      {/* Education table */}
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>Education Levels</h4>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#fff' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Level</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Year Graduated</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: '#475569', width: '50px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {form.educations?.map((edu, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>
                    <select
                      value={edu.level || ''}
                      onChange={(e) => onUpdateEducation('educations', i, { level: e.target.value })}
                      style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    >
                      <option value="">Select level</option>
                      {EDUCATION_LEVELS.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      placeholder="YYYY"
                      value={edu.year_graduated || ''}
                      onChange={(e) => onUpdateEducation('educations', i, { year_graduated: e.target.value || null })}
                      style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
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
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => onAddEducation('educations', educationTemplate)}
          style={{ marginTop: '12px', padding: '8px 12px', fontSize: '13px', color: '#1d4ed8', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
        >
          + Add Education
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
              🔧 Specialized & Professional Skills
            </h5>
            <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px' }}>
              e.g., React, Data Analysis, Accounting. Press Enter to add.
            </p>
            <input
              ref={techSkillsInputRef}
              type="text"
              placeholder="Add skill and press Enter…"
              onKeyDown={handleTechKeyDown}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontFamily: 'inherit',
                marginBottom: '12px',
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(form.technical_skills ?? []).map((skill, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                    gap: '6px',
                  }}
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeTechSkill(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#1e40af',
                      cursor: 'pointer',
                      fontSize: '16px',
                      lineHeight: '1',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Interpersonal / Soft Skills */}
          <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h5 style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
              🤝 Interpersonal / Soft Skills
            </h5>
            <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px' }}>
              e.g., Leadership, Communication, Teamwork. Press Enter to add.
            </p>
            <input
              ref={softSkillsInputRef}
              type="text"
              placeholder="Add skill and press Enter…"
              onKeyDown={handleSoftKeyDown}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontFamily: 'inherit',
                marginBottom: '12px',
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(form.soft_skills ?? []).map((skill, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundColor: '#f3e8ff',
                    color: '#6b21a8',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                    gap: '6px',
                  }}
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSoftSkill(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6b21a8',
                      cursor: 'pointer',
                      fontSize: '16px',
                      lineHeight: '1',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
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
                    <input
                      type="text"
                      placeholder="Course name"
                      value={train.course || ''}
                      onChange={(e) => onUpdateTraining('trainings', i, { course: e.target.value })}
                      style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
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
                    <input
                      type="text"
                      placeholder="License/Eligibility name"
                      value={elig.name || ''}
                      onChange={(e) => onUpdateEligibility('eligibilities', i, { name: e.target.value })}
                      style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
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
      </div>
    </div>
  )
}

// ── STEP 7: WORK EXPERIENCE ────────────────────────────────────────────────

function Step7({ form, errors, onAddExperience, onRemoveExperience, onUpdateExperience }) {
  const experienceTemplate = { company_name: '', company_address: '', position: '', number_of_months: '', employment_status: '' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionHeader title="Work Experience" num={7} />

      {/* Work experiences table */}
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>Work Experiences (required)</h4>
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
                    <input
                      type="text"
                      placeholder="Company name"
                      value={exp.company_name || ''}
                      onChange={(e) => onUpdateExperience('work_experiences', i, { company_name: e.target.value })}
                      style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="text"
                      placeholder="Position"
                      value={exp.position || ''}
                      onChange={(e) => onUpdateExperience('work_experiences', i, { position: e.target.value })}
                      style={{ width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
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
    educ_attainment: '',
    address_province: '',
    address_municipality_city: '',
    address_barangay: '',
    address_house_street: '',
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
    occupation_1 : '',
    occupation_2 : '',
    occupation_3 : '',
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
    
    // Auto-capitalize name fields
    if ((name === 'first_name' || name === 'last_name' || name === 'middle_name') && typeof value === 'string') {
      value = capitalizeName(value)
    }
    
    // Trim text fields
    if (typeof value === 'string' && (name.includes('_name') || name === 'religion' || name === 'religion_other' || name === 'tin' || name === 'ofw_country' || name === 'former_ofw_country' || name === 'unemployment_terminated_country' || name === 'address_house_street' || name === 'occupation_1' || name === 'occupation_2' || name === 'occupation_3' || name === 'disability_specification' || name === 'self_employed_type_others' || name === 'unemployment_reason_others' || name === 'household_id_4ps' || name === 'lang_other_name')) {
      value = value.trim()
    }
    
    setForm((f) => ({ ...f, [name]: value }))
    setErrors((err) => ({ ...err, [name]: undefined }))
    setApiError('')
  }, [])

  const handleGpsDetect = async () => {
    setGpsState({ loading: true, success: false, error: null, accuracy: null })

    try {
      const result = await detectAddress()

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
        warnings: result.warnings // Pass warnings to UI so user knows if something didn't match
      })

    } catch (errorMessage) {
      setGpsState({
        loading : false,
        success : false,
        error   : typeof errorMessage === 'string' ? errorMessage : 'Location detection failed.',
        accuracy: null,
      })
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
      else if (form.height_ft < 2.5 || form.height_ft > 8.5) e.height_ft = '2.5–8.5 ft only.'
      if (!form.educ_attainment)               e.educ_attainment = 'Required.'
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
        if (!form.unemployment_reason) e.unemployment_reason = 'Required.'
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
      if ((form.is_4ps_beneficiary === true || form.is_4ps_beneficiary === 'true') && !form.household_id_4ps?.trim())
        e.household_id_4ps = 'Required.'
    }

    if (s === 3) {
      if (!form.occupation_1?.trim())          e.occupation_1 = 'At least 1 occupation required.'
      if (!form.work_type_preference)          e.work_type_preference = 'Required.'
      if (!form.preferred_work_location)       e.preferred_work_location = 'Required.'
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
      if (!form.educations?.length)
        e.educations = 'Please add at least one education level.'
    }

    if (s === 6) {
      // Both trainings and eligibilities are optional at this step
      // No mandatory validation unless both are empty
      if (!form.trainings?.length && !form.eligibilities?.length)
        e.trainings = 'Please add at least one training or eligibility.'
    }

    if (s === 7) {
      if (!form.work_experiences?.length)
        e.work_experiences = 'Please add at least one work experience.'
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
    educ_attainment          : form.educ_attainment,
    address_province         : form.address_province,
    address_municipality_city: form.address_municipality_city,
    address_barangay         : form.address_barangay,
    address_house_street     : form.address_house_street,
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
    occupations                : [form.occupation_1, form.occupation_2, form.occupation_3].filter(Boolean),
  })

  const buildStep4Payload = () => {
    const languages = []
    for (const lang of LANGUAGES) {
      const key = lang.toLowerCase()
      const hasAny = ['read','write','speak','understand'].some((s) => form[`lang_${key}_${s}`])
      if (hasAny) {
        languages.push({
          language        : lang,
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
    currently_in_school : form.currently_in_school,
    educations          : form.educations || [],
    dole_skills         : form.dole_skills || [],
    technical_skills    : form.technical_skills || [],
    soft_skills         : form.soft_skills || [],
  })

  const buildStep6Payload = () => ({
    trainings      : form.trainings || [],
    eligibilities  : form.eligibilities || [],
  })

  const buildStep7Payload = () => ({
    work_experiences : form.work_experiences || [],
  })

  // ── Navigation ───────────────────────────────────────────────────────────
  const handleNext = async () => {
    const errs = validateStep(step)
    if (Object.keys(errs).length) { setErrors(errs); return }

    setIsLoading(true)
    setApiError('')

    try {
      let data
      if (step === 1) data = await authService.saveStep1(buildStep1Payload())
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
        setErrors(err.response.data.errors ?? {})
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px 60px' }}>

      <div style={{ width: '100%', maxWidth: '720px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ backgroundColor: '#1d4ed8', borderRadius: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#93c5fd', fontSize: '16px', fontWeight: '700' }}>i</span>
              <span style={{ color: '#60a5fa', fontSize: '16px' }}>-</span>
              <span style={{ color: '#fff', fontSize: '16px', fontWeight: '700', letterSpacing: '1px' }}>PESO</span>
            </div>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>
            Complete Your Profile
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            NSRP Form 1 — National Skills Registration Program · DOLE Philippines
          </p>
        </div>

        {/* Card */}
        <div ref={cardRef} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

          {/* Progress bar */}
          <div style={{ height: '4px', backgroundColor: '#f1f5f9' }}>
            <div style={{ height: '100%', backgroundColor: '#1d4ed8', width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
          </div>

          <div style={{ padding: '32px' }}>

            {/* Step Indicator */}
            <StepIndicator current={step} completed={completed} />

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
                style={{ flex: 2, padding: '13px', fontSize: '14px', fontWeight: '700', color: '#fff', backgroundColor: isLoading ? '#93c5fd' : '#1d4ed8', border: 'none', borderRadius: '12px', cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s' }}
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

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '16px', lineHeight: '1.5' }}>
          Your information is protected under the Data Privacy Act of 2012 (RA 10173).<br />
          This form is for official PESO use only.
        </p>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}