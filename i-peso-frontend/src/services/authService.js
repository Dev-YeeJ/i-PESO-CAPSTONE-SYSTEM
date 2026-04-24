import apiClient from './api'

export const authService = {

  async login(email, password) {
    const res = await apiClient.post('/auth/login', { email, password })
    return res.data
  },

  async register(data) {
    const res = await apiClient.post('/auth/register', data)
    return res.data
  },

  async verifyOtp(email, otp) {
    const res = await apiClient.post('/auth/verify-otp', { email, otp })
    return res.data
  },

  async resendOtp(email) {
    const res = await apiClient.post('/auth/resend-otp', { email })
    return res.data
  },

  async forgotPassword(email) {
    const res = await apiClient.post('/auth/forgot-password', { email })
    return res.data
  },

  async resetPassword(email, otp, password, passwordConfirmation) {
    const res = await apiClient.post('/auth/reset-password', {
      email,
      otp,
      password,
      password_confirmation: passwordConfirmation,
    })
    return res.data
  },

  async getAuthenticatedUser() {
    const res = await apiClient.get('/auth/me')
    return res.data.user
  },

  async logout() {
    await apiClient.post('/auth/logout')
  },
}