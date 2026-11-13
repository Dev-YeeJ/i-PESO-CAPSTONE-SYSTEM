// i-peso-frontend/src/services/systemSettingsService.js
// System Settings — switches, deadlines and limits (Configuration → System
// Settings) and the public status the whole site checks first.

import api from './api'

/** Maintenance, registration and assistant switches. Reachable even during maintenance. */
export const publicSystemStatusService = {
  get: async () => (await api.get('/public/system-status')).data,
}

export const adminSystemSettingsService = {
  list: async () => (await api.get('/admin/system-settings')).data,
  /** values: { 'sms.enabled': false, 'placement.deadline_day': 12, … } */
  save: async (values) => (await api.put('/admin/system-settings', { values })).data,
  status: async () => (await api.get('/admin/system-settings/status')).data,
  testEmail: async () => (await api.post('/admin/system-settings/test-email')).data,
  testSms: async (phone) => (await api.post('/admin/system-settings/test-sms', { phone })).data,
  testAi: async () => (await api.post('/admin/system-settings/test-ai')).data,
}
