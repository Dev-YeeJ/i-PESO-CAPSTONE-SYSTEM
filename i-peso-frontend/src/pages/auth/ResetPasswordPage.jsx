import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { authService } from '@/services/authService'
import AuthShell from '@/components/auth/AuthShell'
import Button from '@/components/ui/Button'

const OTP_EXPIRY_SECONDS   = 600  // 10 minutes — matches Laravel cache TTL
const RESEND_COOLDOWN      = 60   // 60 seconds before resend is allowed

const getPasswordStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)          score++
  if (pw.length >= 12)         score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak',   color: 'bg-red-400' }
  if (score <= 3) return { score, label: 'Fair',   color: 'bg-amber-400' }
  if (score === 4) return { score, label: 'Good',  color: 'bg-blue-500' }
  return { score, label: 'Strong', color: 'bg-green-500' }
}

const EyeIcon = ({ open }) => open ? (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
) : (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
)

// Format seconds as M:SS
const formatTime = (secs) => {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m + ':' + (s < 10 ? '0' : '') + s
}

const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const email = location.state?.email
    ?? localStorage.getItem('ipeso_reset_email')
    ?? ''

  // ── OTP state ────────────────────────────────────────────
  const [digits, setDigits]       = useState(Array(6).fill(''))
  const inputRefs                 = useRef([])

  // ── Password state ───────────────────────────────────────
  const [password, setPassword]   = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // ── UI state ─────────────────────────────────────────────
  const [errors, setErrors]       = useState({})
  const [apiError, setApiError]   = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [success, setSuccess]     = useState(false)

  // ── Timers ───────────────────────────────────────────────
  // Expiry countdown — shows how long the current OTP is valid
  const [expiry, setExpiry]       = useState(OTP_EXPIRY_SECONDS)
  const [expired, setExpired]     = useState(false)
  // Resend cooldown — prevents spam
  const [resendCooldown, setResendCooldown] = useState(
    location.state?.freshSent ? RESEND_COOLDOWN : 0
  )
  const [canResend, setCanResend] = useState(
    !location.state?.freshSent
  )

  const strength = getPasswordStrength(password)

  // ── OTP expiry countdown ─────────────────────────────────
  useEffect(() => {
    if (expiry <= 0) { setExpired(true); return }
    const t = setTimeout(() => setExpiry((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [expiry])

  // ── Resend cooldown ──────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  // ── Boot ─────────────────────────────────────────────────
  useEffect(() => {
    if (!email) navigate('/forgot-password', { replace: true })
    inputRefs.current[0]?.focus()
  }, [email, navigate])

  // ── Expiry color ─────────────────────────────────────────
  const expiryColor = expired
    ? 'text-red-600'
    : expiry < 120
    ? 'text-amber-600'
    : 'text-green-600'

  const expiryBg = expired
    ? 'bg-red-50 border-red-200'
    : expiry < 120
    ? 'bg-amber-50 border-amber-200'
    : 'bg-green-50 border-green-200'

  // ── Masked email ─────────────────────────────────────────
  const maskedEmail = email.replace(/(.{2}).+(@.+)/, '$1***$2')

  // ── OTP input handlers ───────────────────────────────────
  const handleDigitChange = (index, value) => {
    const sanitized = value.replace(/\D/g, '').slice(-1)
    const updated   = [...digits]
    updated[index]  = sanitized
    setDigits(updated)
    setApiError('')
    if (sanitized && index < 5) inputRefs.current[index + 1]?.focus()
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

  // ── Validate ─────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (digits.join('').length < 6) e.otp      = 'Please enter the full 6-digit code.'
    if (!password)                  e.password  = 'New password is required.'
    else if (password.length < 8)   e.password  = 'Password must be at least 8 characters.'
    else if (!/\d/.test(password) || !/[^A-Za-z0-9]/.test(password))
                                    e.password  = 'Password must include at least one number and one special character.'
    if (!confirmPw)                 e.confirmPw = 'Please confirm your new password.'
    else if (password !== confirmPw) e.confirmPw = 'Passwords do not match.'
    return e
  }

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return

    setIsLoading(true)
    setApiError('')

    try {
      await authService.resetPassword(email, digits.join(''), password, confirmPw)
      setSuccess(true)
      localStorage.removeItem('ipeso_reset_email')
    } catch (err) {
      setApiError(
        err.response?.data?.message ?? 'Invalid or expired code. Please request a new one.'
      )
      setDigits(Array(6).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  // ── Resend ───────────────────────────────────────────────
  const handleResend = async () => {
    if (!canResend || isResending) return
    setIsResending(true)
    setApiError('')

    try {
      await authService.forgotPassword(email)
      // Reset both timers
      setExpiry(OTP_EXPIRY_SECONDS)
      setExpired(false)
      setResendCooldown(RESEND_COOLDOWN)
      setCanResend(false)
      setDigits(Array(6).fill(''))
      inputRefs.current[0]?.focus()
    } catch (err) {
      setApiError(
        err.response?.data?.message ?? 'Could not resend code. Please try again.'
      )
    } finally {
      setIsResending(false)
    }
  }

  // ── Success screen ───────────────────────────────────────
  if (success) {
    return (
      <AuthShell title="Password updated" subtitle="Sign in with your new password." sideTitle="Locked out? You'll be back in a minute." sideText="We send a time-limited code to the email on your account. Nobody at PESO can see your password.">
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900" role="status">
          <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          <p className="text-sm leading-6">Your password has been changed. Use it the next time you sign in.</p>
        </div>
        <Button onClick={() => navigate('/login')} className="mt-6 w-full">Go to sign in</Button>
      </AuthShell>
    )
  }

  // ── Main page ────────────────────────────────────────────
  return (
    <AuthShell title="Choose a new password" subtitle={<>Enter the code we sent to <span className="font-semibold text-slate-900">{maskedEmail}</span>, then pick a new password.</>} sideTitle="Locked out? You'll be back in a minute." sideText="We send a time-limited code to the email on your account. Nobody at PESO can see your password.">
        <ol className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Reset steps">
          <li className="flex items-center gap-2 text-slate-500"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f0fc] text-xs font-bold text-brand-navy" aria-hidden="true">1</span>Email</li>
          <li className="flex items-center gap-2 font-semibold text-slate-900" aria-current="step"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white" aria-hidden="true">2</span>Code and new password</li>
        </ol>
        <Link to="/forgot-password" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-navy">Use a different email</Link>

        {/* OTP Expiry Banner */}
        <div className={['flex items-center justify-between px-4 py-2.5 rounded-xl border mb-4 transition-all', expiryBg].join(' ')}>
          <div className="flex items-center gap-2">
            <svg className={['w-4 h-4', expiryColor].join(' ')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={['text-xs font-medium', expiryColor].join(' ')}>
              {expired ? 'Code has expired' : 'Code expires in'}
            </span>
          </div>
          {!expired && (
            <span className={['text-sm font-bold tabular-nums', expiryColor].join(' ')}>
              {formatTime(expiry)}
            </span>
          )}
          {expired && (
            <span className="text-xs font-semibold text-red-600">Request a new one below</span>
          )}
        </div>

        <div>

          {apiError && (
            <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* 6-Box OTP */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-800">
                Six-digit code
              </label>
              <div className="flex justify-between gap-2" onPaste={handlePaste}>
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    disabled={expired}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={[
                      'h-14 w-12 rounded-xl border text-center',
                      'font-display text-2xl transition-all focus:outline-none focus:ring-2 focus:ring-[#c4d9f7]',
                      expired
                        ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                        : errors.otp
                        ? 'border-red-300 bg-red-50'
                        : digit
                        ? 'border-slate-400 bg-white text-slate-900'
                        : 'border-slate-300 bg-white text-slate-900 focus:border-brand-navy',
                    ].join(' ')}
                  />
                ))}
              </div>
              {errors.otp && (
                <p className="mt-2 text-xs text-red-600 text-center">{errors.otp}</p>
              )}
            </div>

            {/* Resend section */}
            <div className="flex items-center justify-center">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="flex items-center gap-1.5 text-sm font-semibold text-brand-navy hover:text-blue-800 disabled:opacity-60 transition-colors"
                >
                  {isResending ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                      Sending new code…
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Resend reset code
                    </>
                  )}
                </button>
              ) : (
                <p className="text-sm text-slate-500">
                  Resend available in{' '}
                  <span className="font-semibold text-slate-700 tabular-nums">{resendCooldown}s</span>
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-4">

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setErrors((er) => ({ ...er, password: undefined }))
                    }}
                    placeholder="Min 8 chars, incl. a number & symbol"
                    autoComplete="new-password"
                    className={[
                      'w-full px-3.5 py-2.5 pr-11 text-sm rounded-xl border bg-white',
                      'transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                      errors.password
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-slate-300 focus:border-blue-400',
                    ].join(' ')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPw} />
                  </button>
                </div>

                {/* Strength bar */}
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={[
                            'h-1 flex-1 rounded-full transition-all duration-300',
                            i <= strength.score ? strength.color : 'bg-slate-200',
                          ].join(' ')}
                        />
                      ))}
                    </div>
                    <p className={[
                      'text-xs font-medium',
                      strength.score <= 1 ? 'text-red-500' :
                      strength.score <= 3 ? 'text-amber-500' :
                      strength.score === 4 ? 'text-brand-navy' : 'text-green-600',
                    ].join(' ')}>
                      {strength.label} password
                      {strength.score < 3 && ' — add uppercase, numbers, or symbols'}
                    </p>
                  </div>
                )}

                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={(e) => {
                      setConfirmPw(e.target.value)
                      setErrors((er) => ({ ...er, confirmPw: undefined }))
                    }}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    className={[
                      'w-full px-3.5 py-2.5 pr-11 text-sm rounded-xl border bg-white',
                      'transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                      errors.confirmPw
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-slate-300 focus:border-blue-400',
                    ].join(' ')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>

                {/* Match indicator */}
                {password && confirmPw && password === confirmPw && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <p className="text-xs text-green-600 font-medium">Passwords match</p>
                  </div>
                )}

                {errors.confirmPw && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.confirmPw}
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || expired}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-navy text-[15px] font-semibold text-white transition hover:bg-[#0f2d56] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Resetting password…
                </>
              ) : expired ? 'Code expired. Send a new one to continue' : 'Save new password'}
            </button>

          </form>
        </div>
    </AuthShell>
  )
}

export default ResetPasswordPage
