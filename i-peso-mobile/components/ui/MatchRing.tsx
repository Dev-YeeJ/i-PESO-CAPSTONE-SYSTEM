import { useEffect, useId } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated'
import { useMotion } from '@/hooks/useMotion'
import { colors, textStyles, typography } from '@/theme'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

interface MatchRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
  trackColor?: string
  label?: string
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
  trackColor = colors.blue100,
  label,
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

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      accessibilityLabel={label ? `${label}: ${clamped} percent` : `${clamped} percent match`}
    >
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.blue500} />
            <Stop offset="1" stopColor={colors.blue700} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
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
        <Text style={[styles.value, { fontSize: size * 0.3, lineHeight: size * 0.34 }]}>{clamped}</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
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
    color: colors.blue800,
  },
  label: {
    fontSize: typography.label,
    fontFamily: typography.family.bold,
    color: colors.textSecondary,
    marginTop: 2,
  },
})
