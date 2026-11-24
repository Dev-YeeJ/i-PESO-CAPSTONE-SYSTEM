import { Linking, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { seekerService } from '@/services/seekerService'
import { useNow } from '@/hooks/useNow'
import { formatInterviewTime, interviewPhase, interviewPhaseText, interviewPhaseVariant, isJoinableLink, jobCompany, nextInterviewOf, textFrom } from '@/utils/seekerView'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PressableScale } from '@/components/ui/PressableScale'
import { LiveDot } from '@/components/interview/LiveDot'
import { colors, radii, spacing, textStyles } from '@/theme'

/**
 * Home's "Up next" interview (mirrors the "Up next" block of ApplicationsSummaryCard in
 * i-peso-frontend/src/pages/seeker/JobSeekerHome.jsx): one happening right now first, with
 * its join link, else the soonest upcoming one. Re-checked every 30 seconds so it doesn't
 * vanish the moment the interview starts. Renders nothing when there is no interview ahead.
 * Shares the ['applications'] cache with My Applications.
 */
export function NextInterviewCard() {
  const now = useNow()
  const { data } = useQuery({ queryKey: ['applications'], queryFn: () => seekerService.getApplications(), staleTime: 60_000 })
  const next = nextInterviewOf(data?.applications ?? [], now)
  if (!next?.interview) return null

  const interview = next.interview
  const live = interviewPhase(interview, now) === 'in_progress'
  const jobTitle = textFrom(next.job?.job_title, 'a vacancy')
  const company = next.job ? jobCompany(next.job) : ''
  const open = () => router.push(`/(seeker)/applications/${next.apply_id}`)

  return (
    <View style={styles.wrap}>
      <PressableScale
        scaleTo="cardPress"
        ripple={null}
        onPress={open}
        style={[styles.card, live && styles.cardLive]}
        accessibilityRole="button"
        accessibilityLabel={`${live ? 'Interview now' : 'Up next'}: ${interviewPhaseText(interview, now)}. Interview for ${jobTitle}${company ? ` at ${company}` : ''}, ${formatInterviewTime(interview.schedule)}. View application`}
      >
        <View style={styles.head}>
          <Text style={styles.kicker}>{live ? 'Interview now' : 'Up next'}</Text>
          <View style={styles.phase}>
            {live ? <LiveDot /> : null}
            <Badge variant={interviewPhaseVariant(interview, now)}>{interviewPhaseText(interview, now)}</Badge>
          </View>
        </View>
        <View style={styles.row}>
          <MaterialIcons name="event-available" size={20} color={live ? colors.success : colors.link} />
          <View style={styles.flexOne}>
            <Text style={styles.title} numberOfLines={2}>Interview for {jobTitle}{company ? ` at ${company}` : ''}</Text>
            <Text style={styles.when}>{formatInterviewTime(interview.schedule)}</Text>
          </View>
        </View>
        {live && isJoinableLink(interview) ? (
          <Button variant="primary" size="sm" iconRight="open-in-new" onPress={() => { Linking.openURL(interview.venue_or_link as string).catch(() => undefined) }} style={styles.join}>
            Join call
          </Button>
        ) : null}
      </PressableScale>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  card: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.md, gap: spacing.sm },
  cardLive: { borderColor: colors.successBorder, backgroundColor: colors.successBackground },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  kicker: { ...textStyles.smallBold, color: colors.textSecondary },
  phase: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flexOne: { flex: 1 },
  title: { ...textStyles.smallBold, color: colors.textPrimary },
  when: { ...textStyles.small, color: colors.textSecondary, marginTop: 2 },
  join: { alignSelf: 'flex-start', marginBottom: 0 },
})
