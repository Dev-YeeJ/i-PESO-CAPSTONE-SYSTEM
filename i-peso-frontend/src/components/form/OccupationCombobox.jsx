import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { searchOccupations } from '@/services/occupationService'

const ISCO_BROAD_FIELDS = {
  0: 'Armed Forces',
  1: 'Management',
  2: 'Professional Work',
  3: 'Technical Work',
  4: 'Office and Administration',
  5: 'Service and Sales',
  6: 'Agriculture and Fishery',
  7: 'Skilled Trades',
  8: 'Machine and Plant Operations',
  9: 'Elementary Occupations',
}

export default function OccupationCombobox({
  selected = [],
  onChange,
  multiple = false,
  limit = 3,
  searchLimit = 20,
  minimumQueryLength = 2,
  generalizedOnly = false,
  enableAiSuggestions = false,
  aiSuggestionProvider = null,
  placeholder = 'Search by occupation title or occupation code',
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
  const [aiOptions, setAiOptions] = useState([])
  const [aiError, setAiError] = useState(false)
  const [menuRect, setMenuRect] = useState(null)
  const aiSuggestionProviderRef = useRef(aiSuggestionProvider)
  const inputRef = useRef(null)
  const normalizedQuery = query.trim()
  const canSelectMore = values.length < limit

  useEffect(() => {
    aiSuggestionProviderRef.current = aiSuggestionProvider
  }, [aiSuggestionProvider])

  useEffect(() => {
    if (!open || !canSelectMore) return

    const updateMenuRect = () => {
      const rect = inputRef.current?.getBoundingClientRect()
      if (!rect) return

      setMenuRect({
        left: rect.left,
        top: rect.bottom + 6,
        width: rect.width,
      })
    }

    updateMenuRect()
    window.addEventListener('resize', updateMenuRect)
    window.addEventListener('scroll', updateMenuRect, true)

    return () => {
      window.removeEventListener('resize', updateMenuRect)
      window.removeEventListener('scroll', updateMenuRect, true)
    }
  }, [open, canSelectMore])

  useEffect(() => {
    if (!open || !canSelectMore || normalizedQuery.length < minimumQueryLength) {
      return
    }

    let cancelled = false

    const timer = setTimeout(async () => {
      setLoading(true)
      setSearchError(false)
      setAiError(false)

      const catalogSearch = searchOccupations(
        normalizedQuery,
        generalizedOnly ? 50 : searchLimit,
        generalizedOnly ? 'general' : 'catalog',
      )
      const aiSearch = enableAiSuggestions && !generalizedOnly && aiSuggestionProviderRef.current
        ? aiSuggestionProviderRef.current(normalizedQuery)
        : Promise.resolve([])

      const [catalogResult, aiResult] = await Promise.allSettled([catalogSearch, aiSearch])
      if (cancelled) return

      const catalogOptions = catalogResult.status === 'fulfilled'
        ? catalogResult.value.filter((option) => !values.some((value) => value.id === option.id))
        : []

      setOptions(catalogOptions)
      setSearchError(catalogResult.status === 'rejected')
      setAiOptions(aiResult.status === 'fulfilled'
        ? toAiOccupationOptions(aiResult.value, [...values, ...catalogOptions])
        : [])
      setAiError(aiResult.status === 'rejected')
      setLoading(false)
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [normalizedQuery, open, limit, searchLimit, minimumQueryLength, values, generalizedOnly, enableAiSuggestions, canSelectMore])

  const select = (occupation) => {
    if (multiple && values.some((value) => value.id === occupation.id)) return

    if (multiple) onChange([...values, occupation].slice(0, limit))
    else onChange(occupation)
    setQuery('')
    setOptions([])
    setAiOptions([])
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
              <span className="rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-blue-700">
                {occupationCategory(occupation)}
              </span>
              <button type="button" onClick={() => remove(occupation)} aria-label={`Remove ${occupation.title}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value
            setQuery(nextQuery)
            setSearchError(false)
            setAiError(false)
            if (nextQuery.trim().length < minimumQueryLength) {
              setOptions([])
              setAiOptions([])
              setLoading(false)
            }
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          disabled={!canSelectMore}
          placeholder={!canSelectMore ? `Maximum of ${limit} selected` : placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && canSelectMore}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 ${
            error
              ? 'border-red-400 focus:ring-red-100'
              : 'border-slate-300 focus:border-blue-400 focus:ring-blue-500/20'
          }`}
        />

        {open && canSelectMore && menuRect && (
          <div
            role="listbox"
            className="fixed z-[9999] max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl"
            style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
          >
            {!loading && normalizedQuery.length < minimumQueryLength && (
              <p className="px-4 py-3 text-xs text-slate-500">
                Type at least {minimumQueryLength} characters to search occupations.
              </p>
            )}

            {loading && <p className="px-4 py-3 text-xs text-slate-500">Searching occupations...</p>}

            {!loading && normalizedQuery.length >= minimumQueryLength && options.map((occupation) => (
              <OccupationOption
                key={occupation.id}
                occupation={occupation}
                onSelect={select}
              />
            ))}

            {!loading && normalizedQuery.length >= minimumQueryLength && searchError && (
              <p className="px-4 py-3 text-xs text-red-600">
                Unable to search saved occupations. Showing suggestions when available.
              </p>
            )}

            {!loading && normalizedQuery.length >= minimumQueryLength && aiOptions.length > 0 && (
              <>
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  Suggested occupations
                </div>
                {aiOptions.map((occupation) => (
                  <OccupationOption
                    key={occupation.id}
                    occupation={occupation}
                    onSelect={select}
                  />
                ))}
              </>
            )}

            {!loading && normalizedQuery.length >= minimumQueryLength && !options.length && aiError && (
              <p className="px-4 py-3 text-xs text-slate-500">Suggested occupations are unavailable right now.</p>
            )}

            {!loading && normalizedQuery.length >= minimumQueryLength && !searchError && !options.length && !aiOptions.length && !aiError && (
              <p className="px-4 py-3 text-xs text-slate-500">
                {generalizedOnly
                  ? 'No matching field found. Clear the search and choose the closest broad field.'
                  : 'No matching occupation found. Try another job title, alias, or occupation code.'}
              </p>
            )}
          </div>
        )}
      </div>

      {multiple && <p className="mt-1 text-xs text-slate-400">{values.length} of {limit} selected</p>}
    </div>
  )
}

function OccupationOption({ occupation, onSelect }) {
  const category = occupationCategory(occupation)
  const isGeneral = occupation.is_general

  return (
    <button
      type="button"
      role="option"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(occupation)}
      className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-blue-50"
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{occupation.title}</span>
          <span className={`max-w-48 truncate rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
            isGeneral
              ? 'bg-violet-100 text-violet-700'
              : 'bg-slate-100 text-slate-600'
          }`}>
            {category}
          </span>
        </span>

        {occupation.reason && (
          <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{occupation.reason}</span>
        )}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1.5">
        {occupation.matched_alias && (
          <span className="max-w-36 truncate text-[10px] font-semibold text-emerald-700">
            matches "{occupation.matched_alias}"
          </span>
        )}
        {occupation.matched_general_term && (
          <span className="max-w-40 truncate rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
            related to "{occupation.matched_general_term}"
          </span>
        )}
        {occupation.matched_job_title && (
          <span className="max-w-44 truncate text-[10px] font-semibold text-emerald-700">
            "{occupation.matched_job_title}" belongs here
          </span>
        )}
      </span>
    </button>
  )
}

function occupationCategory(occupation) {
  if (occupation?.is_general) return 'Broad field'

  const explicitCategory = cleanCategory(
    occupation?.broad_category
    || occupation?.category
    || occupation?.general_label
    || occupation?.field
  )

  if (explicitCategory) return explicitCategory

  const generalTerm = cleanCategory(occupation?.general_term || occupation?.matched_general_term)
  if (generalTerm) return titleCase(generalTerm)

  const iscoMajor = String(occupation?.isco_group ?? '').trim().charAt(0)
  return ISCO_BROAD_FIELDS[iscoMajor] ?? 'Specific job'
}

function cleanCategory(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function titleCase(value) {
  return cleanCategory(value).replace(/\w\S*/g, (word) => (
    /^[A-Z]{2,}$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ))
}

const normalizeTitle = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

const toAiOccupationOptions = (suggestions = [], selected = []) => {
  const selectedTitles = new Set(selected.map((occupation) => normalizeTitle(occupation.title)))
  const seen = new Set()

  return suggestions
    .map((suggestion) => {
      const title = String(suggestion?.name ?? suggestion?.title ?? suggestion ?? '').trim().replace(/\s+/g, ' ')
      const key = normalizeTitle(title)
      if (!title || selectedTitles.has(key) || seen.has(key)) return null
      seen.add(key)

      return {
        id: `ai:${key}`,
        title,
        raw_job_title: title,
        reason: String(suggestion?.reason ?? '').trim(),
        broad_category: cleanCategory(
          suggestion?.broad_category
          || suggestion?.category
          || suggestion?.field
          || suggestion?.general_field
        ),
        is_custom: true,
        is_ai_generated: true,
        source: 'ai_generated',
      }
    })
    .filter(Boolean)
    .slice(0, 5)
}
