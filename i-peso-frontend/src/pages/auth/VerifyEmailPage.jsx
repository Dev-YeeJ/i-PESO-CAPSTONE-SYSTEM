import { useRef, useState } from 'react'
import { Inbox, RefreshCw, ShieldCheck } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import { employerRegistrationSteps, seekerRegistrationSteps } from '@/components/auth/registrationJourneys'
import { AlertBox, Button } from '@/components/ui'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { Link, useNavigate } from 'react-router-dom'

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
      title="Check your email"
      subtitle={<>We sent a six-digit code to <span className="font-semibold text-slate-900 break-all">{email || 'your registered email'}</span>. It expires in 10 minutes.</>}
      sideTitle="Secure account activation."
      sideText="Email verification confirms account ownership before personal or company information is collected."
      sideItems={['Six-digit one-time code', 'Protected account activation', 'Guided onboarding after verification']}
      maxWidth="max-w-xl"
      journey={{ role: pendingRole, steps: journeySteps, currentStep: 2 }}
    >
      <>
        {apiError && <AlertBox variant="danger" title="Verification failed" className="mb-5">{apiError}</AlertBox>}
        {resendSuccess && <AlertBox variant="success" title="New code sent" className="mb-5">Check your email inbox for the latest verification code.</AlertBox>}
        <form onSubmit={submit} className="space-y-5">
          <label className="portal-label">
            Six-digit code
            <input ref={inputRef} type="text" value={otp} onChange={change} placeholder="000000" maxLength="6" inputMode="numeric" autoComplete="one-time-code" className={`portal-input mt-2 h-14 text-center font-display text-3xl tracking-[0.5em] ${error ? 'border-red-400' : ''}`} />
            {error && <span className="mt-2 block text-left text-xs font-medium text-red-700">{error}</span>}
          </label>
          <Button type="submit" disabled={loading || otp.length !== 6} icon={ShieldCheck} className="w-full">{loading ? 'Verifying…' : 'Verify and continue'}</Button>
        </form>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-sm">
          <button type="button" onClick={resend} disabled={resending} className="inline-flex items-center gap-2 font-semibold text-brand-navy hover:underline disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} aria-hidden="true" />{resending ? 'Sending…' : 'Send a new code'}
          </button>
          <Link to={pendingRole === 'employer' ? '/register/employer' : '/register/seeker'} className="font-semibold text-slate-600 hover:text-brand-navy">Use a different email</Link>
        </div>
        <p className="mt-5 flex gap-2 rounded-xl bg-brand-canvas p-3.5 text-sm text-slate-600">
          <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy" aria-hidden="true" />
          Can&apos;t find it? Check your Spam or Promotions folder for an email from i-PESO Urdaneta.
        </p>
      </>
    </AuthShell>
  )
}
