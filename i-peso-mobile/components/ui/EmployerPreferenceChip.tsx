import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { colors, radii, spacing, typography } from '@/theme'

interface PreferenceSource {
  preferred_gender?: string | null
  minimum_age?: number | null
  maximum_age?: number | null
}

/**
 * Mirrors i-peso-frontend's EmployerPreferenceChip.jsx / formatEmployerPreference() —
 * 'Any' is the job posting form's default, not a stated preference, so it renders nothing.
 */
function formatEmployerPreference(job?: PreferenceSource | null) {
  if (!job) return null

  const gender = job.preferred_gender
  const min = job.minimum_age
  const max = job.maximum_age

  const parts: string[] = []
  if (gender && gender !== 'Any') parts.push(gender)
  if (min && max) parts.push(`${min}–${max} yrs old`)
  else if (min) parts.push(`${min} yrs old and above`)
  else if (max) parts.push(`up to ${max} yrs old`)

  return parts.length ? parts.join(' · ') : null
}

/**
 * Shows what the employer noted as their preferred candidate profile.
 *
 * Indication only — nothing filters, ranks, or gates an application on this; every
 * seeker sees every posting and can still apply. Styled as neutral information, not a
 * disqualification, matching the web version's amber "note" treatment exactly.
 */
export function EmployerPreferenceChip({ job, style }: { job?: PreferenceSource | null; style?: StyleProp<ViewStyle> }) {
  const label = formatEmployerPreference(job)
  if (!label) return null

  return (
    <View style={[styles.chip, style]}>
      <MaterialIcons name="info-outline" size={13} color={colors.warning} />
      <Text style={styles.text} numberOfLines={2}>Employer preference: {label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningBackground,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  text: {
    color: colors.warning,
    fontSize: typography.label,
    fontFamily: typography.family.bold,
    flexShrink: 1,
  },
})
