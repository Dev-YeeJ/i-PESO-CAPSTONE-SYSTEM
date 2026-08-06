import api from './api'

const clean = (params = {}) => Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
)

export const smsService = {
  getLogs: async (params = {}) => {
    const { data } = await api.get('/admin/sms-notifications', { params: clean(params) })
    return data
  },

  // Re-sends a failed message. The retry is recorded as its own log entry.
  retry: async (id) => {
    const { data } = await api.post(`/admin/sms-notifications/${id}/retry`)
    return data
  },
}
