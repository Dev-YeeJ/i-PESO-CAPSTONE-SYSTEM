import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'

interface AuthState {
  setAuth: (user: any, token: string) => Promise<void>
}

const validate = (email: string, password: string) => {
  const e: Record<string, string> = {}
  if (!email.trim())                    e.email    = 'Email is required.'
  else if (!/\S+@\S+\.\S+/.test(email)) e.email    = 'Enter a valid email.'
  if (!password)                        e.password = 'Password is required.'
  else if (password.length < 8)         e.password = 'Minimum 8 characters.'
  return e
}

export default function LoginScreen() {
  const setAuth = useAuthStore((s: AuthState) => s.setAuth)

  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [apiError, setApiError]   = useState('')
  const [touched, setTouched]     = useState<Record<string, boolean>>({})

  const getError = (field: string) => touched[field] ? errors[field] : ''

  const handleBlur = (field: string) => {
    setTouched((t) => ({ ...t, [field]: true }))
    setErrors(validate(email, password))
  }

  const handleLogin = async () => {
    setTouched({ email: true, password: true })
    const errs = validate(email, password)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setIsLoading(true)
    setApiError('')

    try {
      const data = await authService.login(email, password)
      if (data.user.role !== 'seeker') {
        setApiError('This app is for Job Seekers only. Use the web portal.')
        return
      }

      await setAuth(data.user, data.token)
      router.replace(data.user.profile_completed ? '/(seeker)' : '/onboarding')
    } catch (err: any) {
      const status = err.response?.status
      if (status === 403 && err.response?.data?.email_unverified) {
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email: err.response.data.email },
        })
        return
      }
      setApiError(err.response?.data?.message ?? 'Login failed. Check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoArea}>
          <View style={s.logoBox}>
            <Text style={s.logoLetter}>i</Text>
            <Text style={s.logoDash}>-</Text>
            <Text style={s.logoPeso}>PESO</Text>
          </View>
          <Text style={s.logoSub}>URDANETA CITY</Text>
        </View>

        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Sign in to your i-PESO account</Text>

        {/* API Error Banner */}
        {apiError ? (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerIcon}>⚠</Text>
            <Text style={s.errorBannerText}>{apiError}</Text>
          </View>
        ) : null}

        {/* Card */}
        <View style={s.card}>

          {/* Email Field */}
          <View style={s.field}>
            <Text style={s.label}>Email Address</Text>
            <TextInput
              style={[s.input, getError('email') ? s.inputError : null]}
              value={email}
              onChangeText={(v) => {
                setEmail(v)
                setApiError('')
                setErrors((e) => ({ ...e, email: '' }))
              }}
              onBlur={() => handleBlur('email')}
              placeholder="you@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {getError('email') ? (
              <Text style={s.fieldError}>{getError('email')}</Text>
            ) : null}
          </View>

          {/* Password Field */}
          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={s.label}>Password</Text>
              <Text style={s.forgotLink}>Forgot password is available on the web portal.</Text>
            </View>
            <View style={[s.pwWrap, getError('password') ? s.inputError : null]}>
              <TextInput
                style={s.pwInput}
                value={password}
                onChangeText={(v) => {
                  setPassword(v)
                  setApiError('')
                  setErrors((e) => ({ ...e, password: '' }))
                }}
                onBlur={() => handleBlur('password')}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowPw(!showPw)}
              >
                <Text style={s.eyeText}>{showPw ? '👁' : '🙈'}</Text>
              </TouchableOpacity>
            </View>
            {getError('password') ? (
              <Text style={s.fieldError}>{getError('password')}</Text>
            ) : null}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[s.button, isLoading && s.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Do not have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={s.footerLink}>Register here</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.adminNote}>
          For PESO Admin access, use the web portal.
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  flex           : { flex: 1, backgroundColor: '#f8fafc' },
  container      : { flexGrow: 1, paddingHorizontal: 24, paddingTop: 72, paddingBottom: 40 },
  logoArea       : { alignItems: 'center', marginBottom: 28 },
  logoBox        : { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1d4ed8', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 6 },
  logoLetter     : { color: '#93c5fd', fontSize: 22, fontWeight: '700' },
  logoDash       : { color: '#60a5fa', fontSize: 22, fontWeight: '300', marginHorizontal: 1 },
  logoPeso       : { color: '#ffffff', fontSize: 22, fontWeight: '700', letterSpacing: 1 },
  logoSub        : { fontSize: 10, color: '#94a3b8', letterSpacing: 3, fontWeight: '600' },
  title          : { fontSize: 26, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 6 },
  subtitle       : { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  errorBanner    : { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 14, padding: 14, marginBottom: 16 },
  errorBannerIcon: { fontSize: 14, color: '#ef4444', marginTop: 1 },
  errorBannerText: { flex: 1, color: '#b91c1c', fontSize: 13, lineHeight: 19 },
  card           : { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 24, marginBottom: 20 },
  field          : { marginBottom: 18 },
  label          : { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 7 },
  labelRow       : { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  forgotLink     : { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  input          : { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc' },
  inputError     : { borderColor: '#fca5a5', borderWidth: 1 },
  pwWrap         : { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc' },
  pwInput        : { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#0f172a' },
  eyeBtn         : { paddingHorizontal: 14, paddingVertical: 13 },
  eyeText        : { fontSize: 16 },
  fieldError     : { color: '#ef4444', fontSize: 11, marginTop: 5, fontWeight: '500' },
  button         : { backgroundColor: '#1d4ed8', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4, shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  buttonDisabled : { opacity: 0.6 },
  buttonText     : { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  footer         : { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  footerText     : { fontSize: 14, color: '#64748b' },
  footerLink     : { fontSize: 14, color: '#2563eb', fontWeight: '700' },
  adminNote      : { textAlign: 'center', fontSize: 11, color: '#cbd5e1' },
})
