import api from './api'

const clean = (params = {}) => Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
)

export const analyticsService = {
  getSnapshot: async (filters = {}) => {
    const { data } = await api.get('/admin/analytics', { params: clean(filters) })
    return data
  },
  getOptions: async () => {
    const { data } = await api.get('/admin/analytics/options')
    return data
  },
}
