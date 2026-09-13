import api from './api'

const clean = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined))

// Read-only cross-reference over every application an employer's vacancies
// received (online + job fair sourced) — NOT the official monthly Placement
// Report. Lives under Placement Report; formerly mislabeled "Establishment
// Report" before it was split out (see establishmentReportService.js).
export const previewHiringActivityReport = async (role, filters = {}) => {
  const response = await api.get(`/${role}/reports/hiring-activity/preview`, { params: clean(filters) })
  return response.data
}

export const exportHiringActivityReport = async (role, filters = {}, format = 'pdf') => {
  const response = await api.post(`/${role}/reports/hiring-activity/export`, {
    ...clean(filters),
    format,
  }, { responseType: 'blob' })

  return response.data
}

export const downloadReportBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
