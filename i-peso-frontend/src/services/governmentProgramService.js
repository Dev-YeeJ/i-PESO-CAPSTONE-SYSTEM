import api from './api'

const appendArray = (form, name, values = []) => {
  values.forEach((value, index) => {
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => {
        if (item !== null && item !== undefined && item !== '') {
          form.append(`${name}[${index}][${key}]`, item)
        }
      })
      return
    }
    if (value !== null && value !== undefined && value !== '') {
      form.append(`${name}[${index}]`, value)
    }
  })
}

const programFormData = (payload) => {
  const form = new FormData()
  const arrays = ['eligibility_requirements', 'required_documents', 'skills']
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'eligibility_rules') {
      // Nested arrays (e.g. `values`) don't survive multipart encoding — send JSON.
      form.append('eligibility_rules', JSON.stringify(Array.isArray(value) ? value : []))
    } else if (arrays.includes(key)) {
      appendArray(form, key, value)
    } else if (value !== null && value !== undefined && value !== '') {
      form.append(key, value)
    }
  })
  return form
}

export const governmentProgramService = {
  adminPrograms: async (params = {}) => (await api.get('/admin/government-programs', { params })).data,
  adminAnalytics: async () => (await api.get('/admin/government-programs/analytics')).data.analytics,
  adminProgram: async (id) => (await api.get(`/admin/government-programs/${id}`)).data.program,
  createProgram: async (payload) => (await api.post('/admin/government-programs', programFormData(payload))).data,
  updateProgram: async (id, payload) => (await api.post(`/admin/government-programs/${id}`, programFormData(payload))).data,
  archiveProgram: async (id) => (await api.delete(`/admin/government-programs/${id}`)).data,
  adminProgramAttachment: async (id) => (await api.get(`/admin/government-programs/${id}/attachment`, { responseType: 'blob' })).data,
  programApplications: async (id, params = {}) => (await api.get(`/admin/government-programs/${id}/applications`, { params })).data,
  updateApplicationStatus: async (id, payload) => (await api.post(`/admin/government-program-applications/${id}/status`, payload)).data,

  citizenCharter: async () => (await api.get('/admin/citizen-charter')).data.data,
  createCitizenCharter: async (payload) => (await api.post('/admin/citizen-charter', payload)).data,
  updateCitizenCharter: async (id, payload) => (await api.put(`/admin/citizen-charter/${id}`, payload)).data,
  archiveCitizenCharter: async (id) => (await api.delete(`/admin/citizen-charter/${id}`)).data,

  listSeekerPrograms: async (params = {}) => (await api.get('/seeker/government-programs', { params })).data,
  seekerProgram: async (id) => (await api.get(`/seeker/government-programs/${id}`)).data.program,
  seekerProgramAttachment: async (id) => (await api.get(`/seeker/government-programs/${id}/attachment`, { responseType: 'blob' })).data,
  applyToProgram: async (id) => (await api.post(`/seeker/government-programs/${id}/apply`)).data,
  seekerApplications: async () => (await api.get('/seeker/government-program-applications')).data.data,
  uploadApplicationDocument: async (id, payload) => {
    const form = new FormData()
    form.append('document_type', payload.document_type)
    form.append('document_name', payload.document_name)
    form.append('file', payload.file)
    return (await api.post(`/seeker/government-program-applications/${id}/documents`, form)).data
  },
  publicCitizenCharter: async () => (await api.get('/seeker/citizen-charter')).data.data,
}

export default governmentProgramService
