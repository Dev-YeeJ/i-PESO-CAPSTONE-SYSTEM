import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, Search, X } from 'lucide-react'
import { searchSkills } from '@/services/skillService'

const proficiencyOptions = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' },
]

export default function SkillTaxonomyTags({
  value = [],
  onChange,
  mode = 'employer',
  category = 'technical',
  output = mode === 'seeker' ? 'objects' : 'names',
  label = 'Skills',
  required = false,
  placeholder = 'Search valid skills',
  error,
  disabled = false,
  limit = 20,
  className = '',
}) {
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])

  const selected = useMemo(() => normalizeSelected(value), [value])
  const selectedKeys = useMemo(() => new Set(selected.map((skill) => skillKey(skill))), [selected])
  const visibleResults = useMemo(
    () => uniqueSkills(results).filter((skill) => !selectedKeys.has(skillKey(skill))),
    [results, selectedKeys],
  )

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return undefined
    }

    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        setResults(await fetchSkills(query.trim(), category, limit))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => window.clearTimeout(timer)
  }, [category, limit, open, query])

  const emit = (nextSelected) => {
    if (output === 'names') {
      onChange?.(nextSelected.map((skill) => skill.name))
      return
    }

    onChange?.(nextSelected.map((skill) => ({
      id: skill.id ?? skill.skill_id ?? null,
      skill_id: skill.id ?? skill.skill_id ?? null,
      name: skill.name,
      skill_name: skill.name,
      category: skill.category ?? category,
      proficiency: skill.proficiency ?? 'intermediate',
    })))
  }

  const addSkill = (skill) => {
    const normalized = normalizeSkill(skill, mode)
    if (!normalized || selectedKeys.has(skillKey(normalized))) return

    emit([...selected, normalized])
    setQuery('')
    setResults([])
    setOpen(true)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  const removeSkill = (skill) => {
    emit(selected.filter((item) => skillKey(item) !== skillKey(skill)))
  }

  const updateProficiency = (skill, proficiency) => {
    emit(selected.map((item) => (
      skillKey(item) === skillKey(skill) ? { ...item, proficiency } : item
    )))
  }

  return (
    <div className={className} ref={rootRef}>
      {label && (
        <p className="text-sm font-bold text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </p>
      )}

      <div className={`mt-2 rounded-xl border bg-white p-2 shadow-sm transition focus-within:ring-2 ${
        error ? 'border-red-300 focus-within:ring-red-100' : 'border-slate-300 focus-within:border-blue-900 focus-within:ring-blue-900/10'
      }`}>
        <div className="flex flex-wrap gap-2">
          {selected.map((skill) => (
            <span
              key={skillKey(skill)}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800"
            >
              <span className="truncate">{skill.name}</span>
              {mode === 'seeker' && (
                <select
                  value={skill.proficiency ?? 'intermediate'}
                  onChange={(event) => updateProficiency(skill, event.target.value)}
                  disabled={disabled}
                  className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-bold text-blue-900 outline-none focus:border-blue-900"
                  aria-label={`Set proficiency for ${skill.name}`}
                >
                  {proficiencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                disabled={disabled}
                aria-label={`Remove ${skill.name}`}
                className="text-blue-700 transition hover:text-blue-950 disabled:pointer-events-none"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              disabled={disabled}
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value)
                setOpen(true)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  if (visibleResults.length) addSkill(visibleResults[0])
                }
                if (event.key === 'Backspace' && !query && selected.length) {
                  removeSkill(selected[selected.length - 1])
                }
                if (event.key === 'Escape') setOpen(false)
              }}
              className="w-full border-0 py-1.5 pl-8 pr-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-white"
              placeholder={selected.length ? 'Search another skill' : placeholder}
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
              aria-invalid={Boolean(error)}
            />
          </div>
        </div>
      </div>

      <div className="relative">
        {open && !disabled && (
          <div className="absolute z-50 mt-2 max-h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            {query.trim().length < 2 && (
              <div className="px-4 py-3 text-sm text-slate-500">Type at least 2 characters to search the approved skills taxonomy.</div>
            )}
            {loading && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching skills...
              </div>
            )}
            {!loading && query.trim().length >= 2 && visibleResults.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500">No approved skill found for this search.</div>
            )}
            {!loading && visibleResults.length > 0 && (
              <div className="max-h-72 overflow-y-auto py-1" role="listbox">
                {visibleResults.map((skill) => (
                  <button
                    key={skillKey(skill)}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => addSkill(skill)}
                    className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-blue-50"
                    role="option"
                    aria-selected="false"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-950">{skillName(skill)}</span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {skill.category && <MetaBadge>{titleCase(skill.category)}</MetaBadge>}
                        {skill.source && <MetaBadge>{skill.source}</MetaBadge>}
                        {skill.is_hot && <MetaBadge>In demand</MetaBadge>}
                      </span>
                    </span>
                    <Check className="h-4 w-4 shrink-0 text-blue-900" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-1.5 text-xs text-slate-500">Only approved taxonomy skills can be selected. Free-text tags are disabled for matching accuracy.</p>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}

async function fetchSkills(query, category, limit) {
  if (category === 'all') {
    const rows = await Promise.all([
      searchSkills(query, 'technical', limit),
      searchSkills(query, 'soft', limit),
    ])

    return rows.flat()
  }

  return searchSkills(query, category, limit)
}

function normalizeSelected(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => normalizeSkill(item)).filter(Boolean)
}

function normalizeSkill(item, mode = 'employer') {
  if (!item) return null
  if (typeof item === 'string') {
    return {
      id: null,
      skill_id: null,
      name: item,
      category: null,
      proficiency: mode === 'seeker' ? 'intermediate' : undefined,
    }
  }

  const name = skillName(item)
  if (!name) return null

  return {
    ...item,
    id: item.id ?? item.skill_id ?? null,
    skill_id: item.skill_id ?? item.id ?? null,
    name,
    category: item.category ?? null,
    proficiency: item.proficiency ?? (mode === 'seeker' ? 'intermediate' : undefined),
  }
}

function uniqueSkills(rows) {
  const seen = new Set()
  return rows.filter((row) => {
    const key = skillKey(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function skillKey(skill) {
  const id = skill?.id ?? skill?.skill_id
  return id ? `id:${id}` : `name:${skillName(skill).toLowerCase()}`
}

function skillName(skill) {
  if (!skill) return ''
  if (typeof skill === 'string') return skill.trim()
  return String(skill.name ?? skill.skill_name ?? skill.label ?? '').trim()
}

function MetaBadge({ children }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
      {children}
    </span>
  )
}

function titleCase(value) {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}
