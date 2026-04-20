// src/stores/authStore.js
// ============================================================
// i-PESO Auth Store (Zustand + persist middleware)
// Single source of truth: user object, token, init flag
// ============================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '@/services/authService'

export const useAuthStore = create(
  persist(
    (set, get) => ({

      // ── STATE ──────────────────────────────────────────────
      user: null,          // Full user object from /api/auth/me
      token: null,         // Sanctum Bearer token
      isInitialized: false, // Prevents repeated /api/auth/me calls

      // ── DERIVED ────────────────────────────────────────────
      // Use as: const isAuthenticated = useAuthStore(s => s.isAuthenticated())
      isAuthenticated: () => {
        const { token, user } = get()
        return !!token && !!user
      },

      userRole: () => get().user?.role ?? null,

      // ── ACTIONS ────────────────────────────────────────────

      /**
       * Called once on app mount (in App.jsx useEffect).
       * Zustand persist already rehydrated `token` from localStorage.
       * This validates the token is still live and refreshes user data.
       */
      initializeAuth: async () => {
        if (get().isInitialized) return
        const { token } = get()
        if (token) {
          try {
            const user = await authService.getAuthenticatedUser()
            set({ user })
          } catch {
            // Token revoked or expired — clear everything
            get().clearAuth()
          }
        }
        set({ isInitialized: true })
      },

      /**
       * Called after successful login or registration.
       * @param {Object} user  — includes role field
       * @param {string} token — Sanctum Bearer token
       */
      setAuth: (user, token) => {
        set({ user, token })
      },

      /**
       * Logout: invalidates server token, then clears local state.
       * Always clears locally even if the API call fails.
       */
      logout: async () => {
        try {
          await authService.logout()
        } finally {
          get().clearAuth()
        }
      },

      clearAuth: () => set({ user: null, token: null }),
    }),

    {
      name: 'ipeso-auth',
      // Only persist the token — user is re-fetched on boot for freshness
      partialize: (state) => ({ token: state.token }),
    }
  )
)