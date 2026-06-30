import api from './api'

const clean = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined))

export const previewEstablishmentReport = async (role, filters = {}) => {
  const response = await api.get(`/${role}/reports/establishment-report/preview`, { params: clean(filters) })
  return response.data
}

export const exportEstablishmentReport = async (role, filters = {}, format = 'pdf') => {
  const response = await api.post(`/${role}/reports/establishment-report/export`, {
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
