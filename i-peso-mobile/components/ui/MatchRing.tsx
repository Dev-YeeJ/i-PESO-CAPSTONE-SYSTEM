import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated'
import { colors, typography } from '@/theme'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

interface MatchRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: string
}

export function MatchRing({
  percentage,
  size = 96,
  strokeWidth = 8,
  color = colors.accent,
  trackColor = colors.accentSoft,
  label,
}: MatchRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: 900, easing: Easing.out(Easing.cubic) })
  }, [clamped, progress])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (circumference * progress.value) / 100,
  }))

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
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
        <Text style={[styles.value, { fontSize: size * 0.28 }]}>{clamped}%</Text>
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
    fontFamily: typography.family.display,
    color: colors.primary,
  },
  label: {
    fontSize: typography.label,
    fontFamily: typography.family.bold,
    color: colors.secondaryText,
    marginTop: 2,
  },
})
