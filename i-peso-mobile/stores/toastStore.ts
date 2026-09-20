import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info'

interface ToastState {
  message: string | null
  variant: ToastVariant
  showToast: (message: string, variant?: ToastVariant) => void
  hideToast: () => void
}

const AUTO_DISMISS_MS = 3000

// Module-level, not store state — a timer handle isn't UI, and keeping it out of the
// store means calling showToast() twice in a row cleanly resets the clock instead of
// leaving an earlier timeout racing to clear a message it doesn't own anymore.
let dismissTimer: ReturnType<typeof setTimeout> | null = null

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  variant: 'info',

  showToast: (message, variant = 'info') => {
    if (dismissTimer) clearTimeout(dismissTimer)
    set({ message, variant })
    dismissTimer = setTimeout(() => {
      set({ message: null })
      dismissTimer = null
    }, AUTO_DISMISS_MS)
  },

  hideToast: () => {
    if (dismissTimer) {
      clearTimeout(dismissTimer)
      dismissTimer = null
    }
    set({ message: null })
  },
}))

/** Trigger-only access to the toast — doesn't re-render when the message itself changes. */
export function useToast() {
  const showToast = useToastStore((s) => s.showToast)
  const hideToast = useToastStore((s) => s.hideToast)
  return { showToast, hideToast }
}
