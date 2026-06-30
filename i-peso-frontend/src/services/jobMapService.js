import apiClient from './api'

const ALLOWED_RADII = [5, 10, 15, 25, 50]
const ALLOWED_MATCHES = [0, 50, 70, 80]
const ALLOWED_SORTS = ['distance', 'match', 'newest', 'salary']
const BOOLEAN_FILTERS = ['hide_applied', 'saved_only', 'job_fair_only', 'upskill_recommended_only', 'certificate_match_only', 'can_apply_only']
const JOB_TYPE_MAP = {
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

const asNumber = (value, fallback = null) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null)

export const normalizeMapJob = (job = {}) => {
  const postId = Number(firstValue(job.post_id, job.vacancy_id, job.id))
  const matchPercentage = asNumber(firstValue(job.match?.percentage, job.match_percentage), 0)

  return {
    ...job,
    post_id: postId,
    vacancy_id: postId,
    employer_name: firstValue(job.employer_name, job.employer?.company_name, 'Employer not specified'),
    full_work_address: firstValue(job.full_work_address, job.location, job.specific_address, 'Location not specified'),
    employment_type: firstValue(job.employment_type, job.job_type, ''),
    job_type: firstValue(job.job_type, job.employment_type, ''),
    latitude: asNumber(job.latitude),
    longitude: asNumber(job.longitude),
    distance_km: asNumber(job.distance_km),
    salary_min: asNumber(job.salary_min),
    salary_max: asNumber(job.salary_max),
    match_percentage: matchPercentage,
    match: { ...(job.match || {}), percentage: matchPercentage },
    missing_skills: firstValue(job.missing_skills, job.match?.missing_critical_skills, []),
    has_applied: Boolean(job.has_applied),
    is_saved: Boolean(job.is_saved),
    application_status: job.application_status || null,
    has_coordinates: Boolean(job.has_coordinates ?? (job.latitude !== null && job.longitude !== null)),
    match_breakdown: job.match_breakdown || { skills: 0, occupation: 0, experience: 0, education: 0 },
    matched_skills: job.matched_skills || [],
    job_fair: job.job_fair || { is_available_at_job_fair: false, has_rsvp: false },
    upskill: job.upskill || { recommended: false, programs: [], missing_skills_count: 0 },
    certificate_match: job.certificate_match || { matched: false, matched_count: 0, required_count: 0 },
    actions: job.actions || { can_apply: !job.has_applied, can_save: true, can_rsvp_job_fair: false, can_download_resume: false },
  }
}

const compactParams = (filters) => Object.fromEntries(
  Object.entries(filters)
    .filter(([, value]) => value !== '' && value !== null && value !== undefined)
    .map(([key, value]) => [key, typeof value === 'boolean' ? Number(value) : value]),
)

export const getMapJobs = async (filters = {}) => {
  const response = await apiClient.get('/seeker/job-map', {
    params: compactParams(filters),
  })

  const jobsById = new Map()
  for (const rawJob of response.data.jobs || []) {
    const job = normalizeMapJob(rawJob)
    if (Number.isFinite(job.post_id)) jobsById.set(job.post_id, job)
  }

  const seekerLocation = response.data.seeker_location || {
    latitude: response.data.origin?.latitude ?? null,
    longitude: response.data.origin?.longitude ?? null,
    full_address: '',
  }

  return {
    ...response.data,
    seeker_location: {
      ...seekerLocation,
      latitude: asNumber(seekerLocation.latitude),
      longitude: asNumber(seekerLocation.longitude),
    },
    jobs: [...jobsById.values()],
    seeker: response.data.seeker || null,
    summary: response.data.summary || null,
  }
}

const nearestAllowed = (value, allowed) => allowed.reduce(
  (best, candidate) => Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best,
  allowed[0],
)

export const validateMapFilters = (input = {}) => {
  const filters = {}
  const radius = asNumber(firstValue(input.radius_km, input.radius))
  const minMatch = asNumber(firstValue(input.min_match, input.match_percentage))
  const sort = String(firstValue(input.sort, input.sort_by, '')).toLowerCase()
  const rawJobType = String(firstValue(input.job_type, input.employment_type, '')).trim()
  const jobType = JOB_TYPE_MAP[rawJobType.toLowerCase()] || (Object.values(JOB_TYPE_MAP).includes(rawJobType) ? rawJobType : '')

  if (radius !== null) filters.radius_km = nearestAllowed(radius, ALLOWED_RADII)
  if (minMatch !== null) filters.min_match = nearestAllowed(minMatch, ALLOWED_MATCHES)
  if (ALLOWED_SORTS.includes(sort)) filters.sort = sort
  if (jobType) filters.job_type = jobType

  for (const key of BOOLEAN_FILTERS) {
    if (typeof input[key] === 'boolean') filters[key] = input[key]
  }

  const maxMissingSkills = asNumber(input.max_missing_skills)
  if (maxMissingSkills !== null) filters.max_missing_skills = Math.max(0, Math.min(50, Math.round(maxMissingSkills)))

  const keyword = String(firstValue(input.keyword, input.location, '')).trim().slice(0, 100)
  if (keyword) filters.keyword = keyword
  const locationKeyword = String(input.location_keyword || '').trim().slice(0, 100)
  if (locationKeyword) filters.location_keyword = locationKeyword

  return filters
}

export const parseRuleBasedMapQuery = (rawQuery) => {
  const query = rawQuery.trim()
  const lower = query.toLowerCase()
  const parsed = {}

  const radiusMatch = lower.match(/(?:within|inside|under)\s*(\d{1,3})\s*(?:km|kilometers?)/)
  const matchMatch = lower.match(/(\d{1,3})\s*%\s*(?:match|and above|\+)?/)

  if (radiusMatch) parsed.radius_km = Number(radiusMatch[1])
  if (matchMatch) parsed.min_match = Number(matchMatch[1])
  else if (/high(?:ly)?[-\s]?match|matching my skills|top match/.test(lower)) parsed.min_match = 70

  if (/nearest|near me|closest/.test(lower)) parsed.sort = 'distance'
  if (/newest|latest|recent/.test(lower)) parsed.sort = 'newest'
  if (/high(?:est)? salary|best pay|highest pay/.test(lower)) parsed.sort = 'salary'
  if (/\bsaved\b/.test(lower)) parsed.saved_only = true
  if (/hide\s+(?:jobs?\s+)?(?:i\s+)?applied|not\s+applied/.test(lower)) parsed.hide_applied = true
  if (/job\s*fairs?|upcoming\s+fair/.test(lower)) parsed.job_fair_only = true
  if (/training|upskill|train\s+for/.test(lower)) parsed.upskill_recommended_only = true
  if (/certificates?|certifications?/.test(lower)) parsed.certificate_match_only = true
  if (/apply\s+to\s+now|can\s+apply|ready\s+to\s+apply/.test(lower)) parsed.can_apply_only = true

  const missingSkillMatch = lower.match(/(?:only\s+)?(\d{1,2})\s+missing\s+skills?/)
  if (missingSkillMatch) parsed.max_missing_skills = Number(missingSkillMatch[1])

  const type = Object.keys(JOB_TYPE_MAP).find((candidate) => lower.includes(candidate))
  if (type) parsed.job_type = JOB_TYPE_MAP[type]

  const locationMatch = query.match(/\b(?:jobs?\s+)?(?:in|near)\s+([a-z][a-z\s.-]{1,40})$/i)
  if (locationMatch) parsed.location_keyword = locationMatch[1].trim()

  if (!parsed.keyword) {
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
  }

  return validateMapFilters(parsed)
}

export const parseMapQueryAI = async (query) => {
  const fallback = parseRuleBasedMapQuery(query)

  try {
    const response = await apiClient.post('/seeker/nearby-jobs/ai-parse', { query })
    const validated = validateMapFilters(response.data.data)
    return Object.keys(validated).length > 0 ? validated : fallback
  } catch {
    return fallback
  }
}
