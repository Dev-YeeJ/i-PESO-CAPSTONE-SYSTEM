import api from './api'

const clean = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined))

// Establishment Report = post-event job-fair results only (RO1-JF Form 3),
// browsed here across every fair. Per-report PDF download still uses the
// existing job-fair-results/roi-form-3 endpoint (jobFairService/adminService).
export const previewEstablishmentReport = async (role, filters = {}) => {
  const response = await api.get(`/${role}/reports/establishment-report/preview`, { params: clean(filters) })
  return response.data
}
