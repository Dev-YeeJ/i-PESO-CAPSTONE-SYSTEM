import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
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
    backgroundColor: colors.tint,
    borderColor: colors.tintBorder,
    textColor: colors.iconBlue,
    shadow: null,
  },
  outline: {
    gradient: null,
    backgroundColor: colors.surface,
    borderColor: colors.tintBorder,
    textColor: colors.iconBlue,
    shadow: null,
  },
  /** White pill for use on a brand-gradient surface (e.g. the Home profile-strength hero). */
  inverse: {
    gradient: null,
    backgroundColor: colors.white,
    borderColor: colors.white,
    textColor: colors.blue800,
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
    textColor: colors.iconBlue,
    shadow: null,
  },
}

type ButtonVariant = keyof typeof variantStyles

type ButtonSize = 'sm' | 'md' | 'lg'
type IconName = React.ComponentProps<typeof MaterialIcons>['name']

// Redesign: every button is a pill, so a button is never mistaken for a card or an input.
const radius = radii.pill

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
  /** Optional Material icon before the label. */
  icon?: IconName
  /** Optional Material icon after the label (e.g. arrow-forward on a next-step action). */
  iconRight?: IconName
  accessibilityLabel?: string
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
  icon,
  iconRight,
  accessibilityLabel,
}: ButtonProps) {
  const variantStyle = variantStyles[variant]
  const isInactive = disabled || loading
  const iconSize = size === 'sm' ? 18 : 20

  return (
    <PressableScale
      scaleTo="buttonPress"
      haptics={haptics && !isInactive}
      ripple={null}
      onPress={isInactive ? undefined : onPress}
      // sm is 40pt tall for inline layouts; the slop brings its tap area to the 44pt minimum.
      hitSlop={size === 'sm' ? 4 : undefined}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
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
          {icon ? <MaterialIcons name={icon} size={iconSize} color={variantStyle.textColor} /> : null}
          <Text style={[styles.label, { color: variantStyle.textColor }, textStyle]} numberOfLines={1}>
            {children}
          </Text>
          {iconRight ? <MaterialIcons name={iconRight} size={iconSize} color={variantStyle.textColor} /> : null}
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
  // sm stays at 40 for inline actions; md/lg clear the 44pt minimum touch target.
  sm: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  md: {
    minHeight: 48,
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
    gap: spacing.sm,
  },
  label: {
    ...textStyles.bodyBold,
  },
})
