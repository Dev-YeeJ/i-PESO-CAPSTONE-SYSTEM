import apiClient from './api'

export const getSeekerProfile = async () => {
  const response = await apiClient.get('/seeker/profile')
  return response.data.user
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

export const generateSmartResume = async () => {
  const response = await apiClient.post('/seeker/resume/generate', null, {
    responseType: 'blob',
  })
  return response
}
