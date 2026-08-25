import { useEffect, useRef } from 'react'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import * as Haptics from 'expo-haptics'
import { StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Extrapolation,
  FadeInUp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import type { NearbyJob } from '@/services/seekerService'
import { Badge } from '@/components/ui/Badge'
import { MatchRing } from '@/components/ui/MatchRing'
import { PressableScale } from '@/components/ui/PressableScale'
import { useMotion } from '@/hooks/useMotion'
import { colors, gradients, radii, shadows, spacing, textStyles } from '@/theme'
import { formatSalary, jobCompany, jobLocation, listFrom, textFrom, titleCase } from '@/utils/seekerView'

interface JobFeedCardProps {
  job: NearbyJob
  index?: number
  saving?: boolean
  onPress: () => void
  onToggleSave: () => void
}

/** Drag distance at which the swipe commits. Roughly the width of the action panel behind. */
const SWIPE_THRESHOLD = 72
const SWIPE_MAX = 104

export function JobFeedCard({ job, index = 0, saving = false, onPress, onToggleSave }: JobFeedCardProps) {
  const m = useMotion()
  const requiredSkills = listFrom(job.required_skills).slice(0, 3)
  const missing = job.missing_skills?.slice(0, 2) ?? []
  const match = Math.round(Number(job.match_percentage ?? job.match?.percentage ?? 0))
  const distance = job.distance_km ? `${Number(job.distance_km).toFixed(Number(job.distance_km) >= 10 ? 0 : 1)} km away` : ''

  const translateX = useSharedValue(0)
  // Drives the bookmark's reward pop. Kept separate from the drag so a tap-save animates too.
  const bookmarkScale = useSharedValue(1)

  const fireSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onToggleSave()
  }

  // Pops the bookmark whenever the saved state actually flips, so the feedback confirms the
  // server result rather than the gesture. The ref skips the mount pass — without it every
  // card in the feed would pop its bookmark on first render.
  const wasSaved = useRef(job.is_saved)
  useEffect(() => {
    if (wasSaved.current === job.is_saved) return
    wasSaved.current = job.is_saved

    if (!m.enabled) return
    bookmarkScale.value = withSequence(
      withSpring(1.18, m.spring('bouncy')),
      withSpring(1, m.spring('bouncy')),
    )
  }, [job.is_saved, bookmarkScale, m])

  // Horizontal-only activation: without the offset guards the card would steal every vertical
  // scroll in the feed.
  const swipe = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-14, 14])
    .onChange((event) => {
      // Left drag only — there is no action on the right, and a two-way rubber band reads
      // as an unfinished feature.
      translateX.value = Math.min(0, Math.max(-SWIPE_MAX, translateX.value + event.changeX))
    })
    .onEnd(() => {
      if (translateX.value < -SWIPE_THRESHOLD) {
        runOnJS(fireSave)()
      }
      translateX.value = withSpring(0, m.spring('gentle'))
    })

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const actionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -20, 0], [1, 0.4, 0], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(translateX.value, [-SWIPE_MAX, -SWIPE_THRESHOLD, 0], [1.1, 1, 0.7], Extrapolation.CLAMP),
      },
    ],
  }))

  const bookmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }))

  return (
    <Animated.View
      entering={m.enabled ? FadeInUp.delay(m.stagger(index)).duration(260) : undefined}
      style={styles.wrap}
    >
      {/* Revealed behind the card as it slides left. */}
      <View style={styles.actionLayer} pointerEvents="none">
        <LinearGradient
          colors={[...gradients.cta]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={actionStyle}>
          <MaterialIcons name={job.is_saved ? 'bookmark-remove' : 'bookmark-add'} size={26} color={colors.white} />
          <Text style={styles.actionText}>{job.is_saved ? 'Unsave' : 'Save'}</Text>
        </Animated.View>
      </View>

      <GestureDetector gesture={swipe}>
        <Animated.View style={cardStyle}>
          <PressableScale
            onPress={onPress}
            style={styles.card}
            accessibilityRole="button"
            accessibilityLabel={`Open ${textFrom(job.job_title, 'job')} at ${jobCompany(job)}`}
            accessibilityHint="Swipe left on this card to save it"
          >
            <View style={styles.topRow}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>{companyInitials(jobCompany(job))}</Text>
              </View>
              <View style={styles.titleWrap}>
                <Text style={styles.title} numberOfLines={2}>{textFrom(job.job_title, 'Untitled job')}</Text>
                <Text style={styles.company} numberOfLines={1}>{jobCompany(job)}</Text>
              </View>
              <MatchRing percentage={match} size={52} strokeWidth={5} />
            </View>

            <Text style={styles.salary} numberOfLines={1}>{formatSalary(job)}</Text>

            <View style={styles.metaStack}>
              <Meta icon="place" text={[jobLocation(job), distance].filter(Boolean).join(' · ')} />
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
              <PressableScale
                onPress={fireSave}
                disabled={saving}
                scaleTo="buttonPress"
                ripple={null}
                hitSlop={8}
                style={[styles.saveButton, job.is_saved && styles.saveButtonActive]}
                accessibilityRole="button"
                accessibilityLabel={job.is_saved ? 'Remove from saved jobs' : 'Save this job'}
                accessibilityState={{ selected: job.is_saved, busy: saving }}
              >
                <Animated.View style={bookmarkStyle}>
                  <MaterialIcons
                    name={job.is_saved ? 'bookmark' : 'bookmark-border'}
                    size={18}
                    color={job.is_saved ? colors.blue700 : colors.textSecondary}
                  />
                </Animated.View>
                <Text style={[styles.saveText, job.is_saved && styles.saveTextActive]}>
                  {job.is_saved ? 'Saved' : 'Save'}
                </Text>
              </PressableScale>

              <View style={styles.detailsButton}>
                <Text style={styles.detailsText}>View details</Text>
                <MaterialIcons name="arrow-forward" size={16} color={colors.blue700} />
              </View>
            </View>
          </PressableScale>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  )
}

function Meta({ icon, text }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; text: string }) {
  return (
    <View style={styles.metaRow}>
      <MaterialIcons name={icon} size={15} color={colors.subtle} />
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
  actionLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.lg,
    overflow: 'hidden',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: spacing.xl,
  },
  actionText: {
    ...textStyles.label,
    color: colors.white,
    marginTop: 2,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue50,
  },
  logoText: {
    ...textStyles.smallBold,
    color: colors.blue700,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    ...textStyles.title,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  company: {
    marginTop: spacing.xs,
    ...textStyles.smallMedium,
    color: colors.textSecondary,
  },
  // Salary sits directly under the title, above the other meta: after the match score it is
  // the thing seekers decide on, and burying it in a metadata list hid it.
  salary: {
    marginTop: spacing.md,
    ...textStyles.bodyBold,
    color: colors.blue800,
  },
  metaStack: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    flex: 1,
    ...textStyles.small,
    lineHeight: 18,
    color: colors.textSecondary,
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
    backgroundColor: colors.blue50,
    color: colors.blue700,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...textStyles.smallMedium,
  },
  gapText: {
    marginTop: spacing.sm,
    ...textStyles.smallMedium,
    color: colors.error,
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
    backgroundColor: colors.blue50,
    borderColor: colors.blue200,
  },
  saveText: {
    ...textStyles.smallBold,
    color: colors.textSecondary,
  },
  saveTextActive: {
    color: colors.blue700,
  },
  detailsButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  detailsText: {
    ...textStyles.smallBold,
    color: colors.blue700,
  },
})
