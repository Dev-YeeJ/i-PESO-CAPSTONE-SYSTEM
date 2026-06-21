import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react'
import { searchOccupations } from '@/services/occupationService'

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'

export default function PsocCombobox({
  value = '',
  selected = null,
  onChange,
  label,
  required = false,
  placeholder = 'Search PSOC code or occupation title',
  limit = 20,
  error,
  disabled = false,
  className = '',
}) {
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState(selected)

  useEffect(() => {
    setSelectedOption(selected)
  }, [selected])

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setOptions(selectedOption ? [selectedOption] : [])
      setLoading(false)
      return undefined
    }

    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const rows = await searchOccupations(query.trim(), Math.max(limit, 20), 'catalog')
        setOptions(rows.filter((row) => getCatalogCode(row)))
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => window.clearTimeout(timer)
  }, [limit, open, query, selectedOption])

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  const selectedCode = getCatalogCode(selectedOption) || normalizeCatalogCode(value)
  const displayValue = open ? query : formatOccupation(selectedOption, selectedCode)
  const filteredOptions = useMemo(
    () => uniqueByCatalogCode(options).filter((option) => getCatalogCode(option)),
    [options],
  )

  const selectOption = (occupation) => {
    const catalogCode = getCatalogCode(occupation)
    if (!catalogCode) return

    const normalized = { ...occupation, catalog_code: catalogCode }
    setSelectedOption(normalized)
    setQuery('')
    setOpen(false)
    onChange?.(catalogCode, normalized)
  }

  const clearSelection = () => {
    setSelectedOption(null)
    setQuery('')
    setOpen(false)
    onChange?.('', null)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div className={className} ref={rootRef}>
      {label && (
        <p className="mb-2 text-sm font-bold text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </p>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          disabled={disabled}
          onFocus={() => {
            setOpen(true)
            setQuery('')
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && filteredOptions.length) {
              event.preventDefault()
              selectOption(filteredOptions[0])
            }
            if (event.key === 'Escape') {
              setOpen(false)
              setQuery('')
            }
          }}
          className={`${inputClass} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
          placeholder={placeholder}
        />

        {selectedCode ? (
          <button
            type="button"
            onClick={clearSelection}
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none"
            aria-label="Clear selected occupation"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}

        {open && !disabled && (
          <div className="absolute z-50 mt-2 max-h-80 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            {query.trim().length < 2 && !selectedOption && (
              <div className="px-4 py-3 text-sm text-slate-500">Type at least 2 characters to search standardized occupations.</div>
            )}

            {loading && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching occupations...
              </div>
            )}

            {!loading && query.trim().length >= 2 && filteredOptions.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500">No matching occupation found.</div>
            )}

            {!loading && filteredOptions.length > 0 && (
              <div className="max-h-80 overflow-y-auto py-1" role="listbox">
                {filteredOptions.map((occupation) => {
                  const code = getCatalogCode(occupation)
                  const active = selectedCode === code

                  return (
                    <button
                      key={`${occupation.id ?? code}-${code}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectOption(occupation)}
                      className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-blue-50"
                      role="option"
                      aria-selected={active}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-slate-950">{code} - {occupation.title ?? occupation.name}</span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          {occupation.broad_category && <MetaBadge>{occupation.broad_category}</MetaBadge>}
                          {occupation.isco_group && <MetaBadge>{occupation.isco_group}</MetaBadge>}
                          {occupation.match_reason && <MetaBadge>{occupation.match_reason}</MetaBadge>}
                        </span>
                      </span>
                      {active && <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-900" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-1.5 text-xs text-slate-500">Select a standardized occupation result. Typed text alone is not saved.</p>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}

function MetaBadge({ children }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
      {children}
    </span>
  )
}

function uniqueByCatalogCode(rows) {
  const seen = new Set()
  return rows.filter((row) => {
    const code = getCatalogCode(row)
    if (!code || seen.has(code)) return false
    seen.add(code)
    return true
  })
}

function getCatalogCode(occupation) {
  if (!occupation) return ''
  return normalizeCatalogCode(
    occupation.catalog_code
      || occupation.code
      || occupation.classification_code
      || occupation.psoc_code,
  )
}

function normalizeCatalogCode(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9._-]/g, '')
}

function formatOccupation(occupation, fallbackCode = '') {
  if (!occupation) return fallbackCode
  const code = getCatalogCode(occupation) || fallbackCode
  const title = occupation.title ?? occupation.name
  if (code && title) return `${code} - ${title}`
  return title || code
}
