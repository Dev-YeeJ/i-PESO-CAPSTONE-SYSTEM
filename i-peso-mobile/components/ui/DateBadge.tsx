import { StyleSheet, Text, View } from 'react-native'
import { colors, radii, textStyles, typography } from '@/theme'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Parses "YYYY-MM-DD" as a calendar date (no timezone shift); falls back to Date parsing. */
function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  const date = ymd ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Calendar tile used on job fair cards: month · day · weekday. */
export function DateBadge({ date, size = 60 }: { date: string | null | undefined; size?: number }) {
  const parsed = parseDay(date)
  const label = parsed ? parsed.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', weekday: 'long' }) : 'Date to be announced'

  return (
    <View style={[styles.tile, { width: size, minHeight: size + 8 }]} accessible accessibilityLabel={label}>
      <Text style={styles.month}>{parsed ? MONTHS[parsed.getMonth()] : 'TBA'}</Text>
      <Text style={styles.day}>{parsed ? parsed.getDate() : '—'}</Text>
      {parsed ? <Text style={styles.weekday}>{WEEKDAYS[parsed.getDay()]}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radii.md + 2,
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: colors.tintBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  month: {
    ...textStyles.label,
    color: colors.iconBlue,
  },
  day: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: typography.family.bold,
    color: colors.figure,
  },
  weekday: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: typography.family.regular,
    color: colors.textSecondary,
  },
})
