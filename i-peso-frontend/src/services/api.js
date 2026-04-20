// src/services/api.js
// ============================================================
// SINGLETON Axios Instance — i-PESO API Client
// ============================================================

import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Required for Laravel Sanctum CSRF
})

// ── REQUEST INTERCEPTOR ──────────────────────────────────────
// Attach token from localStorage — we read localStorage directly
// here because this runs outside React's component/hook system.
apiClient.interceptors.request.use(
  (config) => {
    // Zustand persist stores the token under 'ipeso-auth' as JSON
    try {
      const stored = localStorage.getItem('ipeso-auth')
      if (stored) {
        const { state } = JSON.parse(stored)
        if (state?.token) {
          config.headers['Authorization'] = `Bearer ${state.token}`
        }
      }
    } catch {
      // Malformed storage — ignore
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── RESPONSE INTERCEPTOR ─────────────────────────────────────
// 401 anywhere = token dead → wipe and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ipeso-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient