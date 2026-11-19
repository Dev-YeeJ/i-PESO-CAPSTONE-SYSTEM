import { ReactNode, useState } from 'react'
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme'

interface TextFieldProps {
  label: ReactNode
  value: string
  onChangeText: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  error?: string
  keyboardType?: KeyboardTypeOptions
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoCorrect?: boolean
  autoFocus?: boolean
  multiline?: boolean
  labelRight?: ReactNode
  style?: object
  /** Locked read-only, e.g. a name field that must match what was captured at registration. */
  editable?: boolean
  /** Helper text shown under the field when there's no error — e.g. why it's locked. */
  help?: string
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
  multiline = false,
  labelRight,
  style,
  editable = true,
  help,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={[styles.field, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelRight}
      </View>
      <TextInput
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
          !editable ? styles.inputDisabled : null,
        ]}
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
        multiline={multiline}
        editable={editable}
      />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : help ? (
        <Text style={styles.helpText}>{help}</Text>
      ) : null}
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
  // Redesign: 52pt fields with a 1.5px blue-tinted border, so inputs read as tappable and
  // clear the 44pt target with room for dynamic type. Focus is a blue border, error a red one.
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.family.bold,
    color: colors.textPrimary,
  },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    fontSize: 15,
    fontFamily: typography.family.medium,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: colors.secondary,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.surface,
  },
  inputDisabled: {
    backgroundColor: colors.sunken,
    borderColor: colors.border,
    color: colors.muted,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.small,
    lineHeight: 16,
    fontFamily: typography.family.medium,
    marginTop: spacing.xs + 2,
  },
  helpText: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 16,
    fontFamily: typography.family.regular,
    marginTop: spacing.xs + 2,
  },
})
