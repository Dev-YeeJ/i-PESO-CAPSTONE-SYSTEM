import api from './api'

// ── Employer: upload -> map -> preview -> submit ──────────────────────────

export const listEmployerPlacementReports = async () => {
  const response = await api.get('/employer/placement-reports')
  return response.data
}

export const uploadPlacementReport = async (file, coverage = {}) => {
  const formData = new FormData()
  formData.append('file', file)
  if (coverage.month) formData.append('coverage_month', coverage.month)
  if (coverage.year) formData.append('coverage_year', coverage.year)

  const response = await api.post('/employer/placement-reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const getEmployerPlacementReport = async (id) => {
  const response = await api.get(`/employer/placement-reports/${id}`)
  return response.data
}

export const previewPlacementMapping = async (id, mapping) => {
  const response = await api.post(`/employer/placement-reports/${id}/preview`, { mapping })
  return response.data
}

export const submitPlacementReport = async (id, remarks = '') => {
  const response = await api.post(`/employer/placement-reports/${id}/submit`, {
    employer_remarks: remarks,
  })
  return response.data
}

export const deletePlacementReport = async (id) => {
  const response = await api.delete(`/employer/placement-reports/${id}`)
  return response.data
}

// ── Admin: review -> approve/reject -> export ─────────────────────────────

export const listAdminPlacementReports = async (params = {}) => {
  const response = await api.get('/admin/placement-reports', { params })
  return response.data
}

export const getAdminPlacementReport = async (id) => {
  const response = await api.get(`/admin/placement-reports/${id}`)
  return response.data
}

export const approvePlacementReport = async (id, remarks = '') => {
  const response = await api.post(`/admin/placement-reports/${id}/approve`, {
    review_remarks: remarks,
  })
  return response.data
}

export const rejectPlacementReport = async (id, remarks) => {
  const response = await api.post(`/admin/placement-reports/${id}/reject`, {
    review_remarks: remarks,
  })
  return response.data
}

export const exportPlacementReport = async (id) => {
  const response = await api.get(`/admin/placement-reports/${id}/export`, { responseType: 'blob' })
  return response.data
}

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
