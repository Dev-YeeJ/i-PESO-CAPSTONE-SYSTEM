import { useEffect, useId, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, Loader2, Plus, Search, X } from 'lucide-react'
import {
  SOFT_SKILL_SUGGESTIONS,
  TECHNICAL_SKILL_SUGGESTIONS,
} from '@/data/jobPreferenceVocabularies'
import { searchSkills } from '@/services/skillService'

const HARD_LIMIT = 20
const SOFT_LIMIT = 10
const SEARCH_LIMIT = 10

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'hard', label: 'Hard Skills' },
  { value: 'soft', label: 'Soft Skills' },
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
  const inputId = useId()
  const listboxId = `${inputId}-listbox`
  const inputRef = useRef(null)
  const controlled = value !== undefined
  const [internalValue, setInternalValue] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [warning, setWarning] = useState('')
  const [showAllRecommendations, setShowAllRecommendations] = useState(false)

  const selectedSkills = useMemo(
    () => normalizeSelectedSkills(controlled ? value : internalValue),
    [controlled, internalValue, value],
  )
  const selectedKeys = useMemo(
    () => new Set(selectedSkills.map((skill) => skillKey(skill))),
    [selectedSkills],
  )
  const hardCount = selectedSkills.filter((skill) => skill.type === 'hard').length
  const softCount = selectedSkills.filter((skill) => skill.type === 'soft').length
  const hardLimitReached = hardCount >= HARD_LIMIT
  const softLimitReached = softCount >= SOFT_LIMIT
  const searchDisabled = disabled || (hardLimitReached && softLimitReached)
  const recommendationPool = useMemo(
    () => buildRecommendations(preferredOccupations),
    [preferredOccupations],
  )
  const filteredRecommendationPool = recommendationPool.filter((skill) => filterSkill(skill, activeFilter))
  const filteredRecommendations = showAllRecommendations
    ? filteredRecommendationPool
    : filteredRecommendationPool.slice(0, 10)
  const normalizedQuery = normalizeText(query)
  const hasExactResult = results.some((skill) => normalizeText(skill.name) === normalizedQuery)
  const showCustomOption = normalizedQuery.length >= 2 && !hasExactResult && results.length === 0
  const optionCount = results.length + (showCustomOption ? 1 : 0)

  useEffect(() => {
    if (normalizedQuery.length < 2 || searchDisabled) {
      setResults([])
      setLoading(false)
      return undefined
    }

    let ignore = false
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const rows = await searchUnifiedSkillCatalog(query)
        if (!ignore) {
          setResults(rows.filter((skill) => !selectedKeys.has(skillKey(skill))).slice(0, SEARCH_LIMIT))
          setActiveIndex(0)
        }
      } catch {
        if (!ignore) {
          setResults(searchLocalSkills(query).filter((skill) => !selectedKeys.has(skillKey(skill))).slice(0, SEARCH_LIMIT))
          setActiveIndex(0)
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }, 350)

    return () => {
      ignore = true
      window.clearTimeout(timer)
    }
  }, [normalizedQuery, query, searchDisabled, selectedKeys])

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

  const canAdd = (skill) => {
    if (!skill || selectedKeys.has(skillKey(skill))) return false
    if (skill.type === 'hard' && hardLimitReached) return false
    if (skill.type === 'soft' && softLimitReached) return false
    return true
  }

  const addSkill = (rawSkill) => {
    const skill = normalizeSkill(rawSkill)
    if (!skill) return
    if (selectedKeys.has(skillKey(skill))) return

    if (skill.type === 'hard' && hardLimitReached) {
      warn(`You can select up to ${HARD_LIMIT} hard skills.`)
      return
    }

    if (skill.type === 'soft' && softLimitReached) {
      warn(`You can select up to ${SOFT_LIMIT} soft skills.`)
      return
    }

    emit([...selectedSkills, skill])
    setQuery('')
    setResults([])
    setOpen(false)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  const removeSkill = (skill) => {
    emit(selectedSkills.filter((item) => skillKey(item) !== skillKey(skill)))
  }

  const addCustomSkill = () => {
    if (normalizedQuery.length < 2) return
    addSkill(classifyCustomSkill(query))
  }

  const handleKeyDown = (event) => {
    if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      setOpen(true)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, Math.max(optionCount - 1, 0)))
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
    }

    if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(0)
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (!open) return
      if (activeIndex < results.length) {
        addSkill(results[activeIndex])
      } else if (showCustomOption) {
        addCustomSkill()
      }
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-slate-500">Skills & Competencies</p>
        <h3 className="mt-1 text-lg font-black text-slate-950">Add skills for better job matches</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Select the skills you can confidently perform. These skills will help match you with suitable job opportunities.
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-950">Recommended for your Preferred Occupation</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Suggestions are based on your selected preferred occupation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter recommended skills">
            {FILTERS.map((filter) => {
              const active = activeFilter === filter.value

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setActiveFilter(filter.value)
                    setShowAllRecommendations(false)
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    active
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800'
                  }`}
                  role="tab"
                  aria-selected={active}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {filteredRecommendations.map((skill) => {
            const selected = selectedKeys.has(skillKey(skill))
            const limitReached = !canAdd(skill) && !selected

            return (
              <button
                key={skillKey(skill)}
                type="button"
                onClick={() => selected ? removeSkill(skill) : addSkill(skill)}
                disabled={limitReached || disabled}
                aria-pressed={selected}
                aria-label={`${selected ? 'Remove' : 'Add'} ${skill.name}`}
                className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-2 text-sm font-extrabold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selected
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : limitReached
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800'
                }`}
                title={limitReached ? 'Skill limit reached for this category' : skill.name}
              >
                {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span className="truncate">{skill.name}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {filteredRecommendationPool.length > 10 && (
            <button
              type="button"
              onClick={() => setShowAllRecommendations((current) => !current)}
              className="text-sm font-black text-blue-700 transition hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {showAllRecommendations ? 'Show fewer' : `Show ${filteredRecommendationPool.length - 10} more`}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setActiveFilter('all')
              setShowAllRecommendations(false)
              inputRef.current?.focus()
            }}
            className="text-sm font-black text-slate-500 transition hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Update Suggestions
          </button>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor={inputId} className="text-sm font-black text-slate-800">
          Search or Add Skills
        </label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            id={inputId}
            value={query}
            disabled={searchDisabled}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 140)}
            onKeyDown={handleKeyDown}
            placeholder={searchDisabled ? 'Skill limits reached' : 'Search skills, e.g., Excel, Driving, Communication'}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={open && optionCount > 0 ? `${listboxId}-option-${activeIndex}` : undefined}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          {open && !searchDisabled && normalizedQuery.length >= 2 && (
            <div
              id={listboxId}
              role="listbox"
              className="absolute z-40 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            >
              {loading && (
                <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching skills...
                </div>
              )}

              {!loading && results.map((skill, index) => {
                const limitReached = !canAdd(skill)
                const active = activeIndex === index

                return (
                  <button
                    key={skillKey(skill)}
                    id={`${listboxId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={limitReached}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => addSkill(skill)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 ${
                      active ? 'bg-blue-50' : 'bg-white hover:bg-blue-50'
                    } ${limitReached ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-950">{skill.name}</span>
                      <span className="mt-1 flex flex-wrap gap-1.5 text-xs font-bold text-slate-500">
                        <span>{skill.type === 'soft' ? 'Soft Skill' : 'Hard Skill'}</span>
                      </span>
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-blue-700" />
                  </button>
                )
              })}

              {!loading && showCustomOption && (
                <button
                  id={`${listboxId}-option-${results.length}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === results.length}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={addCustomSkill}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                    activeIndex === results.length ? 'bg-blue-50' : 'bg-white hover:bg-blue-50'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-950">
                      Add "{query.trim()}"
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-slate-600">
                      Add as a {inferSoftSkill(normalizedQuery) ? 'Soft Skill' : 'Hard Skill'} because no close catalog match was found.
                    </span>
                  </span>
                  <Plus className="h-4 w-4 shrink-0 text-blue-700" />
                </button>
              )}

              {!loading && results.length === 0 && !showCustomOption && (
                <p className="px-4 py-3 text-sm font-semibold text-slate-500">
                  No skill matches yet. Try another keyword.
                </p>
              )}
            </div>
          )}
        </div>

        {(warning || error) && (
          <p className={`mt-2 text-xs font-semibold ${error ? 'text-red-600' : 'text-amber-700'}`}>
            {error || warning}
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
          <span>{hardCount} / {HARD_LIMIT} hard skills</span>
          <span aria-hidden="true">.</span>
          <span>{softCount} / {SOFT_LIMIT} soft skills</span>
        </div>
        {selectedSkills.length === 0 && (
          <p id="skills-save-requirement" className="mt-2 text-xs font-semibold text-amber-700" role="status">
            Select at least 1 skill to continue.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2" aria-label="Selected skill categories">
        <SkillCategoryPanel
          title="Hard Skills"
          description="Technical, software, trade, vocational, and professional abilities."
          skills={selectedSkills.filter((skill) => skill.type === 'hard')}
          count={hardCount}
          limit={HARD_LIMIT}
          onRemove={removeSkill}
        />
        <SkillCategoryPanel
          title="Soft Skills"
          description="Communication, teamwork, adaptability, and workplace behavior."
          skills={selectedSkills.filter((skill) => skill.type === 'soft')}
          count={softCount}
          limit={SOFT_LIMIT}
          onRemove={removeSkill}
        />
      </div>

      <SelectedSkills
        selectedSkills={selectedSkills}
        onRemove={removeSkill}
      />
    </section>
  )
}

function SkillCategoryPanel({ title, description, skills, count, limit, onRemove }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-slate-950">{title}</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700" aria-label={`${count} of ${limit} selected`}>
          {count}/{limit}
        </span>
      </div>

      {skills.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-xs font-semibold text-slate-500">
          No {title.toLowerCase()} selected yet.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {skills.map((skillItem) => (
            <button
              key={skillKey(skillItem)}
              type="button"
              onClick={() => onRemove(skillItem)}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`Remove ${skillItem.name}`}
              title={`Remove ${skillItem.name}`}
            >
              <span className="truncate">{skillItem.name}</span>
              <X className="h-3.5 w-3.5 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function SelectedSkills({ selectedSkills, onRemove }) {
  const hardSkills = selectedSkills.filter((skill) => skill.type === 'hard')
  const softSkills = selectedSkills.filter((skill) => skill.type === 'soft')

  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-black text-slate-950">Selected Skills Summary</h4>
          <p className="text-xs leading-5 text-slate-500">
            Review your selected skills before continuing.
          </p>
        </div>
        <span className="text-xs font-black text-slate-600">{selectedSkills.length} selected</span>
      </div>

      {selectedSkills.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
          No skills selected yet. Choose from recommendations or search for a skill.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <SkillGroup
            title="Hard Skills"
            skills={hardSkills}
            onRemove={onRemove}
          />
          <SkillGroup
            title="Soft Skills"
            skills={softSkills}
            onRemove={onRemove}
          />
        </div>
      )}
    </section>
  )
}

function SkillGroup({ title, skills, onRemove }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
        <span className="text-xs font-black text-slate-500">{skills.length}</span>
      </div>

      {skills.length === 0 ? (
        <p className="text-xs font-semibold text-slate-400">No {title.toLowerCase()} selected.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skillKey(skill)}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800"
            >
              <span className="truncate">{skill.name}</span>
              <button
                type="button"
                onClick={() => onRemove(skill)}
                aria-label={`Remove ${skill.name}`}
                className="rounded-full p-0.5 text-blue-700 transition hover:bg-white/70 hover:text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

async function searchUnifiedSkillCatalog(query) {
  const [technicalRows, softRows] = await Promise.all([
    searchSkills(query, 'technical', SEARCH_LIMIT),
    searchSkills(query, 'soft', SEARCH_LIMIT),
  ])

  return uniqueSkills([
    ...technicalRows.map((skill) => normalizeSkill({
      ...skill,
      type: 'hard',
    })),
    ...softRows.map((skill) => normalizeSkill({
      ...skill,
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
      is_dole: OFFICIAL_DOLE_SKILLS.some((skill) => normalizeText(skill) === normalizeText(name)),
      source: OFFICIAL_DOLE_SKILLS.some((skill) => normalizeText(skill) === normalizeText(name)) ? 'dole' : 'system',
      is_official: true,
      proficiency: 'Intermediate',
    })),
    ...LOCAL_SOFT_SKILLS.map((name, index) => ({
      skill_id: 2000 + index,
      name,
      type: 'soft',
      is_dole: false,
      source: 'system',
      is_official: true,
      proficiency: 'Intermediate',
    })),
  ].filter((skill) => normalizeText(skill.name).includes(normalized))
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
    skill('Microsoft Excel', 'hard'),
    skill('Computer Literate', 'hard', true),
    skill('Driver', 'hard', true),
    skill('Customer Service', 'soft'),
    skill('Communication', 'soft'),
    skill('Teamwork', 'soft'),
    skill('Problem Solving', 'soft'),
    skill('Data Entry', 'hard'),
    skill('Microsoft Office', 'hard'),
    skill('Critical Thinking', 'soft'),
  ]).map((skillItem) => ({
    ...skillItem,
    source: skillItem.is_dole ? 'dole' : 'occupation_recommended',
    is_recommended: true,
  }))
}

function classifyCustomSkill(input) {
  const normalized = normalizeText(input)
  const rule = SKILL_CLASSIFICATION_RULES.find((item) => (
    item.patterns.some((pattern) => normalized.includes(normalizeText(pattern)))
  ))

  if (rule) {
    return skill(rule.skill, rule.type, Boolean(rule.is_dole), {
      source: rule.is_dole ? 'dole' : 'system',
      is_official: true,
    })
  }

  return skill(titleCase(input), inferSoftSkill(normalized) ? 'soft' : 'hard', false, {
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
    is_official: isDole || officialSource || Boolean(item.is_official ?? item.isOfficial),
    is_recommended: Boolean(item.is_recommended ?? item.isRecommended),
    proficiency: normalizeProficiency(item.proficiency),
  }
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

function filterSkill(skillItem, filter) {
  if (filter === 'all') return true
  return skillItem.type === filter
}

function uniqueSkills(rows = []) {
  const seen = new Set()
  return rows.filter((row) => {
    if (!row?.name) return false
    const key = skillKey(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function skillKey(skillItem) {
  return `${skillItem?.type ?? 'hard'}:${normalizeText(skillItem?.name)}`
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

function normalizeProficiency(value) {
  const normalized = String(value ?? 'Intermediate').toLowerCase()
  if (normalized === 'beginner') return 'Beginner'
  if (normalized === 'expert' || normalized === 'advanced') return 'Expert'
  return 'Intermediate'
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
