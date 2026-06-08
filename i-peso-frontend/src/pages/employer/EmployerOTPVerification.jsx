// src/pages/employer/EmployerOTPVerification.jsx
import { useState, useCallback, useEffect } from 'react'
import FormError from '@/components/form/FormError'
import apiClient from '@/services/api'
import { validateOtp } from '@/services/validationHelpers'

export default function EmployerOTPVerification({ email, employerId, onComplete }) {
  const [otp, setOtp] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [resendMessage, setResendMessage] = useState('')

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown <= 0) return

    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [resendCountdown])

  const handleChange = useCallback((e) => {
    // Only allow digits
    let value = e.target.value.replace(/\D/g, '')
    // Limit to 6 digits
    value = value.slice(0, 6)

    setOtp(value)
    setApiError('')
    setErrors((err) => ({ ...err, otp: undefined }))
  }, [])

  const handleBlur = useCallback(() => {
    setTouched((t) => ({ ...t, otp: true }))
  }, [])

  const getError = (name) => (touched[name] ? errors[name] : undefined)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ otp: true })

    const errs = validateOtp(otp)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setIsLoading(true)
    setApiError('')

    try {
      const res = await apiClient.post('/employer/register/verify-otp', {
        employer_id: employerId,
        otp: otp,
      })

      // Call onComplete to proceed to Step 2
      onComplete({
        otpVerified: true,
        token: res.data.token,
      })
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {})
      } else {
        setApiError(err.response?.data?.message ?? 'OTP verification failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    setApiError('')
    setResendMessage('')

    try {
      await apiClient.post('/employer/register/send-otp', {
        employer_id: employerId,
        email: email,
      })

      setResendMessage('OTP sent successfully. Check your email.')
      setOtp('')
      setTouched({})
      setResendCountdown(60) // 60 second cooldown
    } catch (err) {
      setApiError(err.response?.data?.message ?? 'Failed to resend OTP. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Verify Your Email</h2>
          <p className="text-sm text-slate-600">
            We've sent a verification code to <span className="font-medium text-slate-900">{email}</span>
          </p>
        </div>

        {/* Alerts */}
        <FormError message={apiError} />

        {resendMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 text-sm text-green-800 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {resendMessage}
          </div>
        )}

        {/* OTP Input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Verification Code
          </label>
          <input
            type="text"
            value={otp}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="000000"
            maxLength={6}
            inputMode="numeric"
            className={`w-full px-3.5 py-2.5 text-center text-2xl tracking-widest font-mono rounded-xl border bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
              getError('otp')
                ? 'border-red-400 focus:border-red-400'
                : 'border-slate-300 focus:border-blue-400'
            }`}
          />
          {getError('otp') && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {getError('otp')}
            </p>
          )}
          <p className="mt-1.5 text-xs text-slate-500">
            Enter the 6-digit code sent to your email
          </p>
        </div>

        {/* Verify Button */}
        <button
          type="submit"
          disabled={isLoading || otp.length < 6}
          className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
        >
          {isLoading ? 'Verifying...' : 'Verify Email & Continue'}
        </button>

        {/* Resend Link */}
        <div className="text-center">
          <p className="text-sm text-slate-600 mb-2">
            Didn't receive the code?
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || resendCountdown > 0}
            className="text-sm font-medium text-blue-700 hover:text-blue-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
          </button>
        </div>

        {/* Help Text */}
        <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600">
          <p className="font-medium text-slate-700 mb-1">Verification Code Tips:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Check your spam/junk folder if you don't see the email</li>
            <li>The code expires in 15 minutes</li>
            <li>If you have issues, contact Urdaneta City PESO support</li>
          </ul>
        </div>
      </form>
    </div>
  )
}
