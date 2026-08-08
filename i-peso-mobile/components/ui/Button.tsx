import { StyleSheet, Text, TouchableOpacity, type ViewStyle, type TextStyle } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme'

const variantStyles = {
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    textColor: colors.white,
  },
  success: {
    backgroundColor: colors.success,
    borderColor: colors.success,
    textColor: colors.white,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    textColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    textColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    textColor: colors.white,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    textColor: colors.primary,
  },
}

type ButtonVariant = keyof typeof variantStyles

type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  disabled?: boolean
  onPress?: () => void
  style?: ViewStyle
  textStyle?: TextStyle
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onPress,
  style,
  textStyle,
}: ButtonProps) {
  const variantStyle = variantStyles[variant]

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          width: fullWidth ? '100%' : undefined,
          opacity: disabled ? 0.6 : 1,
        },
        styles[size],
        style,
      ]}
    >
      <Text style={[styles.label, { color: variantStyle.textColor }, textStyle]}>{children}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  sm: {
    minHeight: 38,
    paddingHorizontal: spacing.lg,
  },
  md: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
  },
  lg: {
    minHeight: 50,
    paddingHorizontal: spacing.xxl,
  },
  label: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
})
