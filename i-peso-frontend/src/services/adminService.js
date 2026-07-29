// i-peso-frontend/src/services/adminService.js

import api from './api'

const cleanParams = (params = {}) => Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
)

export const adminService = {
  // ── DASHBOARD ─────────────────────────────────────────────────
  getDashboardStats: async () => {
    const { data } = await api.get('/admin/dashboard/stats')
    return data
  },

  // ── SEEKERS ───────────────────────────────────────────────────
  getSeekers: async (params = {}) => {
    const { data } = await api.get('/admin/seekers', { params: cleanParams(params) })
    return data
  },

  getSeekerSummary: async () => {
    const { data } = await api.get('/admin/seekers/summary')
    return data
  },

  getSeekerDetail: async (id) => {
    const { data } = await api.get(`/admin/seekers/${id}`)
    return data
  },

  // ── EMPLOYERS ──────────────────────────────────────────────────
  getEmployers: async (params = {}) => {
    const { data } = await api.get('/admin/employers', { params: cleanParams(params) })
    return data
  },

  getEmployerSummary: async () => {
    const { data } = await api.get('/admin/employers/summary')
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

  // ── EMPLOYER REPORTS ──────────────────────────────────────────
  getEmployerReports: async (params = {}) => {
    const { data } = await api.get('/admin/employer-reports', { params: cleanParams(params) })
    return data
  },

  getEmployerReportSummary: async () => {
    const { data } = await api.get('/admin/employer-reports/summary')
    return data
  },

  getEmployerReport: async (id) => {
    const { data } = await api.get(`/admin/employer-reports/${id}`)
    return data.report
  },

  updateEmployerReport: async (id, payload) => {
    const { data } = await api.put(`/admin/employer-reports/${id}`, payload)
    return data.report
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

  // Unified review: docs are approved by default; only `rejected_documents`
  // ([{ document_id, reason }]) are rejected. The backend decides approve vs reject.
  finalizeEmployerVerification: async (id, { rejectedDocuments = [], remarks = null } = {}) => {
    const { data } = await api.post(`/admin/employers/${id}/finalize`, {
      rejected_documents: rejectedDocuments,
      remarks,
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
    const { data } = await api.get('/admin/programs', { params: cleanParams(params) })
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
    const { data } = await api.get(`/admin/programs/${programId}/applicants`, { params: cleanParams(params) })
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
    const { data } = await api.get('/admin/job-fairs', { params: cleanParams(params) })
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

  downloadJobFairSprs: async (id) => {
    const response = await api.get(`/admin/job-fairs/${id}/export-sprs`, {
      responseType: 'blob',
    })
    return response.data
  },

  publishJobFair: async (id, status = 'published') => (await api.post(`/admin/job-fairs/${id}/publish`, { status })).data,
  inviteJobFairEmployer: async (id, payload) => (await api.post(`/admin/job-fairs/${id}/invite`, payload)).data,
  updateJobFairParticipation: async (fairId, participationId, payload) => (await api.patch(`/admin/job-fairs/${fairId}/participants/${participationId}`, payload)).data,
  reviewJobFairRequirement: async (submissionId, payload) => (await api.patch(`/admin/job-fair-requirements/${submissionId}/review`, payload)).data,
  viewJobFairRequirement: async (submissionId) => (await api.get(`/admin/job-fair-requirements/${submissionId}/view`, { responseType: 'blob' })).data,
  submitJobFairProxyResults: async (fairId, payload) => (await api.post(`/admin/job-fairs/${fairId}/proxy-results`, payload)).data,
  submitJobFairProxyConfirmation: async (fairId, payload) => (await api.post(`/admin/job-fairs/${fairId}/proxy-confirmation-slip`, payload)).data,
  downloadJobFairResult: async (id) => (await api.get(`/admin/job-fair-results/${id}/roi-form-3`, { responseType: 'blob' })).data,
  downloadJobFairInvitation: async (id, params = {}) => (await api.get(`/admin/job-fairs/${id}/invitation-letter`, { params, responseType: 'blob' })).data,

  // ── REPORTS ───────────────────────────────────────────────────
  getReports: async (params = {}) => {
    const { data } = await api.get('/admin/reports', { params: cleanParams(params) })
    return data
  },

  generateReport: async (reportData) => {
    const { data } = await api.post('/admin/reports/generate', reportData)
    return data
  },

  generateSPRS: async (month, year, extras = {}) => {
    const { data } = await api.post('/admin/reports/generate-sprs', { month, year, ...extras })
    return data
  },

  exportSprsPdf: async (id) => {
    const { data } = await api.get(`/admin/reports/${id}/export-sprs-pdf`, { responseType: 'blob' })
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
    const { data } = await api.get('/admin/activity-logs', { params: cleanParams(params) })
    return data
  },
}
