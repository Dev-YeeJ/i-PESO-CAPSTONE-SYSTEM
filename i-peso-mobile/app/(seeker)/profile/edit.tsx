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
import { router, useLocalSearchParams } from 'expo-router'
import { seekerService } from '@/services/seekerService'
import { resolvePsgcCodes } from '@/services/psgcService'
import { useAuthStore } from '@/stores/authStore'
import { colors, radii, spacing, typography } from '@/theme'
import { AlertBox } from '@/components/ui/AlertBox'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
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

const SECTIONS = [
  { step: 1, label: 'Personal' },
  { step: 2, label: 'Employment' },
  { step: 3, label: 'Preferences' },
  { step: 4, label: 'Languages' },
  { step: 5, label: 'Education & Skills' },
  { step: 6, label: 'Training' },
  { step: 7, label: 'Experience' },
]

export default function ProfileEditScreen() {
  const params = useLocalSearchParams<{ section?: string }>()
  const updateUser = useAuthStore((state) => state.updateUser)
  const [activeStep, setActiveStep] = useState(() => Number(params.section) || 1)
  const [form, setForm] = useState<OnboardingFormValue>(emptyOnboardingForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [errors, setErrors] = useState<ServerErrors>({})

  useEffect(() => {
    let active = true
    seekerService.getProfile()
      .then((profile) => {
        if (active) setForm(mapProfileToForm(profile))
      })
      .catch(() => setError('Unable to load your profile. Check the backend connection.'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const changeSection = (step: number) => {
    setActiveStep(step)
    setError('')
    setSuccess('')
    setErrors({})
  }

  const save = async () => {
    const validationError = validateStep(activeStep, form)
    if (validationError) {
      setError(validationError)
      setSuccess('')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    setErrors({})

    try {
      let payload = buildStepPayload(activeStep, form)

      if (activeStep === 1) {
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

      const data = await seekerService.saveStep(activeStep, payload)
      if (data.user) updateUser(data.user)
      setSuccess('Saved successfully.')
    } catch (caught: unknown) {
      const err = caught as AxiosError<{ message?: string; errors?: ServerErrors }>
      const body = err.response?.data
      setErrors(body?.errors ?? {})
      setError(firstServerError(body?.errors) || body?.message || 'Unable to save this section.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Edit Profile" onBack={() => router.back()} backLabel="Close" />
        <View style={styles.loading}>
          <ActivityIndicator color={colors.info} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Edit Profile" onBack={() => router.back()} backLabel="Close" />

      {/* Android-only: forces this row to composite as one hardware texture instead of
          repeatedly blending several closely-packed rounded/bordered views, which otherwise
          shows up as intermittent ghosting/doubling on some GPUs when the step content below
          re-renders (Personal/Preferences/Languages/Education all mount several SelectField
          modals; Employment doesn't and never showed the glitch). */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
        style={styles.tabScroll}
        renderToHardwareTextureAndroid
      >
        {SECTIONS.map((section) => (
          <TouchableOpacity
            key={section.step}
            style={[styles.tab, activeStep === section.step && styles.tabActive]}
            onPress={() => changeSection(section.step)}
          >
            <Text style={[styles.tabText, activeStep === section.step && styles.tabTextActive]}>{section.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {error ? <AlertBox variant="danger" style={styles.alertBox}>{error}</AlertBox> : null}
        {success ? <AlertBox variant="success" style={styles.alertBox}>{success}</AlertBox> : null}

        <View style={styles.card}>
          {activeStep === 1 && <Step1Personal value={form.step1} onChange={(step1) => setForm((f) => ({ ...f, step1 }))} errors={errors} />}
          {activeStep === 2 && <Step2Employment value={form.step2} onChange={(step2) => setForm((f) => ({ ...f, step2 }))} errors={errors} />}
          {activeStep === 3 && <Step3Preferences value={form.step3} onChange={(step3) => setForm((f) => ({ ...f, step3 }))} errors={errors} />}
          {activeStep === 4 && <Step4Languages value={form.step4} onChange={(step4) => setForm((f) => ({ ...f, step4 }))} errors={errors} />}
          {activeStep === 5 && <Step5Education value={form.step5} onChange={(step5) => setForm((f) => ({ ...f, step5 }))} errors={errors} />}
          {activeStep === 6 && <Step6Training value={form.step6} onChange={(step6) => setForm((f) => ({ ...f, step6 }))} errors={errors} />}
          {activeStep === 7 && <Step7Experience value={form.step7} onChange={(step7) => setForm((f) => ({ ...f, step7 }))} errors={errors} />}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.saveButtonText}>Save {SECTIONS.find((s) => s.step === activeStep)?.label}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: spacing.sm, color: colors.secondaryText, fontSize: typography.small },
  tabScroll: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 },
  tabRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  tabActive: { borderColor: colors.info, backgroundColor: colors.infoBackground },
  tabText: { fontSize: typography.small, fontFamily: typography.family.bold, color: colors.muted },
  tabTextActive: { color: colors.info },
  container: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  alertBox: { marginBottom: spacing.lg },
  card: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.lg },
  saveButton: { marginTop: spacing.lg, backgroundColor: colors.info, borderRadius: radii.lg, paddingVertical: spacing.lg, alignItems: 'center' },
  saveButtonText: { color: colors.white, fontSize: typography.body, fontFamily: typography.family.bold },
})
