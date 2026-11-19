import { StyleSheet, Text, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { NearbyJob } from '@/services/seekerService'
import { formatSalary, jobCompany, jobLocation, textFrom } from '@/utils/seekerView'
import { PressableScale } from '@/components/ui/PressableScale'
import { MatchRing, STRONG_MATCH } from '@/components/ui/MatchRing'
import { Badge } from '@/components/ui/Badge'
import { CompanyLogo } from '@/components/seeker/CompanyLogo'
import { colors, radii, shadows, spacing, textStyles, typography } from '@/theme'

export const HOME_JOB_CARD_WIDTH = 280

interface HomeJobCardProps {
  job: NearbyJob
  saving?: boolean
  onPress: () => void
  onToggleSave: () => void
}

/**
 * Compact job card for Home's "Jobs for you" carousel (redesign base draft). The full card
 * with swipe-to-save, skills and rating stays on the Jobs tab (JobFeedCard).
 *
 * Amber appears only when the match is strong (≥ STRONG_MATCH): the ring and the
 * "Strong match" badge — the one place a seeker has *earned* something on this card.
 */
export function HomeJobCard({ job, saving = false, onPress, onToggleSave }: HomeJobCardProps) {
  // match_deferred jobs carry no percentage; show no ring rather than a misleading 0%.
  const rawMatch = job.match_percentage ?? job.match?.percentage
  const match = rawMatch === undefined || rawMatch === null ? null : Math.round(Number(rawMatch))
  const strong = match !== null && match >= STRONG_MATCH
  const km = job.distance_km ? Number(job.distance_km) : null
  const distance = km !== null && !Number.isNaN(km) ? `${km.toFixed(km >= 10 ? 0 : 1)} km` : ''
  const place = [distance, jobLocation(job)].filter(Boolean).join(' · ')
  const saved = Boolean(job.is_saved)
  const title = textFrom(job.job_title, 'Job opening')

  // The save button is a *sibling* of the card's pressable area (absolutely placed over its
  // footer), not a child: a pressable inside another is one merged element to VoiceOver — the
  // nested Save would be unreachable — and the two touch targets fight over the same press.
  return (
    <View style={styles.card}>
    <PressableScale
      onPress={onPress}
      style={styles.body}
      accessibilityRole="button"
      accessibilityLabel={`${title} at ${jobCompany(job)}${match !== null ? `, ${match} percent match${strong ? ', strong match' : ''}` : ''}. ${formatSalary(job)}`}
    >
      <View style={styles.top}>
        <CompanyLogo uri={job.employer?.company_logo_url} name={jobCompany(job)} size={44} />
        {match !== null ? <MatchRing percentage={match} size={52} strokeWidth={4} earned={strong} showPercent /> : null}
      </View>

      {strong ? (
        <View style={styles.badgeRow}>
          <Badge variant="earned">★ Strong match</Badge>
        </View>
      ) : null}

      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      <Text style={styles.company} numberOfLines={1}>{jobCompany(job)}</Text>

      {place ? (
        <View style={styles.metaRow}>
          <MaterialIcons name="place" size={16} color={colors.iconBlue} />
          <Text style={styles.meta} numberOfLines={1}>{place}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.salaryLabel}>SALARY</Text>
        <Text style={styles.salary} numberOfLines={1}>{formatSalary(job)}</Text>
      </View>
    </PressableScale>
    <PressableScale
      scaleTo="buttonPress"
      ripple={null}
      haptics
      onPress={onToggleSave}
      disabled={saving}
      style={[styles.saveBtn, saved && styles.saveBtnOn]}
      accessibilityRole="button"
      accessibilityLabel={saved ? `Remove ${title} from saved jobs` : `Save ${title}`}
      accessibilityState={{ selected: saved, busy: saving }}
    >
      <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={22} color={saved ? colors.link : colors.iconBlue} />
    </PressableScale>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: HOME_JOB_CARD_WIDTH,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    ...shadows.sm,
  },
  body: { padding: spacing.lg, borderRadius: radii.lg },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  badgeRow: { flexDirection: 'row', marginTop: spacing.md - 2 },
  title: { ...textStyles.bodyBold, fontSize: 16, lineHeight: 22, color: colors.textPrimary, marginTop: spacing.sm },
  company: { ...textStyles.small, fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md - 2 },
  meta: { ...textStyles.small, color: colors.textSecondary, flexShrink: 1 },
  // Right padding keeps the salary clear of the save button that sits over this row.
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    paddingRight: 44 + spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  salaryLabel: { ...textStyles.label, color: colors.subtle },
  // Salary is one of the two figures allowed the serif (see textStyles.figure).
  salary: { fontFamily: typography.family.display, fontSize: 18, lineHeight: 24, color: colors.figure, marginTop: 2 },
  saveBtn: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnOn: { borderColor: colors.tintBorder, backgroundColor: colors.tint },
})
