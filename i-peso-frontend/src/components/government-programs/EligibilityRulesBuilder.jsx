import { Plus, Trash2 } from 'lucide-react'

// Keep field/op values in sync with the backend EligibilityMatchingService
// and AdminGovernmentProgramController::RULE_FIELDS / RULE_OPS.
const EMPLOYMENT_OPTIONS = [
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'employed', label: 'Employed' },
]

// Education labels must match job_seekers.educ_attainment values the service ranks.
export const EDUCATION_LEVELS = [
  'Elementary Graduate',
  'High School Undergraduate',
  'High School Graduate',
  'Senior High School Graduate',
  'Vocational / Technical',
  'College Undergraduate',
  'College Graduate',
  "Master's Degree",
  'Doctorate',
]

const CIVIL_STATUS_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Widowed', label: 'Widowed' },
  { value: 'Separated', label: 'Separated' },
]

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

const FIELD_CONFIG = {
  age: { label: 'Age', op: 'between', input: 'range' },
  employment_status: { label: 'Employment status', op: 'in', input: 'multiselect', options: EMPLOYMENT_OPTIONS },
  educ_attainment: { label: 'Education (minimum)', op: 'min_level', input: 'select', options: EDUCATION_LEVELS },
  is_4ps_beneficiary: { label: '4Ps beneficiary', op: 'equals', input: 'boolean' },
  is_ofw: { label: 'OFW / former OFW', op: 'equals', input: 'boolean' },
  sex: { label: 'Sex', op: 'equals', input: 'select', options: SEX_OPTIONS },
  civil_status: { label: 'Civil status', op: 'in', input: 'multiselect', options: CIVIL_STATUS_OPTIONS },
  residency: { label: 'Residency (city/municipality)', op: 'equals', input: 'text' },
}

const FIELD_ORDER = Object.keys(FIELD_CONFIG)

// DOLE-aligned quick presets (editable after loading).
const PRESETS = {
  SPES: [
    { field: 'age', op: 'between', min: 15, max: 30, weight: 2, required: true },
    { field: 'employment_status', op: 'in', values: ['unemployed'], weight: 2, required: true },
    { field: 'is_4ps_beneficiary', op: 'equals', value: true, weight: 1, required: false },
  ],
  TUPAD: [
    { field: 'age', op: 'between', min: 18, max: 200, weight: 2, required: true },
    { field: 'employment_status', op: 'in', values: ['unemployed'], weight: 2, required: true },
    { field: 'is_4ps_beneficiary', op: 'equals', value: true, weight: 1, required: false },
  ],
  GIP: [
    { field: 'age', op: 'between', min: 18, max: 30, weight: 2, required: true },
    { field: 'educ_attainment', op: 'min_level', value: 'High School Graduate', weight: 2, required: true },
    { field: 'is_4ps_beneficiary', op: 'equals', value: true, weight: 1, required: false },
  ],
  'DOLE-AKAP': [
    { field: 'is_ofw', op: 'equals', value: true, weight: 3, required: true },
    { field: 'age', op: 'between', min: 18, max: 200, weight: 1, required: true },
  ],
}

const describeRule = (rule) => {
  switch (rule.field) {
    case 'age':
      return Number(rule.max) >= 120 ? `At least ${rule.min || 0} years old` : `Age ${rule.min ?? '?'} to ${rule.max ?? '?'} years old`
    case 'employment_status':
      return `Employment: ${(rule.values ?? []).join(' / ') || 'any'}`
    case 'educ_attainment':
      return `At least ${rule.value || '—'}`
    case 'is_4ps_beneficiary':
      return rule.value ? '4Ps / low-income household' : 'Not a 4Ps beneficiary'
    case 'is_ofw':
      return rule.value ? 'OFW or former OFW' : 'Not an OFW'
    case 'sex':
      return `Sex: ${rule.value || '—'}`
    case 'civil_status':
      return `Civil status: ${(rule.values ?? []).join(' / ') || 'any'}`
    case 'residency':
      return `Resident of ${rule.value || '—'}`
    default:
      return rule.field
  }
}

const defaultRuleForField = (field) => {
  const config = FIELD_CONFIG[field]
  const base = { field, op: config.op, weight: 1, required: false }
  if (config.input === 'range') return { ...base, min: 18, max: 200 }
  if (config.input === 'multiselect') return { ...base, values: [] }
  if (config.input === 'boolean') return { ...base, value: true }
  if (config.input === 'select') return { ...base, value: config.options[0]?.value ?? config.options[0] ?? '' }
  return { ...base, value: '' }
}

const withAutoLabel = (rule) => ({ ...rule, label: describeRule(rule) })

export default function EligibilityRulesBuilder({ rules = [], onChange }) {
  const update = (index, patch) => {
    const next = rules.map((rule, i) => (i === index ? withAutoLabel({ ...rule, ...patch }) : rule))
    onChange(next)
  }

  const changeField = (index, field) => {
    onChange(rules.map((rule, i) => (i === index ? withAutoLabel(defaultRuleForField(field)) : rule)))
  }

  const addRule = () => {
    const used = new Set(rules.map((rule) => rule.field))
    const nextField = FIELD_ORDER.find((field) => !used.has(field)) ?? 'age'
    onChange([...rules, withAutoLabel(defaultRuleForField(nextField))])
  }

  const loadPreset = (name) => onChange(PRESETS[name].map(withAutoLabel))
  const removeRule = (index) => onChange(rules.filter((_, i) => i !== index))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500">Quick start:</span>
        {Object.keys(PRESETS).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => loadPreset(name)}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:border-blue-400 hover:text-blue-700"
          >
            {name}
          </button>
        ))}
      </div>

      {rules.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          No eligibility rules yet. Programs with no rules are open to everyone. Add rules to enable eligibility scoring.
        </p>
      )}

      <div className="space-y-3">
        {rules.map((rule, index) => {
          const config = FIELD_CONFIG[rule.field] ?? FIELD_CONFIG.age
          return (
            <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-500">Requirement</span>
                  <select
                    value={rule.field}
                    onChange={(e) => changeField(index, e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {FIELD_ORDER.map((field) => (
                      <option key={field} value={field}>{FIELD_CONFIG[field].label}</option>
                    ))}
                  </select>
                </label>

                {config.input === 'range' && (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-500">Min age</span>
                      <input
                        type="number" min="0" max="200" value={rule.min ?? ''}
                        onChange={(e) => update(index, { min: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-500">Max age</span>
                      <input
                        type="number" min="0" max="200" value={rule.max ?? ''}
                        onChange={(e) => update(index, { max: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </>
                )}

                {config.input === 'select' && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500">Value</span>
                    <select
                      value={rule.value ?? ''}
                      onChange={(e) => update(index, { value: e.target.value })}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {config.options.map((opt) => {
                        const value = opt.value ?? opt
                        const label = opt.label ?? opt
                        return <option key={value} value={value}>{label}</option>
                      })}
                    </select>
                  </label>
                )}

                {config.input === 'boolean' && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500">Must be</span>
                    <select
                      value={rule.value ? 'yes' : 'no'}
                      onChange={(e) => update(index, { value: e.target.value === 'yes' })}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                )}

                {config.input === 'text' && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500">Value</span>
                    <input
                      type="text" value={rule.value ?? ''}
                      onChange={(e) => update(index, { value: e.target.value })}
                      placeholder="e.g. Urdaneta City"
                      className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                )}

                {config.input === 'multiselect' && (
                  <fieldset className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500">Accepted values</span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {config.options.map((opt) => {
                        const checked = (rule.values ?? []).includes(opt.value)
                        return (
                          <label key={opt.value} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const set = new Set(rule.values ?? [])
                                e.target.checked ? set.add(opt.value) : set.delete(opt.value)
                                update(index, { values: [...set] })
                              }}
                            />
                            {opt.label}
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                )}

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-500">Weight</span>
                  <input
                    type="number" min="0" max="100" step="1" value={rule.weight ?? 1}
                    onChange={(e) => update(index, { weight: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!rule.required}
                    onChange={(e) => update(index, { required: e.target.checked })}
                  />
                  Required
                </label>

                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  className="mb-1 ml-auto inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>

              <label className="mt-3 flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-500">Label shown to the applicant</span>
                <input
                  type="text" value={rule.label ?? ''}
                  onChange={(e) => onChange(rules.map((r, i) => (i === index ? { ...r, label: e.target.value } : r)))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addRule}
        className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
      >
        <Plus className="h-4 w-4" /> Add rule
      </button>
    </div>
  )
}
