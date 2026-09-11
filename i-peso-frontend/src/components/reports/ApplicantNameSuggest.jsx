import { useEffect, useRef, useState } from 'react'
import { Loader2, UserRound } from 'lucide-react'

// Module-level cache so re-focusing a field with the same text already typed
// doesn't re-hit the server — mirrors the same pattern OccupationCombobox uses.
const queryCache = new Map()
const CACHE_MAX = 30
function putCache(key, value) {
  if (queryCache.size >= CACHE_MAX) queryCache.delete(queryCache.keys().next().value)
  queryCache.set(key, value)
}

const inputClass = 'w-full min-w-[9rem] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm hover:border-slate-200 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy/20'

/**
 * "Smart typing" name search for the applicant-name field on a job fair
 * result entry row. Type a few letters of a registered job seeker's name,
 * pick a suggestion, and the caller's `onSelect` receives everything needed
 * to auto-fill the rest of that row (sex, city, contact number, age group,
 * education, classification) from their i-PESO profile. Free typing always
 * still works underneath for walk-ins with no account.
 *
 * @param {string} value
 * @param {(text: string) => void} onChangeText
 * @param {(suggestion: object) => void} onSelect
 * @param {(query: string, signal: AbortSignal) => Promise<object[]>} searchFn
 */
export default function ApplicantNameSuggest({ value, onChangeText, onSelect, searchFn, placeholder = 'Full name' }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [searched, setSearched] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)

  const wrapperRef = useRef(null)
  const abortRef = useRef(null)

  const query = value.trim()

  useEffect(() => {
    if (!open || query.length < 2) {
      setSuggestions([])
      setSearched(false)
      return undefined
    }

    const cached = queryCache.get(query)
    if (cached) {
      setSuggestions(cached)
      setSearched(true)
      return undefined
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)

    const timer = setTimeout(async () => {
      try {
        const results = await searchFn(query, controller.signal)
        if (controller.signal.aborted) return
        putCache(query, results)
        setSuggestions(results)
        setSearched(true)
      } catch (err) {
        if (controller.signal.aborted || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return
        setSuggestions([])
        setSearched(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, open, searchFn])

  useEffect(() => {
    if (!open) return undefined
    const handleOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const select = (suggestion) => {
    onSelect(suggestion)
    setOpen(false)
    setHighlighted(-1)
  }

  const handleKeyDown = (event) => {
    if (!open || suggestions.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (event.key === 'Enter' && highlighted >= 0) {
      event.preventDefault()
      select(suggestions[highlighted])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown = open && query.length >= 2

  return (
    <div ref={wrapperRef} className="relative">
      <input
        value={value}
        onChange={(event) => { onChangeText(event.target.value); setOpen(true); setHighlighted(-1) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClass}
      />
      {showDropdown && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {loading && suggestions.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching job seekers…
            </div>
          )}
          {!loading && searched && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400">No matching job seeker — you can still type a name manually.</div>
          )}
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.seeker_id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(suggestion)}
              className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left ${index === highlighted ? 'bg-brand-navy/5' : 'hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {suggestion.name}
              </span>
              {(suggestion.city_municipality || suggestion.contact_number) && (
                <span className="pl-5 text-xs text-slate-400">
                  {[suggestion.city_municipality, suggestion.contact_number].filter(Boolean).join(' · ')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
