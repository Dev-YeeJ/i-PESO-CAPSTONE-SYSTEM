import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { PressableScale } from './PressableScale'
import { colors, gradients, radii, shadows, spacing, textStyles } from '@/theme'

// `primary` renders a blue gradient rather than a flat fill — it is the one control on any
// screen that advances the seeker toward a job, so it gets the only gradient in the button
// set. Every other variant stays flat; if two things on screen both look primary, neither is.
const variantStyles = {
  primary: {
    gradient: gradients.cta,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    // 5.1:1 against the lightest stop in `cta`, so contrast holds across the whole sweep.
    textColor: colors.white,
    shadow: shadows.ctaGlow,
  },
  success: {
    gradient: null,
    backgroundColor: colors.success,
    borderColor: colors.success,
    textColor: colors.white,
    shadow: shadows.sm,
  },
  secondary: {
    gradient: null,
    backgroundColor: colors.blue50,
    borderColor: colors.blue200,
    textColor: colors.blue700,
    shadow: null,
  },
  outline: {
    gradient: null,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    textColor: colors.blue700,
    shadow: null,
  },
  danger: {
    gradient: null,
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    textColor: colors.white,
    shadow: shadows.sm,
  },
  ghost: {
    gradient: null,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    textColor: colors.blue700,
    shadow: null,
  },
}

type ButtonVariant = keyof typeof variantStyles

type ButtonSize = 'sm' | 'md' | 'lg'

const radiusForSize: Record<ButtonSize, number> = {
  sm: radii.md,
  md: radii.lg,
  lg: radii.lg,
}

interface ButtonProps {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  disabled?: boolean
  loading?: boolean
  onPress?: () => void
  style?: ViewStyle
  textStyle?: TextStyle
  haptics?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onPress,
  style,
  textStyle,
  haptics = true,
}: ButtonProps) {
  const variantStyle = variantStyles[variant]
  const isInactive = disabled || loading
  const radius = radiusForSize[size]

  return (
    <PressableScale
      scaleTo="buttonPress"
      haptics={haptics && !isInactive}
      ripple={null}
      onPress={isInactive ? undefined : onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={[
        styles.button,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          borderRadius: radius,
          width: fullWidth ? '100%' : undefined,
          opacity: disabled ? 0.5 : 1,
        },
        !isInactive && variantStyle.shadow,
        styles[size],
        style,
      ]}
    >
      {variantStyle.gradient ? (
        <LinearGradient
          colors={[...variantStyle.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
          pointerEvents="none"
        />
      ) : null}

      {loading ? (
        <ActivityIndicator size="small" color={variantStyle.textColor} />
      ) : (
        <View style={styles.labelWrap}>
          <Text style={[styles.label, { color: variantStyle.textColor }, textStyle]} numberOfLines={1}>
            {children}
          </Text>
        </View>
      )}
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    // Keeps the gradient clipped to the button's rounded corners on Android.
    overflow: 'hidden',
  },
  sm: {
    minHeight: 38,
    paddingHorizontal: spacing.lg,
  },
  md: {
    minHeight: 46,
    paddingHorizontal: spacing.xl,
  },
  lg: {
    minHeight: 52,
    paddingHorizontal: spacing.xxl,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...textStyles.bodyBold,
  },
})
