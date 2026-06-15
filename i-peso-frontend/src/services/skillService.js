import apiClient from './api'

export async function searchSkills(search = '', category = 'technical', limit = 12) {
  const response = await apiClient.get('/skills', {
    params: { search, category, limit },
  })

  return response.data.data ?? []
}
