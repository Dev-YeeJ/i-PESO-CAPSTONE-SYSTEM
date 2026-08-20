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

  return parsed
}

/** Merges the AI-parsed filters (server) with the rule-based fallback, preferring server values. */
export function mergeParsedFilters(aiParsed: AiParsedJobQuery | null, rawQuery: string): Partial<JobFilters> {
  const fallback = parseRuleBasedMapQuery(rawQuery)
  if (!aiParsed) return fallback

  return {
    radiusKm: aiParsed.radius_km ?? fallback.radiusKm,
    minMatch: aiParsed.min_match ?? fallback.minMatch,
    keyword: aiParsed.keyword ?? fallback.keyword,
    locationKeyword: aiParsed.location_keyword ?? fallback.locationKeyword,
    sort: aiParsed.sort ?? fallback.sort,
    hideApplied: aiParsed.hide_applied ?? fallback.hideApplied,
    savedOnly: aiParsed.saved_only ?? fallback.savedOnly,
    jobFairOnly: aiParsed.job_fair_only ?? fallback.jobFairOnly,
    upskillRecommendedOnly: aiParsed.upskill_recommended_only ?? fallback.upskillRecommendedOnly,
    certificateMatchOnly: aiParsed.certificate_match_only ?? fallback.certificateMatchOnly,
    canApplyOnly: aiParsed.can_apply_only ?? fallback.canApplyOnly,
    maxMissingSkills: aiParsed.max_missing_skills ?? fallback.maxMissingSkills,
  }
}
