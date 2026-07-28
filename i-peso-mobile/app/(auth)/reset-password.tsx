import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import type { AxiosError } from 'axios'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { authService } from '@/services/authService'
import { API_BASE_URL } from '@/services/api'
import { AuthShell } from '@/components/ui/AuthShell'
import { PasswordField } from '@/components/ui/PasswordField'
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter'
import { OtpInput, type OtpInputHandle } from '@/components/ui/OtpInput'
import { Button } from '@/components/ui/Button'
import { colors, radii, spacing, typography } from '@/theme'

interface ResetPasswordParams {
  email?: string
  freshSent?: string
}

interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
}

const OTP_EXPIRY_SECONDS = 600 // 10 minutes — matches Laravel cache TTL
const RESEND_COOLDOWN    = 60  // 60 seconds before resend is allowed

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60)
  const sec = secs % 60
  return `${m}:${sec < 10 ? '0' : ''}${sec}`
}

export default function ResetPasswordScreen() {
  const { email: rawEmail, freshSent } = useLocalSearchParams<ResetPasswordParams>()
  const email = rawEmail ?? ''

  const [digits, setDigits] = useState(Array(6).fill(''))
  const otpRef = useRef<OtpInputHandle>(null)

  const [password, setPassword]           = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [errors, setErrors]         = useState<Record<string, string>>({})
  const [apiError, setApiError]     = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending]   = useState(false)
  const [success, setSuccess]       = useState(false)

  const [expiry, setExpiry]   = useState(OTP_EXPIRY_SECONDS)
  const [expired, setExpired] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(freshSent === '1' ? RESEND_COOLDOWN : 0)
  const [canResend, setCanResend] = useState(freshSent !== '1')

  // Guard: no email in route params → the flow must restart from Forgot Password
  useEffect(() => {
    if (!email) router.replace('/(auth)/forgot-password')
  }, [email])

  useEffect(() => {
    setTimeout(() => otpRef.current?.focus(0), 400)
  }, [])

  useEffect(() => {
    if (expiry <= 0) { setExpired(true); return }
    const t = setTimeout(() => setExpiry((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [expiry])

  useEffect(() => {
    if (resendCooldown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const expiryColor = expired ? colors.danger : expiry < 120 ? colors.warning : colors.success
  const expiryBg    = expired ? colors.dangerBackground : expiry < 120 ? colors.warningBackground : colors.successBackground
  const expiryBorder = expired ? colors.dangerBorder : expiry < 120 ? colors.warningBorder : colors.successBorder

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, '$1***$2') || email

  const handleDigitsChange = (updated: string[]) => {
    setDigits(updated)
    setApiError('')
    setErrors((e) => ({ ...e, otp: '' }))
  }

  const handlePasswordChange = (setter: (value: string) => void, field: string) => (value: string) => {
    setter(value)
    setErrors((e) => ({ ...e, [field]: '' }))
    setApiError('')
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (digits.join('').length < 6) e.otp = 'Please enter the full 6-digit code.'
    if (!password) e.password = 'New password is required.'
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (!confirmPassword) e.confirmPassword = 'Please confirm your new password.'
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match.'
    return e
  }

  const handleSubmit = async () => {
    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length) return

    setIsSubmitting(true)
    setApiError('')

    try {
      await authService.resetPassword(email, digits.join(''), password, confirmPassword)
      setSuccess(true)
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorBody>
      const response = err.response

      if (response?.status === 422) {
        const serverErrors = response.data?.errors
        if (serverErrors) {
          const mapped: Record<string, string> = {}
          if (serverErrors.otp?.[0]) mapped.otp = serverErrors.otp[0]
          if (serverErrors.password?.[0]) mapped.password = serverErrors.password[0]
          setErrors((e) => ({ ...e, ...mapped }))
          setApiError(response.data?.message ?? 'Please check the highlighted fields.')
        } else {
          // Custom 422: invalid/expired code
          setApiError(response.data?.message ?? 'Invalid or expired code. Please request a new one.')
          setDigits(Array(6).fill(''))
          setTimeout(() => otpRef.current?.focus(0), 100)
        }
      } else if (response?.status === 404) {
        setApiError(response.data?.message ?? 'We could not find an account for that email.')
      } else if (response?.status === 429) {
        setApiError('Too many attempts. Please wait a moment before trying again.')
      } else if (!response) {
        const reason = err.code === 'ECONNABORTED' ? 'The request timed out.' : 'The backend could not be reached.'
        setApiError(`${reason} Make sure it is running at ${API_BASE_URL} and both devices use the same Wi-Fi.`)
      } else {
        setApiError(response.data?.message ?? 'Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!canResend || isResending) return
    setIsResending(true)
    setApiError('')

    try {
      await authService.forgotPassword(email)
      setExpiry(OTP_EXPIRY_SECONDS)
      setExpired(false)
      setResendCooldown(RESEND_COOLDOWN)
      setCanResend(false)
      setDigits(Array(6).fill(''))
      setTimeout(() => otpRef.current?.focus(0), 100)
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorBody>
      const response = err.response
      if (response?.status === 429) {
        setApiError('Too many attempts. Please wait a moment before requesting another code.')
      } else {
        setApiError(response?.data?.message ?? 'Could not resend code. Please try again.')
      }
    } finally {
      setIsResending(false)
    }
  }

  if (success) {
    return (
      <View style={s.successContainer}>
        <View style={s.successIconWrap}>
          <MaterialIcons name="check" size={36} color={colors.success} />
        </View>
        <Text style={s.successTitle}>Password reset!</Text>
        <Text style={s.successSub}>
          Your password has been updated successfully.{'\n'}You can now sign in with your new password.
        </Text>
        <Button fullWidth onPress={() => router.replace('/(auth)/login')}>
          Back to Sign In
        </Button>
      </View>
    )
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={
        <>
          Enter the code sent to{'\n'}
          <Text style={s.emailHighlight}>{maskedEmail}</Text>
        </>
      }
      onBack={() => router.replace('/(auth)/forgot-password')}
      apiError={apiError}
      headerExtra={
        <View style={[s.expiryBanner, { backgroundColor: expiryBg, borderColor: expiryBorder }]}>
          <Text style={[s.expiryLabel, { color: expiryColor }]}>
            {expired ? 'Code has expired' : 'Code expires in'}
          </Text>
          {!expired ? (
            <Text style={[s.expiryTime, { color: expiryColor }]}>{formatTime(expiry)}</Text>
          ) : (
            <Text style={[s.expiryLabel, { color: expiryColor, fontFamily: typography.family.bold }]}>Request a new one below</Text>
          )}
        </View>
      }
    >
      <Text style={s.otpLabel}>6-Digit Reset Code</Text>
      <OtpInput ref={otpRef} digits={digits} onChangeDigits={handleDigitsChange} disabled={expired} error={Boolean(errors.otp)} />
      {errors.otp ? <Text style={s.otpError}>{errors.otp}</Text> : null}

      <View style={s.resendRow}>
        {canResend ? (
          <TouchableOpacity onPress={handleResend} disabled={isResending}>
            {isResending ? (
              <ActivityIndicator size="small" color={colors.info} />
            ) : (
              <Text style={s.resendLink}>Resend reset code</Text>
            )}
          </TouchableOpacity>
        ) : (
          <Text style={s.resendTimer}>
            Resend available in <Text style={s.resendCount}>{resendCooldown}s</Text>
          </Text>
        )}
      </View>

      <View style={s.divider} />

      <PasswordField
        label="New Password"
        value={password}
        onChangeText={handlePasswordChange(setPassword, 'password')}
        placeholder="Minimum 8 characters"
        error={errors.password}
      />
      <PasswordStrengthMeter password={password} />

      <PasswordField
        label="Confirm New Password"
        value={confirmPassword}
        onChangeText={handlePasswordChange(setConfirmPassword, 'confirmPassword')}
        placeholder="Re-enter new password"
        error={errors.confirmPassword}
      />
      {password && confirmPassword && password === confirmPassword ? (
        <Text style={s.matchText}>Passwords match</Text>
      ) : null}

      <Button fullWidth onPress={handleSubmit} disabled={isSubmitting || expired} style={s.submit}>
        {isSubmitting ? 'Resetting...' : expired ? 'Code expired — resend to continue' : 'Reset Password'}
      </Button>
    </AuthShell>
  )
}

const s = StyleSheet.create({
  emailHighlight : { fontFamily: typography.family.bold, color: colors.primary },
  expiryBanner   : { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.lg },
  expiryLabel    : { fontSize: typography.small, fontFamily: typography.family.bold },
  expiryTime     : { fontSize: typography.title, fontFamily: typography.family.bold },
  otpLabel       : { fontSize: typography.small, fontFamily: typography.family.bold, color: colors.muted, marginBottom: spacing.md, textAlign: 'center' },
  otpError       : { color: colors.danger, fontSize: typography.label, marginTop: spacing.xs, marginBottom: spacing.sm, fontFamily: typography.family.medium, textAlign: 'center' },
  resendRow      : { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
  resendLink     : { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  resendTimer    : { fontSize: typography.small, color: colors.subtle },
  resendCount    : { fontFamily: typography.family.bold, color: colors.muted },
  divider        : { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.md, marginBottom: spacing.lg },
  matchText      : { color: colors.success, fontSize: typography.small, fontFamily: typography.family.bold, marginTop: -spacing.sm, marginBottom: spacing.md },
  submit         : { marginTop: spacing.xs },

  successContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  successIconWrap : { width: 76, height: 76, borderRadius: radii.xl, backgroundColor: colors.successBackground, borderWidth: 2, borderColor: colors.successBorder, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl },
  successTitle    : { fontSize: typography.hero, fontFamily: typography.family.display, color: colors.primary, marginBottom: spacing.md, textAlign: 'center' },
  successSub      : { fontSize: typography.body, color: colors.secondaryText, textAlign: 'center', lineHeight: 21, marginBottom: spacing.xxl },
})
