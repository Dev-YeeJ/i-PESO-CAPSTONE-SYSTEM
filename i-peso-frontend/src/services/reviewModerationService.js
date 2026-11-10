// i-peso-frontend/src/services/reviewModerationService.js
// PESO moderation of employer reviews and worker feedback (Constituent CRM).

import api from './api'

const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null))

export const reviewModerationService = {
  summary: async () => (await api.get('/admin/reviews/summary')).data,
  list: async (params = {}) => (await api.get('/admin/reviews', { params: clean(params) })).data,
  show: async (id) => (await api.get(`/admin/reviews/${id}`)).data,
  publish: async (id, note) => (await api.post(`/admin/reviews/${id}/publish`, { note: note || null })).data,
  hide: async (id, note) => (await api.post(`/admin/reviews/${id}/hide`, { note })).data,
  setReplyVisible: async (id, visible) => (await api.post(`/admin/reviews/${id}/reply-visibility`, { visible })).data,
  escalate: async (id, reason, note) => (await api.post(`/admin/reviews/${id}/escalate`, { reason, note: note || null })).data,
  seekerWorkerFeedback: async (seekerId) => (await api.get(`/admin/seekers/${seekerId}/worker-feedback`)).data,
  setWorkerFeedbackVisible: async (id, visible, note) => (await api.post(`/admin/worker-feedback/${id}/visibility`, { visible, note: note || null })).data,
}
