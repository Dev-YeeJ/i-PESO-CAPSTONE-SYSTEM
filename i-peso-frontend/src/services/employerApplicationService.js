import apiClient from './api'

export const getEmployerApplications = async (params = {}) => {
  const response = await apiClient.get('/employer/applications', { params })
  return response.data
}

export const getVacancyApplications = async (vacancyId, params = {}) => {
  const response = await apiClient.get('/employer/applications', {
    params: { post_id: vacancyId, ...params }
  })
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

export const getEmployerCalendarEvents = async (params) => {
  const response = await apiClient.get('/employer/calendar/events', { params })
  return response.data
}

// Fetches the applicant's 2x2 photo as a blob — only ever call this when
// application.seeker.has_profile_image is true, mirroring seekerService's
// own getProfileImage() pattern.
export const getApplicantProfileImage = async (applicationId) => {
  const response = await apiClient.get(`/employer/applications/${applicationId}/seeker-profile-image`, {
    responseType: 'blob',
  })
  return response.data
}

export const getApplicantResume = async (applicationId) => {
  const response = await apiClient.get(`/employer/applications/${applicationId}/resume`, {
    responseType: 'blob',
  })
  return response.data
}
