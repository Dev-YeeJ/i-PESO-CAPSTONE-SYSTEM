import { useState, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { authService } from '@/services/authService'

const EDUC_OPTIONS = [
  'Elementary Graduate',
  'High School Graduate',
  'Senior High School Graduate',
  'Vocational / Technical',
  'College Undergraduate',
  'College Graduate',
  "Master's Degree",
  'Doctorate',
]

const getStrength = (pw: string) => {
  if (!pw) return { score: 0, label: '', color: '#e2e8f0' }
  let score = 0
  if (pw.length >= 8)          score++
  if (pw.length >= 12)         score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak',   color: '#ef4444' }
  if (score <= 3) return { score, label: 'Fair',   color: '#f59e0b' }
  if (score === 4) return { score, label: 'Good',  color: '#3b82f6' }
  return { score, label: 'Strong', color: '#10b981' }
}

// ✅ OUTSIDE the component — never recreated on re-render
interface FieldProps {
  label: string
  name: string
  value: string
  onChangeText: (name: string, value: string) => void
  placeholder?: string
  keyboard?: any
  secure?: boolean
  showToggle?: boolean
  toggleState?: boolean
  onToggle?: () => void
  error?: string
}

const Field = ({
  label, name, value, onChangeText,
  placeholder, keyboard = 'default',
  secure = false, showToggle = false,
  toggleState = false, onToggle = () => {},
  error,
}: FieldProps) => (
  <View style={fs.field}>
    <Text style={fs.label}>{label}</Text>
    <View style={secure ? fs.pwWrap : null}>
      <TextInput
        style={[
          secure ? fs.pwInput : fs.input,
          error ? fs.inputErr : null,
        ]}
        value={value}
        onChangeText={(v) => onChangeText(name, v)}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboard}
        secureTextEntry={secure && !toggleState}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {showToggle && (
        <TouchableOpacity style={fs.eye} onPress={onToggle}>
          <Text style={{ fontSize: 16 }}>{toggleState ? '👁' : '🙈'}</Text>
        </TouchableOpacity>
      )}
    </View>
    {error ? <Text style={fs.err}>{error}</Text> : null}
  </View>
)

// Field styles — outside component so they're never recreated
const fs = StyleSheet.create({
  field   : { marginBottom: 14 },
  label   : { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 5 },
  input   : { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc' },
  inputErr: { borderColor: '#fca5a5' },
  pwWrap  : { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc' },
  pwInput : { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#0f172a' },
  eye     : { paddingHorizontal: 14, paddingVertical: 13 },
  err     : { color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: '500' },
})

export default function RegisterScreen() {
  const [form, setForm]           = useState<Record<string, string>>({})
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [apiError, setApiError]   = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPw, setShowPw]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [educOpen, setEducOpen]   = useState(false)

  const strength = getStrength(form.password ?? '')

  // ✅ useCallback prevents new function reference on every render
  const handleChange = useCallback((name: string, value: string) => {
    setForm((f) => ({ ...f, [name]: value }))
    setErrors((e) => ({ ...e, [name]: '' }))
    setApiError('')
  }, [])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.first_name?.trim())       e.first_name       = 'First name is required.'
    if (!form.last_name?.trim())        e.last_name        = 'Last name is required.'
    if (!form.educ_attainment)          e.educ_attainment  = 'Please select attainment.'
    if (!form.email?.trim())            e.email            = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email    = 'Enter a valid email.'
    if (!form.mobile_number?.trim())    e.mobile_number    = 'Mobile number is required.'
    if (!form.complete_address?.trim()) e.complete_address = 'Address is required.'
    if (!form.password)                 e.password         = 'Password is required.'
    else if (form.password.length < 8)  e.password         = 'Minimum 8 characters.'
    if (!form.password_confirmation)    e.password_confirmation = 'Please confirm password.'
    else if (form.password !== form.password_confirmation)
                                        e.password_confirmation = 'Passwords do not match.'
    return e
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setIsLoading(true)
    setApiError('')

    try {
      const data = await authService.register({ ...form, role: 'seeker' })
      router.push({
        pathname: '/(auth)/verify-email',
        params: { email: data.email },
      })
    } catch (err: any) {
      // --- ADDED LOGGING HERE ---
      console.log("-----------------------------------------");
      console.log("🚨 REGISTRATION ERROR DETAILS:");
      console.log("FULL ERROR OBJECT:", err);
      if (err.response) {
        console.log("SERVER RESPONSE DATA:", err.response.data);
        console.log("STATUS CODE:", err.response.status);
      } else {
        console.log("NETWORK ERROR MESSAGE:", err.message);
      }
      console.log("-----------------------------------------");
      // ---------------------------

      if (err.response?.status === 422) {
        const serverErrors: Record<string, string[]> = err.response.data.errors ?? {}
        const mapped: Record<string, string> = {}
        Object.keys(serverErrors).forEach((k) => {
          mapped[k] = serverErrors[k][0]
        })
        setErrors(mapped)
      } else {
        setApiError(err.response?.data?.message ?? 'Registration failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Logo */}
        <View style={s.logoArea}>
          <View style={s.logoBox}>
            <Text style={s.logoLetter}>i</Text>
            <Text style={s.logoDash}>-</Text>
            <Text style={s.logoPeso}>PESO</Text>
          </View>
          <Text style={s.logoSub}>URDANETA CITY</Text>
        </View>

        <Text style={s.title}>Create your account</Text>
        <Text style={s.subtitle}>Job Seeker Registration</Text>

        {/* API Error */}
        {apiError ? (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>{apiError}</Text>
          </View>
        ) : null}

        {/* Card */}
        <View style={s.card}>

          {/* Name row */}
          <View style={s.nameRow}>
            <View style={s.nameHalf}>
              <Field
                label="First Name"
                name="first_name"
                value={form.first_name ?? ''}
                onChangeText={handleChange}
                placeholder="Juan"
                error={errors.first_name}
              />
            </View>
            <View style={s.nameHalf}>
              <Field
                label="Last Name"
                name="last_name"
                value={form.last_name ?? ''}
                onChangeText={handleChange}
                placeholder="dela Cruz"
                error={errors.last_name}
              />
            </View>
          </View>

          {/* Educational Attainment Picker */}
          <View style={fs.field}>
            <Text style={fs.label}>Educational Attainment</Text>
            <TouchableOpacity
              style={[s.picker, errors.educ_attainment ? fs.inputErr : null]}
              onPress={() => setEducOpen(!educOpen)}
              activeOpacity={0.8}
            >
              <Text style={form.educ_attainment ? s.pickerValue : s.pickerPlaceholder}>
                {form.educ_attainment ?? 'Select highest attainment'}
              </Text>
              <Text style={s.pickerArrow}>{educOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {educOpen && (
              <View style={s.dropdown}>
                {EDUC_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={s.dropItem}
                    onPress={() => {
                      handleChange('educ_attainment', opt)
                      setEducOpen(false)
                    }}
                  >
                    <Text style={[
                      s.dropItemText,
                      form.educ_attainment === opt && s.dropItemActive,
                    ]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {errors.educ_attainment ? (
              <Text style={fs.err}>{errors.educ_attainment}</Text>
            ) : null}
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
            label="Complete Address"
            name="complete_address"
            value={form.complete_address ?? ''}
            onChangeText={handleChange}
            placeholder="Barangay, City, Province"
            error={errors.complete_address}
          />

          {/* Password */}
          <Field
            label="Password"
            name="password"
            value={form.password ?? ''}
            onChangeText={handleChange}
            placeholder="Minimum 8 characters"
            secure
            showToggle
            toggleState={showPw}
            onToggle={() => setShowPw(!showPw)}
            error={errors.password}
          />

          {/* Strength bar */}
          {form.password ? (
            <View style={s.strengthWrap}>
              <View style={s.strengthBar}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    style={[
                      s.strengthSeg,
                      { backgroundColor: i <= strength.score ? strength.color : '#e2e8f0' },
                    ]}
                  />
                ))}
              </View>
              <Text style={[s.strengthLabel, { color: strength.color }]}>
                {strength.label} password
              </Text>
            </View>
          ) : null}

          {/* Confirm Password */}
          <Field
            label="Confirm Password"
            name="password_confirmation"
            value={form.password_confirmation ?? ''}
            onChangeText={handleChange}
            placeholder="Re-enter your password"
            secure
            showToggle
            toggleState={showConfirm}
            onToggle={() => setShowConfirm(!showConfirm)}
            error={errors.password_confirmation}
          />

          {/* Match indicator */}
          {form.password && form.password_confirmation && form.password === form.password_confirmation ? (
            <View style={s.matchRow}>
              <Text style={s.matchText}>✓ Passwords match</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[s.button, isLoading && s.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={s.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  flex            : { flex: 1, backgroundColor: '#f8fafc' },
  container       : { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  back            : { marginBottom: 16 },
  backText        : { color: '#64748b', fontSize: 14, fontWeight: '500' },
  logoArea        : { alignItems: 'center', marginBottom: 16 },
  logoBox         : { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1d4ed8', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 6 },
  logoLetter      : { color: '#93c5fd', fontSize: 20, fontWeight: '700' },
  logoDash        : { color: '#60a5fa', fontSize: 20, fontWeight: '300', marginHorizontal: 1 },
  logoPeso        : { color: '#ffffff', fontSize: 20, fontWeight: '700', letterSpacing: 1 },
  logoSub         : { fontSize: 10, color: '#94a3b8', letterSpacing: 3, fontWeight: '600' },
  title           : { fontSize: 24, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 4 },
  subtitle        : { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  errorBanner     : { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorBannerText : { color: '#b91c1c', fontSize: 13, textAlign: 'center' },
  card            : { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, marginBottom: 20 },
  nameRow         : { flexDirection: 'row', gap: 10 },
  nameHalf        : { flex: 1 },
  picker          : { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#f8fafc' },
  pickerValue     : { fontSize: 14, color: '#0f172a' },
  pickerPlaceholder: { fontSize: 14, color: '#94a3b8' },
  pickerArrow     : { fontSize: 10, color: '#94a3b8' },
  dropdown        : { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#fff', marginTop: 4, overflow: 'hidden' },
  dropItem        : { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  dropItemText    : { fontSize: 13, color: '#374151' },
  dropItemActive  : { color: '#1d4ed8', fontWeight: '700' },
  strengthWrap    : { marginTop: -6, marginBottom: 10 },
  strengthBar     : { flexDirection: 'row', gap: 4, marginBottom: 4 },
  strengthSeg     : { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel   : { fontSize: 11, fontWeight: '600' },
  matchRow        : { marginTop: -6, marginBottom: 10 },
  matchText       : { color: '#10b981', fontSize: 12, fontWeight: '600' },
  button          : { backgroundColor: '#1d4ed8', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8, shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  buttonDisabled  : { opacity: 0.6 },
  buttonText      : { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  footer          : { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText      : { fontSize: 14, color: '#64748b' },
  footerLink      : { fontSize: 14, color: '#2563eb', fontWeight: '700' },
})