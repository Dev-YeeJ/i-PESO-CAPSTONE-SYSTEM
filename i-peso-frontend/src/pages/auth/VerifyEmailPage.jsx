import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'

const VerifyEmailPage = () => {
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  // Get email from localStorage (set by login page after 403 unverified)
  const email = localStorage.getItem('ipeso_pending_email') || ''
  const pendingRole = localStorage.getItem('ipeso_pending_role') || 'seeker'

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(value)
    setError('')
    setApiError('')
  }

  const validateOtp = () => {
    if (!otp) {
      setError('Please enter the verification code.')
      return false
    }
    if (otp.length !== 6) {
      setError('Verification code must be exactly 6 digits.')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateOtp()) return

    setIsLoading(true)
    setApiError('')

    try {
      const data = await authService.verifyOtp(email, otp)

      // ✅ Use the proper setAuth method from authStore
      const { setAuth } = useAuthStore.getState()
      setAuth(data.user, data.token)

      // Clean up pending email
      localStorage.removeItem('ipeso_pending_email')
      localStorage.removeItem('ipeso_pending_role')

      navigate(data.user.role === 'employer' ? '/employer/onboarding' : '/seeker/onboarding', { replace: true })

    } catch (err) {
      setApiError(err.response?.data?.message ?? 'Verification failed. Please try again.')
      setOtp('')
      inputRef.current?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setApiError('')

    try {
      await authService.resendOtp(email)
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 3000)
    } catch (err) {
      setApiError(err.response?.data?.message ?? 'Failed to resend code.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white flex items-center justify-center p-4">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-100 rounded-full opacity-30 blur-3xl" />
      </div>

      {/* Card Container */}
      <div className="relative w-full max-w-md">
        <div className="overflow-hidden bg-white rounded-2xl shadow-xl">
          <div className="h-1 bg-slate-100">
            <div className={`h-full bg-blue-700 ${pendingRole === 'employer' ? 'w-2/5' : 'w-full'}`} />
          </div>
          <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            {pendingRole === 'employer' && (
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-700">Step 2 of 5</p>
            )}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Verify Your Email</h1>
            <p className="text-slate-600 text-sm">
              We've sent a 6-digit code to
              <span className="font-semibold text-slate-900 block mt-1">{email}</span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Verification Code</label>
              <input
                ref={inputRef}
                type="text"
                value={otp}
                onChange={handleOtpChange}
                placeholder="000000"
                maxLength="6"
                className={`w-full px-4 py-3.5 text-center text-2xl font-bold tracking-widest rounded-xl border-2 transition-all focus:outline-none ${
                  error || apiError
                    ? 'border-red-400 text-red-600 focus:border-red-500'
                    : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                }`}
                inputMode="numeric"
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              {apiError && <p className="mt-2 text-sm text-red-600">{apiError}</p>}
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 4.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </button>

            {/* Resend Link */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-slate-600 text-sm">Didn't receive the code?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-blue-600 font-semibold text-sm hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resending ? 'Resending...' : 'Resend Code'}
              </button>
            </div>

            {/* Resend Success Message */}
            {resendSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium">Code resent successfully!</p>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-center text-xs text-slate-500">
              Having trouble? Contact our support team for assistance.
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmailPage
