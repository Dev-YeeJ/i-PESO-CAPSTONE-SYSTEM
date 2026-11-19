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

export const deleteDocument = async (documentType) => {
  const response = await apiClient.delete(`/employer/register/document/${documentType}`)
  return response.data
}

export const getRequiredDocuments = async () => {
  const response = await apiClient.get('/employer/required-documents')
  return response.data
}

export const setCompanyType = async (companyType) => {
  const response = await apiClient.post('/employer/register/company-type', { company_type: companyType })
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

export const getVacancy = async (id) => {
  const response = await apiClient.get(`/employer/vacancies/${id}`)
  return response.data
}

/** Rough "likely matches" for a post still being written: counts only. */
export const getMatchEstimate = async ({ generalTerm, city }) => {
  const response = await apiClient.get('/employer/vacancies/match-estimate', {
    params: { general_term: generalTerm, city_municipality: city || undefined },
  })
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

export const suggestJobPosting = async (payload) => {
  const response = await apiClient.post('/employer/vacancies/ai-suggest', payload)
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

// Sidebar "Applicants" badge: { new, active, total }.
export const getApplicantCounts = async () => {
  const response = await apiClient.get('/employer/applications/counts')
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

export const reuploadDocument = async (documentType, file, expirationDate = null) => {
  const formData = new FormData()
  formData.append('document_type', documentType)
  formData.append('document_file', file)
  if (expirationDate) formData.append('expiration_date', expirationDate)

  const response = await apiClient.post('/employer/register/step-3', formData)
  return response.data
}
