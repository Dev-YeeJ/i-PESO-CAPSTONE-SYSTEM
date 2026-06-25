import apiClient from './api'

export const getSeekerProfile = async () => {
  const response = await apiClient.get('/seeker/profile')
  return response.data.user
}

export const getSeekerAnalytics = async () => {
  const response = await apiClient.get('/seeker/analytics')
  return response.data.analytics
}

export const getNearbyJobs = async ({ radiusKm = 15, limit = 20 } = {}) => {
  const response = await apiClient.get('/seeker/nearby-jobs', {
    params: {
      radius_km: radiusKm,
      limit,
    },
  })

  return response.data
}

export const getSeekerApplications = async () => {
  const response = await apiClient.get('/seeker/applications')
  return response.data
}

export const saveSeekerProfileStep = async (step, payload) => {
  const response = await apiClient.post(`/seeker/step-${step}`, payload)
  return response.data
}

export const applyToJob = async (postId) => {
  const response = await apiClient.post(`/seeker/jobs/${postId}/apply`)
  return response.data
}

export const uploadCertificate = async (formData) => {
  const response = await apiClient.post('/seeker/certificates', formData)
  return response.data
}

export const getCertificateFile = async (id) => {
  const response = await apiClient.get(`/seeker/certificates/${id}/view`, {
    responseType: 'blob',
  })
  return response.data
}

export const deleteCertificate = async (id) => {
  const response = await apiClient.delete(`/seeker/certificates/${id}`)
  return response.data
}

export const generateSmartResume = async (payload = {}) => {
  try {
    return await apiClient.post('/seeker/resume/generate', payload, {
      responseType: 'blob',
    })
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text())
      } catch {
        // Preserve the original response when the server did not return JSON.
      }
    }
    throw error
  }
}

export const uploadProfileImage = async (formData) => {
  const response = await apiClient.post('/seeker/profile-image', formData)
  return response.data
}

export const getProfileImage = async () => {
  const response = await apiClient.get('/seeker/profile-image', {
    responseType: 'blob',
  })
  return response.data
}

export const deleteProfileImage = async () => {
  const response = await apiClient.delete('/seeker/profile-image')
  return response.data
}
