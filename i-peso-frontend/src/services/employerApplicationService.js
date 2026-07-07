import apiClient from './api'

export const getEmployerApplications = async (params = {}) => {
  const response = await apiClient.get('/employer/applications', { params })
  return response.data
}

export const getEmployerApplicationDetail = async (applicationId) => {
  const response = await apiClient.get(`/employer/applications/${applicationId}`)
  return response.data
}

export const updateEmployerApplicationStatus = async (applicationId, payload) => {
  const response = await apiClient.patch(`/employer/applications/${applicationId}/status`, payload)
  return response.data
}

export const updateEmployerApplicationStatusBulk = async (payload) => {
  const response = await apiClient.patch(`/employer/applications/bulk-status`, payload)
  return response.data
}

export const generateGoogleMeetLink = async (payload) => {
  const response = await apiClient.post('/employer/calendar/generate-meet-link', payload)
  return response.data
}

export const connectGoogleCalendar = async () => {
  const response = await apiClient.get('/employer/calendar/connect')
  return response.data
}
