import { useEffect, useId, useRef, useState } from 'react'
import { LoaderCircle, MapPin, Search } from 'lucide-react'
import { autocompleteAddress, getPlaceAddress } from '@/services/geoService'

function createSessionToken() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function getComponent(addressComponents, types) {
  const component = addressComponents.find((item) =>
    types.some((type) => item.types?.includes(type))
  )

  return component?.long_name ?? component?.longText ?? ''
}

function parseAddressComponents(addressComponents = []) {
  const streetNumber = getComponent(addressComponents, ['street_number'])
  const route = getComponent(addressComponents, ['route'])

  return {
    street: [streetNumber, route].filter(Boolean).join(' '),
    barangay: getComponent(addressComponents, [
      'sublocality_level_1',
      'sublocality',
      'neighborhood',
    ]),
    city: getComponent(addressComponents, [
      'locality',
      'administrative_area_level_2',
    ]),
    province: getComponent(addressComponents, ['administrative_area_level_1']),
  }
}

export default function SingleAddressInput({
  onAddressParsed,
  onPlaceResolved,
  value = '',
  label = 'Address',
  placeholder = 'Search your address',
  disabled = false,
  className = '',
}) {
  const inputId = useId()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [error, setError] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const requestSequence = useRef(0)
  const sessionToken = useRef(createSessionToken())
  const selectedDisplayValue = useRef('')
  const loading = isSearching || isResolving

  useEffect(() => {
    if (!value || value === query) return

    selectedDisplayValue.current = value
    setQuery(value)
    setSuggestions([])
    setActiveIndex(-1)
  }, [value, query])

  useEffect(() => {
    const text = query.trim()
    if (text.length < 3 || isResolving || query === selectedDisplayValue.current) return undefined

    const sequence = ++requestSequence.current
    const timer = window.setTimeout(async () => {
      setIsSearching(true)
      setError('')

      try {
        const results = await autocompleteAddress(text, {}, sessionToken.current)
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
        if (requestSequence.current === sequence) setIsSearching(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [query, isResolving])

  const selectSuggestion = async (suggestion) => {
    const currentToken = sessionToken.current
    requestSequence.current += 1
    setSuggestions([])
    setActiveIndex(-1)
    setIsSearching(false)
    setIsResolving(true)
    setError('')

    try {
      const place = await getPlaceAddress(suggestion.place_id, currentToken)
      const parsedAddress = parseAddressComponents(place?.address_components)
      const formattedAddress = place?.formatted ?? suggestion.formatted ?? ''

      selectedDisplayValue.current = formattedAddress
      setQuery(formattedAddress)
      onAddressParsed?.(parsedAddress)
      await onPlaceResolved?.(place)
      sessionToken.current = createSessionToken()
    } catch {
      setError('The selected address could not be loaded. Please try another result.')
    } finally {
      setIsResolving(false)
    }
  }

  const handleKeyDown = (event) => {
    if (!suggestions.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      selectSuggestion(suggestions[activeIndex])
    } else if (event.key === 'Escape') {
      setSuggestions([])
      setActiveIndex(-1)
    }
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          id={inputId}
          type="text"
          value={query}
          disabled={disabled || isResolving}
          onChange={(event) => {
            selectedDisplayValue.current = ''
            setQuery(event.target.value)
            setError('')
            if (event.target.value.trim().length < 3) {
              requestSequence.current += 1
              setSuggestions([])
              setIsSearching(false)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls={`${inputId}-suggestions`}
          aria-busy={loading}
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
        />
        {loading && (
          <LoaderCircle
            aria-label="Loading address"
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-700"
          />
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

      {suggestions.length > 0 && (
        <div
          id={`${inputId}-suggestions`}
          role="listbox"
          className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
              className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                activeIndex === index ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {suggestion.address_line1 ?? suggestion.formatted}
                </span>
                {suggestion.address_line2 && (
                  <span className="block truncate text-xs text-slate-500">
                    {suggestion.address_line2}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
