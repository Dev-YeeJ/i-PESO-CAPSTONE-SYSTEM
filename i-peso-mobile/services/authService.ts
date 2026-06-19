import apiClient from './api'

export const authService = {
  async login(email: string, password: string) {
    const res = await apiClient.post('/auth/login', { email, password })
    return res.data
  },

  async register(data: Record<string, string>) {
    try {
      const res = await apiClient.post('/auth/register', data)
      return res.data
    } catch (error: any) {
      console.log('=== REGISTER ERROR DEBUG ===')
      console.log('Message:', error?.message)
      console.log('Code:', error?.code)
      console.log('Response status:', error?.response?.status)
      try {
        console.log('Response data:', JSON.stringify(error?.response?.data))
      } catch (e) {
        console.log('Response data: <unserializable>')
      }
      console.log('Request URL:', error?.config?.url)
      console.log('Base URL:', error?.config?.baseURL)
      console.log('=============================')
      throw error
    }
  },

  async verifyOtp(email: string, otp: string) {
    const res = await apiClient.post('/auth/verify-otp', { email, otp })
    return res.data
  },

  async resendOtp(email: string) {
    const res = await apiClient.post('/auth/resend-otp', { email })
    return res.data
  },

  async forgotPassword(email: string) {
    const res = await apiClient.post('/auth/forgot-password', { email })
    return res.data
  },

  async resetPassword(
    email: string,
    otp: string,
    password: string,
    passwordConfirmation: string
  ) {
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