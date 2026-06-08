// i-peso-frontend/src/services/adminService.js

import api from './api'

export const adminService = {
  // ── DASHBOARD ─────────────────────────────────────────────────
  getDashboardStats: async () => {
    const { data } = await api.get('/admin/dashboard/stats')
    return data
  },

  // ── SEEKERS ───────────────────────────────────────────────────
  getSeekers: async (params = {}) => {
    const { data } = await api.get('/admin/seekers', { params })
    return data
  },

  getSeekerDetail: async (id) => {
    const { data } = await api.get(`/admin/seekers/${id}`)
    return data
  },

  verifySeekerProfile: async (id, action, remarks = null) => {
    const { data } = await api.post(`/admin/seekers/${id}/verify`, {
      action,
      remarks,
    })
    return data
  },

  getVerificationQueue: async (params = {}) => {
    const { data } = await api.get('/admin/seekers/verification-queue', { params })
    return data
  },

  // ── EMPLOYERS ──────────────────────────────────────────────────
  getEmployers: async (params = {}) => {
    const { data } = await api.get('/admin/employers', { params })
    return data
  },

  getPendingEmployers: async () => {
    const { data } = await api.get('/admin/employers/pending')
    return data
  },

  getEmployerDetail: async (id) => {
    const { data } = await api.get(`/admin/employers/${id}`)
    return data
  },

  getEmployerReview: async (id) => {
    const { data } = await api.get(`/admin/employers/${id}/review`)
    return data
  },

  approveEmployer: async (id, remarks = null) => {
    const { data } = await api.post(`/admin/employers/${id}/approve`, { remarks })
    return data
  },

  rejectEmployer: async (id, rejectionReason) => {
    const { data } = await api.post(`/admin/employers/${id}/reject`, {
      rejection_reason: rejectionReason,
    })
    return data
  },

  reviewEmployerDocument: async (id, verificationStatus, adminNotes = null) => {
    const { data } = await api.post(`/admin/documents/${id}/review`, {
      verification_status: verificationStatus,
      admin_notes: adminNotes,
    })
    return data
  },

  getEmployerDocument: async (id) => {
    const { data } = await api.get(`/admin/documents/${id}/view`, {
      responseType: 'blob',
    })
    return data
  },

  downloadEmployerDocument: async (id, reason) => {
    const response = await api.post(
      `/admin/documents/${id}/download`,
      { reason },
      { responseType: 'blob' },
    )
    return response
  },

  // ── PROGRAMS ───────────────────────────────────────────────────
  getProgramsList: async (params = {}) => {
    const { data } = await api.get('/admin/programs', { params })
    return data
  },

  createProgram: async (programData) => {
    const { data } = await api.post('/admin/programs', programData)
    return data
  },

  updateProgram: async (id, programData) => {
    const { data } = await api.put(`/admin/programs/${id}`, programData)
    return data
  },

  getProgramDetail: async (id) => {
    const { data } = await api.get(`/admin/programs/${id}`)
    return data
  },

  deleteProgram: async (id) => {
    const { data } = await api.delete(`/admin/programs/${id}`)
    return data
  },

  getProgramApplicants: async (programId, params = {}) => {
    const { data } = await api.get(`/admin/programs/${programId}/applicants`, { params })
    return data
  },

  reviewProgramApplicant: async (programId, applicantId, action, remarks = null) => {
    const { data } = await api.post(
      `/admin/programs/${programId}/applicants/${applicantId}/review`,
      { action, remarks }
    )
    return data
  },

  bulkReviewApplicants: async (programId, ids, action, remarks = null) => {
    const { data } = await api.post(
      `/admin/programs/${programId}/applicants/bulk-review`,
      { ids, action, remarks }
    )
    return data
  },

  // ── JOB FAIRS ──────────────────────────────────────────────────
  getJobFairsList: async (params = {}) => {
    const { data } = await api.get('/admin/job-fairs', { params })
    return data
  },

  createJobFair: async (fairData) => {
    const { data } = await api.post('/admin/job-fairs', fairData)
    return data
  },

  updateJobFair: async (id, fairData) => {
    const { data } = await api.put(`/admin/job-fairs/${id}`, fairData)
    return data
  },

  getJobFairDetail: async (id) => {
    const { data } = await api.get(`/admin/job-fairs/${id}`)
    return data
  },

  deleteJobFair: async (id) => {
    const { data } = await api.delete(`/admin/job-fairs/${id}`)
    return data
  },

  // ── REPORTS ───────────────────────────────────────────────────
  getReports: async (params = {}) => {
    const { data } = await api.get('/admin/reports', { params })
    return data
  },

  generateReport: async (reportData) => {
    const { data } = await api.post('/admin/reports/generate', reportData)
    return data
  },

  getReportDetail: async (id) => {
    const { data } = await api.get(`/admin/reports/${id}`)
    return data
  },

  deleteReport: async (id) => {
    const { data } = await api.delete(`/admin/reports/${id}`)
    return data
  },

  // ── ACTIVITY LOGS ──────────────────────────────────────────────
  getActivityLogs: async (params = {}) => {
    const { data } = await api.get('/admin/activity-logs', { params })
    return data
  },
}
