import { useEffect } from 'react'
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg'
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { StyleSheet, View } from 'react-native'
import { useMotion } from '@/hooks/useMotion'
import { colors } from '@/theme'

// Bespoke illustrations rather than stock animation files: these are drawn from the app's own
// palette and geometry, so they stay on-brand at any size and add no dependency or licence.
// Each one animates when its slide becomes active, driven by the `active` prop.

const VIEW_BOX = '0 0 240 200'

interface IllustrationProps {
  active: boolean
}

/** Shared gradient defs. Ids are namespaced per illustration to avoid collisions across SVGs. */
function BlueGradient({ id }: { id: string }) {
  return (
    <Defs>
      <SvgLinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={colors.blue500} />
        <Stop offset="1" stopColor={colors.blue700} />
      </SvgLinearGradient>
    </Defs>
  )
}

/**
 * Hook for a staggered entrance value. Returns a style that fades + lifts an element into
 * place, replayed each time the slide becomes active so the animation isn't a one-shot the
 * user misses while swiping back.
 */
function useEntrance(active: boolean, delay: number, lift = 16) {
  const m = useMotion()
  const progress = useSharedValue(0)

  useEffect(() => {
    if (active) {
      progress.value = withDelay(delay, withSpring(1, m.spring('gentle')))
    } else {
      progress.value = 0
    }
  }, [active, delay, progress, m])

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * lift }],
  }))
}

/** Slide 1 — jobs plotted near the seeker. Mirrors the job-map screen. */
export function NearbyJobsArt({ active }: IllustrationProps) {
  const panel = useEntrance(active, 0, 20)
  const pinA = useEntrance(active, 160, 28)
  const pinB = useEntrance(active, 260, 28)
  const pinC = useEntrance(active, 360, 28)

  return (
    <View style={styles.wrap}>
      <Animated.View style={[StyleSheet.absoluteFill, panel]}>
        <Svg viewBox={VIEW_BOX} style={styles.svg}>
          <BlueGradient id="nearbyGrad" />
          <Rect x="20" y="26" width="200" height="148" rx="20" fill={colors.blue50} />
          {/* Street grid, kept faint so the pins stay the subject. */}
          <Path d="M20 92 H220" stroke={colors.blue200} strokeWidth="3" strokeLinecap="round" />
          <Path d="M96 26 V174" stroke={colors.blue200} strokeWidth="3" strokeLinecap="round" />
          <Path d="M160 26 V174" stroke={colors.blue100} strokeWidth="3" strokeLinecap="round" />
          <Path d="M20 138 H220" stroke={colors.blue100} strokeWidth="3" strokeLinecap="round" />
          {/* Search radius around the seeker. */}
          <Circle
            cx="96"
            cy="92"
            r="46"
            stroke={colors.blue300}
            strokeWidth="2"
            strokeDasharray="6 7"
            fill="none"
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, pinA]}>
        <Svg viewBox={VIEW_BOX} style={styles.svg}>
          <BlueGradient id="pinAGrad" />
          <Pin x={96} y={92} scale={1.25} fill="url(#pinAGrad)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, pinB]}>
        <Svg viewBox={VIEW_BOX} style={styles.svg}>
          <Pin x={158} y={62} scale={0.85} fill={colors.blue400} />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, pinC]}>
        <Svg viewBox={VIEW_BOX} style={styles.svg}>
          <Pin x={62} y={142} scale={0.85} fill={colors.blue400} />
        </Svg>
      </Animated.View>
    </View>
  )
}

function Pin({ x, y, scale, fill }: { x: number; y: number; scale: number; fill: string }) {
  // Teardrop pin drawn around the origin, then translated — keeps the maths readable.
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Path
        d="M0 -26 C 11 -26 20 -17 20 -6 C 20 6 6 16 0 26 C -6 16 -20 6 -20 -6 C -20 -17 -11 -26 0 -26 Z"
        fill={fill}
      />
      <Circle cx="0" cy="-6" r="7" fill={colors.white} />
    </G>
  )
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/** Circumference of the r=58 arc, used to convert a percentage into a dash offset. */
const RING_CIRCUMFERENCE = 2 * Math.PI * 58
const MATCH_PERCENT = 0.87

/** Slide 2 — the match score. Mirrors MatchRing on the job cards. */
export function MatchScoreArt({ active }: IllustrationProps) {
  const m = useMotion()
  const ring = useEntrance(active, 0, 18)
  const chipA = useEntrance(active, 300, 14)
  const chipB = useEntrance(active, 380, 14)
  const chipC = useEntrance(active, 460, 14)

  const sweep = useSharedValue(RING_CIRCUMFERENCE)

  useEffect(() => {
    if (active) {
      sweep.value = withDelay(
        140,
        withTiming(RING_CIRCUMFERENCE * (1 - MATCH_PERCENT), { duration: m.duration('slow') }),
      )
    } else {
      sweep.value = RING_CIRCUMFERENCE
    }
  }, [active, sweep, m])

  // useAnimatedProps (not useAnimatedStyle) is what drives SVG attributes on the UI thread.
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: sweep.value,
  }))

  return (
    <View style={styles.wrap}>
      <Animated.View style={[StyleSheet.absoluteFill, ring]}>
        <Svg viewBox={VIEW_BOX} style={styles.svg}>
          <BlueGradient id="matchGrad" />
          <Circle cx="120" cy="94" r="58" stroke={colors.blue100} strokeWidth="14" fill="none" />
          <AnimatedCircle
            cx="120"
            cy="94"
            r="58"
            stroke="url(#matchGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={RING_CIRCUMFERENCE}
            animatedProps={arcProps}
            // Starts the sweep at 12 o'clock rather than 3 o'clock.
            transform="rotate(-90 120 94)"
          />
          <Circle cx="120" cy="94" r="40" fill={colors.white} />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.chip, styles.chipLeft, chipA]} />
      <Animated.View style={[styles.chip, styles.chipRight, chipB]} />
      <Animated.View style={[styles.chip, styles.chipBottom, chipC]} />
    </View>
  )
}

/** Slide 3 — DOLE training programs. Mirrors the government-programs screen. */
export function ProgramsArt({ active }: IllustrationProps) {
  const cap = useEntrance(active, 0, 20)
  const barA = useEntrance(active, 220, 26)
  const barB = useEntrance(active, 300, 26)
  const barC = useEntrance(active, 380, 26)

  return (
    <View style={styles.wrap}>
      <Animated.View style={[StyleSheet.absoluteFill, cap]}>
        <Svg viewBox={VIEW_BOX} style={styles.svg}>
          <BlueGradient id="capGrad" />
          <Rect x="28" y="34" width="184" height="106" rx="18" fill={colors.blue50} />
          {/* Graduation cap */}
          <Path d="M120 52 L182 78 L120 104 L58 78 Z" fill="url(#capGrad)" />
          <Path
            d="M78 88 V112 C 78 122 98 130 120 130 C 142 130 162 122 162 112 V88"
            stroke={colors.blue700}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
          <Path d="M182 78 V106" stroke={colors.blue700} strokeWidth="5" strokeLinecap="round" />
          <Circle cx="182" cy="112" r="7" fill={colors.accent} />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.bar, styles.barA, barA]} />
      <Animated.View style={[styles.bar, styles.barB, barB]} />
      <Animated.View style={[styles.bar, styles.barC, barC]} />
    </View>
  )
}

/** Slide 4 — application tracking. Mirrors the applications screen's status timeline. */
export function TrackingArt({ active }: IllustrationProps) {
  const cardBack = useEntrance(active, 0, 24)
  const cardMid = useEntrance(active, 120, 24)
  const cardFront = useEntrance(active, 240, 24)
  const check = useEntrance(active, 420, 12)

  return (
    <View style={styles.wrap}>
      <Animated.View style={[StyleSheet.absoluteFill, cardBack]}>
        <Svg viewBox={VIEW_BOX} style={styles.svg}>
          <Rect x="52" y="30" width="136" height="44" rx="12" fill={colors.blue100} />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, cardMid]}>
        <Svg viewBox={VIEW_BOX} style={styles.svg}>
          <Rect x="42" y="62" width="156" height="48" rx="13" fill={colors.blue200} />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, cardFront]}>
        <Svg viewBox={VIEW_BOX} style={styles.svg}>
          <BlueGradient id="trackGrad" />
          <Rect x="32" y="100" width="176" height="62" rx="16" fill="url(#trackGrad)" />
          <Rect x="50" y="118" width="84" height="9" rx="4.5" fill={colors.white} opacity="0.92" />
          <Rect x="50" y="136" width="52" height="8" rx="4" fill={colors.white} opacity="0.55" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, check]}>
        <Svg viewBox={VIEW_BOX} style={styles.svg}>
          <Circle cx="176" cy="131" r="17" fill={colors.white} />
          <Path
            d="M168 131 L174 137 L185 125"
            stroke={colors.success}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 240 / 200,
    maxHeight: 260,
  },
  svg: {
    width: '100%',
    height: '100%',
  },
  chip: {
    position: 'absolute',
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.blue100,
  },
  chipLeft: {
    width: 62,
    left: '6%',
    top: '26%',
  },
  chipRight: {
    width: 54,
    right: '6%',
    top: '42%',
  },
  chipBottom: {
    width: 72,
    left: '18%',
    bottom: '12%',
  },
  bar: {
    position: 'absolute',
    width: 26,
    borderRadius: 8,
    backgroundColor: colors.blue600,
    bottom: '4%',
  },
  barA: {
    height: 30,
    left: '26%',
    opacity: 0.55,
  },
  barB: {
    height: 46,
    left: '44%',
    opacity: 0.75,
  },
  barC: {
    height: 62,
    left: '62%',
  },
})
