import { useCallback, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Button } from '@/components/ui/Button'
import {
  MatchScoreArt,
  NearbyJobsArt,
  ProgramsArt,
  TrackingArt,
} from '@/components/onboarding/WelcomeIllustrations'
import { useMotion } from '@/hooks/useMotion'
import { colors, gradients, radii, spacing, textStyles } from '@/theme'
import { LinearGradient } from 'expo-linear-gradient'

export const WELCOME_SEEN_KEY = 'ipeso_welcome_seen'

// Each slide names one thing the app actually does, in the order a seeker meets it: find work,
// judge the fit, close the gap, then track the outcome. No slide promises a feature that
// isn't in the build.
const SLIDES = [
  {
    eyebrow: 'Nearby work',
    title: 'Jobs on your side of town',
    body: 'See vacancies plotted around you, with the distance from home on every listing.',
    Art: NearbyJobsArt,
  },
  {
    eyebrow: 'Your match',
    title: 'Know where you stand',
    body: 'Every job shows how closely it fits your skills, and which ones you still need.',
    Art: MatchScoreArt,
  },
  {
    eyebrow: 'DOLE programs',
    title: 'Train first, then apply',
    body: 'Government scholarships and training programs you qualify for, gathered in one list.',
    Art: ProgramsArt,
  },
  {
    eyebrow: 'After you apply',
    title: 'Follow every application',
    body: 'Track each one from submitted to hired, and get a notification when it moves.',
    Art: TrackingArt,
  },
]

export default function WelcomeScreen() {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<Animated.ScrollView>(null)
  const scrollX = useSharedValue(0)
  const [index, setIndex] = useState(0)

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x
    },
  })

  const finish = useCallback(async () => {
    // Best-effort: a failed write only means the carousel shows once more.
    try {
      await SecureStore.setItemAsync(WELCOME_SEEN_KEY, 'true')
    } catch {
      // Ignored — not worth blocking entry to the app.
    }
    router.replace('/(auth)/login')
  }, [])

  const isLast = index === SLIDES.length - 1

  const advance = () => {
    if (isLast) {
      finish()
      return
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true })
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.skipRow}>
        <Pressable
          onPress={finish}
          hitSlop={12}
          style={styles.skipButton}
          accessibilityRole="button"
          accessibilityLabel="Skip the introduction"
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
        }}
        style={styles.flex}
      >
        {SLIDES.map((slide, slideIndex) => (
          <Slide
            key={slide.title}
            slide={slide}
            index={slideIndex}
            width={width}
            scrollX={scrollX}
            active={index === slideIndex}
          />
        ))}
      </Animated.ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        <View style={styles.dots}>
          {SLIDES.map((slide, dotIndex) => (
            <Dot key={slide.title} index={dotIndex} scrollX={scrollX} width={width} />
          ))}
        </View>

        <Button size="lg" fullWidth onPress={advance}>
          {isLast ? 'Get started' : 'Next'}
        </Button>
      </View>
    </View>
  )
}

function Slide({
  slide,
  index,
  width,
  scrollX,
  active,
}: {
  slide: (typeof SLIDES)[number]
  index: number
  width: number
  scrollX: { value: number }
  active: boolean
}) {
  const m = useMotion()
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width]

  // Art and copy travel at different rates against the swipe, which is what produces depth.
  // Both collapse to no movement when the OS asks for reduced motion.
  const artStyle = useAnimatedStyle(() => {
    if (!m.enabled) return {}
    return {
      transform: [
        {
          translateX: interpolate(scrollX.value, inputRange, [width * 0.28, 0, -width * 0.28], Extrapolation.CLAMP),
        },
        {
          scale: interpolate(scrollX.value, inputRange, [0.86, 1, 0.86], Extrapolation.CLAMP),
        },
      ],
      opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
    }
  })

  const copyStyle = useAnimatedStyle(() => {
    if (!m.enabled) return {}
    return {
      transform: [
        {
          translateX: interpolate(scrollX.value, inputRange, [width * 0.12, 0, -width * 0.12], Extrapolation.CLAMP),
        },
      ],
      opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
    }
  })

  const { Art } = slide

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={[styles.artWrap, artStyle]}>
        <Art active={active} />
      </Animated.View>

      <Animated.View style={[styles.copy, copyStyle]}>
        <Text style={styles.eyebrow}>{slide.eyebrow.toUpperCase()}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </Animated.View>
    </View>
  )
}

function Dot({ index, scrollX, width }: { index: number; scrollX: { value: number }; width: number }) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width]

  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, inputRange, [8, 26, 8], Extrapolation.CLAMP),
    opacity: interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP),
  }))

  return (
    <Animated.View style={[styles.dot, style]}>
      <LinearGradient
        colors={[...gradients.cta]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.dotFill}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    ...textStyles.bodyBold,
    color: colors.textSecondary,
  },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
  },
  artWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxxl,
  },
  copy: {
    alignItems: 'center',
  },
  eyebrow: {
    ...textStyles.label,
    color: colors.blue600,
    letterSpacing: 1.4,
  },
  title: {
    ...textStyles.display,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  body: {
    ...textStyles.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  dotFill: {
    flex: 1,
  },
})
