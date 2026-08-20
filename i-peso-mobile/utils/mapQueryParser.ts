import type { AiParsedJobQuery, JobFilters } from '@/services/seekerService'

const JOB_TYPE_MAP: Record<string, string> = {
  permanent: 'Permanent/Regular',
  'permanent/regular': 'Permanent/Regular',
  'full-time': 'Permanent/Regular',
  'full time': 'Permanent/Regular',
  contractual: 'Contractual',
  contract: 'Contractual',
  'part-time': 'Part-Time',
  'part time': 'Part-Time',
  freelance: 'Freelance',
}

const ALLOWED_RADII = [5, 10, 15, 25, 50]
const ALLOWED_MATCHES = [0, 50, 70, 80]
const ALLOWED_SORTS: readonly NonNullable<JobFilters['sort']>[] = ['distance', 'match', 'newest', 'salary']
const BOOLEAN_FILTER_KEYS = [
  'hideApplied', 'savedOnly', 'jobFairOnly', 'upskillRecommendedOnly', 'certificateMatchOnly', 'canApplyOnly',
] as const

function nearestAllowed(value: number, allowed: number[]) {
  return allowed.reduce((best, candidate) => (Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best), allowed[0])
}

function asNumber(value: unknown): number | null {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/**
 * Mirrors i-peso-frontend's validateMapFilters — clamps radius/min-match to the UI's
 * preset options, checks sort/job-type against their enums, and truncates free-text
 * fields to the backend's max lengths. Applied to BOTH the AI response and the regex
 * fallback's output, same as web, since neither source is trusted as-is.
 */
function validateMapFilters(input: Partial<Record<keyof JobFilters, unknown>>): Partial<JobFilters> {
  const filters: Partial<JobFilters> = {}

  const radius = asNumber(input.radiusKm)
  if (radius !== null) filters.radiusKm = nearestAllowed(radius, ALLOWED_RADII)

  const minMatch = asNumber(input.minMatch)
  if (minMatch !== null) filters.minMatch = nearestAllowed(minMatch, ALLOWED_MATCHES)

  const sort = String(input.sort ?? '').toLowerCase()
  if ((ALLOWED_SORTS as readonly string[]).includes(sort)) filters.sort = sort as JobFilters['sort']

  const rawJobType = String(input.jobType ?? '').trim()
  const jobType = JOB_TYPE_MAP[rawJobType.toLowerCase()] ?? (Object.values(JOB_TYPE_MAP).includes(rawJobType) ? rawJobType : '')
  if (jobType) filters.jobType = jobType

  for (const key of BOOLEAN_FILTER_KEYS) {
    if (typeof input[key] === 'boolean') filters[key] = input[key] as boolean
  }

  const maxMissingSkills = asNumber(input.maxMissingSkills)
  if (maxMissingSkills !== null) filters.maxMissingSkills = Math.max(0, Math.min(50, Math.round(maxMissingSkills)))

  const keyword = String(input.keyword ?? '').trim().slice(0, 100)
  if (keyword) filters.keyword = keyword

  const locationKeyword = String(input.locationKeyword ?? '').trim().slice(0, 100)
  if (locationKeyword) filters.locationKeyword = locationKeyword

  return filters
}

/**
 * Client-side fallback for when POST /seeker/nearby-jobs/ai-parse is unavailable (503) or
 * returns nothing usable. Mirrors i-peso-frontend's parseRuleBasedMapQuery so both platforms
 * degrade to the same keyword-rule behavior when Gemini is down.
 */
export function parseRuleBasedMapQuery(rawQuery: string): Partial<JobFilters> {
  const query = rawQuery.trim()
  const lower = query.toLowerCase()
  const parsed: Partial<JobFilters> = {}

  const radiusMatch = lower.match(/(?:within|inside|under)\s*(\d{1,3})\s*(?:km|kilometers?)/)
  const matchMatch = lower.match(/(\d{1,3})\s*%\s*(?:match|and above|\+)?/)

  if (radiusMatch) parsed.radiusKm = Number(radiusMatch[1])
  if (matchMatch) parsed.minMatch = Number(matchMatch[1])
  else if (/high(?:ly)?[-\s]?match|matching my skills|top match/.test(lower)) parsed.minMatch = 70

  if (/nearest|near me|closest/.test(lower)) parsed.sort = 'distance'
  if (/newest|latest|recent/.test(lower)) parsed.sort = 'newest'
  if (/high(?:est)? salary|best pay|highest pay/.test(lower)) parsed.sort = 'salary'
  if (/\bsaved\b/.test(lower)) parsed.savedOnly = true
  if (/hide\s+(?:jobs?\s+)?(?:i\s+)?applied|not\s+applied/.test(lower)) parsed.hideApplied = true
  if (/job\s*fairs?|upcoming\s+fair/.test(lower)) parsed.jobFairOnly = true
  if (/training|upskill|train\s+for/.test(lower)) parsed.upskillRecommendedOnly = true
  if (/certificates?|certifications?/.test(lower)) parsed.certificateMatchOnly = true
  if (/apply\s+to\s+now|can\s+apply|ready\s+to\s+apply/.test(lower)) parsed.canApplyOnly = true

  const missingSkillMatch = lower.match(/(?:only\s+)?(\d{1,2})\s+missing\s+skills?/)
  if (missingSkillMatch) parsed.maxMissingSkills = Number(missingSkillMatch[1])

  const type = Object.keys(JOB_TYPE_MAP).find((candidate) => lower.includes(candidate))
  if (type) parsed.jobType = JOB_TYPE_MAP[type]

  const locationMatch = query.match(/\b(?:jobs?\s+)?(?:in|near)\s+([a-z][a-z\s.-]{1,40})$/i)
  if (locationMatch) parsed.locationKeyword = locationMatch[1].trim()

  const cleaned = query
    .replace(/\b(show|find|give|me|please|jobs?|vacancies|positions?|near me|matching my skills)\b/gi, ' ')
    .replace(/\b(within|inside|under)\s*\d{1,3}\s*(km|kilometers?)\b/gi, ' ')
    .replace(/\b\d{1,3}\s*%\s*(match|and above|\+)?\b/gi, ' ')
    .replace(/\b(high(?:ly)?[-\s]?match(?:ed)?|nearest|closest|newest|latest|recent|high(?:est)? salary|best pay|highest pay|and above)\b/gi, ' ')
    .replace(/\b(saved|hide applied|job fairs?|upcoming fair|training|upskill|certificates?|certifications?|apply to now|can apply|ready to apply|with only \d+ missing skills?)\b/gi, ' ')
    .replace(/\b(i|my|that|with|available|at|to|now|already|recommendations?|match)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (cleaned.length >= 2) parsed.keyword = cleaned

  return validateMapFilters(parsed)
}

/** Merges the AI-parsed filters (server) with the rule-based fallback, preferring server values. */
export function mergeParsedFilters(aiParsed: AiParsedJobQuery | null, rawQuery: string): Partial<JobFilters> {
  const fallback = parseRuleBasedMapQuery(rawQuery)
  if (!aiParsed) return fallback

  // The AI response is validated the same way as the regex fallback — it's model
  // output, not a trusted structured value, so it gets the same clamping/enum checks.
  const validatedAi = validateMapFilters({
    radiusKm: aiParsed.radius_km,
    minMatch: aiParsed.min_match,
    keyword: aiParsed.keyword,
    locationKeyword: aiParsed.location_keyword,
    sort: aiParsed.sort,
    hideApplied: aiParsed.hide_applied,
    savedOnly: aiParsed.saved_only,
    jobFairOnly: aiParsed.job_fair_only,
    upskillRecommendedOnly: aiParsed.upskill_recommended_only,
    certificateMatchOnly: aiParsed.certificate_match_only,
    canApplyOnly: aiParsed.can_apply_only,
    maxMissingSkills: aiParsed.max_missing_skills,
  })

  return {
    radiusKm: validatedAi.radiusKm ?? fallback.radiusKm,
    minMatch: validatedAi.minMatch ?? fallback.minMatch,
    keyword: validatedAi.keyword ?? fallback.keyword,
    locationKeyword: validatedAi.locationKeyword ?? fallback.locationKeyword,
    sort: validatedAi.sort ?? fallback.sort,
    hideApplied: validatedAi.hideApplied ?? fallback.hideApplied,
    savedOnly: validatedAi.savedOnly ?? fallback.savedOnly,
    jobFairOnly: validatedAi.jobFairOnly ?? fallback.jobFairOnly,
    upskillRecommendedOnly: validatedAi.upskillRecommendedOnly ?? fallback.upskillRecommendedOnly,
    certificateMatchOnly: validatedAi.certificateMatchOnly ?? fallback.certificateMatchOnly,
    canApplyOnly: validatedAi.canApplyOnly ?? fallback.canApplyOnly,
    maxMissingSkills: validatedAi.maxMissingSkills ?? fallback.maxMissingSkills,
  }
}
