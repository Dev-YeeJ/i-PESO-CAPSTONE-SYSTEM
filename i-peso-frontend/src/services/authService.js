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
    // Short timeout: this call gates every guest-only/protected route render
    // (see authStore.initializeAuth + router/guards.jsx). If it hangs, the
    // visitor is stuck on a blank spinner instead of the page they clicked
    // into, with nothing in the console to explain why. Failing fast here
    // just falls back to "treat as logged out" (handled by the existing
    // catch in initializeAuth), which is safe since the API still enforces
    // real auth on every actual protected request.
    const res = await apiClient.get('/auth/me', { timeout: 8000 })
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