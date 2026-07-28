import { forwardRef, useImperativeHandle, useRef } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme'

export interface OtpInputHandle {
  focus: (index?: number) => void
}

interface OtpInputProps {
  length?: number
  digits: string[]
  onChangeDigits: (digits: string[]) => void
  disabled?: boolean
  error?: boolean
}

export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput(
  { length = 6, digits, onChangeDigits, disabled = false, error = false },
  ref
) {
  const inputRefs = useRef<(TextInput | null)[]>([])

  useImperativeHandle(ref, () => ({
    focus: (index = 0) => inputRefs.current[index]?.focus(),
  }))

  const handleChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, '').slice(-1)
    const updated = [...digits]
    updated[index] = sanitized
    onChangeDigits(updated)
    if (sanitized && index < length - 1) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          style={[
            styles.box,
            digits[index] ? styles.boxFilled : null,
            error ? styles.boxError : null,
            disabled ? styles.boxDisabled : null,
          ]}
          value={digits[index] ?? ''}
          editable={!disabled}
          onChangeText={(v) => handleChange(index, v)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          selectTextOnFocus
          caretHidden
        />
      ))}
    </View>
  )
})

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  box: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    fontSize: typography.heading,
    fontFamily: typography.family.bold,
    color: colors.primary,
    backgroundColor: colors.surface,
  },
  boxFilled: {
    borderColor: colors.info,
    borderWidth: 2,
    backgroundColor: colors.infoBackground,
    color: colors.info,
  },
  boxError: {
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBackground,
  },
  boxDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.subtle,
  },
})
