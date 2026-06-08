import apiClient from './api'

export const getProfile = async () => {
  const response = await apiClient.get('/employer/profile')
  return response.data
}

export const saveCompanyProfile = async (formData) => {
  const response = await apiClient.post('/employer/register/step-2', formData)
  return response.data
}

export const uploadDocument = async (documentType, file) => {
  const formData = new FormData()
  formData.append('document_type', documentType)
  formData.append('document_file', file)

  const response = await apiClient.post('/employer/register/step-3', formData)
  return response.data
}

export const getRequiredDocuments = async () => {
  const response = await apiClient.get('/employer/required-documents')
  return response.data
}

export const saveRepresentative = async (formData) => {
  const response = await apiClient.post('/employer/register/step-4', formData)
  return response.data
}

export const getVacancies = async (params = {}) => {
  const response = await apiClient.get('/employer/vacancies', { params })
  return response.data
}

export const createVacancy = async (vacancy) => {
  const response = await apiClient.post('/employer/vacancies', vacancy)
  return response.data
}

export const updateVacancy = async (id, vacancy) => {
  const response = await apiClient.put(`/employer/vacancies/${id}`, vacancy)
  return response.data
}

export const deleteVacancy = async (id) => {
  const response = await apiClient.delete(`/employer/vacancies/${id}`)
  return response.data
}

export const getNotifications = async () => {
  const response = await apiClient.get('/employer/notifications')
  return response.data
}

export const markNotificationRead = async (id) => {
  const response = await apiClient.patch(`/employer/notifications/${id}/read`)
  return response.data
}

export const markAllNotificationsRead = async () => {
  const response = await apiClient.patch('/employer/notifications/read-all')
  return response.data
}
