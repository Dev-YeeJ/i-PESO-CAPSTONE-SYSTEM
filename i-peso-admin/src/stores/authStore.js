import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import apiClient from '@/services/api'

export const useAdminAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: false,

      setAuth: (user, token) => {
        localStorage.setItem('ipeso_admin_token', token)
        set({ user, token, isAuthenticated: true, isInitialized: true })
      },

      logout: async () => {
        try {
          await apiClient.post('/auth/logout')
        } finally {
          get().clearAuth()
        }
      },

      clearAuth: () => {
        localStorage.removeItem('ipeso_admin_token')
        set({ user: null, token: null, isAuthenticated: false })
      },

      updateUser: (updatedUser) => {
        set({ user: { ...get().user, ...updatedUser } })
      },

      initializeAuth: async () => {
        if (get().isInitialized) return

        if (get().isAuthenticated && get().user) {
          set({ isInitialized: true })
          return
        }

        const storedToken = localStorage.getItem('ipeso_admin_token')
        if (storedToken) {
          set({ token: storedToken })
          try {
            const res = await apiClient.get('/auth/me')
            const user = res.data.user
            if (user.role === 'admin') {
              set({ user, isAuthenticated: true })
            } else {
              get().clearAuth()
            }
          } catch {
            get().clearAuth()
          }
        }

        set({ isInitialized: true })
      },
    }),
    {
      name: 'ipeso-admin-auth',
    }
  )
)
