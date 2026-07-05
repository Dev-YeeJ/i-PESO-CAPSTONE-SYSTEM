import { useEffect, useId, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Plus, Search, X } from 'lucide-react'
import {
  SOFT_SKILL_SUGGESTIONS,
  TECHNICAL_SKILL_SUGGESTIONS,
} from '@/data/jobPreferenceVocabularies'
import { searchSkills } from '@/services/skillService'

const HARD_LIMIT = 20
const SOFT_LIMIT = 10
const SEARCH_LIMIT = 12
const SUGGESTION_LIMIT = 10

const DEFAULT_HARD_SUGGESTIONS = [
  'Web Development',
  'Programming',
  'Microsoft Excel',
  'Data Entry',
  'Computer Literate',
  'Driver',
]

const DEFAULT_SOFT_SUGGESTIONS = [
  'Communication',
  'Critical Thinking',
  'Customer Service',
  'Teamwork',
  'Problem Solving',
  'Attention to Detail',
]

const OFFICIAL_DOLE_SKILLS = [
  'Auto Mechanic',
  'Beautician',
  'Carpentry Work',
  'Computer Literate',
  'Domestic Chores',
  'Driver',
  'Electrician',
  'Embroidery',
  'Gardening',
  'Masonry',
  'Painter/Artist',
  'Painting Jobs',
  'Photography',
  'Plumbing',
  'Sewing Dresses',
  'Stenography',
  'Tailoring',
]

const LOCAL_HARD_SKILLS = [
  ...TECHNICAL_SKILL_SUGGESTIONS,
  'Cash Handling',
  'Classroom Management',
  'Defensive Driving',
  'Food Preparation',
  'Lesson Planning',
  'Records Management',
]

const LOCAL_SOFT_SKILLS = [
  ...SOFT_SKILL_SUGGESTIONS,
  'Patience',
  'Service Orientation',
]

const SKILL_CLASSIFICATION_RULES = [
  { patterns: ['excell', 'spreadsheet'], skill: 'Microsoft Excel', type: 'hard' },
  { patterns: ['drive', 'driver', 'driving'], skill: 'Driver', type: 'hard', is_dole: true },
  { patterns: ['computer', 'encoding', 'encode'], skill: 'Computer Literate', type: 'hard', is_dole: true },
  { patterns: ['talking', 'speaking', 'communicate'], skill: 'Communication', type: 'soft' },
  { patterns: ['problem', 'troubleshoot'], skill: 'Problem Solving', type: 'soft' },
  { patterns: ['team', 'collab'], skill: 'Teamwork', type: 'soft' },
  { patterns: ['web', 'react', 'frontend', 'developer'], skill: 'Web Development', type: 'hard' },
  { patterns: ['cashier', 'pos'], skill: 'Point of Sale Systems', type: 'hard' },
]

export default function SeekerSkillsForm({
  value,
  onChange,
  preferredOccupations = [],
  error,
  disabled = false,
}) {
  const baseId = useId()
  const controlled = value !== undefined
  const [internalValue, setInternalValue] = useState([])
  const [queries, setQueries] = useState({ hard: '', soft: '' })
  const [activeType, setActiveType] = useState('hard')
  const [loadingType, setLoadingType] = useState(null)
  const [searchResultsByType, setSearchResultsByType] = useState({ hard: [], soft: [] })
  const [warning, setWarning] = useState('')

  const selectedSkills = useMemo(
    () => normalizeSelectedSkills(controlled ? value : internalValue),
    [controlled, internalValue, value],
  )
  const selectedNameKeys = useMemo(
    () => new Set(selectedSkills.map((skillItem) => skillNameKey(skillItem))),
    [selectedSkills],
  )
  const hardSkills = useMemo(
    () => selectedSkills.filter((skillItem) => skillItem.type === 'hard'),
    [selectedSkills],
  )
  const softSkills = useMemo(
    () => selectedSkills.filter((skillItem) => skillItem.type === 'soft'),
    [selectedSkills],
  )
  const hardCount = hardSkills.length
  const softCount = softSkills.length
  const activeQuery = queries[activeType] ?? ''
  const normalizedActiveQuery = normalizeText(activeQuery)

  useEffect(() => {
    if (normalizedActiveQuery.length < 2 || disabled) {
      setSearchResultsByType((current) => ({ ...current, [activeType]: [] }))
      setLoadingType(null)
      return undefined
    }

    let ignore = false
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoadingType(activeType)
      try {
        const rows = await searchUnifiedSkillCatalog(activeQuery, controller.signal)
        if (!ignore) {
          setSearchResultsByType((current) => ({ ...current, [activeType]: rows }))
        }
      } catch (error) {
        if (!ignore && error?.code !== 'ERR_CANCELED' && error?.name !== 'AbortError') {
          setSearchResultsByType((current) => ({ ...current, [activeType]: searchLocalSkills(activeQuery) }))
        }
      } finally {
        if (!ignore) setLoadingType(null)
      }
    }, 260)

    return () => {
      ignore = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [activeQuery, activeType, disabled, normalizedActiveQuery])

  const hardSuggestions = useMemo(
    () => buildSmartSuggestions({
      query: queries.hard,
      type: 'hard',
      preferredOccupations,
      searchResults: searchResultsByType.hard,
      selectedSkills,
    }),
    [preferredOccupations, queries.hard, searchResultsByType.hard, selectedSkills],
  )

  const softSuggestions = useMemo(
    () => buildSmartSuggestions({
      query: queries.soft,
      type: 'soft',
      preferredOccupations,
      searchResults: searchResultsByType.soft,
      selectedSkills,
    }),
    [preferredOccupations, queries.soft, searchResultsByType.soft, selectedSkills],
  )

  const emit = (nextSkills) => {
    const normalized = normalizeSelectedSkills(nextSkills)
    if (!controlled) setInternalValue(normalized)
    onChange?.(normalized)
    setWarning('')
  }

  const warn = (message) => {
    setWarning(message)
    toast.error(message)
  }

  const addSkill = (rawSkill) => {
    const skillItem = normalizeSkill(rawSkill)
    if (!skillItem) return

    if (selectedNameKeys.has(skillNameKey(skillItem))) {
      warn(`${skillItem.name} is already selected.`)
      return
    }

    if (skillItem.type === 'hard' && hardCount >= HARD_LIMIT) {
      warn(`You can select up to ${HARD_LIMIT} hard skills.`)
      return
    }

    if (skillItem.type === 'soft' && softCount >= SOFT_LIMIT) {
      warn(`You can select up to ${SOFT_LIMIT} soft skills.`)
      return
    }

    emit([...selectedSkills, skillItem])
    setQueries((current) => ({ ...current, [skillItem.type]: '' }))
    setSearchResultsByType((current) => ({ ...current, [skillItem.type]: [] }))
    setActiveType(skillItem.type)
  }

  const addTypedSkill = (type) => {
    const query = queries[type]?.trim()
    if (!query || query.length < 2) return
    addSkill(classifyCustomSkill(query, type))
  }

  const removeSkill = (skillItem) => {
    emit(selectedSkills.filter((item) => skillNameKey(item) !== skillNameKey(skillItem)))
  }

  const updateQuery = (type, nextQuery) => {
    setQueries((current) => ({ ...current, [type]: nextQuery }))
    setActiveType(type)
    setWarning('')
  }

  const canAdd = (skillItem) => {
    const normalized = normalizeSkill(skillItem)
    if (!normalized) return false
    if (selectedNameKeys.has(skillNameKey(normalized))) return false
    if (normalized.type === 'hard') return hardCount < HARD_LIMIT
    return softCount < SOFT_LIMIT
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-slate-500">Skills & Competencies</p>
        <h3 className="mt-1 text-lg font-black text-slate-950">Add skills for better job matches</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Select the skills you can confidently perform. These skills will help match you with suitable job opportunities.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SkillCard
          id={`${baseId}-hard`}
          title="Hard Skills"
          placeholder="Search or add a hard skill"
          type="hard"
          query={queries.hard}
          skills={hardSkills}
          count={hardCount}
          limit={HARD_LIMIT}
          loading={loadingType === 'hard'}
          suggestions={hardSuggestions}
          disabled={disabled}
          canAdd={canAdd}
          onFocus={() => setActiveType('hard')}
          onQueryChange={(nextQuery) => updateQuery('hard', nextQuery)}
          onAddTyped={() => addTypedSkill('hard')}
          onAddSuggestion={addSkill}
          onRemove={removeSkill}
        />

        <SkillCard
          id={`${baseId}-soft`}
          title="Soft Skills"
          placeholder="Search or add a soft skill"
          type="soft"
          query={queries.soft}
          skills={softSkills}
          count={softCount}
          limit={SOFT_LIMIT}
          loading={loadingType === 'soft'}
          suggestions={softSuggestions}
          disabled={disabled}
          canAdd={canAdd}
          onFocus={() => setActiveType('soft')}
          onQueryChange={(nextQuery) => updateQuery('soft', nextQuery)}
          onAddTyped={() => addTypedSkill('soft')}
          onAddSuggestion={addSkill}
          onRemove={removeSkill}
        />
      </div>

      {(warning || error || selectedSkills.length === 0) && (
        <div className="mt-4 space-y-1">
          {(warning || error) && (
            <p className={`text-xs font-semibold ${error ? 'text-red-600' : 'text-amber-700'}`} role={error ? 'alert' : 'status'}>
              {error || warning}
            </p>
          )}
          {selectedSkills.length === 0 && (
            <p id="skills-save-requirement" className="text-xs font-semibold text-amber-700" role="status">
              Select at least 1 skill to continue.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function SkillCard({
  id,
  title,
  placeholder,
  type,
  query,
  skills,
  count,
  limit,
  loading,
  suggestions,
  disabled,
  canAdd,
  onFocus,
  onQueryChange,
  onAddTyped,
  onAddSuggestion,
  onRemove,
}) {
  const inputRef = useRef(null)
  const limitReached = count >= limit
  const inputDisabled = disabled || limitReached
  const labelId = `${id}-label`

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onAddTyped()
    }

    if (event.key === 'Escape') {
      onQueryChange('')
    }

    if (event.key === 'Backspace' && !query && skills.length > 0) {
      onRemove(skills[skills.length - 1])
    }
  }

  return (
    <section
      className="flex min-h-full flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/10"
      aria-labelledby={labelId}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 id={labelId} className="text-base font-black text-slate-950">{title}</h4>
        </div>
        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600">
          {count}/{limit} selected
        </span>
      </div>

      <label htmlFor={id} className="mt-4 text-sm font-black text-slate-800">
        {title}
      </label>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          id={id}
          value={query}
          disabled={inputDisabled}
          onFocus={onFocus}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={limitReached ? `${title} limit reached` : placeholder}
          aria-describedby={`${id}-description ${id}-counter`}
          className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        />
      </div>
      <p id={`${id}-description`} className="sr-only">
        Type a {type} skill and press Enter to add it.
      </p>

      <div id={`${id}-counter`} className="mt-3 text-xs font-bold text-slate-500">
        {count}/{limit} selected.
      </div>

      <div className="mt-3 min-h-14 rounded-lg border border-slate-200 bg-white p-3">
        {skills.length === 0 ? (
          <p className="text-sm font-semibold text-slate-500">
            No {type} skills selected yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((skillItem) => (
              <SelectedSkillChip
                key={skillNameKey(skillItem)}
                skill={skillItem}
                disabled={disabled}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>

      <CardSuggestions
        title={`Suggested ${title}`}
        loading={loading}
        suggestions={suggestions}
        disabled={disabled}
        canAdd={canAdd}
        onAdd={onAddSuggestion}
      />
    </section>
  )
}

function SelectedSkillChip({ skill, disabled, onRemove }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
      <span className="truncate">{skill.name}</span>
      <button
        type="button"
        onClick={() => onRemove(skill)}
        disabled={disabled}
        aria-label={`Remove ${skill.name}`}
        className="rounded-full p-0.5 text-blue-700 transition hover:bg-white hover:text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:pointer-events-none disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  )
}

function CardSuggestions({
  title,
  loading,
  suggestions,
  disabled,
  canAdd,
  onAdd,
}) {
  return (
    <div className="mt-4 border-t border-slate-200 pt-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
        {loading && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Updating
          </span>
        )}
      </div>

      <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
        {loading && suggestions.length === 0 ? (
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-8 w-28 animate-pulse rounded-full border border-slate-200 bg-white" />
          ))
        ) : suggestions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
            No matching skills found. You can press Enter to add the typed skill.
          </p>
        ) : (
          suggestions.map((skillItem) => {
            const limitReached = !canAdd(skillItem)

            return (
              <button
                key={skillNameKey(skillItem)}
                type="button"
                onClick={() => onAdd(skillItem)}
                disabled={disabled || limitReached}
                aria-label={`Add ${skillItem.name}`}
                title={limitReached ? 'Skill limit reached' : `${skillTypeLabel(skillItem.type)} · ${skillCategoryLabel(skillItem)} · ${skillSourceLabel(skillItem.source)}`}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-xs font-extrabold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  limitReached
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800'
                }`}
              >
                <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{skillItem.name}</span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

async function searchUnifiedSkillCatalog(query, signal) {
  const [technicalRows, softRows] = await Promise.all([
    searchSkills(query, 'technical', SEARCH_LIMIT, signal),
    searchSkills(query, 'soft', SEARCH_LIMIT, signal),
  ])

  return uniqueSkills([
    ...technicalRows.map((skillItem) => normalizeSkill({
      ...skillItem,
      type: 'hard',
    })),
    ...softRows.map((skillItem) => normalizeSkill({
      ...skillItem,
      type: 'soft',
      is_dole: false,
    })),
    ...searchLocalDoleSkills(query),
    ...searchLocalSkills(query),
  ]).filter(Boolean)
}

function searchLocalSkills(query) {
  const normalized = normalizeText(query)
  if (!normalized) return []

  return [
    ...LOCAL_HARD_SKILLS.map((name, index) => ({
      skill_id: 1000 + index,
      name,
      type: 'hard',
      is_dole: OFFICIAL_DOLE_SKILLS.some((skillItem) => normalizeText(skillItem) === normalizeText(name)),
      source: OFFICIAL_DOLE_SKILLS.some((skillItem) => normalizeText(skillItem) === normalizeText(name)) ? 'dole' : 'system',
      is_official: true,
    })),
    ...LOCAL_SOFT_SKILLS.map((name, index) => ({
      skill_id: 2000 + index,
      name,
      type: 'soft',
      is_dole: false,
      source: 'system',
      is_official: true,
    })),
  ].filter((skillItem) => normalizeText(skillItem.name).includes(normalized))
}

function searchLocalDoleSkills(query) {
  const normalized = normalizeText(query)
  if (!normalized) return []

  return OFFICIAL_DOLE_SKILLS
    .filter((name) => normalizeText(name).includes(normalized))
    .map((name, index) => normalizeSkill({
      skill_id: 3000 + index,
      name,
      type: 'hard',
      is_dole: true,
      source: 'dole',
      is_official: true,
    }))
}

function buildSmartSuggestions({
  query,
  type,
  preferredOccupations,
  searchResults,
  selectedSkills,
}) {
  const normalizedQuery = normalizeText(query)
  const querySkill = normalizedQuery.length >= 2
    ? classifyCustomSkill(query, type)
    : null
  const ruleMatches = normalizedQuery.length >= 2
    ? matchingRuleSkills(normalizedQuery)
    : []
  const defaultSuggestions = type === 'hard'
    ? DEFAULT_HARD_SUGGESTIONS.map((name) => skill(
      name,
      'hard',
      OFFICIAL_DOLE_SKILLS.some((doleSkill) => normalizeText(doleSkill) === normalizeText(name)),
    ))
    : DEFAULT_SOFT_SUGGESTIONS.map((name) => skill(name, 'soft'))

  return uniqueSkills([
    ...ruleMatches,
    ...searchResults,
    querySkill,
    ...buildRecommendations(preferredOccupations),
    ...buildRelatedSuggestions(selectedSkills),
    ...defaultSuggestions,
  ].filter(Boolean))
    .filter((skillItem) => skillItem.type === type)
    .filter((skillItem) => !selectedSkills.some((selectedSkill) => skillNameKey(selectedSkill) === skillNameKey(skillItem)))
    .filter((skillItem) => {
      if (!normalizedQuery) return true
      return normalizeText(skillItem.name).includes(normalizedQuery)
        || matchingRuleSkills(normalizedQuery).some((match) => skillNameKey(match) === skillNameKey(skillItem))
    })
    .slice(0, SUGGESTION_LIMIT)
}

function buildRecommendations(preferredOccupations) {
  const text = normalizeText(
    preferredOccupations
      .map((occupation) => [
        occupation?.title,
        occupation?.general_term,
        occupation?.raw_job_title,
        occupation?.broadField,
      ].filter(Boolean).join(' '))
      .join(' '),
  )

  const occupationSkills = []
  if (matchesAny(text, ['teacher', 'education', 'instructor', 'tutor'])) {
    occupationSkills.push(
      skill('Lesson Planning', 'hard'),
      skill('Classroom Management', 'hard'),
      skill('Computer Literate', 'hard', true),
      skill('Communication', 'soft'),
      skill('Patience', 'soft'),
    )
  }
  if (matchesAny(text, ['driver', 'transport', 'delivery', 'logistics'])) {
    occupationSkills.push(
      skill('Driver', 'hard', true),
      skill('Defensive Driving', 'hard'),
      skill('Time Management', 'soft'),
      skill('Attention to Detail', 'soft'),
    )
  }
  if (matchesAny(text, ['ict', 'information', 'developer', 'programmer', 'web', 'computer'])) {
    occupationSkills.push(
      skill('Web Development', 'hard'),
      skill('Programming', 'hard'),
      skill('Data Analysis', 'hard'),
      skill('Problem Solving', 'soft'),
      skill('Attention to Detail', 'soft'),
    )
  }
  if (matchesAny(text, ['cashier', 'sales', 'retail', 'customer'])) {
    occupationSkills.push(
      skill('Point of Sale Systems', 'hard'),
      skill('Cash Handling', 'hard'),
      skill('Customer Service', 'soft'),
      skill('Communication', 'soft'),
    )
  }

  return uniqueSkills([
    ...occupationSkills,
    skill('Data Entry', 'hard'),
    skill('Microsoft Office', 'hard'),
    skill('Critical Thinking', 'soft'),
  ]).map((skillItem) => ({
    ...skillItem,
    source: skillItem.is_dole ? 'dole' : 'occupation_recommended',
    is_recommended: true,
  }))
}

function buildRelatedSuggestions(selectedSkills) {
  const selectedText = normalizeText(selectedSkills.map((skillItem) => skillItem.name).join(' '))
  const relatedSkills = []

  if (matchesAny(selectedText, ['web', 'programming', 'react', 'developer'])) {
    relatedSkills.push(skill('Programming', 'hard'), skill('Data Analysis', 'hard'), skill('Problem Solving', 'soft'))
  }

  if (matchesAny(selectedText, ['customer', 'sales', 'cash'])) {
    relatedSkills.push(skill('Point of Sale Systems', 'hard'), skill('Cash Handling', 'hard'), skill('Communication', 'soft'))
  }

  if (matchesAny(selectedText, ['driver', 'driving', 'delivery'])) {
    relatedSkills.push(skill('Defensive Driving', 'hard'), skill('Time Management', 'soft'), skill('Attention to Detail', 'soft'))
  }

  if (matchesAny(selectedText, ['office', 'excel', 'data entry'])) {
    relatedSkills.push(skill('Microsoft Excel', 'hard'), skill('Records Management', 'hard'), skill('Organization', 'soft'))
  }

  return relatedSkills
}

function matchingRuleSkills(normalizedQuery) {
  if (!normalizedQuery) return []

  return SKILL_CLASSIFICATION_RULES
    .filter((item) => item.patterns.some((pattern) => normalizedQuery.includes(normalizeText(pattern))))
    .map((item) => skill(item.skill, item.type, Boolean(item.is_dole), {
      source: item.is_dole ? 'dole' : 'system',
      is_official: true,
    }))
}

function classifyCustomSkill(input, forcedType = null) {
  const normalized = normalizeText(input)
  const rule = SKILL_CLASSIFICATION_RULES.find((item) => (
    item.patterns.some((pattern) => normalized.includes(normalizeText(pattern)))
  ))

  if (rule && (!forcedType || rule.type === forcedType)) {
    return skill(rule.skill, rule.type, Boolean(rule.is_dole), {
      source: rule.is_dole ? 'dole' : 'system',
      is_official: true,
    })
  }

  const type = forcedType ?? (inferSoftSkill(normalized) ? 'soft' : 'hard')

  return skill(titleCase(input), type, false, {
    source: 'user_added',
    is_official: false,
  })
}

function normalizeSelectedSkills(rows = []) {
  return uniqueSkills((Array.isArray(rows) ? rows : []).map(normalizeSkill).filter(Boolean))
}

function normalizeSkill(item) {
  if (!item) return null
  const name = cleanSkillName(item.name ?? item.skill_name ?? item.label)
  if (!name) return null

  const type = normalizeSkillType(item.type ?? item.category ?? item.skill_type)
  const isDole = Boolean(item.is_dole ?? item.is_official_dole_skill ?? item.isOfficialDoleSkill)
    || normalizeText(item.category).includes('dole')
    || OFFICIAL_DOLE_SKILLS.some((skillName) => normalizeText(skillName) === normalizeText(name))
  const source = isDole ? 'dole' : normalizeMetadataSource(item.source)
  const officialSource = ['dole', 'esco', 'system', 'occupation_recommended'].includes(source)

  return {
    skill_id: item.skill_id ?? item.id ?? stableMockId(name, type, isDole),
    name,
    type,
    is_dole: isDole,
    source,
    category: item.category ?? item.skill_category ?? null,
    is_official: isDole || officialSource || Boolean(item.is_official ?? item.isOfficial),
    is_recommended: Boolean(item.is_recommended ?? item.isRecommended),
  }
}

function skillTypeLabel(type) {
  return type === 'soft' ? 'Soft skill' : 'Hard skill'
}

function skillCategoryLabel(skillItem) {
  const category = String(skillItem.category ?? '').trim()
  if (category && !['technical', 'soft'].includes(category.toLowerCase())) return titleCase(category)
  return skillItem.type === 'soft' ? 'Work behavior' : 'Technical capability'
}

function skillSourceLabel(source) {
  const labels = {
    dole: 'DOLE catalog',
    esco: 'ESCO catalog',
    occupation_recommended: 'Occupation suggestion',
    user_added: 'Manual entry',
    system: 'Skills catalog',
  }
  return labels[source] ?? 'Skills catalog'
}

function skill(name, type = 'hard', isDole = false, metadata = {}) {
  return normalizeSkill({
    name,
    type,
    is_dole: isDole,
    source: isDole ? 'dole' : (metadata.source ?? 'system'),
    is_official: isDole || (metadata.is_official ?? true),
    is_recommended: metadata.is_recommended ?? false,
  })
}

function uniqueSkills(rows = []) {
  const seen = new Set()
  return rows.filter((row) => {
    if (!row?.name) return false
    const key = skillNameKey(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function skillNameKey(skillItem) {
  return normalizeText(skillItem?.name)
}

function normalizeSkillType(type) {
  const normalized = normalizeText(type)
  return normalized.includes('soft') ? 'soft' : 'hard'
}

function normalizeMetadataSource(source) {
  const normalized = String(source ?? 'system').toLowerCase()
  if (normalized === 'local_submitted' || normalized === 'user_added') return 'user_added'
  if (['dole', 'esco', 'occupation_recommended', 'system'].includes(normalized)) return normalized
  return 'system'
}

function cleanSkillName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function titleCase(value) {
  return cleanSkillName(value)
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

function matchesAny(text, terms) {
  return terms.some((term) => text.includes(normalizeText(term)))
}

function inferSoftSkill(text) {
  return matchesAny(text, [
    'adapt',
    'communicat',
    'lead',
    'listen',
    'organize',
    'problem',
    'team',
    'time',
    'work ethic',
  ])
}

function stableMockId(name, type, isDole) {
  const seed = `${type}:${isDole ? 'dole' : 'general'}:${normalizeText(name)}`
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash % 900000) + 10000
}
