import api from './api'

export const listJobFairs = async () => {
  const { data } = await api.get('/job-fairs')
  return data.data ?? []
}

export const rsvpToJobFair = async (jobFairId) => {
  const { data } = await api.post(`/job-fairs/${jobFairId}/rsvp`)
  return data
}

export const joinJobFair = async (jobFairId, vacancyIds) => {
  const { data } = await api.post(`/job-fairs/${jobFairId}/employer-join`, {
    vacancy_ids: vacancyIds,
  })
  return data
}

export const scanJobFairQr = async ({ qrCodeUuid, jobFairId }) => {
  const { data } = await api.post('/job-fairs/scan-qr', {
    qr_code_uuid: qrCodeUuid,
    job_fair_id: jobFairId,
  })
  return data
}

export const fastTrackJobFairApplication = async (payload) => {
  const { data } = await api.post('/job-fairs/applications/fast-track', payload)
  return data
}

export const downloadRoiForm3 = async (jobFairId) => {
  const response = await api.get(`/job-fairs/${jobFairId}/export-roi-form-3`, {
    responseType: 'blob',
  })
  return response.data
}

export const downloadSprsReport = async (jobFairId) => {
  const response = await api.get(`/admin/job-fairs/${jobFairId}/export-sprs`, {
    responseType: 'blob',
  })
  return response.data
}
