import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Sparkles, X } from 'lucide-react'
import { searchOccupations } from '@/services/occupationService'

const DEBOUNCE_MS = 500

const MODE_COPY = {
  seeker: {
    label: 'What is your profession or job title?',
    helper: 'AI suggests a field, but you can always choose a broad i-PESO job family manually.',
    selectedLabel: 'Career field mapped',
  },
  employer: {
    label: 'Job Title for this Vacancy (Display Name)',
    helper: 'Type the vacancy title freely, then choose the broad field that should anchor matching.',
    selectedLabel: 'Vacancy anchor mapped',
  },
}

const BROAD_FIELD_OPTIONS = [
  { key: 'office-work', label: 'Office and Administration', anchorCode: 'general:office-work', psocCode: '41' },
  { key: 'factory-worker', label: 'Manufacturing and Factory Work', anchorCode: 'general:factory-worker', psocCode: '81' },
  { key: 'driver', label: 'Driving and Transportation', anchorCode: 'general:driver', psocCode: '83' },
  { key: 'delivery-work', label: 'Delivery and Courier Work', anchorCode: 'general:delivery-work', psocCode: '83' },
  { key: 'healthcare-work', label: 'Healthcare', anchorCode: 'general:healthcare-work', psocCode: '22' },
  { key: 'caregiver-work', label: 'Caregiving and Personal Care', anchorCode: 'general:caregiver-work', psocCode: '53' },
  { key: 'construction-work', label: 'Construction', anchorCode: 'general:construction-work', psocCode: '93' },
  { key: 'skilled-trades', label: 'Skilled Trades and Repair', anchorCode: 'general:skilled-trades', psocCode: '72' },
  { key: 'hospitality-work', label: 'Hospitality and Hotels', anchorCode: 'general:hospitality-work', psocCode: '51' },
  { key: 'restaurant-work', label: 'Food Service and Restaurants', anchorCode: 'general:restaurant-work', psocCode: '51' },
  { key: 'retail-work', label: 'Retail and Store Work', anchorCode: 'general:retail-work', psocCode: '52' },
  { key: 'agriculture-work', label: 'Agriculture and Farming', anchorCode: 'general:agriculture-work', psocCode: '61' },
  { key: 'fishing-work', label: 'Fishing and Fish Processing', anchorCode: 'general:fishing-work', psocCode: '62' },
  { key: 'it-work', label: 'IT and Computer Work', anchorCode: 'general:it-work', psocCode: '25' },
  { key: 'education-work', label: 'Education and Teaching', anchorCode: 'general:education-work', psocCode: '23' },
  { key: 'logistics-work', label: 'Warehouse and Logistics', anchorCode: 'general:logistics-work', psocCode: '43' },
  { key: 'beauty-work', label: 'Beauty and Wellness', anchorCode: 'general:beauty-work', psocCode: '51' },
  { key: 'household-work', label: 'Household and Domestic Services', anchorCode: 'general:household-work', psocCode: '91' },
  { key: 'government-work', label: 'Government and Community Services', anchorCode: 'general:government-work', psocCode: '33' },
  { key: 'bpo-work', label: 'BPO and Customer Service', anchorCode: 'general:bpo-work', psocCode: '42' },
  { key: 'online-work', label: 'Online and Digital Work', anchorCode: 'general:online-work', psocCode: '25' },
  { key: 'finance-work', label: 'Accounting and Finance', anchorCode: 'general:finance-work', psocCode: '24' },
  { key: 'engineering-work', label: 'Engineering and Architecture', anchorCode: 'general:engineering-work', psocCode: '21' },
  { key: 'security-work', label: 'Security and Protective Services', anchorCode: 'general:security-work', psocCode: '54' },
  { key: 'human-resources-work', label: 'Human Resources and Recruitment', anchorCode: 'general:human-resources-work', psocCode: '24' },
  { key: 'legal-work', label: 'Legal and Compliance', anchorCode: 'general:legal-work', psocCode: '26' },
  { key: 'marketing-work', label: 'Marketing and Communications', anchorCode: 'general:marketing-work', psocCode: '24' },
  { key: 'creative-work', label: 'Media Arts and Design', anchorCode: 'general:creative-work', psocCode: '26' },
  { key: 'banking-work', label: 'Banking and Insurance', anchorCode: 'general:banking-work', psocCode: '33' },
  { key: 'real-estate-work', label: 'Real Estate and Property Services', anchorCode: 'general:real-estate-work', psocCode: '33' },
  { key: 'science-work', label: 'Science, Research and Laboratory Work', anchorCode: 'general:science-work', psocCode: '21' },
  { key: 'utilities-work', label: 'Utilities, Energy and Environment', anchorCode: 'general:utilities-work', psocCode: '31' },
  { key: 'tourism-work', label: 'Tourism, Events and Recreation', anchorCode: 'general:tourism-work', psocCode: '51' },
  { key: 'social-services-work', label: 'Social Services and Counseling', anchorCode: 'general:social-services-work', psocCode: '26' },
  { key: 'management-work', label: 'Management and Business Operations', anchorCode: 'general:management-work', psocCode: '12' },
]

const BROAD_FIELD_RULES = [
  { key: 'office-work', keywords: 'office admin clerical secretary receptionist encoder', patterns: 'office clerk|administrative assistant|data entry|secretary|receptionist|records clerk' },
  { key: 'factory-worker', keywords: 'factory production machine operator assembler packer', patterns: 'machine operator|production operator|production supervisor|assembler|packer|manufacturing|sewing machine' },
  { key: 'driver', keywords: 'driver taxi jeepney bus truck transport', patterns: 'driver|chauffeur|taxi|bus operator|jeepney|vehicle operator' },
  { key: 'delivery-work', keywords: 'delivery rider courier parcel messenger', patterns: 'delivery|courier|messenger|parcel|rider' },
  { key: 'healthcare-work', keywords: 'health nurse nursing midwife medical clinic hospital pharmacy', patterns: 'nurse|midwife|physician|doctor|medical technologist|pharmacist|radiographer|health worker|dental' },
  { key: 'caregiver-work', keywords: 'caregiver care aide elderly home care', patterns: 'caregiver|care worker|care aide|nursing assistant|home care|personal care' },
  { key: 'construction-work', keywords: 'construction laborer mason carpenter building', patterns: 'construction|mason|carpenter|bricklayer|roofer|scaffolder|building worker' },
  { key: 'skilled-trades', keywords: 'electrician plumber welder mechanic technician repair', patterns: 'electrician|plumber|welder|mechanic|repair technician|aircon technician|refrigeration technician' },
  { key: 'hospitality-work', keywords: 'hotel hospitality room attendant front desk', patterns: 'hotel|room attendant|housekeeping supervisor|accommodation|front desk' },
  { key: 'restaurant-work', keywords: 'restaurant food cook chef waiter service crew kitchen', patterns: 'cook|chef|waiter|waitress|service crew|kitchen assistant|food service|restaurant|barista' },
  { key: 'retail-work', keywords: 'retail store cashier salesperson sales merchandiser', patterns: 'cashier|retail|shop assistant|salesperson|sales assistant|merchandiser|store keeper' },
  { key: 'agriculture-work', keywords: 'farm farmer agriculture crop livestock poultry', patterns: 'farmer|farm worker|agricultural|crop production|livestock|poultry|plantation' },
  { key: 'fishing-work', keywords: 'fishing fisherman fishery fish processing aquaculture', patterns: 'fishery|fisherman|fishing|fish processing|aquaculture' },
  { key: 'it-work', keywords: 'it computer programmer software web data technology network cybersecurity', patterns: 'software|programmer|web developer|it support|computer network|database|cybersecurity|systems analyst|data analyst|react|javascript|frontend|front end' },
  { key: 'education-work', keywords: 'teacher teaching education tutor school instructor trainer', patterns: 'teacher|teaching assistant|teacher aide|tutor|school instructor|lecturer|education|professor' },
  { key: 'logistics-work', keywords: 'warehouse logistics stock inventory forklift supply chain', patterns: 'warehouse|forklift|inventory|stock clerk|supply chain|logistics' },
  { key: 'beauty-work', keywords: 'beauty salon barber hairdresser massage nail makeup', patterns: 'hairdresser|barber|manicurist|beautician|make-up artist|massage therapist|nail technician' },
  { key: 'household-work', keywords: 'household domestic helper cleaner babysitter laundry kasambahay', patterns: 'domestic|housekeeper|cleaner|babysitter|laundry worker|household helper|kasambahay' },
  { key: 'government-work', keywords: 'government public service barangay community civil service', patterns: 'government|civil registrar|public administration|barangay|community officer' },
  { key: 'bpo-work', keywords: 'bpo call center customer service support agent contact center', patterns: 'call centre|call center|customer service|contact centre|bpo|technical support representative' },
  { key: 'online-work', keywords: 'online remote virtual ecommerce content freelance virtual assistant', patterns: 'virtual assistant|online seller|e-commerce|ecommerce|content creator|social media|remote work' },
  { key: 'finance-work', keywords: 'accounting finance accountant bookkeeper auditor tax payroll', patterns: 'accountant|bookkeeper|auditor|accounting clerk|tax adviser|payroll' },
  { key: 'engineering-work', keywords: 'engineering engineer architect architecture drafting', patterns: 'engineer|architect|engineering technician|architectural drafter|drafting' },
  { key: 'security-work', keywords: 'security guard sekyu guwardiya protection police', patterns: 'security guard|security officer|protective service|police officer|bodyguard|sekyu|guwardiya' },
  { key: 'human-resources-work', keywords: 'human resources hr recruitment recruiter personnel talent payroll', patterns: 'human resources|hr|recruiter|recruitment|personnel officer|talent acquisition' },
  { key: 'legal-work', keywords: 'legal law lawyer attorney paralegal compliance court', patterns: 'lawyer|attorney|paralegal|legal assistant|legal secretary|compliance officer' },
  { key: 'marketing-work', keywords: 'marketing advertising communications public relations brand promotion', patterns: 'marketing|advertising|public relations|communications officer|brand manager' },
  { key: 'creative-work', keywords: 'creative media arts design graphic photo video writer', patterns: 'graphic designer|artist|photographer|videographer|writer|editor|multimedia|animator' },
  { key: 'banking-work', keywords: 'bank banking insurance teller loan credit claims', patterns: 'bank teller|bank account|bank manager|loan officer|insurance|credit officer|claims' },
  { key: 'real-estate-work', keywords: 'real estate property broker leasing realtor', patterns: 'real estate|property manager|leasing agent|property agent|realtor' },
  { key: 'science-work', keywords: 'science scientist research laboratory lab biology chemistry', patterns: 'scientist|researcher|laboratory|biologist|chemist|physicist|lab technician' },
  { key: 'utilities-work', keywords: 'utilities energy power water environment waste renewable', patterns: 'power plant|water treatment|waste management|environmental|renewable energy|utility worker' },
  { key: 'tourism-work', keywords: 'tourism tour travel events recreation leisure', patterns: 'tour guide|travel consultant|event coordinator|event manager|recreation' },
  { key: 'social-services-work', keywords: 'social services social worker counselor counselling welfare', patterns: 'social worker|counsellor|counselor|welfare worker|community development' },
  { key: 'management-work', keywords: 'management manager supervisor business operations entrepreneur', patterns: 'general manager|operations manager|business manager|project manager|entrepreneur|supervisor' },
]

async function suggestPSOCFieldsWithAI(inputText, mode = 'seeker') {
  await new Promise((resolve) => window.setTimeout(resolve, mode === 'employer' ? 700 : 600))

  try {
    const rows = await searchOccupations(inputText, 8, 'general')
    const apiSuggestions = toAiBroadSuggestions(rows, inputText)
    if (apiSuggestions.length) return apiSuggestions
  } catch {
    // Local rules keep the mapper useful while the API is unavailable.
  }

  return localBroadSuggestions(inputText)
}

export default function AIOccupationMapper({
  mode = 'seeker',
  value = null,
  onChange,
  defaultInputText = '',
  placeholder = 'e.g., Night Shift Cashier, React Developer, Auto Mechanic...',
  disabled = false,
  className = '',
}) {
  const resolvedMode = mode === 'employer' ? 'employer' : 'seeker'
  const copy = MODE_COPY[resolvedMode]
  const [inputText, setInputText] = useState(value?.displayTitle ?? defaultInputText ?? '')
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
    if (!selected && !inputText.trim() && defaultInputText) {
      setInputText(defaultInputText)
      setOpen(true)
    }
  }, [defaultInputText, inputText, selected])

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
        const result = await suggestPSOCFieldsWithAI(trimmedInput, resolvedMode)
        if (requestIdRef.current === requestId) setSuggestions(result)
      } finally {
        if (requestIdRef.current === requestId) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [canSearch, resolvedMode, trimmedInput])

  const selectedSummary = useMemo(() => {
    if (!selected) return null

    return {
      displayTitle: selected.displayTitle,
      psocCode: selected.psocCode,
      anchorCode: selected.anchorCode ?? selected.psocCode,
      broadFieldKey: selected.broadFieldKey,
      fieldName: selected.fieldName ?? selected.broadField,
      matchLevel: 'broad',
    }
  }, [selected])

  const selectSuggestedBroadField = (suggestion) => {
    const payload = {
      displayTitle: trimmedInput,
      psocCode: suggestion.broadCode,
      anchorCode: suggestion.anchorCode || suggestion.broadCode,
      broadField: suggestion.broadField,
      broadFieldKey: suggestion.broadFieldKey,
      fieldName: suggestion.broadField,
      matchLevel: 'broad',
    }

    setSelected(payload)
    setSuggestions([])
    setOpen(false)
    onChange?.({
      displayTitle: payload.displayTitle,
      psocCode: payload.psocCode,
      anchorCode: payload.anchorCode,
      broadField: payload.broadField,
      broadFieldKey: payload.broadFieldKey,
      matchLevel: payload.matchLevel,
    })
  }

  const selectManualBroadField = (fieldKey) => {
    const field = BROAD_FIELD_OPTIONS.find((option) => option.key === fieldKey)
    if (!field || !trimmedInput) return

    const payload = {
      displayTitle: trimmedInput,
      psocCode: field.psocCode,
      anchorCode: field.anchorCode,
      broadField: field.label,
      broadFieldKey: field.key,
      fieldName: field.label,
      matchLevel: 'broad',
      source: 'manual_broad_field',
    }

    setSelected(payload)
    setSuggestions([])
    setOpen(false)
    onChange?.({
      displayTitle: payload.displayTitle,
      psocCode: payload.psocCode,
      anchorCode: payload.anchorCode,
      broadField: payload.broadField,
      broadFieldKey: payload.broadFieldKey,
      matchLevel: payload.matchLevel,
    })
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
        <span className="mb-2 block text-sm font-bold text-slate-800">{copy.label}</span>
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
            aria-autocomplete="list"
            aria-expanded={open}
            role="combobox"
          />

          {selected && (
            <button
              type="button"
              onClick={clearSelection}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear occupation mapping"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </label>

      <p className="mt-2 text-xs font-medium text-slate-500">{copy.helper}</p>

      {!selected && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">
              Broad Field Dropdown
            </span>
            <select
              value=""
              disabled={disabled || trimmedInput.length < 2}
              onChange={(event) => selectManualBroadField(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">
                {trimmedInput.length < 2 ? 'Type a job title first' : 'Choose a broad job family manually'}
              </option>
              {BROAD_FIELD_OPTIONS.map((field) => (
                <option key={field.key} value={field.key}>
                  {field.label}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs text-slate-500">
            Use this when the AI suggestion is too narrow, missing, or the job title is uncommon.
          </p>
        </div>
      )}

      {selectedSummary && (
        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-700 p-4 text-white shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-100" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-100">{copy.selectedLabel}</p>
              <p className="mt-1 text-sm font-black">{selectedSummary.fieldName}</p>
              <p className="mt-1 text-xs font-semibold text-blue-100">
                Display title preserved: {selectedSummary.displayTitle}
              </p>

            </div>
          </div>
        </div>
      )}

      {!selected && loading && (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            AI is standardizing the occupation...
          </span>
        </div>
      )}

      {!selected && open && !loading && suggestions.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg" role="listbox">
          {suggestions.map((suggestion) => (
            <SuggestionRow
              key={`${suggestion.anchorCode}-${suggestion.broadCode}`}
              mode={resolvedMode}
              suggestion={suggestion}
              onSelect={selectSuggestedBroadField}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestionRow({ mode, suggestion, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(suggestion)}
      className="flex w-full items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-indigo-50"
      role="option"
    >
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-950">{suggestion.broadField}</span>
        <span className="mt-1 block text-xs font-semibold text-slate-500">
          {mode === 'employer' ? 'Broad field for this vacancy' : 'Broad career field'}
          {suggestion.reason ? `: ${suggestion.reason}` : ''}
        </span>
        <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          Broad anchor {suggestion.anchorCode || suggestion.broadCode}
        </span>
      </span>

      <ConfidenceBadge confidence={suggestion.confidence} />
    </button>
  )
}

function ConfidenceBadge({ confidence }) {
  return (
    <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-black text-indigo-700">
      {confidence}%
    </span>
  )
}

function toAiBroadSuggestions(rows = [], inputText = '') {
  const seen = new Set()

  return rows
    .map((row) => {
      const term = normalizeText(row.general_term || row.matched_general_term || row.title)
      const option = findBroadOption(term)
      if (!option || seen.has(option.key)) return null
      seen.add(option.key)

      return {
        broadField: option.label,
        broadCode: option.psocCode,
        broadFieldKey: option.key,
        anchorCode: option.anchorCode,
        reason: row.matched_job_title
          ? `"${inputText}" matched ${row.matched_job_title} from the occupation database.`
          : `Recognized "${inputText}" as ${option.label}.`,
        confidence: row.match_type === 'specific_job' ? 98 : 90,
      }
    })
    .filter(Boolean)
}

function localBroadSuggestions(inputText = '') {
  const normalized = normalizeText(inputText)
  const tokens = normalized.split(' ').filter((token) => token.length >= 3)

  const scored = BROAD_FIELD_RULES
    .map((rule) => {
      const option = BROAD_FIELD_OPTIONS.find((field) => field.key === rule.key)
      if (!option) return null

      const searchable = normalizeText([
        option.label,
        option.key,
        option.anchorCode,
        rule.keywords,
        rule.patterns.replaceAll('|', ' '),
      ].join(' '))
      const patterns = rule.patterns.split('|').map(normalizeText).filter(Boolean)
      const directPattern = patterns.find((pattern) => (
        pattern && new RegExp(`\\b${escapeRegExp(pattern)}\\b`).test(normalized)
      ))
      const tokenHits = tokens.filter((token) => searchable.includes(token)).length
      const labelHit = searchable.includes(normalized) || normalized.includes(normalizeText(option.label))
      const score = directPattern
        ? 98
        : labelHit
          ? 90
          : tokenHits
            ? Math.min(84, 58 + tokenHits * 8)
            : 0

      if (score <= 0) return null

      return {
        broadField: option.label,
        broadCode: option.psocCode,
        broadFieldKey: option.key,
        anchorCode: option.anchorCode,
        reason: directPattern
          ? `Recognized "${inputText}" using "${directPattern}".`
          : `Best broad-field match from local i-PESO occupation rules.`,
        confidence: score,
      }
    })
    .filter(Boolean)
    .sort((left, right) => right.confidence - left.confidence || left.broadField.localeCompare(right.broadField))

  if (scored.length) return scored.slice(0, 5)

  return BROAD_FIELD_OPTIONS.slice(0, 5).map((option) => ({
    broadField: option.label,
    broadCode: option.psocCode,
    broadFieldKey: option.key,
    anchorCode: option.anchorCode,
    reason: `General broad-field option for "${inputText}".`,
    confidence: 45,
  }))
}

function findBroadOption(term = '') {
  const normalized = normalizeText(term).replace(/\s+/g, '-')
  const text = normalizeText(term)

  return BROAD_FIELD_OPTIONS.find((option) => (
    option.key === normalized
    || normalizeText(option.label) === text
    || normalizeText(option.anchorCode.replace('general:', '')) === text.replace(/\s+/g, '-')
  ))
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
