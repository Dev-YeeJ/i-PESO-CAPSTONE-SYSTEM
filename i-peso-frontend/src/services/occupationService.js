import apiClient from './api'

export async function searchOccupations(search = '', limit = 20) {
  const response = await apiClient.get('/occupations', {
    params: { search, limit },
  })

  return response.data.data ?? []
}
