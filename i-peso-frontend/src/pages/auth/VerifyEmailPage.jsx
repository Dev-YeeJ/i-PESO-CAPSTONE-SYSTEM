import { useRef, useState } from 'react'
import { MailCheck, RefreshCw, ShieldCheck } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import { employerRegistrationSteps, seekerRegistrationSteps } from '@/components/auth/registrationJourneys'
import { AlertBox, Button, Card } from '@/components/ui'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const email = localStorage.getItem('ipeso_pending_email') || ''
  const pendingRole = localStorage.getItem('ipeso_pending_role') || 'seeker'
  const journeySteps = pendingRole === 'employer' ? employerRegistrationSteps : seekerRegistrationSteps

  const change = (event) => {
    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
    setError('')
    setApiError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (otp.length !== 6) {
      setError('Enter the complete 6-digit verification code.')
      return
    }
    setLoading(true)
    setApiError('')
    try {
      const data = await authService.verifyOtp(email, otp)
      useAuthStore.getState().setAuth(data.user, data.token)
      localStorage.removeItem('ipeso_pending_email')
      localStorage.removeItem('ipeso_pending_role')
      navigate(data.user.role === 'employer' ? '/employer/onboarding' : '/seeker/onboarding', { replace: true })
    } catch (requestError) {
      setApiError(requestError.response?.data?.message ?? 'Verification failed. Please try again.')
      setOtp('')
      inputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setResending(true)
    setApiError('')
    try {
      await authService.resendOtp(email)
      setResendSuccess(true)
      window.setTimeout(() => setResendSuccess(false), 3000)
    } catch (requestError) {
      setApiError(requestError.response?.data?.message ?? 'Failed to resend code.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Enter the six-digit code sent to your registered email address."
      sideTitle="Secure account activation."
      sideText="Email verification confirms account ownership before personal or company information is collected."
      sideItems={['Six-digit one-time code', 'Protected account activation', 'Guided onboarding after verification']}
      maxWidth="max-w-xl"
      journey={{ role: pendingRole, steps: journeySteps, currentStep: 2 }}
    >
      <Card>
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><MailCheck className="h-7 w-7" /></span>
          <p className="mt-4 text-sm text-slate-600">Code sent to</p>
          <p className="mt-1 break-all font-extrabold text-brand-navy">{email || 'your registered email'}</p>
        </div>
        {apiError && <AlertBox variant="danger" title="Verification failed" className="mb-5">{apiError}</AlertBox>}
        {resendSuccess && <AlertBox variant="success" title="New code sent" className="mb-5">Check your email inbox for the latest verification code.</AlertBox>}
        <form onSubmit={submit} className="space-y-5">
          <label className="portal-label text-center">
            Verification code
            <input ref={inputRef} type="text" value={otp} onChange={change} placeholder="000000" maxLength="6" inputMode="numeric" autoComplete="one-time-code" className={`portal-input mt-2 py-3 text-center text-2xl font-black tracking-[0.45em] ${error ? 'border-red-400' : ''}`} />
            {error && <span className="mt-2 block text-left text-xs font-medium text-red-600">{error}</span>}
          </label>
          <Button type="submit" disabled={loading || otp.length !== 6} icon={ShieldCheck} className="w-full">{loading ? 'Verifying...' : 'Verify and Continue'}</Button>
        </form>
        <div className="mt-6 border-t border-slate-200 pt-5 text-center">
          <p className="text-sm text-slate-600">Did not receive the email?</p>
          <button type="button" onClick={resend} disabled={resending} className="mt-2 inline-flex items-center gap-2 text-sm font-extrabold text-blue-700 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />{resending ? 'Sending...' : 'Resend verification code'}
          </button>
        </div>
      </Card>
    </AuthShell>
  )
}
