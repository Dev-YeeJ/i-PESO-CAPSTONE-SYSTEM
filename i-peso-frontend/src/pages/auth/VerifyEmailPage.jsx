import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'

const RESEND_COUNTDOWN_SECONDS = 60

const ROLE_ROUTES = {
  seeker:   '/seeker/dashboard',
  employer: '/employer/dashboard',
  admin:    '/admin/dashboard',
}

const VerifyEmailPage = () => {
  const navigate  = useNavigate()
  const location  = useLocation()

  const email = location.state?.email
    ?? localStorage.getItem('ipeso_pending_email')
    ?? ''

  const [digits, setDigits]           = useState(Array(6).fill(''))
  const inputRefs                     = useRef([])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [apiError, setApiError]       = useState('')
  const [countdown, setCountdown]     = useState(RESEND_COUNTDOWN_SECONDS)
  const [canResend, setCanResend]     = useState(false)

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (!email) navigate('/register', { replace: true })
  }, [email, navigate])

  const handleDigitChange = (index, value) => {
    const sanitized = value.replace(/\D/g, '').slice(-1)
    const updated   = [...digits]
    updated[index]  = sanitized
    setDigits(updated)
    setApiError('')
    if (sanitized && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted  = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const updated = Array(6).fill('')
    pasted.split('').forEach((char, i) => { updated[i] = char })
    setDigits(updated)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleVerify = async () => {
    const otp = digits.join('')
    if (otp.length < 6) {
      setApiError('Please enter all 6 digits of your verification code.')
      return
    }

    setIsVerifying(true)
    setApiError('')

    try {
      const data = await authService.verifyOtp(email, otp)

      // ✅ Set auth state AND isInitialized atomically
      // This prevents RequireAuth from seeing an uninitialized state
      // and kicking the user to /login before the store settles
      useAuthStore.setState({
        user            : data.user,
        token           : data.token,
        isAuthenticated : true,
        isInitialized   : true,
      })
      localStorage.setItem('ipeso_token', data.token)
      localStorage.removeItem('ipeso_pending_email')

      // ✅ Navigate to the correct dashboard based on role
      navigate(ROLE_ROUTES[data.user.role] ?? '/', { replace: true })

    } catch (err) {
      setApiError(err.response?.data?.message ?? 'Verification failed. Please try again.')
      setDigits(Array(6).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (!canResend) return
    setIsResending(true)
    setApiError('')

    try {
      await authService.resendOtp(email)
      setCountdown(RESEND_COUNTDOWN_SECONDS)
      setCanResend(false)
      setDigits(Array(6).fill(''))
      inputRefs.current[0]?.focus()
    } catch (err) {
      setApiError(err.response?.data?.message ?? 'Could not resend code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, '$1***$2')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white flex items-center justify-center p-4">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-100 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-base font-bold text-blue-900 leading-none">i-PESO</p>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5 uppercase tracking-wide">Urdaneta City</p>
            </div>
          </div>
          <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Check your email</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            We sent a 6-digit verification code to<br />
            <span className="font-semibold text-slate-700">{maskedEmail}</span>
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">

          {apiError && (
            <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}

          {/* 6-Box OTP Input */}
          <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                  apiError
                    ? 'border-red-300 bg-red-50'
                    : digit
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-blue-400'
                }`}
              />
            ))}
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={isVerifying || digits.join('').length < 6}
            className="w-full py-3 bg-blue-700 hover:bg-blue-800 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-blue-200"
          >
            {isVerifying ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
                Verifying…
              </>
            ) : 'Verify Email'}
          </button>

          {/* Resend */}
          <div className="mt-5 text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={isResending}
                className="text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-60 flex items-center gap-1.5 mx-auto transition-colors"
              >
                {isResending ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                    </svg>
                    Sending…
                  </>
                ) : 'Resend verification code'}
              </button>
            ) : (
              <p className="text-sm text-slate-500">
                Resend code in{' '}
                <span className="font-semibold text-slate-700 tabular-nums">{countdown}s</span>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Wrong email?{' '}
          <span
            className="text-blue-600 cursor-pointer hover:underline"
            onClick={() => navigate('/register')}
          >
            Go back to register
          </span>
        </p>
      </div>
    </div>
  )
}

export default VerifyEmailPage