import api from './api'

const clean = (params = {}) => Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
)

export const smsService = {
  getLogs: async (params = {}) => {
    const { data } = await api.get('/admin/sms-notifications', { params: clean(params) })
    return data
  },
}
