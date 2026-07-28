import apiClient from './api'

export const getProfile = async () => {
  const response = await apiClient.get('/employer/profile')
  return response.data
}

export const saveCompanyProfile = async (formData) => {
  const response = await apiClient.post('/employer/register/step-2', formData)
  return response.data
}

export const uploadDocument = async (documentType, file, expirationDate = null) => {
  const formData = new FormData()
  formData.append('document_type', documentType)
  formData.append('document_file', file)
  if (expirationDate) formData.append('expiration_date', expirationDate)

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

export const getNotifications = async ({ page = 1, perPage = 20 } = {}) => {
  const response = await apiClient.get('/employer/notifications', { params: { page, per_page: perPage } })
  return response.data
}

export const getNotificationUnreadCount = async () => {
  const response = await apiClient.get('/employer/notifications/unread-count')
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

export const connectGoogleCalendar = async () => {
  const response = await apiClient.get('/employer/calendar/connect')
  return response.data
}

export const getCalendarEvents = async (start, end) => {
  const response = await apiClient.get('/employer/calendar/events', {
    params: { start, end }
  })
  return response.data
}

export const reuploadDocument = async (documentType, file, expirationDate = null) => {
  const formData = new FormData()
  formData.append('document_type', documentType)
  formData.append('document_file', file)
  if (expirationDate) formData.append('expiration_date', expirationDate)

  const response = await apiClient.post('/employer/register/step-3', formData)
  return response.data
}
