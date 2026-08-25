import api from './api'

export const listJobFairs = async () => (await api.get('/job-fairs')).data.data ?? []
export const listEmployerJobFairs = async () => (await api.get('/employer/job-fairs')).data.data ?? []
export const expressJobFairInterest = async (jobFairId) => (await api.post(`/employer/job-fairs/${jobFairId}/interest`)).data
export const respondToJobFairInvitation = async (jobFairId, response, remarks = '') => (await api.post(`/employer/job-fairs/${jobFairId}/respond`, { response, remarks })).data
export const uploadJobFairRequirement = async (jobFairId, requirementId, file) => {
  const body = new FormData(); body.append('document', file)
  return (await api.post(`/employer/job-fairs/${jobFairId}/requirements/${requirementId}`, body)).data
}
export const viewJobFairRequirement = async (submissionId) => (await api.get(`/employer/job-fair-requirements/${submissionId}/view`, { responseType: 'blob' })).data
export const submitJobFairConfirmation = async (jobFairId, payload) => (await api.post(`/employer/job-fairs/${jobFairId}/confirmation-slip`, payload)).data
export const submitJobFairResults = async (jobFairId, payload) => (await api.post(`/employer/job-fairs/${jobFairId}/results`, payload)).data
export const downloadJobFairResult = async (resultId) => (await api.get(`/employer/job-fair-results/${resultId}/roi-form-3`, { responseType: 'blob' })).data
