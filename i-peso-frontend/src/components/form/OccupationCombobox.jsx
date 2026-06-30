import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Search, CheckCircle2, BookOpen, Sparkles, AlertCircle, HelpCircle } from 'lucide-react'
import { classifyOccupation } from '@/services/occupationService'

const BROAD_OCCUPATION_FIELDS = [
  { key: 'office-work', title: 'Office and Administration', generalTerm: 'office work' },
  { key: 'factory-worker', title: 'Manufacturing and Factory Work', generalTerm: 'factory worker' },
  { key: 'driver', title: 'Driving and Transportation', generalTerm: 'driver' },
  { key: 'delivery-work', title: 'Delivery and Courier Work', generalTerm: 'delivery work' },
  { key: 'healthcare-work', title: 'Healthcare', generalTerm: 'healthcare work' },
  { key: 'caregiver-work', title: 'Caregiving and Personal Care', generalTerm: 'caregiver work' },
  { key: 'construction-work', title: 'Construction', generalTerm: 'construction work' },
  { key: 'skilled-trades', title: 'Skilled Trades and Repair', generalTerm: 'skilled trades' },
  { key: 'hospitality-work', title: 'Hospitality and Hotels', generalTerm: 'hospitality work' },
  { key: 'restaurant-work', title: 'Food Service and Restaurants', generalTerm: 'restaurant work' },
  { key: 'retail-work', title: 'Retail and Store Work', generalTerm: 'retail work' },
  { key: 'agriculture-work', title: 'Agriculture and Farming', generalTerm: 'agriculture work' },
  { key: 'fishing-work', title: 'Fishing and Fish Processing', generalTerm: 'fishing work' },
  { key: 'it-work', title: 'IT and Computer Work', generalTerm: 'it work' },
  { key: 'education-work', title: 'Education and Teaching', generalTerm: 'education work' },
  { key: 'logistics-work', title: 'Warehouse and Logistics', generalTerm: 'logistics work' },
  { key: 'beauty-work', title: 'Beauty and Wellness', generalTerm: 'beauty work' },
  { key: 'household-work', title: 'Household and Domestic Services', generalTerm: 'household work' },
  { key: 'government-work', title: 'Government and Community Services', generalTerm: 'government work' },
  { key: 'bpo-work', title: 'BPO and Customer Service', generalTerm: 'bpo work' },
  { key: 'online-work', title: 'Online and Digital Work', generalTerm: 'online work' },
  { key: 'finance-work', title: 'Accounting and Finance', generalTerm: 'finance work' },
  { key: 'engineering-work', title: 'Engineering and Architecture', generalTerm: 'engineering work' },
  { key: 'human-resources-work', title: 'Human Resources and Recruitment', generalTerm: 'human resources work' },
  { key: 'legal-work', title: 'Legal and Compliance', generalTerm: 'legal work' },
  { key: 'security-work', title: 'Security and Protective Services', generalTerm: 'security work' },
  { key: 'marketing-work', title: 'Marketing and Communications', generalTerm: 'marketing work' },
  { key: 'creative-work', title: 'Media Arts and Design', generalTerm: 'creative work' },
  { key: 'banking-work', title: 'Banking and Insurance', generalTerm: 'banking work' },
  { key: 'real-estate-work', title: 'Real Estate and Property Services', generalTerm: 'real estate work' },
  { key: 'science-work', title: 'Science, Research and Laboratory Work', generalTerm: 'science work' },
  { key: 'utilities-work', title: 'Utilities, Energy and Environment', generalTerm: 'utilities work' },
  { key: 'tourism-work', title: 'Tourism, Events and Recreation', generalTerm: 'tourism work' },
  { key: 'social-services-work', title: 'Social Services and Counseling', generalTerm: 'social services work' },
  { key: 'management-work', title: 'Management and Business Operations', generalTerm: 'management work' },
]

export default function OccupationCombobox({
  selected = [],
  onChange,
  multiple = false,
  limit = 3,
  placeholder = 'Type a specific job title (e.g. Teacher, Cashier, React Developer)',
  error,
}) {
  const values = useMemo(
    () => multiple ? selected : selected ? [selected] : [],
    [multiple, selected],
  )
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [menuRect, setMenuRect] = useState(null)
  const [fallbackMode, setFallbackMode] = useState(false)
  const inputRef = useRef(null)
  const normalizedQuery = query.trim()
  const canSelectMore = values.length < limit

  useEffect(() => {
    if (!open || !canSelectMore) return undefined

    const updateMenuRect = () => {
      const rect = inputRef.current?.getBoundingClientRect()
      if (!rect) return

      setMenuRect({
        left: Math.max(12, rect.left),
        top: rect.bottom + 6,
        width: Math.min(rect.width, window.innerWidth - Math.max(12, rect.left) - 12),
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
    if (!open || !canSelectMore || normalizedQuery.length < 2) {
      setResult(null)
      setFallbackMode(false)
      return
    }

    let cancelled = false

    const timer = setTimeout(async () => {
      setLoading(true)
      setSearchError(false)

      try {
        const response = await classifyOccupation(normalizedQuery, 5)
        if (cancelled) return

        setResult(response)
        
        // Auto-trigger fallback mode if no suggestions and no invalid reason
        if (response?.is_valid_job_input && (!response.suggestions || response.suggestions.length === 0)) {
          setFallbackMode(true)
        } else {
          setFallbackMode(false)
        }
      } catch {
        if (!cancelled) {
          setSearchError(true)
          setFallbackMode(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [normalizedQuery, open, canSelectMore])

  const select = (suggestion) => {
    // Check duplicates by title or broad field (if fallback)
    if (multiple) {
      const isDuplicate = values.some((value) => {
        if (suggestion.is_fallback) {
          return value.broad_field === suggestion.broad_field
        }
        return value.occupation_id === suggestion.occupation_id 
          && value.occupation_title === suggestion.occupation_title
      })
      if (isDuplicate) return
    }

    const payload = {
      occupation_id: suggestion.occupation_id || null,
      general_term: suggestion.general_term || null,
      broad_field: suggestion.broad_field || null,
      role_function: suggestion.role_function || null,
      confidence: suggestion.confidence || null,
      source: suggestion.source || null,
      occupation_title: suggestion.occupation_title,
      raw_job_title: normalizedQuery,
      is_custom_pending: !suggestion.occupation_id,
    }

    if (multiple) onChange([...values, payload].slice(0, limit))
    else onChange(payload)
    
    setQuery('')
    setResult(null)
    setFallbackMode(false)
    setOpen(false)
  }

  const remove = (indexToRemove) => {
    if (multiple) onChange(values.filter((_, index) => index !== indexToRemove))
    else onChange(null)
  }

  const handleManualFallbackSelection = (field) => {
    select({
      occupation_title: normalizedQuery,
      broad_field: field.title,
      general_term: field.generalTerm,
      role_function: 'General',
      confidence: 100, // User confirmed
      source: 'user_selected_broad_field',
      is_fallback: true,
    })
  }

  return (
    <div>
      {values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {values.map((occupation, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
              {occupation.occupation_title}
              {occupation.broad_field && (
                <span className="rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-blue-700">
                  {occupation.broad_field}
                </span>
              )}
              <button type="button" onClick={() => remove(i)} aria-label={`Remove ${occupation.occupation_title}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value
              setQuery(nextQuery)
              setSearchError(false)
              if (nextQuery.trim().length < 2) {
                setResult(null)
                setFallbackMode(false)
                setLoading(false)
              }
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            disabled={!canSelectMore}
            placeholder={!canSelectMore ? `Maximum of ${limit} selected` : placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={open && canSelectMore}
            className={`w-full rounded-xl border bg-white pl-10 pr-3.5 py-2.5 text-sm outline-none transition focus:ring-2 ${
              error
                ? 'border-red-400 focus:ring-red-100'
                : 'border-slate-300 focus:border-blue-400 focus:ring-blue-500/20'
            }`}
          />
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        </div>

        {open && canSelectMore && menuRect && (
          <div
            role="listbox"
            className="fixed z-[9999] max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl"
            style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
          >
            {/* Loading State */}
            {loading && (
              <div className="flex items-center gap-3 px-4 py-4 text-sm text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                Analyzing occupation...
              </div>
            )}

            {/* Error / Invalid Input State */}
            {!loading && result && !result.is_valid_job_input && (
              <div className="px-4 py-4">
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div className="text-sm">
                    <p className="font-semibold">Invalid job input</p>
                    <p className="mt-1 text-xs">{result.invalid_reason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Clarification State */}
            {!loading && result?.is_valid_job_input && result?.needs_clarification && result.suggestions?.length > 0 && !fallbackMode && (
              <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
                <div className="flex items-start gap-2 text-amber-800">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="text-sm">
                    <p className="font-semibold">Did you mean...</p>
                    <p className="mt-0.5 text-xs">Your input "{result.raw_input}" is broad. Please select the closest match below.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions List */}
            {!loading && result?.is_valid_job_input && result.suggestions?.length > 0 && !fallbackMode && (
              <div className="py-2">
                {result.suggestions.map((suggestion, idx) => (
                  <SuggestionOption
                    key={idx}
                    suggestion={suggestion}
                    onSelect={() => select(suggestion)}
                  />
                ))}
              </div>
            )}

            {/* Fallback Mode - Manual Broad Field Selection */}
            {!loading && fallbackMode && normalizedQuery.length >= 2 && (
              <div>
                <div className="border-b border-blue-100 bg-blue-50 px-4 py-3">
                  <div className="flex items-start gap-2 text-blue-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <div className="text-sm">
                      <p className="font-semibold">We could not identify the exact occupation.</p>
                      <p className="mt-0.5 text-xs">Please select the closest broad field for <strong>"{normalizedQuery}"</strong>.</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2">
                  {BROAD_OCCUPATION_FIELDS.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleManualFallbackSelection(field)}
                      className="flex items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left text-sm transition hover:border-blue-200 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                    >
                      <span className="font-medium text-slate-700">{field.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && normalizedQuery.length >= 2 && !result && !searchError && (
              <p className="px-4 py-3 text-xs text-slate-500">
                Keep typing to search for occupations...
              </p>
            )}
          </div>
        )}
      </div>

      {multiple && <p className="mt-1.5 text-xs text-slate-400">{values.length} of {limit} selected</p>}
    </div>
  )
}

function SuggestionOption({ suggestion, onSelect }) {
  const isCatalog = suggestion.source === 'catalog'
  const isDict = suggestion.source === 'dictionary'
  const isAi = suggestion.source === 'ai'

  return (
    <button
      type="button"
      role="option"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
      className="group flex w-full flex-col gap-1 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-blue-50/80 last:border-0"
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800">{suggestion.occupation_title}</span>
          
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
            {isCatalog && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
            {isDict && <BookOpen className="h-3 w-3 text-blue-500" />}
            {isAi && <Sparkles className="h-3 w-3 text-amber-500" />}
            {isCatalog ? 'Catalog' : isDict ? 'Dictionary' : 'AI Match'}
          </span>
        </div>
        
        {suggestion.confidence && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
            suggestion.confidence >= 85 ? 'bg-emerald-100 text-emerald-700' :
            suggestion.confidence >= 70 ? 'bg-blue-100 text-blue-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {suggestion.confidence}% match
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-blue-100 px-1.5 py-0.5 font-bold text-blue-700">
          {suggestion.broad_field}
        </span>
        <span className="text-slate-500">•</span>
        <span className="text-slate-600">{suggestion.role_function}</span>
      </div>

      {suggestion.reason && (
        <p className="mt-1 text-[11px] text-slate-500 group-hover:text-slate-600">
          {suggestion.reason}
        </p>
      )}
    </button>
  )
}
