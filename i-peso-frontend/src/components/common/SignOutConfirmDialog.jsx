import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/authStore'

// Shared by the admin, employer, and seeker sidebars so every portal asks before
// ending the session — a one-click sign-out sitting under the collapse control
// was too easy to hit by accident. Owns the logout call and the redirect; the
// caller only owns the open state and its own button styling.
export default function SignOutConfirmDialog({ open, onOpenChange }) {
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const confirmSignOut = async () => {
    setSigningOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setSigningOut(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !signingOut && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign out of i-PESO?</DialogTitle>
          <DialogDescription>You will need to log in again to get back into your account.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={signingOut}>Cancel</Button>
          <Button variant="danger" onClick={confirmSignOut} disabled={signingOut}>{signingOut ? 'Signing out...' : 'Sign out'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
