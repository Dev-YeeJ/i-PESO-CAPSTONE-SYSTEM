import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import type { KeyboardTypeOptions } from 'react-native'
import { router } from 'expo-router'
import type { AxiosError } from 'axios'
import { authService } from '@/services/authService'
import type { SeekerRegisterPayload } from '@/services/authService'

interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
}

interface FieldProps {
  label: string
  name: string
  value: string
  onChangeText: (name: string, value: string) => void
  placeholder?: string
  keyboard?: KeyboardTypeOptions
  secure?: boolean
  showToggle?: boolean
  toggleState?: boolean
  onToggle?: () => void
  error?: string
}

const getStrength = (password: string) => {
  if (!password) return { score: 0, label: '', color: '#e2e8f0' }

  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' }
  if (score <= 3) return { score, label: 'Fair', color: '#f59e0b' }
  if (score === 4) return { score, label: 'Good', color: '#3b82f6' }
  return { score, label: 'Strong', color: '#10b981' }
}

const normalizeMobileNumber = (value: string) => {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('639')) digits = `0${digits.slice(2)}`
  if (digits.startsWith('9')) digits = `0${digits}`
  return digits.slice(0, 11)
}

const firstServerError = (errors: Record<string, string[]> = {}) => {
  const firstKey = Object.keys(errors)[0]
  return firstKey ? errors[firstKey]?.[0] : ''
}

const Field = ({
  label,
  name,
  value,
  onChangeText,
  placeholder,
  keyboard = 'default',
  secure = false,
  showToggle = false,
  toggleState = false,
  onToggle = () => {},
  error,
}: FieldProps) => (
  <View style={fieldStyles.field}>
    <Text style={fieldStyles.label}>{label}</Text>
    <View style={secure ? fieldStyles.passwordWrap : null}>
      <TextInput
        style={[
          secure ? fieldStyles.passwordInput : fieldStyles.input,
          error ? fieldStyles.inputError : null,
        ]}
        value={value}
        onChangeText={(text) => onChangeText(name, text)}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboard}
        secureTextEntry={secure && !toggleState}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {showToggle && (
        <TouchableOpacity style={fieldStyles.eyeButton} onPress={onToggle}>
          <Text style={fieldStyles.eyeText}>{toggleState ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      )}
    </View>
    {error ? <Text style={fieldStyles.errorText}>{error}</Text> : null}
  </View>
)

export default function RegisterScreen() {
  const [form, setForm] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const strength = getStrength(form.password ?? '')

  const handleChange = useCallback((name: string, value: string) => {
    const nextValue = name === 'mobile_number' ? normalizeMobileNumber(value) : value
    setForm((current) => ({ ...current, [name]: nextValue }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setApiError('')
  }, [])

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (!form.first_name?.trim()) nextErrors.first_name = 'First name is required.'
    if (!form.last_name?.trim()) nextErrors.last_name = 'Last name is required.'

    if (!form.email?.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      nextErrors.email = 'Enter a valid email.'
    }

    if (!form.mobile_number?.trim()) {
      nextErrors.mobile_number = 'Mobile number is required.'
    } else if (!/^09\d{9}$/.test(normalizeMobileNumber(form.mobile_number))) {
      nextErrors.mobile_number = 'Use a valid PH mobile number, e.g. 09XXXXXXXXX.'
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.'
    } else if (form.password.length < 8) {
      nextErrors.password = 'Minimum 8 characters.'
    }

    if (!form.password_confirmation) {
      nextErrors.password_confirmation = 'Please confirm password.'
    } else if (form.password !== form.password_confirmation) {
      nextErrors.password_confirmation = 'Passwords do not match.'
    }

    return nextErrors
  }

  const handleSubmit = async () => {
    const validationErrors = validate()
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }

    const payload: SeekerRegisterPayload = {
      role: 'seeker',
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(),
      mobile_number: normalizeMobileNumber(form.mobile_number),
      password: form.password,
      password_confirmation: form.password_confirmation,
    }

    setIsLoading(true)
    setApiError('')

    try {
      const data = await authService.register(payload)
      router.push({
        pathname: '/(auth)/verify-email',
        params: { email: data.email ?? payload.email },
      })
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorBody>
      const response = err.response

      if (response?.status === 422) {
        const serverErrors = response.data?.errors ?? {}
        const mappedErrors: Record<string, string> = {}
        Object.keys(serverErrors).forEach((key) => {
          mappedErrors[key] = serverErrors[key][0]
        })
        setErrors(mappedErrors)
        setApiError(firstServerError(serverErrors) || response.data?.message || 'Please check the highlighted fields.')
      } else {
        setApiError(response?.data?.message ?? 'Registration failed. Check your connection to the i-PESO backend.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.logoArea}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>i</Text>
            <Text style={styles.logoDash}>-</Text>
            <Text style={styles.logoPeso}>PESO</Text>
          </View>
          <Text style={styles.logoSub}>URDANETA CITY</Text>
        </View>

        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Register as a job seeker on your phone</Text>

        {apiError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{apiError}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.nameRow}>
            <View style={styles.nameHalf}>
              <Field
                label="First Name"
                name="first_name"
                value={form.first_name ?? ''}
                onChangeText={handleChange}
                placeholder="Juan"
                error={errors.first_name}
              />
            </View>
            <View style={styles.nameHalf}>
              <Field
                label="Last Name"
                name="last_name"
                value={form.last_name ?? ''}
                onChangeText={handleChange}
                placeholder="Dela Cruz"
                error={errors.last_name}
              />
            </View>
          </View>

          <Field
            label="Email Address"
            name="email"
            value={form.email ?? ''}
            onChangeText={handleChange}
            placeholder="you@example.com"
            keyboard="email-address"
            error={errors.email}
          />

          <Field
            label="Mobile Number"
            name="mobile_number"
            value={form.mobile_number ?? ''}
            onChangeText={handleChange}
            placeholder="09XXXXXXXXX"
            keyboard="phone-pad"
            error={errors.mobile_number}
          />

          <Field
            label="Password"
            name="password"
            value={form.password ?? ''}
            onChangeText={handleChange}
            placeholder="Minimum 8 characters"
            secure
            showToggle
            toggleState={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
            error={errors.password}
          />

          {form.password ? (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthBar}>
                {[1, 2, 3, 4, 5].map((index) => (
                  <View
                    key={index}
                    style={[
                      styles.strengthSegment,
                      { backgroundColor: index <= strength.score ? strength.color : '#e2e8f0' },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>
                {strength.label} password
              </Text>
            </View>
          ) : null}

          <Field
            label="Confirm Password"
            name="password_confirmation"
            value={form.password_confirmation ?? ''}
            onChangeText={handleChange}
            placeholder="Re-enter your password"
            secure
            showToggle
            toggleState={showConfirmation}
            onToggle={() => setShowConfirmation(!showConfirmation)}
            error={errors.password_confirmation}
          />

          {form.password && form.password_confirmation && form.password === form.password_confirmation ? (
            <View style={styles.matchRow}>
              <Text style={styles.matchText}>Passwords match</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const fieldStyles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  inputError: { borderColor: '#fca5a5' },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#0f172a',
  },
  eyeButton: { paddingHorizontal: 14, paddingVertical: 13 },
  eyeText: { color: '#2563eb', fontSize: 12, fontWeight: '700' },
  errorText: { color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: '500' },
})

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  back: { marginBottom: 16 },
  backText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  logoArea: { alignItems: 'center', marginBottom: 16 },
  logoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 6,
  },
  logoLetter: { color: '#93c5fd', fontSize: 20, fontWeight: '700' },
  logoDash: { color: '#60a5fa', fontSize: 20, fontWeight: '300', marginHorizontal: 1 },
  logoPeso: { color: '#ffffff', fontSize: 20, fontWeight: '700', letterSpacing: 1 },
  logoSub: { fontSize: 10, color: '#94a3b8', letterSpacing: 3, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: '#b91c1c', fontSize: 13, textAlign: 'center' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    marginBottom: 20,
  },
  nameRow: { flexDirection: 'row', gap: 10 },
  nameHalf: { flex: 1 },
  strengthWrap: { marginTop: -6, marginBottom: 10 },
  strengthBar: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  strengthSegment: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '600' },
  matchRow: { marginTop: -6, marginBottom: 10 },
  matchText: { color: '#10b981', fontSize: 12, fontWeight: '600' },
  button: {
    backgroundColor: '#1d4ed8',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: '#64748b' },
  footerLink: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
})
