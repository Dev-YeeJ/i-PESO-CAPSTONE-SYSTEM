import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { searchOccupations } from '@/services/occupationService'

const sourceBadgeClass = {
  PSOC: 'bg-emerald-100 text-emerald-700',
  'O*NET': 'bg-amber-100 text-amber-700',
  ESCO: 'bg-blue-100 text-blue-700',
  'Local PESO': 'bg-slate-100 text-slate-600',
}

const occupationSources = (occupation) => {
  if (occupation.sources?.length) return occupation.sources
  if (occupation.source === 'psa') return ['PSOC']
  if (occupation.source === 'esco') return ['ESCO']
  if (occupation.source === 'fallback') return ['Local PESO']
  return []
}

const SourceBadges = ({ occupation }) => occupationSources(occupation).map((source) => (
  <span
    key={source}
    className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide ${
      sourceBadgeClass[source] ?? 'bg-slate-100 text-slate-600'
    }`}
  >
    {source}
  </span>
))

export default function OccupationCombobox({
  selected = [],
  onChange,
  multiple = false,
  limit = 3,
  searchLimit = 20,
  minimumQueryLength = 2,
  generalizedOnly = false,
  placeholder = 'Search by occupation title or classification code',
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
  const [searchError, setSearchError] = useState(false)
  const normalizedQuery = query.trim()

  useEffect(() => {
    if (!open || values.length >= limit || normalizedQuery.length < minimumQueryLength) return

    let cancelled = false

    const timer = setTimeout(async () => {
      setLoading(true)
      setSearchError(false)
      try {
        const results = await searchOccupations(
          normalizedQuery,
          generalizedOnly ? 50 : searchLimit,
          generalizedOnly ? 'general' : 'catalog',
        )
        if (!cancelled) {
          setOptions(results.filter((option) => !values.some((value) => value.id === option.id)))
        }
      } catch {
        if (!cancelled) {
          setOptions([])
          setSearchError(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [normalizedQuery, open, limit, searchLimit, minimumQueryLength, values, generalizedOnly])

  const select = (occupation) => {
    if (multiple) onChange([...values, occupation].slice(0, limit))
    else onChange(occupation)
    setQuery('')
    setOptions([])
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
              {!occupation.is_custom && (
                <span className="font-medium text-blue-500">{occupation.code ?? occupation.psoc_code}</span>
              )}
              <SourceBadges occupation={occupation} />
              {occupation.is_general && (
                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-violet-700">
                  JOB FAMILY
                </span>
              )}
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
            const nextQuery = event.target.value
            setQuery(nextQuery)
            setSearchError(false)
            if (nextQuery.trim().length < minimumQueryLength) {
              setOptions([])
              setLoading(false)
            }
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
            {!loading && normalizedQuery.length < minimumQueryLength && (
              <p className="px-4 py-3 text-xs text-slate-500">
                Type at least {minimumQueryLength} characters to search occupations.
              </p>
            )}
            {loading && <p className="px-4 py-3 text-xs text-slate-500">Searching occupations...</p>}
            {!loading && normalizedQuery.length >= minimumQueryLength && options.map((occupation) => (
              <button
                key={occupation.id}
                type="button"
                onClick={() => select(occupation)}
                className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-blue-50"
              >
                <span className="text-sm font-semibold text-slate-800">{occupation.title}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {occupation.matched_alias && (
                    <span className="max-w-32 truncate text-[10px] font-semibold text-emerald-700">
                      matches "{occupation.matched_alias}"
                    </span>
                  )}
                  {occupation.matched_general_term && (
                    <span className="max-w-36 truncate rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                      related to "{occupation.matched_general_term}"
                    </span>
                  )}
                  {occupation.matched_job_title && (
                    <span className="max-w-44 truncate text-[10px] font-semibold text-emerald-700">
                      "{occupation.matched_job_title}" belongs here
                    </span>
                  )}
                  <SourceBadges occupation={occupation} />
                  {occupation.is_general ? (
                    <span className="rounded bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                      BROAD FIELD
                    </span>
                  ) : (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {occupation.code ?? occupation.psoc_code}
                    </span>
                  )}
                </span>
              </button>
            ))}
            {!loading && normalizedQuery.length >= minimumQueryLength && searchError && (
              <p className="px-4 py-3 text-xs text-red-600">Unable to search occupations. Please try again.</p>
            )}
            {!loading && normalizedQuery.length >= minimumQueryLength && !searchError && !options.length && (
              <p className="px-4 py-3 text-xs text-slate-500">
                {generalizedOnly
                  ? 'No matching field found. Clear the search and choose the closest broad field.'
                  : 'No matching occupation found. Try another job title, alias, or classification code.'}
              </p>
            )}
          </div>
        )}
      </div>

      {multiple && <p className="mt-1 text-xs text-slate-400">{values.length} of {limit} selected</p>}
    </div>
  )
}
