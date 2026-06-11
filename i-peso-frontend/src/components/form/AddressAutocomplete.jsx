import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, MapPin, Search, X } from 'lucide-react'
import { autocompleteAddress } from '@/services/geoService'

export default function AddressAutocomplete({
  onSelect,
  latitude,
  longitude,
  placeholder = 'Search your house, street, purok, barangay, or city',
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const requestSequence = useRef(0)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 3) {
      return undefined
    }

    const sequence = ++requestSequence.current
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')

      try {
        const results = await autocompleteAddress(trimmed, { latitude, longitude })
        if (requestSequence.current === sequence) {
          setSuggestions(results)
          setActiveIndex(-1)
        }
      } catch {
        if (requestSequence.current === sequence) {
          setSuggestions([])
          setError('Address suggestions are temporarily unavailable.')
        }
      } finally {
        if (requestSequence.current === sequence) setLoading(false)
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [query, latitude, longitude])

  const choose = (suggestion) => {
    setQuery(suggestion.formatted ?? suggestion.address_line1 ?? '')
    setSuggestions([])
    setActiveIndex(-1)
    onSelect(suggestion)
  }

  const onKeyDown = (event) => {
    if (!suggestions.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      choose(suggestions[activeIndex])
    } else if (event.key === 'Escape') {
      setSuggestions([])
    }
  }

  return (
    <div className="relative mb-4">
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        Find address automatically
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-700" />
        <input
          type="text"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value
            setQuery(nextQuery)
            if (nextQuery.trim().length < 3) {
              setSuggestions([])
              setLoading(false)
              setError('')
            }
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-autocomplete="list"
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        {loading ? (
          <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-700" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setSuggestions([])
            }}
            aria-label="Clear address search"
            className="absolute right-2 top-1/2 rounded-md p-1 -translate-y-1/2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

      {suggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id ?? `${suggestion.formatted}-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(suggestion)}
              className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                index === activeIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {suggestion.address_line1 ?? suggestion.formatted}
                </span>
                {suggestion.address_line2 && (
                  <span className="block truncate text-xs text-slate-500">{suggestion.address_line2}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-slate-500">
        Suggestions are limited to Philippine addresses. Verify the official PSGC fields below.
      </p>
    </div>
  )
}
