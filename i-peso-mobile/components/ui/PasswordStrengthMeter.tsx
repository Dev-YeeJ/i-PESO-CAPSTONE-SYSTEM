import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '@/theme'

export function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: '', color: colors.border }

  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 1) return { score, label: 'Weak', color: colors.danger }
  if (score <= 3) return { score, label: 'Fair', color: colors.accent }
  if (score === 4) return { score, label: 'Good', color: colors.info }
  return { score, label: 'Strong', color: colors.success }
}

interface PasswordStrengthMeterProps {
  password: string
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null
  const strength = getPasswordStrength(password)

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {[1, 2, 3, 4, 5].map((index) => (
          <View
            key={index}
            style={[styles.segment, { backgroundColor: index <= strength.score ? strength.color : colors.border }]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: strength.color }]}>{strength.label} password</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  bar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.xs,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  label: {
    fontSize: typography.label,
    fontFamily: typography.family.bold,
  },
})
