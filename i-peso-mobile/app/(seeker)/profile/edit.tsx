import { memo, useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated'
import type { AxiosError } from 'axios'
import { router, useLocalSearchParams } from 'expo-router'
import { seekerService } from '@/services/seekerService'
import { resolvePsgcCodes } from '@/services/psgcService'
import { useAuthStore } from '@/stores/authStore'
import { useMotion } from '@/hooks/useMotion'
import { useToast } from '@/stores/toastStore'
import { colors, radii, spacing, typography } from '@/theme'
import { AlertBox } from '@/components/ui/AlertBox'
import { Button } from '@/components/ui/Button'
import { PressableScale } from '@/components/ui/PressableScale'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
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

// Isolated so the step content re-rendering below (Personal/Preferences/Languages/Education
// all mount several SelectField modals) never re-renders this row — that sibling churn was
// the actual cause of the intermittent text ghosting/doubling on some Android GPUs, not
// something a hardware-texture hint alone could paper over.
const SectionTabs = memo(function SectionTabs({ activeStep, onChange }: { activeStep: number; onChange: (step: number) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabRow}
      style={styles.tabScroll}
    >
      {SECTIONS.map((section) => (
        <PressableScale
          key={section.step}
          scaleTo="buttonPress"
          ripple={null}
          style={[styles.tab, activeStep === section.step && styles.tabActive]}
          onPress={() => onChange(section.step)}
          accessibilityRole="button"
          accessibilityState={{ selected: activeStep === section.step }}
        >
          <Text style={[styles.tabText, activeStep === section.step && styles.tabTextActive]}>{section.label}</Text>
        </PressableScale>
      ))}
    </ScrollView>
  )
})

export default function ProfileEditScreen() {
  const params = useLocalSearchParams<{ section?: string }>()
  const updateUser = useAuthStore((state) => state.updateUser)
  const m = useMotion()
  const { showToast } = useToast()
  const [activeStep, setActiveStep] = useState(() => Number(params.section) || 1)
  const [form, setForm] = useState<OnboardingFormValue>(emptyOnboardingForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<ServerErrors>({})
  // Drives which direction the section content animates in from — these tabs are a
  // jump-to-any-section list, not a linear wizard, so direction is derived by comparing
  // section numbers rather than tracked via explicit forward/back buttons.
  const [goingBack, setGoingBack] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

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

  // Every section change returns the seeker to the top of the form — otherwise a short
  // section (e.g. Languages) can open scrolled halfway down where a longer section's
  // content happened to end.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: m.enabled })
  }, [activeStep, m.enabled])

  const changeSection = (step: number) => {
    setGoingBack(step < activeStep)
    setActiveStep(step)
    setError('')
    setErrors({})
  }

  const save = async () => {
    const validationError = validateStep(activeStep, form)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
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
      showToast('Saved successfully.', 'success')
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
        <ScreenHeader title="Edit Profile" onBack={() => router.replace('/(seeker)/profile')} backLabel="Close" />
        <SkeletonGroup label="Loading your profile" style={styles.loadingWrap}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="100%" height={300} radius={radii.xl} style={styles.loadingBlock} />
        </SkeletonGroup>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Edit Profile" onBack={() => router.replace('/(seeker)/profile')} backLabel="Close" />

      <SectionTabs activeStep={activeStep} onChange={changeSection} />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {error ? <AlertBox variant="danger" style={styles.alertBox}>{error}</AlertBox> : null}

        <Animated.View
          key={activeStep}
          entering={m.enabled ? (goingBack ? FadeInLeft.duration(260) : FadeInRight.duration(260)) : undefined}
          style={styles.card}
        >
          {activeStep === 1 && <Step1Personal value={form.step1} onChange={(step1) => setForm((f) => ({ ...f, step1 }))} errors={errors} />}
          {activeStep === 2 && <Step2Employment value={form.step2} onChange={(step2) => setForm((f) => ({ ...f, step2 }))} errors={errors} />}
          {activeStep === 3 && <Step3Preferences value={form.step3} onChange={(step3) => setForm((f) => ({ ...f, step3 }))} errors={errors} />}
          {activeStep === 4 && <Step4Languages value={form.step4} onChange={(step4) => setForm((f) => ({ ...f, step4 }))} errors={errors} />}
          {activeStep === 5 && <Step5Education value={form.step5} onChange={(step5) => setForm((f) => ({ ...f, step5 }))} errors={errors} />}
          {activeStep === 6 && <Step6Training value={form.step6} onChange={(step6) => setForm((f) => ({ ...f, step6 }))} errors={errors} />}
          {activeStep === 7 && <Step7Experience value={form.step7} onChange={(step7) => setForm((f) => ({ ...f, step7 }))} errors={errors} />}
        </Animated.View>

        <Button size="lg" fullWidth onPress={save} loading={saving} style={styles.saveButton}>
          Save {SECTIONS.find((s) => s.step === activeStep)?.label}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  loadingBlock: { marginTop: spacing.xl },
  // Explicit height (not just minHeight) so this horizontal ScrollView can never lock in a
  // too-short auto-measured height from before the custom bold font finished loading, then
  // clip the taller post-font-load glyphs — that stale-measurement was the actual cause of
  // the tab labels rendering with their tops cut off (lineHeight changes on tabText alone
  // had no effect, because the clip was coming from this container, not the Text box).
  // `overflow: 'hidden'` is required alongside the fixed height: a horizontal ScrollView on
  // Android only reliably clips along its scroll axis — the perpendicular (vertical) axis can
  // silently paint past the declared height for a sibling whose content computes a taller
  // natural box, which visually grows the whole row (and the border line under it) for that
  // scroll position even though `height: 60` never actually changes. This is what made
  // "Personal" vs "Training" look like different heights despite sharing one style object.
  tabScroll: { height: 60, overflow: 'hidden', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 },
  tabRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm, alignItems: 'center' },
  // Fixed `height` (not left to padding + lineHeight) so every pill — regardless of label
  // length or content — is byte-for-byte the same size, active or inactive. paddingHorizontal
  // is identical across active/inactive too (tabActive below only swaps border/background
  // colors) — the saturated blue border + light blue fill on the active pill just reads
  // visually "tighter" against the same padding than the pale gray border on inactive ones,
  // so the horizontal padding here is bumped up a notch to reduce that contrast illusion.
  tab: {
    flexShrink: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  tabActive: { borderColor: colors.info, backgroundColor: colors.infoBackground },
  // A generous lineHeight (well above fontSize) is what actually prevents Android from
  // clipping the custom DM Sans bold face's ascenders here. `includeFontPadding: false` +
  // `textAlignVertical: 'center'` was tried and made it worse on-device — that combination
  // pushed this custom font's glyphs almost entirely out of the box instead of just trimming
  // padding, so it's deliberately not used.
  tabText: {
    fontSize: typography.small,
    lineHeight: 20,
    fontFamily: typography.family.bold,
    color: colors.muted,
  },
  tabTextActive: { color: colors.info },
  container: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  alertBox: { marginBottom: spacing.lg },
  card: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.lg },
  saveButton: { marginTop: spacing.lg },
})
