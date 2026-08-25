import apiClient from './api'

export interface LoginPayload {
  email: string
  password: string
}

export interface SeekerRegisterPayload extends LoginPayload {
  role: 'seeker'
  first_name: string
  last_name: string
  mobile_number: string
  password_confirmation: string
}

export const authService = {
  async login(email: string, password: string) {
    const res = await apiClient.post('/auth/login', { email, password })
    return res.data
  },

  async register(data: SeekerRegisterPayload) {
    const res = await apiClient.post('/auth/register', data)
    return res.data
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
    // Short timeout: this call gates app boot (authStore.initializeAuth) —
    // if it hangs on the full 15s global default, the visitor is stuck on
    // the splash/loading state instead of reaching the login screen. Failing
    // fast just falls back to "treat as logged out", which is safe since the
    // API still enforces real auth on every actual protected request.
    const res = await apiClient.get('/auth/me', { timeout: 8000 })
    return res.data.user
  },

  async logout() {
    await apiClient.post('/auth/logout')
  },
}
