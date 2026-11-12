// i-peso-frontend/src/services/announcementService.js
// PESO announcements — admin workspace, signed-in readers (job seekers and
// employers share one API), and the public landing page.
// Plan: docs/announcement-module-plan.md

import api from './api'

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''))

/** Admin form → multipart body. Laravel can't read multipart PUT, so updates spoof the method. */
const toFormData = (values, { method } = {}) => {
  const form = new FormData()
  if (method) form.append('_method', method)
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (key === 'attachment') {
      if (value instanceof File) form.append('attachment', value)
      return
    }
    if (typeof value === 'boolean') {
      form.append(key, value ? '1' : '0')
      return
    }
    form.append(key, value)
  })
  return form
}

/** datetime-local input value ("2026-11-20T08:00") → ISO string in the viewer's timezone. */
export const localInputToIso = (value) => (value ? new Date(value).toISOString() : '')

/** ISO string → datetime-local input value. */
export const isoToLocalInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const adminAnnouncementService = {
  options: async () => (await api.get('/admin/announcements/options')).data,

  list: async (params = {}) => (await api.get('/admin/announcements', { params: clean(params) })).data,

  get: async (id) => (await api.get(`/admin/announcements/${id}`)).data.announcement,

  /** intent: 'draft' | 'publish' */
  create: async (values, intent = 'draft') => (await api.post('/admin/announcements', toFormData({ ...values, intent }))).data,

  /** intent: 'save' | 'publish' */
  update: async (id, values, intent = 'save') =>
    (await api.post(`/admin/announcements/${id}`, toFormData({ ...values, intent }, { method: 'PUT' }))).data,

  action: async (id, action) => (await api.post(`/admin/announcements/${id}/${action}`)).data,

  remove: async (id) => (await api.delete(`/admin/announcements/${id}`)).data,

  attachment: async (id) => (await api.get(`/admin/announcements/${id}/attachment`, { responseType: 'blob' })).data,
}

export const announcementService = {
  list: async (params = {}) => (await api.get('/announcements', { params: clean(params) })).data,

  banner: async () => (await api.get('/announcements/banner')).data,

  unreadCount: async () => (await api.get('/announcements/unread-count')).data,

  /** Opening marks it read. */
  get: async (id) => (await api.get(`/announcements/${id}`)).data,

  dismiss: async (id) => (await api.post(`/announcements/${id}/dismiss`)).data,

  readAll: async () => (await api.post('/announcements/read-all')).data,

  attachment: async (id) => (await api.get(`/announcements/${id}/attachment`, { responseType: 'blob' })).data,
}

export const publicAnnouncementService = {
  list: async (limit = 3) => (await api.get('/public/announcements', { params: { limit } })).data.data ?? [],

  attachmentUrl: (id) => `${api.defaults.baseURL}/public/announcements/${id}/attachment`,
}
