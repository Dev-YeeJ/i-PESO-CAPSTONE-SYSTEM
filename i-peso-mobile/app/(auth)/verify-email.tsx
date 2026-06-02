import { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'

interface AuthState {
  setAuth: (user: any, token: string) => Promise<void>
}

const RESEND_COOLDOWN = 60

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>()
  const setAuth   = useAuthStore((s: AuthState) => s.setAuth)

  const [digits, setDigits]           = useState(Array(6).fill(''))
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [apiError, setApiError]       = useState('')
  const [countdown, setCountdown]     = useState(RESEND_COOLDOWN)
  const [canResend, setCanResend]     = useState(false)
  const inputRefs = useRef<(TextInput | null)[]>([])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Auto-focus first box
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 400)
  }, [])

  // Guard: no email → back to register
  useEffect(() => {
    if (!email) router.replace('/(auth)/register')
  }, [email])

  const handleChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, '').slice(-1)
    const updated   = [...digits]
    updated[index]  = sanitized
    setDigits(updated)
    setApiError('')
    if (sanitized && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const updated    = [...digits]
      updated[index - 1] = ''
      setDigits(updated)
      inputRefs.current[index - 1]?.focus()
    }
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
      await setAuth(data.user, data.token)

      if (data.user.role === 'seeker') {
        router.replace('/(seeker)/')
      } else {
        router.replace('/(auth)/login')
      }
    } catch (err: any) {
      setApiError(err.response?.data?.message ?? 'Invalid code. Please try again.')
      setDigits(Array(6).fill(''))
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
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
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
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

      {/* Icon */}
      <View style={s.iconWrap}>
        <View style={s.iconBox}>
          <Text style={s.iconEmoji}>✉️</Text>
        </View>
      </View>

      {/* Header */}
      <Text style={s.title}>Check your email</Text>
      <Text style={s.sub}>
        We sent a 6-digit code to{'\n'}
        <Text style={s.emailHighlight}>{maskedEmail}</Text>
      </Text>

      {/* Error */}
      {apiError ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{apiError}</Text>
        </View>
      ) : null}

      {/* OTP Boxes */}
      <View style={s.otpRow}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(el) => { inputRefs.current[index] = el }}
            style={[
              s.otpBox,
              digit ? s.otpBoxFilled : null,
              apiError ? s.otpBoxError : null,
            ]}
            value={digit}
            onChangeText={(v) => handleChange(index, v)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            selectTextOnFocus
            caretHidden
          />
        ))}
      </View>

      {/* Verify Button */}
      <TouchableOpacity
        style={[s.button, (!otpComplete || isVerifying) && s.buttonDisabled]}
        onPress={handleVerify}
        disabled={!otpComplete || isVerifying}
        activeOpacity={0.85}
      >
        {isVerifying ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={s.buttonText}>Verify Email</Text>
        )}
      </TouchableOpacity>

      {/* Resend */}
      <View style={s.resendRow}>
        {canResend ? (
          <TouchableOpacity onPress={handleResend} disabled={isResending}>
            {isResending ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Text style={s.resendLink}>Resend verification code</Text>
            )}
          </TouchableOpacity>
        ) : (
          <Text style={s.resendTimer}>
            Resend in{' '}
            <Text style={s.resendCount}>{countdown}s</Text>
          </Text>
        )}
      </View>

      {/* Back */}
      <TouchableOpacity
        onPress={() => router.push('/(auth)/register')}
        style={s.backBtn}
      >
        <Text style={s.backText}>← Wrong email? Go back</Text>
      </TouchableOpacity>

    </View>
  )
}

const s = StyleSheet.create({
  container      : { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center' },
  iconWrap       : { marginBottom: 20 },
  iconBox        : { width: 76, height: 76, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  iconEmoji      : { fontSize: 34 },
  title          : { fontSize: 26, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 10 },
  sub            : { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emailHighlight : { fontWeight: '700', color: '#1e293b', fontSize: 14 },
  errorBox       : { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 16, width: '100%' },
  errorText      : { color: '#b91c1c', fontSize: 13, textAlign: 'center', fontWeight: '500' },
  otpRow         : { flexDirection: 'row', gap: 10, marginBottom: 28 },
  otpBox         : { width: 46, height: 56, borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 14, fontSize: 22, fontWeight: '700', color: '#0f172a', backgroundColor: '#ffffff' },
  otpBoxFilled   : { borderColor: '#2563eb', borderWidth: 2, backgroundColor: '#eff6ff', color: '#1d4ed8' },
  otpBoxError    : { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  button         : { backgroundColor: '#1d4ed8', borderRadius: 14, paddingVertical: 15, alignItems: 'center', width: '100%', marginBottom: 18, shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  buttonDisabled : { opacity: 0.5 },
  buttonText     : { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  resendRow      : { marginBottom: 20, alignItems: 'center' },
  resendLink     : { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  resendTimer    : { fontSize: 13, color: '#94a3b8' },
  resendCount    : { fontWeight: '700', color: '#475569', fontSize: 13 },
  backBtn        : { marginTop: 4 },
  backText       : { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
})