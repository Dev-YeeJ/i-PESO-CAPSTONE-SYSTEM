import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { classifyOccupationTitle, searchOccupations } from '@/services/occupationService'

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

const BROAD_OCCUPATION_FIELDS = [
  { key: 'office-work', title: 'Office and Administration', generalTerm: 'office work', patterns: ['office', 'admin', 'administrative', 'encoder', 'data entry', 'secretary', 'receptionist', 'clerk', 'records'] },
  { key: 'factory-worker', title: 'Manufacturing and Factory Work', generalTerm: 'factory worker', patterns: ['factory', 'production', 'machine operator', 'assembler', 'packer', 'manufacturing'] },
  { key: 'driver', title: 'Driving and Transportation', generalTerm: 'driver', patterns: ['driver', 'chauffeur', 'taxi', 'bus operator', 'truck driver', 'jeepney', 'transport'] },
  { key: 'delivery-work', title: 'Delivery and Courier Work', generalTerm: 'delivery work', patterns: ['delivery', 'courier', 'messenger', 'parcel', 'rider'] },
  { key: 'maritime-work', title: 'Maritime and Seafaring', generalTerm: 'maritime work', patterns: ['seaman', 'seafarer', 'sailor', 'maritime', 'marine', 'ship crew', 'deckhand', 'able seaman', 'oiler', 'bosun', 'vessel'] },
  { key: 'healthcare-work', title: 'Healthcare', generalTerm: 'healthcare work', patterns: ['nurse', 'medical', 'clinic', 'hospital', 'pharma', 'pharmacy', 'pharmaceutical', 'pharmacist', 'midwife', 'doctor', 'health worker'] },
  { key: 'caregiver-work', title: 'Caregiving and Personal Care', generalTerm: 'caregiver work', patterns: ['caregiver', 'care worker', 'care aide', 'nursing assistant', 'home care', 'personal care'] },
  { key: 'construction-work', title: 'Construction', generalTerm: 'construction work', patterns: ['construction', 'mason', 'carpenter', 'building', 'scaffold', 'roofer', 'painter'] },
  { key: 'skilled-trades', title: 'Skilled Trades and Repair', generalTerm: 'skilled trades', patterns: ['mechanic', 'auto', 'automotive', 'electrician', 'plumber', 'welder', 'repair', 'aircon', 'refrigeration'] },
  { key: 'hospitality-work', title: 'Hospitality and Hotels', generalTerm: 'hospitality work', patterns: ['hotel', 'housekeeping', 'front desk', 'room attendant', 'hospitality'] },
  { key: 'restaurant-work', title: 'Food Service and Restaurants', generalTerm: 'restaurant work', patterns: ['cook', 'chef', 'waiter', 'waitress', 'service crew', 'kitchen', 'restaurant', 'food service', 'barista'] },
  { key: 'retail-work', title: 'Retail and Store Work', generalTerm: 'retail work', patterns: ['cashier', 'retail', 'sales', 'store', 'merchandiser', 'counter'] },
  { key: 'agriculture-work', title: 'Agriculture and Farming', generalTerm: 'agriculture work', patterns: ['farm', 'farmer', 'agriculture', 'crop', 'livestock', 'poultry'] },
  { key: 'fishing-work', title: 'Fishing and Fish Processing', generalTerm: 'fishing work', patterns: ['fishery', 'fisherman', 'fishing', 'fish processing', 'aquaculture'] },
  { key: 'it-work', title: 'IT and Computer Work', generalTerm: 'it work', patterns: ['react', 'frontend', 'front end', 'software', 'developer', 'programmer', 'web', 'javascript', 'it support', 'computer', 'network', 'data analyst'] },
  { key: 'education-work', title: 'Education and Teaching', generalTerm: 'education work', patterns: ['teacher', 'teaching', 'tutor', 'instructor', 'lecturer', 'professor', 'school', 'trainer'] },
  { key: 'logistics-work', title: 'Warehouse and Logistics', generalTerm: 'logistics work', patterns: ['warehouse', 'logistics', 'inventory', 'stock clerk', 'forklift', 'supply chain'] },
  { key: 'beauty-work', title: 'Beauty and Wellness', generalTerm: 'beauty work', patterns: ['hairdresser', 'barber', 'beautician', 'makeup', 'massage', 'nail technician'] },
  { key: 'household-work', title: 'Household and Domestic Services', generalTerm: 'household work', patterns: ['domestic', 'housekeeper', 'cleaner', 'babysitter', 'laundry', 'kasambahay'] },
  { key: 'government-work', title: 'Government and Community Services', generalTerm: 'government work', patterns: ['government', 'public service', 'barangay', 'community', 'civil service', 'public administration'] },
  { key: 'bpo-work', title: 'BPO and Customer Service', generalTerm: 'bpo work', patterns: ['bpo', 'call center', 'contact center', 'customer service representative', 'technical support representative'] },
  { key: 'online-work', title: 'Online and Digital Work', generalTerm: 'online work', patterns: ['virtual assistant', 'online seller', 'ecommerce', 'e-commerce', 'content creator', 'social media', 'remote work'] },
  { key: 'finance-work', title: 'Accounting and Finance', generalTerm: 'finance work', patterns: ['accountant', 'bookkeeper', 'accounting', 'auditor', 'payroll', 'tax', 'finance'] },
  { key: 'engineering-work', title: 'Engineering and Architecture', generalTerm: 'engineering work', patterns: ['engineer', 'engineering', 'architect', 'architecture', 'drafting', 'drafter'] },
  { key: 'human-resources-work', title: 'Human Resources and Recruitment', generalTerm: 'human resources work', patterns: ['human resources', 'hr', 'recruiter', 'recruitment', 'personnel', 'talent acquisition'] },
  { key: 'legal-work', title: 'Legal and Compliance', generalTerm: 'legal work', patterns: ['lawyer', 'attorney', 'paralegal', 'legal assistant', 'legal secretary', 'compliance officer'] },
  { key: 'security-work', title: 'Security and Protective Services', generalTerm: 'security work', patterns: ['security guard', 'security officer', 'protective service', 'police', 'bodyguard'] },
  { key: 'marketing-work', title: 'Marketing and Communications', generalTerm: 'marketing work', patterns: ['marketing', 'advertising', 'brand', 'public relations', 'communications officer'] },
  { key: 'creative-work', title: 'Media Arts and Design', generalTerm: 'creative work', patterns: ['graphic designer', 'artist', 'photographer', 'videographer', 'writer', 'editor', 'multimedia', 'animator'] },
  { key: 'banking-work', title: 'Banking and Insurance', generalTerm: 'banking work', patterns: ['bank', 'banking', 'insurance', 'teller', 'loan', 'credit', 'claims'] },
  { key: 'real-estate-work', title: 'Real Estate and Property Services', generalTerm: 'real estate work', patterns: ['real estate', 'property', 'broker', 'leasing', 'realtor'] },
  { key: 'science-work', title: 'Science, Research and Laboratory Work', generalTerm: 'science work', patterns: ['science', 'scientist', 'researcher', 'laboratory', 'lab', 'biologist', 'chemist', 'physicist'] },
  { key: 'utilities-work', title: 'Utilities, Energy and Environment', generalTerm: 'utilities work', patterns: ['utilities', 'energy', 'power plant', 'water treatment', 'waste management', 'environmental', 'renewable energy'] },
  { key: 'tourism-work', title: 'Tourism, Events and Recreation', generalTerm: 'tourism work', patterns: ['tourism', 'tour guide', 'travel', 'event coordinator', 'event manager', 'recreation'] },
  { key: 'social-services-work', title: 'Social Services and Counseling', generalTerm: 'social services work', patterns: ['social worker', 'counselor', 'counsellor', 'welfare worker', 'community development'] },
  { key: 'management-work', title: 'Management and Business Operations', generalTerm: 'management work', patterns: ['manager', 'supervisor', 'operations manager', 'project manager', 'business manager', 'entrepreneur'] },
]

export default function OccupationCombobox({
  selected = [],
  onChange,
  multiple = false,
  limit = 3,
  searchLimit = 20,
  minimumQueryLength = 2,
  generalizedOnly = false,
  enableAiSuggestions = false,
  allowCustomFallback = false,
  aiSuggestionProvider = null,
  broadFieldOnly = false,
  enableAiBroadField = false,
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
  const localBroadOptions = useMemo(() => {
    if (!broadFieldOnly || normalizedQuery.length < minimumQueryLength) return []
    return broadOccupationOptions(normalizedQuery, values, searchLimit)
  }, [broadFieldOnly, minimumQueryLength, normalizedQuery, searchLimit, values])
  const displayedOptions = broadFieldOnly
    ? uniqueBroadOccupationOptions([...options, ...localBroadOptions]).slice(0, searchLimit)
    : options
  const customFallbackOption = useMemo(() => {
    if (!allowCustomFallback || generalizedOnly || broadFieldOnly || normalizedQuery.length < minimumQueryLength) return null

    const title = normalizedQuery.replace(/\s+/g, ' ')
    const duplicate = [...values, ...options, ...aiOptions].some((occupation) => (
      normalizeTitle(occupation.title || occupation.raw_job_title) === normalizeTitle(title)
    ))

    if (!title || duplicate) return null

    return {
      id: `custom:${normalizeTitle(title)}`,
      title,
      raw_job_title: title,
      reason: 'Save as a pending title for PESO review and later catalog mapping.',
      broad_category: 'Pending PESO mapping',
      is_custom: true,
      is_custom_pending: true,
      source: 'manual',
    }
  }, [allowCustomFallback, aiOptions, broadFieldOnly, generalizedOnly, minimumQueryLength, normalizedQuery, options, values])

  useEffect(() => {
    aiSuggestionProviderRef.current = aiSuggestionProvider
  }, [aiSuggestionProvider])

  useEffect(() => {
    if (broadFieldOnly) return undefined
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
  }, [broadFieldOnly, open, canSelectMore])

  useEffect(() => {
    if (!open || !canSelectMore || normalizedQuery.length < minimumQueryLength) {
      return
    }

    if (broadFieldOnly) {
      let cancelled = false
      const localOptions = localBroadOptions

      const timer = setTimeout(async () => {
        setSearchError(false)
        setAiError(false)

        try {
          const catalogRows = await searchOccupations(normalizedQuery, searchLimit, 'general')
          if (cancelled) return

          const apiOptions = toBroadFieldOptions(catalogRows, normalizedQuery, values)
          setOptions(uniqueBroadOccupationOptions([...apiOptions, ...localOptions]).slice(0, searchLimit))
        } catch {
          if (!cancelled) {
            setSearchError(true)
            setOptions(localOptions)
          }
        }

        if (enableAiBroadField) {
          try {
            const aiRows = await classifyOccupationTitle(normalizedQuery, 5)
            if (cancelled) return

            const aiBroadOptions = toAiBroadFieldOptions(aiRows, normalizedQuery, values)
            setOptions((current) => uniqueBroadOccupationOptions([
              ...current,
              ...aiBroadOptions,
              ...localOptions,
            ]).slice(0, searchLimit))
          } catch {
            if (!cancelled) {
              setAiError(true)
            }
          }
        }
      }, 220)

      return () => {
        cancelled = true
        clearTimeout(timer)
      }
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
  }, [normalizedQuery, open, limit, searchLimit, minimumQueryLength, values, generalizedOnly, enableAiSuggestions, broadFieldOnly, enableAiBroadField, canSelectMore, localBroadOptions])

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
            } else if (broadFieldOnly) {
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

        {open && canSelectMore && (broadFieldOnly || menuRect) && (
          <div
            role="listbox"
            className={`${broadFieldOnly ? 'absolute left-0 right-0 top-full mt-2' : 'fixed'} z-[9999] max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl`}
            style={broadFieldOnly ? undefined : { left: menuRect.left, top: menuRect.top, width: menuRect.width }}
          >
            {!loading && normalizedQuery.length < minimumQueryLength && (
              <p className="px-4 py-3 text-xs text-slate-500">
                Type at least {minimumQueryLength} characters so the system can suggest the broad field.
              </p>
            )}

            {loading && !broadFieldOnly && <p className="px-4 py-3 text-xs text-slate-500">Searching saved occupations...</p>}

            {!loading && broadFieldOnly && normalizedQuery.length >= minimumQueryLength && displayedOptions.length > 0 && (
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                Broad job fields
              </div>
            )}

            {!loading && normalizedQuery.length >= minimumQueryLength && displayedOptions.map((occupation) => (
              <OccupationOption
                key={occupation.id}
                occupation={occupation}
                onSelect={select}
              />
            ))}

            {!loading && normalizedQuery.length >= minimumQueryLength && searchError && (
              <p className="px-4 py-3 text-xs text-red-600">
                {broadFieldOnly
                  ? 'Unable to reach database broad fields. Showing local broad-field fallback.'
                  : 'Unable to search saved occupations. Showing suggestions when available.'}
              </p>
            )}

            {!loading && broadFieldOnly && normalizedQuery.length >= minimumQueryLength && aiError && (
              <p className="px-4 py-3 text-xs text-amber-700">
                AI broad-field understanding is unavailable right now. Showing database and local fallback results.
              </p>
            )}

            {!broadFieldOnly && !loading && normalizedQuery.length >= minimumQueryLength && aiOptions.length > 0 && (
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

            {!broadFieldOnly && !loading && customFallbackOption && (
              <>
                <div className="border-b border-slate-100 bg-amber-50 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
                  Pending PESO mapping
                </div>
                <OccupationOption
                  occupation={customFallbackOption}
                  onSelect={select}
                />
              </>
            )}

            {!broadFieldOnly && !loading && normalizedQuery.length >= minimumQueryLength && !options.length && !customFallbackOption && aiError && (
              <p className="px-4 py-3 text-xs text-slate-500">Suggested occupations are unavailable right now.</p>
            )}

            {!loading && normalizedQuery.length >= minimumQueryLength && !searchError && !displayedOptions.length && !aiOptions.length && !aiError && !customFallbackOption && (
              <p className="px-4 py-3 text-xs text-slate-500">
                {broadFieldOnly
                  ? 'No broad field recognized yet. Try a simpler title like Teacher, Cashier, Driver, Nurse, or React Developer.'
                  : generalizedOnly
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
              ? 'bg-blue-100 text-blue-700'
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
          <span className="max-w-44 truncate rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
            from "{occupation.matched_job_title}"
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

function broadOccupationOptions(query, selected = [], limit = 20) {
  const normalized = normalizeTitle(query)
  const selectedTerms = new Set(selected.map((occupation) => normalizeTitle(occupation.general_term || occupation.matched_general_term || occupation.title)))
  const scored = BROAD_OCCUPATION_FIELDS
    .map((field) => {
      const directPattern = field.patterns.find((pattern) => normalized.includes(normalizeTitle(pattern)))
      const titleMatch = normalizeTitle(field.title).includes(normalized) || normalized.includes(normalizeTitle(field.title))
      const termMatch = normalizeTitle(field.generalTerm).includes(normalized) || normalized.includes(normalizeTitle(field.generalTerm))
      const score = directPattern ? 100 : titleMatch ? 88 : termMatch ? 80 : tokenScore(normalized, field)

      return { field, score, directPattern }
    })
    .filter(({ field, score }) => score > 0 && !selectedTerms.has(normalizeTitle(field.generalTerm)))
    .sort((left, right) => right.score - left.score || left.field.title.localeCompare(right.field.title))

  const primary = scored.slice(0, 8)
  const fallback = BROAD_OCCUPATION_FIELDS
    .filter((field) => !selectedTerms.has(normalizeTitle(field.generalTerm)))
    .slice(0, 8)
    .map((field) => ({ field, score: 45, directPattern: null }))

  return uniqueBroadFields([...primary, ...fallback])
    .slice(0, limit)
    .map(({ field, score, directPattern }) => ({
      id: `broad:${field.key}`,
      title: field.title,
      raw_job_title: query.trim().replace(/\s+/g, ' '),
      reason: directPattern
        ? `Recognized from "${query.trim()}" using "${directPattern}".`
        : `Broad field option for "${query.trim()}".`,
      broad_category: 'Broad field',
      general_term: field.generalTerm,
      matched_general_term: field.generalTerm,
      matched_job_title: query.trim().replace(/\s+/g, ' '),
      confidence: score,
      is_general: true,
      is_ai_generated: false,
      source: 'local_broad_field',
    }))
}

function toAiBroadFieldOptions(rows = [], query = '', selected = []) {
  const typedTitle = query.trim().replace(/\s+/g, ' ')
  const selectedTerms = new Set(selected.map((occupation) => normalizeTitle(occupation.general_term || occupation.matched_general_term || occupation.title)))

  return rows
    .map((row) => {
      const generalTerm = cleanCategory(row.general_term || row.matched_general_term || row.term || row.title)
      const title = cleanCategory(row.title || row.broad_category || titleCase(generalTerm))
      const key = normalizeTitle(generalTerm || title)

      if (!key || selectedTerms.has(key)) return null

      return {
        ...row,
        id: row.id || `ai-general:${key}`,
        title,
        raw_job_title: typedTitle,
        reason: row.reason
          ? `AI understood "${typedTitle}": ${row.reason}`
          : `AI understood "${typedTitle}" as ${title}.`,
        broad_category: 'AI broad field',
        general_term: generalTerm || key,
        matched_general_term: generalTerm || key,
        matched_job_title: typedTitle,
        is_general: true,
        is_ai_generated: true,
        source: 'vertex_ai',
      }
    })
    .filter(Boolean)
}

function tokenScore(normalized, field) {
  const tokens = normalized.split(' ').filter((token) => token.length >= 3)
  if (!tokens.length) return 0

  const haystack = normalizeTitle([field.title, field.generalTerm, ...field.patterns].join(' '))
  const matches = tokens.filter((token) => haystack.includes(token)).length

  return matches ? Math.min(70, 40 + matches * 10) : 0
}

function uniqueBroadFields(rows) {
  const seen = new Set()

  return rows.filter(({ field }) => {
    if (seen.has(field.key)) return false
    seen.add(field.key)
    return true
  })
}

function uniqueBroadOccupationOptions(rows) {
  const seen = new Set()

  return rows.filter((occupation) => {
    const key = normalizeTitle(occupation.general_term || occupation.matched_general_term || occupation.title)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function toBroadFieldOptions(rows = [], query = '', selected = []) {
  const typedTitle = query.trim().replace(/\s+/g, ' ')
  const selectedTerms = new Set(selected.map((occupation) => normalizeTitle(occupation.general_term || occupation.matched_general_term || occupation.title)))
  const seen = new Set()

  return rows
    .map((row) => {
      const generalTerm = cleanCategory(row.general_term || row.matched_general_term || row.term || row.title)
      const title = cleanCategory(row.title || row.broad_category || titleCase(generalTerm))
      const key = normalizeTitle(generalTerm || title)

      if (!key || selectedTerms.has(key) || seen.has(key)) return null
      seen.add(key)

      return {
        ...row,
        id: row.id || `general:${key}`,
        title,
        raw_job_title: typedTitle,
        reason: row.matched_job_title
          ? `"${typedTitle}" matched ${row.matched_job_title}.`
          : `Broad field recognized for "${typedTitle}".`,
        broad_category: 'Broad field',
        general_term: generalTerm || key,
        matched_general_term: generalTerm || key,
        matched_job_title: typedTitle,
        is_general: true,
        is_ai_generated: true,
        source: row.source || 'generalized',
      }
    })
    .filter(Boolean)
}

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
