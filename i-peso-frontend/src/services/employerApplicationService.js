import apiClient from './api'

export const getEmployerApplications = async (params = {}) => {
  const response = await apiClient.get('/employer/applications', { params })
  return response.data
}

export const updateEmployerApplicationStatus = async (applicationId, payload) => {
  const response = await apiClient.patch(`/employer/applications/${applicationId}/status`, payload)
  return response.data
}
