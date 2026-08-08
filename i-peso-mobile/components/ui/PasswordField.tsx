import { ReactNode, useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { colors, radii, spacing, typography } from '@/theme'

interface PasswordFieldProps {
  label: string
  value: string
  onChangeText: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  error?: string
  autoFocus?: boolean
  labelRight?: ReactNode
}

export function PasswordField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  autoFocus = false,
  labelRight,
}: PasswordFieldProps) {
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(false)

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelRight}
      </View>
      <View style={[styles.wrap, focused ? styles.wrapFocused : null, error ? styles.wrapError : null]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            onBlur?.()
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.subtle}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
        />
        <TouchableOpacity
          onPress={() => setVisible((v) => !v)}
          style={styles.toggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={20} color={colors.secondaryText} />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.small,
    fontFamily: typography.family.bold,
    color: colors.textSecondary,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  wrapFocused: {
    borderColor: colors.secondary,
    backgroundColor: colors.surface,
  },
  wrapError: {
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorBackground,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    fontFamily: typography.family.regular,
    color: colors.textPrimary,
  },
  toggle: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.label,
    fontFamily: typography.family.medium,
    marginTop: spacing.xs,
  },
})
