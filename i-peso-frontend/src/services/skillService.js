import apiClient from './api'

export async function searchSkills(search = '', category = 'technical', limit = 12) {
  const response = await apiClient.get('/skills', {
    params: { search, category, limit },
  })

  return response.data.data ?? []
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
