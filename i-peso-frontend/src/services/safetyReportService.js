// i-peso-frontend/src/services/safetyReportService.js
// Report & Safety Management — job seekers reporting employers, employers
// reporting job seekers, and PESO's case workspace.

import api from './api'

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''))

/** `role` is 'seeker' or 'employer' — the API prefix of the person filing. */
export const safetyReportService = {
  options: async (role) => {
    const { data } = await api.get(`/${role}/safety-reports/options`)
    return data
  },

  list: async (role, params = {}) => {
    const { data } = await api.get(`/${role}/safety-reports`, { params: clean(params) })
    return data
  },

  get: async (role, id) => {
    const { data } = await api.get(`/${role}/safety-reports/${id}`)
    return data.report
  },

  /** payload: { subject_id, post_id, application_id, category, description, incident_date, acknowledge, attachments: File[] } */
  submit: async (role, payload) => {
    const form = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'attachments') {
        (value ?? []).forEach((file) => form.append('attachments[]', file))
      } else if (value !== undefined && value !== null && value !== '') {
        form.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : value)
      }
    })
    const { data } = await api.post(`/${role}/safety-reports`, form)
    return data
  },

  addDetails: async (role, id, { details, attachments = [] }) => {
    const form = new FormData()
    if (details) form.append('details', details)
    attachments.forEach((file) => form.append('attachments[]', file))
    const { data } = await api.post(`/${role}/safety-reports/${id}/details`, form)
    return data
  },
}

export const adminSafetyReportService = {
  options: async () => {
    const { data } = await api.get('/admin/safety-reports/options')
    return data
  },

  summary: async () => {
    const { data } = await api.get('/admin/safety-reports/summary')
    return data
  },

  list: async (params = {}) => {
    const { data } = await api.get('/admin/safety-reports', { params: clean(params) })
    return data
  },

  get: async (id) => {
    const { data } = await api.get(`/admin/safety-reports/${id}`)
    return data.report
  },

  update: async (id, payload) => {
    const { data } = await api.patch(`/admin/safety-reports/${id}`, payload)
    return data
  },

  addNote: async (id, note) => {
    const { data } = await api.post(`/admin/safety-reports/${id}/notes`, { note })
    return data
  },

  recordAction: async (id, payload) => {
    const { data } = await api.post(`/admin/safety-reports/${id}/actions`, clean(payload))
    return data
  },

  /** Evidence is private: fetched with the staff session, opened as a blob. */
  openAttachment: async (reportId, attachmentId) => {
    const response = await api.get(`/admin/safety-reports/${reportId}/attachments/${attachmentId}`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    window.open(url, '_blank', 'noopener')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },

  subject: async (type, id) => {
    const { data } = await api.get(`/admin/safety-reports/subjects/${type}/${id}`)
    return data
  },
}

/** Shared status → Badge variant mapping for every Report & Safety screen. */
export const safetyStatusBadge = (status) => ({
  submitted: 'pending',
  under_review: 'review',
  action_required: 'warning',
  resolved: 'verified',
  dismissed: 'neutral',
}[status] ?? 'neutral')

export const safetyPriorityClass = (priority) => ({
  urgent: 'border-red-300 bg-red-100 text-red-800',
  high: 'border-orange-200 bg-orange-50 text-orange-800',
  normal: 'border-slate-200 bg-slate-50 text-slate-700',
  low: 'border-slate-200 bg-white text-slate-500',
}[priority] ?? 'border-slate-200 bg-slate-50 text-slate-700')
