import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Sparkles, X } from 'lucide-react'

const DEBOUNCE_MS = 500

const DEFAULT_SUGGESTIONS = [
  {
    broadField: 'Services and Sales Workers',
    broadCode: '52',
    specificMatch: 'Shop Salespersons (5223)',
    confidence: 82,
  },
  {
    broadField: 'Clerical Support Workers',
    broadCode: '41',
    specificMatch: 'General Office Clerks (4110)',
    confidence: 64,
  },
]

async function suggestBroadFieldWithAI(inputText) {
  const normalized = inputText.toLowerCase()

  const suggestionBank = [
    {
      patterns: ['react', 'frontend', 'front end', 'software', 'developer', 'programmer', 'web', 'javascript'],
      suggestions: [
        {
          broadField: 'Information and Communications Technology Professionals',
          broadCode: '25',
          specificMatch: 'Software Developers (2512)',
          confidence: 98,
        },
        {
          broadField: 'Information and Communications Technicians',
          broadCode: '35',
          specificMatch: 'Web Technicians (3514)',
          confidence: 75,
        },
      ],
    },
    {
      patterns: ['cashier', 'sales clerk', 'store crew', 'retail'],
      suggestions: [
        {
          broadField: 'Sales Workers',
          broadCode: '52',
          specificMatch: 'Cashiers and Ticket Clerks (5230)',
          confidence: 96,
        },
        {
          broadField: 'Service Workers',
          broadCode: '51',
          specificMatch: 'Shop Sales Assistants (5223)',
          confidence: 72,
        },
      ],
    },
    {
      patterns: ['mechanic', 'auto', 'automotive', 'motorcycle', 'technician'],
      suggestions: [
        {
          broadField: 'Metal, Machinery and Related Trades Workers',
          broadCode: '72',
          specificMatch: 'Motor Vehicle Mechanics and Repairers (7231)',
          confidence: 97,
        },
        {
          broadField: 'Science and Engineering Associate Professionals',
          broadCode: '31',
          specificMatch: 'Mechanical Engineering Technicians (3115)',
          confidence: 68,
        },
      ],
    },
    {
      patterns: ['nurse', 'caregiver', 'health aide', 'medical assistant'],
      suggestions: [
        {
          broadField: 'Health Professionals',
          broadCode: '22',
          specificMatch: 'Nursing Professionals (2221)',
          confidence: 94,
        },
        {
          broadField: 'Health Associate Professionals',
          broadCode: '32',
          specificMatch: 'Health Care Assistants (5321)',
          confidence: 76,
        },
      ],
    },
  ]

  const match = suggestionBank.find((group) => (
    group.patterns.some((pattern) => normalized.includes(pattern))
  ))

  await new Promise((resolve) => window.setTimeout(resolve, 650))
  return match?.suggestions ?? DEFAULT_SUGGESTIONS
}

export default function SeekerOccupationMapper({
  value = null,
  onChange,
  label = 'What is your profession or job title?',
  placeholder = 'e.g., Night Shift Cashier, React Developer, Auto Mechanic...',
  disabled = false,
  className = '',
}) {
  const [inputText, setInputText] = useState(value?.displayTitle ?? '')
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected] = useState(value)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const requestIdRef = useRef(0)

  const trimmedInput = inputText.trim()
  const canSearch = trimmedInput.length >= 2 && !selected

  useEffect(() => {
    setSelected(value)
    if (value?.displayTitle) setInputText(value.displayTitle)
  }, [value])

  useEffect(() => {
    if (!canSearch) {
      setSuggestions([])
      setLoading(false)
      return undefined
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    const timer = window.setTimeout(async () => {
      setLoading(true)
      setOpen(true)

      try {
        const result = await suggestBroadFieldWithAI(trimmedInput)
        if (requestIdRef.current === requestId) {
          setSuggestions(result)
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false)
        }
      }
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [canSearch, trimmedInput])

  const selectedPayload = useMemo(() => {
    if (!selected) return null

    return {
      displayTitle: selected.displayTitle,
      broadField: selected.broadField,
      psocCode: selected.psocCode,
    }
  }, [selected])

  const selectSuggestion = (suggestion) => {
    const payload = {
      displayTitle: trimmedInput,
      broadField: suggestion.broadField,
      psocCode: suggestion.broadCode,
    }

    setSelected(payload)
    setOpen(false)
    setSuggestions([])
    onChange?.(payload)
  }

  const clearSelection = () => {
    setSelected(null)
    setSuggestions([])
    setOpen(false)
    onChange?.(null)
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-800">{label}</span>

        <div className="relative">
          <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
          <input
            type="text"
            value={inputText}
            disabled={disabled || Boolean(selected)}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true)
            }}
            onChange={(event) => {
              setInputText(event.target.value)
              setSelected(null)
              setOpen(true)
              onChange?.(null)
            }}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
          />

          {selected && (
            <button
              type="button"
              onClick={clearSelection}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear selected occupation mapping"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </label>

      {selectedPayload && (
        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-700 p-4 text-white shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-100" />
            <div>
              <p className="text-sm font-black">{selectedPayload.broadField}</p>
              <p className="mt-1 text-xs font-semibold text-blue-100">
                Saved from your title: {selectedPayload.displayTitle}
              </p>
              <span className="mt-3 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold text-white">
                Broad PSOC field {selectedPayload.psocCode}
              </span>
            </div>
          </div>
        </div>
      )}

      {!selected && loading && (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            AI is finding your career field...
          </span>
        </div>
      )}

      {!selected && open && !loading && suggestions.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.broadCode}-${suggestion.specificMatch}`}
              type="button"
              onClick={() => selectSuggestion(suggestion)}
              className="flex w-full items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-indigo-50"
            >
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-950">{suggestion.broadField}</span>
                <span className="mt-1 block text-xs font-semibold text-slate-500">
                  Mapped from your input: {stripPsocCode(suggestion.specificMatch)}
                </span>
                <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  PSOC broad code {suggestion.broadCode}
                </span>
              </span>

              <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-black text-indigo-700">
                {suggestion.confidence}%
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function stripPsocCode(value) {
  return String(value ?? '').replace(/\s*\(\d+\)\s*$/, '')
}
