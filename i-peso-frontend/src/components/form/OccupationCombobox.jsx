import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { searchOccupations } from '@/services/occupationService'

export default function OccupationCombobox({
  selected = [],
  onChange,
  multiple = false,
  limit = 3,
  placeholder = 'Search by occupation title or PSOC code',
  error,
}) {
  const values = useMemo(
    () => multiple ? selected : selected ? [selected] : [],
    [multiple, selected],
  )
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || values.length >= limit) return

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await searchOccupations(query, 20)
        setOptions(results.filter((option) => !values.some((value) => value.id === option.id)))
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query, open, limit, values])

  const select = (occupation) => {
    if (multiple) onChange([...values, occupation].slice(0, limit))
    else onChange(occupation)
    setQuery('')
    setOpen(false)
  }

  const remove = (occupation) => {
    if (multiple) onChange(values.filter((value) => value.id !== occupation.id))
    else onChange(null)
  }

  return (
    <div>
      {values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {values.map((occupation) => (
            <span key={occupation.id} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
              {occupation.title}
              <span className="font-medium text-blue-500">{occupation.psoc_code}</span>
              <button type="button" onClick={() => remove(occupation)} aria-label={`Remove ${occupation.title}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          disabled={values.length >= limit}
          placeholder={values.length >= limit ? `Maximum of ${limit} selected` : placeholder}
          autoComplete="off"
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 ${
            error
              ? 'border-red-400 focus:ring-red-100'
              : 'border-slate-300 focus:border-blue-400 focus:ring-blue-500/20'
          }`}
        />

        {open && values.length < limit && (
          <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            {loading && <p className="px-4 py-3 text-xs text-slate-500">Searching occupations...</p>}
            {!loading && options.map((occupation) => (
              <button
                key={occupation.id}
                type="button"
                onClick={() => select(occupation)}
                className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-blue-50"
              >
                <span className="text-sm font-semibold text-slate-800">{occupation.title}</span>
                <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{occupation.psoc_code}</span>
              </button>
            ))}
            {!loading && !options.length && (
              <p className="px-4 py-3 text-xs text-slate-500">No standardized occupation found.</p>
            )}
          </div>
        )}
      </div>

      {multiple && <p className="mt-1 text-xs text-slate-400">{values.length} of {limit} selected</p>}
    </div>
  )
}
