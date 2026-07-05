import apiClient from './api'

/**
 * Search the occupation catalog.
 * mode: 'catalog' | 'general'
 * signal: AbortController signal for request cancellation.
 */
export async function searchOccupations(search = '', limit = 20, mode = 'catalog', signal = undefined) {
  const response = await apiClient.get('/occupations', {
    params: { search, limit, mode },
    signal,
  })
  return response.data.data ?? []
}

/**
 * Legacy AI occupation classification endpoint.
 * @deprecated Use classifyOccupation() instead.
 */
export async function classifyOccupationTitle(title = '', limit = 5) {
  const response = await apiClient.post('/seeker/ai-occupation-classification', {
    title,
    limit,
  })
  return response.data.data ?? []
}

/**
 * Unified 3-layer occupation classification endpoint.
 * Runs: Catalog → Local Dictionary → AI fallback.
 * signal: AbortController signal for request cancellation.
 */
export async function classifyOccupation(title, limit = 5, signal = undefined) {
  const response = await apiClient.post(
    '/seeker/classify-occupation',
    { title, limit },
    { signal },
  )
  return response.data
}
