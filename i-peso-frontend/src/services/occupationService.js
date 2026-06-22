import apiClient from './api'

export async function searchOccupations(search = '', limit = 20, mode = 'catalog') {
  const response = await apiClient.get('/occupations', {
    params: { search, limit, mode },
  })

  return response.data.data ?? []
}

export async function classifyOccupationTitle(title = '', limit = 5) {
  const response = await apiClient.post('/seeker/ai-occupation-classification', {
    title,
    limit,
  })

  return response.data.data ?? []
}
