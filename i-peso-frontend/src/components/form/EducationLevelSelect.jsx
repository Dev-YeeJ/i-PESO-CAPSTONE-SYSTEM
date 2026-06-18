export const EDUCATION_LEVEL_OPTIONS = [
  { rank: 1, label: 'High School Undergraduate', backendValue: 'High School Undergraduate' },
  { rank: 2, label: 'High School Graduate', backendValue: 'High School Graduate' },
  { rank: 3, label: 'Vocational / TVET (TESDA)', backendValue: 'TVET/Vocational Graduate' },
  { rank: 4, label: 'College Undergraduate', backendValue: 'College Undergraduate' },
  { rank: 5, label: 'College Graduate', backendValue: 'College Graduate' },
  { rank: 6, label: "Post-Graduate (Master's/Doctorate)", backendValue: 'Post-Graduate' },
]

const selectClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'

export default function EducationLevelSelect({
  value = '',
  onChange,
  label,
  required = false,
  error,
  disabled = false,
  placeholder = 'Select education level',
  className = '',
}) {
  const selectedValue = value === '' || value === null || value === undefined ? '' : String(value)

  return (
    <div className={className}>
      {label && (
        <p className="text-sm font-bold text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </p>
      )}
      <select
        value={selectedValue}
        onChange={(event) => {
          const rank = Number(event.target.value)
          const option = EDUCATION_LEVEL_OPTIONS.find((item) => item.rank === rank) ?? null
          onChange?.(Number.isNaN(rank) ? '' : rank, option)
        }}
        disabled={disabled}
        className={`${selectClass} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
        aria-invalid={Boolean(error)}
      >
        <option value="">{placeholder}</option>
        {EDUCATION_LEVEL_OPTIONS.map((option) => (
          <option key={option.rank} value={option.rank}>{option.label}</option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}

export function educationRankToBackendValue(rank) {
  return EDUCATION_LEVEL_OPTIONS.find((option) => option.rank === Number(rank))?.backendValue ?? ''
}

export function educationBackendValueToRank(value) {
  const normalized = String(value ?? '').toLowerCase()
  return EDUCATION_LEVEL_OPTIONS.find((option) => option.backendValue.toLowerCase() === normalized)?.rank ?? ''
}

export function educationRankToLabel(rank) {
  return EDUCATION_LEVEL_OPTIONS.find((option) => option.rank === Number(rank))?.label ?? ''
}
