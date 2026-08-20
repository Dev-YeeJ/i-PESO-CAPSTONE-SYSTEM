import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, type ViewStyle, type TextStyle } from 'react-native'
import * as Haptics from 'expo-haptics'
import { colors, radii, shadows, spacing, textStyles } from '@/theme'

const variantStyles = {
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    textColor: colors.white,
    shadow: shadows.accentGlow,
  },
  success: {
    backgroundColor: colors.success,
    borderColor: colors.success,
    textColor: colors.white,
    shadow: shadows.sm,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    textColor: colors.primary,
    shadow: null,
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    textColor: colors.primary,
    shadow: null,
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    textColor: colors.white,
    shadow: shadows.sm,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    textColor: colors.primary,
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

  const handlePress = () => {
    if (isInactive) return
    if (haptics) Haptics.selectionAsync()
    onPress?.()
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={[
        styles.button,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          borderRadius: radiusForSize[size],
          width: fullWidth ? '100%' : undefined,
          opacity: disabled ? 0.5 : 1,
        },
        !isInactive && variantStyle.shadow,
        styles[size],
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyle.textColor} />
      ) : (
        <Text style={[styles.label, { color: variantStyle.textColor }, textStyle]} numberOfLines={1}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
  label: {
    ...textStyles.bodyBold,
  },
})
