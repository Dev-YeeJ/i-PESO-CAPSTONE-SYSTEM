import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, Plus, Search, X } from 'lucide-react'
import { searchSkills } from '@/services/skillService'
import {
  SOFT_SKILL_SUGGESTIONS,
  TECHNICAL_SKILL_SUGGESTIONS,
} from '@/data/jobPreferenceVocabularies'

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
  allowCustom = true,
  className = '',
}) {
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [starterSkills, setStarterSkills] = useState([])
  const [starterLoading, setStarterLoading] = useState(false)

  const selected = useMemo(() => normalizeSelected(value), [value])
  const selectedKeys = useMemo(() => new Set(selected.map((skill) => skillKey(skill))), [selected])
  const selectionFull = selected.length >= limit
  const starterFallbacks = useMemo(
    () => localStarterSkills(category, Math.min(limit, 14)),
    [category, limit],
  )
  const customSkill = useMemo(() => {
    const name = query.trim().replace(/\s+/g, ' ')
    if (!allowCustom || selectionFull || name.length < 2) return null

    const skill = {
      id: null,
      skill_id: null,
      name,
      skill_name: name,
      category,
      source: 'custom_user_input',
      is_custom: true,
      proficiency: mode === 'seeker' ? 'intermediate' : undefined,
    }

    return selectedKeys.has(skillKey(skill)) ? null : skill
  }, [allowCustom, category, mode, query, selectedKeys, selectionFull])
  const recommendedSkills = useMemo(
    () => uniqueSkills([
      ...starterSkills,
      ...starterFallbacks,
    ])
      .filter((skill) => !selectedKeys.has(skillKey(skill)))
      .slice(0, 16),
    [selectedKeys, starterFallbacks, starterSkills],
  )
  const visibleResults = useMemo(
    () => uniqueSkills(results).filter((skill) => !selectedKeys.has(skillKey(skill))).slice(0, 16),
    [results, selectedKeys],
  )
  const hasSearchQuery = query.trim().length >= 2

  useEffect(() => {
    let ignore = false

    async function loadStarterSkills() {
      setStarterLoading(true)
      try {
        const skills = await fetchSkills('', category, 16)
        if (!ignore) setStarterSkills(skills)
      } catch {
        if (!ignore) setStarterSkills([])
      } finally {
        if (!ignore) setStarterLoading(false)
      }
    }

    loadStarterSkills()

    return () => {
      ignore = true
    }
  }, [category])

  useEffect(() => {
    if (!hasSearchQuery) {
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
  }, [category, hasSearchQuery, limit, query])

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
      source: skill.source ?? null,
      is_custom: Boolean(skill.is_custom),
    })))
  }

  const addSkill = (skill) => {
    const normalized = normalizeSkill(skill, mode)
    if (!normalized || selectionFull || selectedKeys.has(skillKey(normalized))) return

    emit([...selected, normalized])
    setQuery('')
    setResults([])
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
    <div className={className}>
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
              disabled={disabled || selectionFull}
              onChange={(event) => {
                setQuery(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  if (customSkill) addSkill(customSkill)
                  else if (visibleResults.length) addSkill(visibleResults[0])
                }
                if (event.key === 'Backspace' && !query && selected.length) {
                  removeSkill(selected[selected.length - 1])
                }
                if (event.key === 'Escape') setQuery('')
              }}
              className="w-full border-0 py-1.5 pl-8 pr-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-white"
              placeholder={selectionFull ? `Maximum of ${limit} selected` : (selected.length ? 'Search another skill' : placeholder)}
              aria-invalid={Boolean(error)}
            />
          </div>
        </div>
      </div>

      {!disabled && !selectionFull && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
              {hasSearchQuery ? 'Matching skills' : 'Recommended skills'}
            </p>
            {(starterLoading || loading) && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading
              </span>
            )}
          </div>

          {hasSearchQuery && customSkill && (
            <button
              type="button"
              onClick={() => addSkill(customSkill)}
              className="mb-2 flex w-full items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-left transition hover:border-indigo-300 hover:bg-indigo-100"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-indigo-950">Use typed skill: "{customSkill.name}"</span>
                <span className="mt-0.5 block text-xs font-semibold text-indigo-700">
                  Add exactly what the user typed. The system will normalize it for matching.
                </span>
              </span>
              <Check className="h-4 w-4 shrink-0 text-indigo-800" />
            </button>
          )}

          {!loading && hasSearchQuery && visibleResults.length === 0 && (
            <p className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-500">
              No database recommendation yet. The typed skill above can still be added.
            </p>
          )}

          {(!hasSearchQuery || visibleResults.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {(hasSearchQuery ? visibleResults : recommendedSkills).map((skill) => (
                <SuggestionPill
                  key={skillKey(skill)}
                  skill={skill}
                  onClick={() => addSkill(skill)}
                />
              ))}
            </div>
          )}

          {!hasSearchQuery && !starterLoading && recommendedSkills.length === 0 && (
            <p className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-500">
              Start typing any skill to add it or find database recommendations.
            </p>
          )}
        </div>
      )}

      <p className="mt-1.5 text-xs text-slate-500">
        Tap a recommended skill below, or type any skill and press Enter. {selected.length} of {limit} selected.
      </p>
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

function SuggestionPill({ skill, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-xs font-extrabold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900"
      title={skillName(skill)}
    >
      <Plus className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-blue-800" />
      <span className="truncate">{skillName(skill)}</span>
      {skill.is_hot && (
        <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-blue-700">
          In Demand
        </span>
      )}
    </button>
  )
}

function localStarterSkills(category, limit) {
  const source = category === 'soft'
    ? SOFT_SKILL_SUGGESTIONS
    : category === 'all'
      ? [...TECHNICAL_SKILL_SUGGESTIONS, ...SOFT_SKILL_SUGGESTIONS]
      : TECHNICAL_SKILL_SUGGESTIONS

  return source.slice(0, limit).map((name) => ({
    id: null,
    skill_id: null,
    name,
    skill_name: name,
    category: category === 'all'
      ? (SOFT_SKILL_SUGGESTIONS.includes(name) ? 'soft' : 'technical')
      : category,
    source: 'starter',
  }))
}
