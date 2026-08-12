import { useMemo, useState } from 'react'

const normalize = (value) => String(value ?? '').trim().toLowerCase()

export default function SearchableTextInput({ label, value, onChange, options = [], placeholder, error, allowCustom = true }) {
  const [open, setOpen] = useState(false)
  const rows = useMemo(() => options.map((option) => (
    typeof option === 'string' ? { label: option } : option
  )), [options])
  const query = normalize(value)
  const matches = rows
    .filter((option) => !query || normalize(`${option.label} ${option.keywords ?? ''} ${option.meta ?? ''}`).includes(query))
    .slice(0, 10)

  return (
    <label className="block">
      {label && <span className="block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>}
      <div className={`relative mt-1.5 ${open ? 'z-50' : 'z-20'}`}>
        <input value={value ?? ''} onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 140)} placeholder={placeholder} autoComplete="off" role="combobox" aria-expanded={open} className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10 ${error ? 'border-red-400' : 'border-slate-300'}`} />
        {open && matches.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {matches.map((option) => (
              <button key={option.label} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => {
                onChange(option.label)
                setOpen(false)
              }} className="block w-full border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-blue-50">
                <span className="block text-sm font-bold text-slate-900">{option.label}</span>
                {option.meta && <span className="mt-0.5 block text-xs text-slate-500">{option.meta}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {!allowCustom && value && !rows.some((option) => normalize(option.label) === query) && <p className="mt-1 text-xs text-amber-600">Select a value from the suggestions.</p>}
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </label>
  )
}
