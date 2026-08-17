import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import type { AxiosError } from 'axios'
import { router } from 'expo-router'
import { seekerService } from '@/services/seekerService'
import { resolvePsgcCodes } from '@/services/psgcService'
import { useAuthStore } from '@/stores/authStore'
import { colors, radii, spacing, typography } from '@/theme'
import { AlertBox } from '@/components/ui/AlertBox'
import { firstServerError, type ServerErrors } from '@/components/onboarding/formPrimitives'
import { buildAddressString, buildStepPayload, mapProfileToForm, validateStep } from '@/components/onboarding/payloads'
import { emptyOnboardingForm, type OnboardingFormValue } from '@/components/onboarding/types'
import {
  Step1Personal,
  Step2Employment,
  Step3Preferences,
  Step4Languages,
  Step5Education,
  Step6Training,
  Step7Experience,
} from '@/components/onboarding/Steps'

interface ApiErrorBody {
  message?: string
  errors?: ServerErrors
}

const steps = ['Personal', 'Employment', 'Preferences', 'Languages', 'Education', 'Training', 'Experience']

export default function OnboardingScreen() {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const updateUser = useAuthStore((state) => state.updateUser)

  const [form, setForm] = useState<OnboardingFormValue>(() => ({
    ...emptyOnboardingForm,
    step1: {
      ...emptyOnboardingForm.step1,
      first_name: user?.first_name ?? user?.name?.split(' ')[0] ?? '',
      last_name: user?.last_name ?? user?.name?.split(' ').slice(1).join(' ') ?? '',
    },
  }))
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<ServerErrors>({})

  useEffect(() => {
    if (!isInitialized) return
    if (!isAuthenticated) {
      router.replace('/(auth)/login')
      return
    }
    if (user?.profile_completed) {
      router.replace('/(seeker)')
    }
  }, [isAuthenticated, isInitialized, user?.profile_completed])

  useEffect(() => {
    let active = true

    seekerService.getProfile()
      .then((profile) => {
        if (!active) return
        setForm(mapProfileToForm(profile))
      })
      .catch(() => {
        // The form is still usable with auth payload defaults.
      })
      .finally(() => {
        if (active) setInitialLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const submit = async () => {
    const validationError = validateStep(step, form)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')
    setErrors({})

    try {
      let payload = buildStepPayload(step, form)

      if (step === 1) {
        const address = buildAddressString(form.step1)
        try {
          const geo = await seekerService.geocodeAddress(address)
          if (geo?.latitude != null && geo?.longitude != null) {
            payload = { ...payload, latitude: geo.latitude, longitude: geo.longitude, google_place_id: geo.place_id ?? null }
          }
        } catch {
          // Geocoding is best-effort — the address still saves without coordinates.
        }
        try {
          const psgc = await resolvePsgcCodes(form.step1)
          if (psgc) payload = { ...payload, ...psgc }
        } catch {
          // PSGC code lookup is best-effort — the address still saves with free-text fields only.
        }
      }

      const data = await seekerService.saveStep(step, payload)
      if (data.user) updateUser(data.user)

      if (step < steps.length) {
        setStep((current) => current + 1)
      } else {
        updateUser({ profile_completed: true })
        router.replace('/(seeker)')
      }
    } catch (caught: unknown) {
      const err = caught as AxiosError<ApiErrorBody>
      const body = err.response?.data
      setErrors(body?.errors ?? {})
      setError(firstServerError(body?.errors) || body?.message || 'Unable to save this step. Check the required fields and backend connection.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.info} />
        <Text style={styles.loadingText}>Preparing your profile...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>Job Seeker Registration</Text>
        <Text style={styles.title}>Complete your NSRP profile</Text>
        <Text style={styles.subtitle}>Step {step} of {steps.length}: {steps[step - 1]}</Text>

        <View style={styles.stepRow}>
          {steps.map((label, index) => (
            <View key={label} style={[styles.stepSegment, index + 1 <= step ? styles.stepSegmentDone : null]} />
          ))}
        </View>

        {error ? (
          <AlertBox variant="danger" style={styles.errorBox}>{error}</AlertBox>
        ) : null}

        <View style={styles.card}>
          {step === 1 && <Step1Personal value={form.step1} onChange={(step1) => setForm((f) => ({ ...f, step1 }))} errors={errors} />}
          {step === 2 && <Step2Employment value={form.step2} onChange={(step2) => setForm((f) => ({ ...f, step2 }))} errors={errors} />}
          {step === 3 && <Step3Preferences value={form.step3} onChange={(step3) => setForm((f) => ({ ...f, step3 }))} errors={errors} />}
          {step === 4 && <Step4Languages value={form.step4} onChange={(step4) => setForm((f) => ({ ...f, step4 }))} errors={errors} />}
          {step === 5 && <Step5Education value={form.step5} onChange={(step5) => setForm((f) => ({ ...f, step5 }))} errors={errors} />}
          {step === 6 && <Step6Training value={form.step6} onChange={(step6) => setForm((f) => ({ ...f, step6 }))} errors={errors} />}
          {step === 7 && <Step7Experience value={form.step7} onChange={(step7) => setForm((f) => ({ ...f, step7 }))} errors={errors} />}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.secondaryButton, step === 1 && styles.disabledButton]}
            onPress={() => { setErrors({}); setError(''); setStep((current) => Math.max(1, current - 1)) }}
            disabled={step === 1 || loading}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>{step === steps.length ? 'Finish' : 'Save and Continue'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: 10, color: colors.secondaryText, fontSize: 13 },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  kicker: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { marginTop: spacing.sm, color: colors.textPrimary, fontSize: typography.heading, fontFamily: typography.family.medium },
  subtitle: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.body, lineHeight: 20 },
  stepRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.lg },
  stepSegment: { flex: 1, height: 6, borderRadius: radii.pill, backgroundColor: colors.border },
  stepSegmentDone: { backgroundColor: colors.secondary },
  errorBox: { marginTop: spacing.lg },
  card: { marginTop: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.lg },
  footer: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  secondaryButton: { flex: 0.8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.lg, paddingVertical: spacing.lg, alignItems: 'center' },
  disabledButton: { opacity: 0.45 },
  secondaryButtonText: { color: colors.textSecondary, fontSize: typography.body, fontFamily: typography.family.bold },
  primaryButton: { flex: 1.4, backgroundColor: colors.primary, borderRadius: radii.lg, paddingVertical: spacing.lg, alignItems: 'center' },
  primaryButtonText: { color: colors.white, fontSize: typography.body, fontFamily: typography.family.bold },
})
