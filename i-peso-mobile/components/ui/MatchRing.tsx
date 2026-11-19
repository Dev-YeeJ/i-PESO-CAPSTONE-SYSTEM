import { useEffect, useId } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated'
import { useMotion } from '@/hooks/useMotion'
import { colors, textStyles, typography } from '@/theme'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/** Match % at or above which a job counts as a strong (earned → amber) match. */
export const STRONG_MATCH = 80

interface MatchRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
  trackColor?: string
  label?: string
  /**
   * Amber arc + navy figure: the seeker *earned* this (a strong job match). Leave off for
   * scores that aren't an achievement, e.g. profile strength.
   */
  earned?: boolean
  /** White figure and a white-to-blue arc, for use on a brand-gradient surface. */
  onDark?: boolean
  /** Append "%" to the figure (job cards); off by default to keep existing screens unchanged. */
  showPercent?: boolean
  /** Screen-reader text when the ring isn't a job match (e.g. "Profile strength"). */
  accessibilityLabel?: string
}

/**
 * The match score, drawn as a filling arc.
 *
 * The figure sits in DM Serif Display rather than the UI sans — match percentage and salary
 * are the two numbers a seeker actually weighs, and the serif marks them as *the* content
 * rather than another piece of interface. See `textStyles.figure` for the reasoning.
 */
export function MatchRing({
  percentage,
  size = 96,
  strokeWidth = 8,
  trackColor,
  label,
  earned = false,
  onDark = false,
  showPercent = false,
  accessibilityLabel,
}: MatchRingProps) {
  const m = useMotion()
  // Gradient ids are global in SVG, so a list of rings would otherwise all reference the
  // first one's definition.
  const gradientId = `matchRing-${useId()}`
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withTiming(clamped, {
      duration: m.enabled ? 900 : 0,
      easing: Easing.out(Easing.cubic),
    })
  }, [clamped, progress, m])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (circumference * progress.value) / 100,
  }))

  const track = trackColor ?? (onDark ? 'rgba(255,255,255,0.18)' : earned ? colors.accentSoft : colors.tintStrong)
  const stops = onDark ? [colors.blue300, colors.white] : [colors.blue500, colors.blue700]
  const figureColor = onDark ? colors.white : earned ? colors.accentText : colors.figure

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      accessibilityLabel={
        accessibilityLabel
          ? `${accessibilityLabel}: ${clamped} percent`
          : label
          ? `${label}: ${clamped} percent`
          : `${clamped} percent match${earned ? ', strong match' : ''}`
      }
    >
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={stops[0]} />
            <Stop offset="1" stopColor={stops[1]} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={track} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={earned && !onDark ? colors.accent : `url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.value, { color: figureColor, fontSize: size * (showPercent ? 0.27 : 0.3), lineHeight: size * 0.34 }]}>
          {clamped}
          {showPercent ? <Text style={{ fontSize: size * 0.17 }}>%</Text> : null}
        </Text>
        {label ? <Text style={[styles.label, onDark && styles.labelOnDark]}>{label}</Text> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...textStyles.figure,
    color: colors.figure,
  },
  label: {
    fontSize: typography.label,
    fontFamily: typography.family.bold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  labelOnDark: {
    color: colors.blue200,
  },
})
