// src/pages/auth/VerifyEmailPage.jsx
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { useState } from 'react'
import AppButton from '@/components/common/AppButton'
import AppAlert from '@/components/common/AppAlert'

export default function VerifyEmailPage() {
  const user = useAuthStore(s => s.user)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const resend = async () => {
    setLoading(true)
    await authService.resendVerificationEmail()
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Verify your email</h1>
        <p style={{ color: 'var(--color-text-2)', marginBottom: 24 }}>
          We sent a verification link to <strong>{user?.email}</strong>. Click the link to activate your account.
        </p>
        {sent && <AppAlert variant="success">Verification email resent!</AppAlert>}
        <AppButton onClick={resend} loading={loading} variant="secondary" style={{ marginTop: 16 }}>
          Resend verification email
        </AppButton>
      </div>
    </div>
  )
}