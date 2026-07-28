import { ReactNode, useState } from 'react'
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme'

interface TextFieldProps {
  label: string
  value: string
  onChangeText: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  error?: string
  keyboardType?: KeyboardTypeOptions
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoCorrect?: boolean
  autoFocus?: boolean
  labelRight?: ReactNode
  style?: object
}

export function TextField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  autoFocus = false,
  labelRight,
  style,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={[styles.field, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelRight}
      </View>
      <TextInput
        style={[styles.input, focused ? styles.inputFocused : null, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          onBlur?.()
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        autoFocus={autoFocus}
      />
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
    color: colors.muted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    fontFamily: typography.family.regular,
    color: colors.primary,
    backgroundColor: colors.background,
  },
  inputFocused: {
    borderColor: colors.info,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBackground,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.label,
    fontFamily: typography.family.medium,
    marginTop: spacing.xs,
  },
})
