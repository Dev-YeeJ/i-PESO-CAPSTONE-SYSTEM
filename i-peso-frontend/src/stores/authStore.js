import { create } from 'zustand'
import { authService } from '@/services/authService'

export const useAuthStore = create((set, get) => ({

  // ── STATE ─────────────────────────────────────────────────
  user            : null,
  token           : null,
  isAuthenticated : false,
  isInitialized   : false,

  // ── ACTIONS ───────────────────────────────────────────────

  initializeAuth: async () => {
    // If already initialized, skip completely
    if (get().isInitialized) return

    // If already has auth data in memory from login, just mark initialized
    if (get().isAuthenticated && get().user && get().token) {
      set({ isInitialized: true })
      return
    }

    // Try to restore from localStorage (page refresh case)
    const storedToken = localStorage.getItem('ipeso_token')

    if (storedToken) {
      set({ token: storedToken })
      try {
        const user = await authService.getAuthenticatedUser()
        set({ user, isAuthenticated: true, isInitialized: true })
        return
      } catch (error) {
        console.error('Failed to fetch authenticated user:', error)
        get().clearAuth()
      }
    }

    // No token found or auth failed - mark as initialized (not authenticated)
    set({ isInitialized: true })
  },

  setAuth: (user, token) => {
    localStorage.setItem('ipeso_token', token)
    set({ user, token, isAuthenticated: true, isInitialized: true })
  },

  logout: async () => {
    try {
      await authService.logout()
    } finally {
      get().clearAuth()
    }
  },

  clearAuth: () => {
    localStorage.removeItem('ipeso_token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  updateUser: (updatedUser) => {
    set({ user: { ...get().user, ...updatedUser } })
  },
}))