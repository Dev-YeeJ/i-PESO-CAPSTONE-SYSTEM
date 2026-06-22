import { useMemo, useState } from 'react'
import { CheckCircle2, Sparkles } from 'lucide-react'

export default function SmartSuggestionInput({
  label,
  name,
  value = '',
  onChange,
  onBlur,
  error,
  options = [],
  placeholder,
  helper,
  required = false,
  maxLength,
  inputMode,
  type = 'text',
  autoComplete,
  transformValue,
}) {
  const [open, setOpen] = useState(false)
  const normalizedValue = String(value ?? '')
  const visibleOptions = useMemo(() => {
    const query = normalizedValue.trim().toLowerCase()
    const rows = options.map((option) => (
      typeof option === 'string' ? { label: option, value: option } : option
    ))

    if (!query) return rows.slice(0, 6)

    return rows
      .filter((option) => `${option.label} ${option.value} ${option.helper ?? ''}`.toLowerCase().includes(query))
      .slice(0, 6)
  }, [normalizedValue, options])

  const emitChange = (nextValue) => {
    const cleanValue = transformValue ? transformValue(nextValue) : nextValue
    onChange?.({ target: { name, value: cleanValue } })
  }

  return (
    <div className="relative">
      <label className="block text-sm font-bold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {helper && <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>}
      <div className="relative mt-2">
        <input
          type={type}
          name={name}
          value={normalizedValue}
          onChange={(event) => emitChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={(event) => {
            window.setTimeout(() => setOpen(false), 120)
            onBlur?.(event)
          }}
          placeholder={placeholder}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className={`w-full rounded-xl border bg-white px-3.5 py-3 pr-11 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
          }`}
        />
        <Sparkles className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
      </div>

      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}

      {open && visibleOptions.length > 0 && (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <p className="px-2 pb-2 text-[11px] font-black uppercase tracking-wide text-indigo-500">Smart suggestions</p>
          {visibleOptions.map((option) => (
            <button
              key={`${option.value}-${option.label}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                emitChange(option.value)
                setOpen(false)
              }}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <span>
                <span className="block text-sm font-bold text-slate-800">{option.label}</span>
                {option.helper && <span className="mt-0.5 block text-xs leading-5 text-slate-500">{option.helper}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
