import { Pressable, StyleSheet, Text, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { colors, spacing, textStyles } from '@/theme'

// Rebuilt from i-peso-frontend/src/components/reviews/StarRating.jsx.
const WORDS = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent']
const STARS = [1, 2, 3, 4, 5]

/** Minimum touch target (pt) for each star, per platform accessibility guidance. */
const STAR_TARGET = 44

interface StarInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  error?: string
  disabled?: boolean
}

/**
 * 1–5 star input, built as a radio group so screen readers announce
 * "Communication, 4 of 5 stars, Good". Filled stars are amber (the "earned" accent);
 * empty stars use the border tone. No animation, so Reduce Motion has nothing to gate.
 */
export function StarInput({ label, value, onChange, error, disabled = false }: StarInputProps) {
  return (
    <View>
      <Text style={styles.legend}>{label}</Text>
      <View style={styles.inputRow}>
        <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel={label}>
          {STARS.map((star) => {
            const checked = value === star
            return (
              <Pressable
                key={star}
                onPress={() => onChange(star)}
                disabled={disabled}
                style={styles.starTarget}
                accessibilityRole="radio"
                accessibilityState={{ checked, disabled }}
                accessibilityLabel={`${star} of 5 stars, ${WORDS[star]}`}
              >
                <MaterialIcons name="star" size={30} color={star <= value ? colors.accent : colors.border} />
              </Pressable>
            )
          })}
        </View>
        <Text style={styles.word} importantForAccessibility="no" accessibilityElementsHidden>
          {WORDS[value] ?? ''}
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

interface StarsProps {
  value: number | null | undefined
  size?: 'sm' | 'lg'
  label?: string
}

/** Read-only stars, e.g. "4.3 ★★★★☆", rounded to the nearest half star. */
export function Stars({ value, size = 'sm', label }: StarsProps) {
  const numeric = Number(value) || 0
  const rounded = Math.round(numeric * 2) / 2
  const iconSize = size === 'lg' ? 20 : 16

  return (
    <View
      style={styles.readOnly}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label ?? `${numeric.toFixed(1)} out of 5 stars`}
    >
      {STARS.map((star) => {
        const full = star <= rounded
        const half = !full && star - 0.5 === rounded
        return (
          <View key={star} style={{ width: iconSize, height: iconSize }}>
            <MaterialIcons name="star" size={iconSize} color={colors.border} style={StyleSheet.absoluteFill} />
            {full || half ? (
              <View style={[styles.fillClip, { width: half ? iconSize / 2 : iconSize, height: iconSize }]}>
                <MaterialIcons name="star" size={iconSize} color={colors.accent} />
              </View>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  legend: { ...textStyles.smallBold, color: colors.textPrimary },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  stars: { flexDirection: 'row' },
  starTarget: { width: STAR_TARGET, height: STAR_TARGET, alignItems: 'center', justifyContent: 'center' },
  word: { ...textStyles.smallMedium, color: colors.textSecondary },
  error: { ...textStyles.small, color: colors.error, marginTop: spacing.xs },
  readOnly: { flexDirection: 'row', alignItems: 'center' },
  fillClip: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
})
