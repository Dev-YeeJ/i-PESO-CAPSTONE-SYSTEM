// src/services/authService.js
// ============================================================
// i-PESO Auth Service — all authentication API calls
// ============================================================

import apiClient from './api'

export const authService = {

  async login(email, password) {
    const response = await apiClient.post('/auth/login', { email, password })
    return response.data
    // Returns: { user: { id, first_name|company_name, email, role, email_verified_at }, token }
  },

  async registerSeeker(data) {
    // data: { first_name, last_name, email, password, password_confirmation,
    //         mobile_number, complete_address, educ_attainment }
    const response = await apiClient.post('/auth/register/seeker', data)
    return response.data
  },

  async registerEmployer(data) {
    // data: { company_name, representative_name, email, password,
    //         password_confirmation, mobile_number, complete_address, industry_type }
    const response = await apiClient.post('/auth/register/employer', data)
    return response.data
  },

  async getAuthenticatedUser() {
    const response = await apiClient.get('/auth/me')
    return response.data.user
  },

  async resendVerificationEmail() {
    const response = await apiClient.post('/email/verification-notification')
    return response.data
  },

  async logout() {
    await apiClient.post('/auth/logout')
  },
}