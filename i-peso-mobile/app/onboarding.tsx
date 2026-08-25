import { useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { AxiosError } from 'axios'
import { router } from 'expo-router'
import { seekerService } from '@/services/seekerService'
import { resolvePsgcCodes } from '@/services/psgcService'
import { useAuthStore } from '@/stores/authStore'
import { useMotion } from '@/hooks/useMotion'
import { colors, gradients, radii, shadows, spacing, textStyles } from '@/theme'
import { AlertBox } from '@/components/ui/AlertBox'
import { Button } from '@/components/ui/Button'
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

interface ApiErrorBody {
  message?: string
  errors?: ServerErrors
}

// Mirrors i-peso-frontend's registrationJourneys.js seekerRegistrationSteps exactly —
// the 7 NSRP step labels here are stages 3-9 of that same 9-stage journey.
const steps = [
  'Personal Information',
  'Employment Status',
  'Job Preference',
  'Language Skills',
  'Education & Skills',
  'Training & Eligibility',
  'Work Experience',
]

// The full 9-stage registration journey (Account Setup + Email Verification are already
// behind the user by the time they reach this screen — shown here for overall context,
// matching the website's registrationJourneys.js rail).
const JOURNEY_STAGES = ['Account Setup', 'Email Verification', ...steps]

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const m = useMotion()
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
  // Drives which direction the step animates in from, so going Back reads as going back.
  const [goingBack, setGoingBack] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

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

  // Every step change returns the seeker to the top of the form — otherwise step 5 opens
  // scrolled halfway down where step 4's fields happened to end.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: m.enabled })
  }, [step, m.enabled])

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
        setGoingBack(false)
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

  const goBack = () => {
    setErrors({})
    setError('')
    setGoingBack(true)
    setStep((current) => Math.max(1, current - 1))
  }

  if (initialLoading) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top + spacing.xl }]}>
        <SkeletonGroup label="Preparing your profile" style={styles.loadingWrap}>
          <Skeleton width="55%" height={12} />
          <Skeleton width="80%" height={26} style={styles.loadingGap} />
          <Skeleton width="100%" height={8} style={styles.loadingBlock} />
          <Skeleton width="100%" height={320} radius={radii.xl} style={styles.loadingBlock} />
        </SkeletonGroup>
      </View>
    )
  }

  const isLastStep = step === steps.length

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Fixed header: the seeker's position in a seven-step government form is the one thing
          that must never scroll out of view. */}
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.lg }]}
      >
        <Text style={styles.kicker}>DOLE NATIONAL SKILLS REGISTRATION</Text>
        <Text style={styles.title}>{steps[step - 1]}</Text>
        <Text style={styles.journeyText}>
          Step {step + 2} of {JOURNEY_STAGES.length} · Account and email already verified
        </Text>

        <StepRail current={step} total={steps.length} />
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <AlertBox variant="danger" style={styles.errorBox}>{error}</AlertBox>
        ) : null}

        <Animated.View
          // Keyed on step so Reanimated treats each step as a new element to animate in.
          key={step}
          entering={m.enabled ? (goingBack ? FadeInLeft.duration(260) : FadeInRight.duration(260)) : undefined}
          exiting={m.enabled ? (goingBack ? FadeOutRight.duration(160) : FadeOutLeft.duration(160)) : undefined}
          style={styles.card}
        >
          {step === 1 && <Step1Personal value={form.step1} onChange={(step1) => setForm((f) => ({ ...f, step1 }))} errors={errors} />}
          {step === 2 && <Step2Employment value={form.step2} onChange={(step2) => setForm((f) => ({ ...f, step2 }))} errors={errors} />}
          {step === 3 && <Step3Preferences value={form.step3} onChange={(step3) => setForm((f) => ({ ...f, step3 }))} errors={errors} />}
          {step === 4 && <Step4Languages value={form.step4} onChange={(step4) => setForm((f) => ({ ...f, step4 }))} errors={errors} />}
          {step === 5 && <Step5Education value={form.step5} onChange={(step5) => setForm((f) => ({ ...f, step5 }))} errors={errors} />}
          {step === 6 && <Step6Training value={form.step6} onChange={(step6) => setForm((f) => ({ ...f, step6 }))} errors={errors} />}
          {step === 7 && <Step7Experience value={form.step7} onChange={(step7) => setForm((f) => ({ ...f, step7 }))} errors={errors} />}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button
          variant="outline"
          size="lg"
          onPress={goBack}
          disabled={step === 1 || loading}
          style={styles.backButton}
        >
          Back
        </Button>
        <Button size="lg" onPress={submit} loading={loading} style={styles.nextButton}>
          {isLastStep ? 'Finish' : 'Save and continue'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  )
}

/**
 * Seven segments, one per NSRP step. Completed segments stay filled so the rail reads as
 * ground covered rather than a single moving dot — it's a long form, and seeing the distance
 * already travelled is what keeps people in it.
 */
function StepRail({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepRow} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: current }}>
      {Array.from({ length: total }).map((_, index) => (
        <RailSegment key={index} filled={index + 1 <= current} index={index} />
      ))}
    </View>
  )
}

function RailSegment({ filled, index }: { filled: boolean; index: number }) {
  const m = useMotion()
  const progress = useSharedValue(filled ? 1 : 0)

  useEffect(() => {
    progress.value = withSpring(filled ? 1 : 0, m.spring('snappy'))
  }, [filled, progress, m])

  const style = useAnimatedStyle(() => ({
    opacity: 0.25 + progress.value * 0.75,
    transform: [{ scaleY: 0.6 + progress.value * 0.4 }],
  }))

  return <Animated.View key={index} style={[styles.stepSegment, style]} />
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { paddingHorizontal: spacing.lg },
  loadingGap: { marginTop: spacing.sm },
  loadingBlock: { marginTop: spacing.xl },

  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    ...shadows.md,
  },
  kicker: {
    ...textStyles.label,
    fontSize: 10,
    color: colors.blue200,
    letterSpacing: 1.3,
  },
  title: {
    marginTop: spacing.sm,
    ...textStyles.heading,
    color: colors.white,
  },
  journeyText: {
    marginTop: spacing.xs,
    ...textStyles.small,
    color: colors.blue200,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  stepSegment: {
    flex: 1,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },

  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  errorBox: { marginBottom: spacing.lg },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.card,
  },

  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backButton: { flex: 1 },
  nextButton: { flex: 2 },
})
