import { useState, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { AlertBox } from '@/components/ui/AlertBox'
import { OtpInput, type OtpInputHandle } from '@/components/ui/OtpInput'
import { Button } from '@/components/ui/Button'
import { colors, radii, spacing, typography } from '@/theme'

interface AuthState {
  setAuth: (user: any, token: string) => Promise<void>
}

const RESEND_COOLDOWN = 60

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>()
  const setAuth   = useAuthStore((s: AuthState) => s.setAuth)

  const [digits, setDigits]           = useState(Array(6).fill(''))
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [apiError, setApiError]       = useState('')
  const [countdown, setCountdown]     = useState(RESEND_COOLDOWN)
  const [canResend, setCanResend]     = useState(false)
  const otpRef = useRef<OtpInputHandle>(null)

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Auto-focus first box
  useEffect(() => {
    setTimeout(() => otpRef.current?.focus(0), 400)
  }, [])

  // Guard: no email → back to register
  useEffect(() => {
    if (!email) router.replace('/(auth)/register')
  }, [email])

  const handleDigitsChange = (updated: string[]) => {
    setDigits(updated)
    setApiError('')
  }

  const handleVerify = async () => {
    const otp = digits.join('')
    if (otp.length < 6) {
      setApiError('Please enter all 6 digits.')
      return
    }

    setIsVerifying(true)
    setApiError('')

    try {
      const data = await authService.verifyOtp(email!, otp)
      if (data.user.role !== 'seeker') {
        setApiError('This app is for Job Seekers only. Use the web portal.')
        router.replace('/(auth)/login')
        return
      }

      await setAuth(data.user, data.token)
      router.replace(data.user.profile_completed ? '/(seeker)' : '/onboarding')
    } catch (err: any) {
      // 5 failed attempts trigger a 429 lockout server-side — same "too many
      // attempts" messaging pattern as login's lockout, distinct from a
      // plain wrong-code message.
      const fallback = err.response?.status === 429
        ? 'Too many attempts. Please wait a moment before trying again.'
        : 'Invalid code. Please try again.'
      setApiError(err.response?.data?.message ?? fallback)
      setDigits(Array(6).fill(''))
      setTimeout(() => otpRef.current?.focus(0), 100)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (!canResend || isResending) return
    setIsResending(true)
    setApiError('')
    try {
      await authService.resendOtp(email!)
      setCountdown(RESEND_COOLDOWN)
      setCanResend(false)
      setDigits(Array(6).fill(''))
      setTimeout(() => otpRef.current?.focus(0), 100)
    } catch (err: any) {
      setApiError(err.response?.data?.message ?? 'Could not resend. Try again.')
    } finally {
      setIsResending(false)
    }
  }

  const maskedEmail = email?.replace(/(.{2}).+(@.+)/, '$1***$2') ?? ''
  const otpComplete = digits.join('').length === 6

  return (
    <View style={s.container}>
      <View style={s.iconWrap}>
        <View style={s.iconBox}>
          <MaterialIcons name="mark-email-read" size={34} color={colors.info} />
        </View>
      </View>

      <Text style={s.title}>Check your email</Text>
      <Text style={s.sub}>
        We sent a 6-digit code to{'\n'}
        <Text style={s.emailHighlight}>{maskedEmail}</Text>
      </Text>

      {apiError ? <AlertBox variant="danger" style={s.errorBox}>{apiError}</AlertBox> : null}

      <OtpInput ref={otpRef} digits={digits} onChangeDigits={handleDigitsChange} error={Boolean(apiError)} />

      <Button fullWidth disabled={!otpComplete || isVerifying} onPress={handleVerify} style={s.button}>
        {isVerifying ? 'Verifying...' : 'Verify Email'}
      </Button>

      <View style={s.resendRow}>
        {canResend ? (
          <TouchableOpacity onPress={handleResend} disabled={isResending}>
            {isResending ? (
              <ActivityIndicator size="small" color={colors.info} />
            ) : (
              <Text style={s.resendLink}>Resend verification code</Text>
            )}
          </TouchableOpacity>
        ) : (
          <Text style={s.resendTimer}>
            Resend in <Text style={s.resendCount}>{countdown}s</Text>
          </Text>
        )}
      </View>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={s.backBtn}>
        <MaterialIcons name="arrow-back" size={14} color={colors.subtle} />
        <Text style={s.backText}>Wrong email? Go back</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container      : { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl + spacing.xs, justifyContent: 'center', alignItems: 'center' },
  iconWrap       : { marginBottom: spacing.xl },
  iconBox        : { width: 76, height: 76, backgroundColor: colors.infoBackground, borderWidth: 1, borderColor: colors.infoBorder, borderRadius: radii.xl - 2, justifyContent: 'center', alignItems: 'center' },
  title          : { fontSize: typography.hero, fontFamily: typography.family.display, color: colors.primary, textAlign: 'center', marginBottom: spacing.sm },
  sub            : { fontSize: typography.body, color: colors.secondaryText, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  emailHighlight : { fontFamily: typography.family.bold, color: colors.primary, fontSize: typography.body },
  errorBox       : { width: '100%', marginBottom: spacing.lg },
  button         : { width: '100%', marginTop: spacing.xl, marginBottom: spacing.lg },
  resendRow      : { marginBottom: spacing.xl, alignItems: 'center' },
  resendLink     : { color: colors.info, fontSize: typography.body, fontFamily: typography.family.bold },
  resendTimer    : { fontSize: typography.small, color: colors.subtle },
  resendCount    : { fontFamily: typography.family.bold, color: colors.muted, fontSize: typography.small },
  backBtn        : { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  backText       : { color: colors.subtle, fontSize: typography.label, fontFamily: typography.family.medium },
})
