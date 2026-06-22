import { useMemo } from 'react'

const inputClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'

export default function ExperienceTimeFrame({
  mode = 'employer',
  value,
  onChange,
  label,
  required = false,
  error,
  disabled = false,
  className = '',
}) {
  if (mode === 'employer') {
    return (
      <div className={className}>
        {label && (
          <p className="text-sm font-bold text-slate-700">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </p>
        )}
        <input
          type="number"
          min="0"
          max="50"
          step="0.5"
          value={value ?? 0}
          onChange={(event) => onChange?.(event.target.value === '' ? '' : Number(event.target.value))}
          disabled={disabled}
          className={`${inputClass} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
          aria-invalid={Boolean(error)}
          placeholder="Minimum years of relevant experience required"
        />
        <p className="mt-1.5 text-xs text-slate-500">Stored as a numeric requirement and converted to backend experience bands on publish.</p>
        {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <SeekerTimeFrame
      value={value}
      onChange={onChange}
      label={label}
      required={required}
      error={error}
      disabled={disabled}
      className={className}
    />
  )
}

function SeekerTimeFrame({ value = {}, onChange, label, required, error, disabled, className }) {
  const frame = {
    start_date: value.start_date ?? '',
    end_date: value.end_date ?? '',
    currently_employed: Boolean(value.currently_employed),
  }

  const months = useMemo(
    () => calculateMonths(frame.start_date, frame.currently_employed ? todayDate() : frame.end_date),
    [frame.currently_employed, frame.end_date, frame.start_date],
  )

  const emit = (patch) => {
    const next = {
      ...frame,
      ...patch,
    }

    if (next.currently_employed) {
      next.end_date = ''
    }

    const nextMonths = calculateMonths(next.start_date, next.currently_employed ? todayDate() : next.end_date)

    onChange?.({
      ...value,
      ...next,
      number_of_months: nextMonths,
    })
  }

  return (
    <div className={className}>
      {label && (
        <p className="text-sm font-bold text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </p>
      )}

      <p className="mt-1 text-xs leading-5 text-slate-500">Use exact dates to calculate work duration accurately.</p>

      <div className="mt-2 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Start Date</span>
          <input
            type="date"
            value={frame.start_date}
            onChange={(event) => emit({ start_date: event.target.value })}
            disabled={disabled}
            max={todayDate()}
            className={`${inputClass} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
          />
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">End Date</span>
          {frame.currently_employed ? (
            <div className="mt-2 flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-black text-slate-700">
              Present
            </div>
          ) : (
            <input
              type="date"
              value={frame.end_date}
              onChange={(event) => emit({ end_date: event.target.value })}
              disabled={disabled}
              min={frame.start_date || undefined}
              max={todayDate()}
              className={`${inputClass} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
            />
          )}
        </label>
      </div>

      <label className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
        <input
          type="checkbox"
          checked={frame.currently_employed}
          onChange={(event) => emit({ currently_employed: event.target.checked })}
          disabled={disabled}
          className="h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900"
        />
        Currently employed here
      </label>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
        {months > 0 ? `${months} month${months === 1 ? '' : 's'} calculated from exact dates` : 'Select exact dates to calculate relevant months.'}
      </div>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}

function calculateMonths(startDate, endDate) {
  if (!startDate || !endDate) return 0

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0
  }

  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  const partialMonth = end.getDate() >= start.getDate() ? 1 : 0

  return Math.max(1, months + partialMonth)
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}
