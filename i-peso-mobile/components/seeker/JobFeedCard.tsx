import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import * as Haptics from 'expo-haptics'
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import type { NearbyJob } from '@/services/seekerService'
import { Badge } from '@/components/ui/Badge'
import { MatchRing } from '@/components/ui/MatchRing'
import { colors, radii, shadows, spacing, typography } from '@/theme'
import { formatSalary, jobCompany, jobLocation, listFrom, textFrom, titleCase } from '@/utils/seekerView'

interface JobFeedCardProps {
  job: NearbyJob
  index?: number
  saving?: boolean
  onPress: () => void
  onToggleSave: () => void
}

export function JobFeedCard({ job, index = 0, saving = false, onPress, onToggleSave }: JobFeedCardProps) {
  const requiredSkills = listFrom(job.required_skills).slice(0, 3)
  const missing = job.missing_skills?.slice(0, 2) ?? []
  const match = Math.round(Number(job.match_percentage ?? job.match?.percentage ?? 0))
  const distance = job.distance_km ? `${Number(job.distance_km).toFixed(Number(job.distance_km) >= 10 ? 0 : 1)} km away` : ''

  const handleSave = () => {
    Haptics.selectionAsync()
    onToggleSave()
  }

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 8) * 45).duration(260)} style={styles.wrap}>
      <Pressable
        onPress={onPress}
        android_ripple={{ color: colors.infoBackground }}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${textFrom(job.job_title, 'job')} at ${jobCompany(job)}`}
      >
        <View style={styles.topRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>{companyInitials(jobCompany(job))}</Text>
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={2}>{textFrom(job.job_title, 'Untitled job')}</Text>
            <Text style={styles.company} numberOfLines={1}>{jobCompany(job)}</Text>
          </View>
          <MatchRing percentage={match} size={48} strokeWidth={4} />
        </View>

        <View style={styles.metaStack}>
          <Meta icon="place" text={[jobLocation(job), distance].filter(Boolean).join(' - ')} />
          <Meta icon="payments" text={formatSalary(job)} />
          <Meta icon="business-center" text={titleCase(job.employment_type, 'Employment type not listed')} />
        </View>

        <View style={styles.badgeRow}>
          {job.has_applied ? <Badge variant="info">{titleCase(job.application_status, 'Applied')}</Badge> : null}
          {job.job_fair?.is_available_at_job_fair ? <Badge variant="warning">Job Fair</Badge> : null}
          {job.certificate_match?.matched ? <Badge variant="success">Certificate Match</Badge> : null}
          {match >= 80 ? <Badge variant="success">Strong Match</Badge> : null}
        </View>

        {requiredSkills.length ? (
          <View style={styles.skillRow}>
            {requiredSkills.map((skill) => (
              <Text key={skill} style={styles.skill}>{skill}</Text>
            ))}
          </View>
        ) : null}

        {missing.length ? (
          <Text style={styles.gapText}>Missing: {missing.map((gap) => gap.skill).join(', ')}</Text>
        ) : null}

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            hitSlop={8}
            style={[styles.saveButton, job.is_saved && styles.saveButtonActive]}
            accessibilityRole="button"
          >
            <MaterialIcons name={job.is_saved ? 'bookmark' : 'bookmark-border'} size={18} color={job.is_saved ? colors.warning : colors.textSecondary} />
            <Text style={[styles.saveText, job.is_saved && styles.saveTextActive]}>{job.is_saved ? 'Saved' : 'Save'}</Text>
          </TouchableOpacity>
          <View style={styles.detailsButton}>
            <Text style={styles.detailsText}>View details</Text>
            <MaterialIcons name="arrow-forward" size={16} color={colors.white} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

function Meta({ icon, text }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; text: string }) {
  return (
    <View style={styles.metaRow}>
      <MaterialIcons name={icon} size={15} color={colors.textSecondary} />
      <Text style={styles.metaText} numberOfLines={1}>{text}</Text>
    </View>
  )
}

function companyInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'PE'
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    borderColor: colors.infoBorder,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoText: {
    color: colors.primary,
    fontSize: typography.small,
    fontFamily: typography.family.bold,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.title,
    lineHeight: 22,
    fontFamily: typography.family.bold,
  },
  company: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.small,
    fontFamily: typography.family.medium,
  },
  metaStack: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 18,
  },
  badgeRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  skillRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  skill: {
    backgroundColor: colors.infoBackground,
    color: colors.info,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: typography.small,
    fontFamily: typography.family.medium,
  },
  gapText: {
    marginTop: spacing.sm,
    color: colors.error,
    fontSize: typography.small,
    fontFamily: typography.family.medium,
  },
  footer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  saveButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  saveButtonActive: {
    backgroundColor: colors.warningBackground,
    borderColor: colors.warningBorder,
  },
  saveText: {
    color: colors.textSecondary,
    fontSize: typography.small,
    fontFamily: typography.family.bold,
  },
  saveTextActive: {
    color: colors.warning,
  },
  detailsButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.secondary,
  },
  detailsText: {
    color: colors.white,
    fontSize: typography.small,
    fontFamily: typography.family.bold,
  },
})
