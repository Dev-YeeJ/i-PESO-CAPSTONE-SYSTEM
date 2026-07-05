import apiClient from './api'

const skillSearchCache = new Map()
const SKILL_CACHE_LIMIT = 60

export async function searchSkills(search = '', category = 'technical', limit = 12, signal = undefined) {
  const cacheKey = `${category}:${String(search).trim().toLowerCase()}:${limit}`
  if (skillSearchCache.has(cacheKey)) return skillSearchCache.get(cacheKey)

  const response = await apiClient.get('/skills', {
    params: { search, category, limit },
    signal,
  })

  const rows = response.data.data ?? []
  if (skillSearchCache.size >= SKILL_CACHE_LIMIT) {
    skillSearchCache.delete(skillSearchCache.keys().next().value)
  }
  skillSearchCache.set(cacheKey, rows)
  return rows
}

export async function getSkillRecommendations() {
  const response = await apiClient.get('/seeker/skill-recommendations')

  return response.data.data ?? {}
}

export async function getAiProfileSuggestions(context = {}) {
  const response = await apiClient.post('/seeker/ai-profile-suggestions', {
    context,
  })

  return response.data.data ?? {}
}

export async function analyzeSkillGaps(requiredSkills = []) {
  const response = await apiClient.post('/seeker/skill-gap-analysis', {
    required_skills: requiredSkills,
  })

  return response.data.data ?? {}
}

export async function getLearningResources(skill) {
  const response = await apiClient.get(`/seeker/learning-resources/${encodeURIComponent(skill)}`)

  return response.data.resources ?? {}
}
