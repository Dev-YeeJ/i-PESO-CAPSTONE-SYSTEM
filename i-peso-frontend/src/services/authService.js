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

  // ===== STEP-BY-STEP PROFILE COMPLETION =====
  
  async saveStep1(data) {
    const res = await apiClient.post('/seeker/step-1', data)
    return res.data
  },

  async saveStep2(data) {
    const res = await apiClient.post('/seeker/step-2', data)
    return res.data
  },

  async saveStep3(data) {
    const res = await apiClient.post('/seeker/step-3', data)
    return res.data
  },

  async saveStep4(data) {
    const res = await apiClient.post('/seeker/step-4', data)
    return res.data
  },

  async saveStep5(data) {
    const res = await apiClient.post('/seeker/step-5', data)
    return res.data
  },

  async saveStep6(data) {
    const res = await apiClient.post('/seeker/step-6', data)
    return res.data
  },

  async saveStep7(data) {
    const res = await apiClient.post('/seeker/step-7', data)
    return res.data
  },

  // ===== LEGACY: Single-submit endpoint =====
  
  async saveSeekerProfile(profileData) {
    const res = await apiClient.post('/seeker/profile', profileData)
    return res.data
  },

  async getSeekerProfile() {
    const res = await apiClient.get('/seeker/profile')
    return res.data.user
  },
}