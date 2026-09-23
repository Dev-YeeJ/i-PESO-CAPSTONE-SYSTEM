import { api } from '@/config/axios'

/**
 * Update employer profile details
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
export const updateProfile = async (data) => {
  const response = await api.put('/employer/profile', data)
  return response.data
}

/**
 * Upload a new company logo
 * @param {File} file 
 * @returns {Promise<Object>}
 */
export const uploadCompanyLogo = async (file) => {
  const formData = new FormData()
  formData.append('company_logo', file)

  const response = await api.post('/employer/profile/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * Upload a new representative profile photo
 * @param {File} file 
 * @returns {Promise<Object>}
 */
export const uploadRepresentativePhoto = async (file) => {
  const formData = new FormData()
  formData.append('profile_image', file)

  const response = await api.post('/employer/profile/photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}
