import { useState } from 'react'
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { JobFair } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { formatDate, textFrom, titleCase } from '@/utils/seekerView'
import { useMotion } from '@/hooks/useMotion'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PressableScale } from '@/components/ui/PressableScale'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { QueryState } from '@/components/ui/QueryState'
import { colors, radii, spacing, typography } from '@/theme'

function statusVariant(status?: string | null): 'info' | 'success' | 'neutral' {
  const value = textFrom(status, '').toLowerCase()
  if (['published', 'accepting_employers', 'upcoming'].includes(value)) return 'info'
  if (['ongoing', 'active'].includes(value)) return 'success'
  return 'neutral'
}

// Where each entry point wants the header's back button to land, since job-fairs is a flat
// sibling in the Tabs navigator (not nested under any of these screens' own stack) — plain
// router.back() has no real history to pop and always falls through to the first tab (Home).
// Callers pass `from` to say where they actually opened this screen from; unset (e.g. deep
// links) defaults to Home, which is at least always a real destination.
const BACK_DESTINATIONS: Record<string, string> = {
  home: '/(seeker)',
  'government-programs': '/(seeker)/government-programs',
  'job-map': '/(seeker)/job-map',
  notifications: '/(seeker)/notifications',
}

export default function JobFairsScreen() {
  const router = useRouter()
  const { from } = useLocalSearchParams<{ from?: string }>()
  const backTarget = BACK_DESTINATIONS[from ?? ''] ?? '/(seeker)'
  const [refreshing, setRefreshing] = useState(false)
  const m = useMotion()

  const { data: jobFairs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['jobFairs'],
    queryFn: () => seekerService.getJobFairs(),
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Job Fairs" onBack={() => router.replace(backTarget as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.info} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>PESO Bulletin</Text>
        <Text style={styles.subtitle}>
          Register for a digital QR pass to make check-in faster, or simply walk in on the day.
        </Text>

        <QueryState
          isLoading={isLoading}
          error={error}
          errorFallback="Unable to load job fairs. Please try again."
          onRetry={refetch}
          isEmpty={!jobFairs.length}
          emptyIcon="event"
          emptyTitle="No upcoming job fairs right now"
          emptyMessage="Check back later or pull down to refresh."
        >
          {jobFairs.map((fair: JobFair, index: number) => {
            const employerCount = fair.participating_employers?.length ?? 0
            const vacancyCount = fair.published_vacancies?.length ?? 0

            return (
              <Animated.View
                key={String(fair.job_fair_id)}
                entering={m.enabled ? FadeInUp.delay(m.stagger(index)).duration(240) : undefined}
              >
              {fair.banner_url ? <Image source={{ uri: fair.banner_url }} style={styles.fairBanner} resizeMode="cover" /> : null}
              <Card style={[styles.fairCard, fair.banner_url && styles.fairCardWithBanner]} padding="md">
                <PressableScale
                  scaleTo="cardPress"
                  ripple={null}
                  onPress={() => router.push(`/(seeker)/job-fairs/${fair.job_fair_id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${textFrom(fair.title, 'job fair')} details`}
                >
                  <View style={styles.fairHeader}>
                    <Text style={styles.fairTitle} numberOfLines={2}>{textFrom(fair.title, 'Untitled job fair')}</Text>
                    <View style={styles.badgeStack}>
                      <Badge variant={statusVariant(fair.status)}>{titleCase(fair.status, 'Scheduled')}</Badge>
                      {fair.is_rsvped ? <Badge variant="success">Registered</Badge> : null}
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <MaterialIcons name="event" size={16} color={colors.subtle} />
                    <Text style={styles.meta}>
                      {formatDate(fair.start_date || fair.event_date)}
                      {fair.end_date ? ` - ${formatDate(fair.end_date)}` : ''}
                    </Text>
                  </View>

                  {fair.venue ? (
                    <View style={styles.metaRow}>
                      <MaterialIcons name="place" size={16} color={colors.subtle} />
                      <Text style={styles.meta}>{fair.venue}</Text>
                    </View>
                  ) : null}

                  <View style={styles.metaRow}>
                    <MaterialIcons name="business" size={16} color={colors.subtle} />
                    <Text style={styles.meta}>
                      {employerCount > 0 ? `${employerCount} employer${employerCount === 1 ? '' : 's'} confirmed` : 'Employers confirming soon'}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <MaterialIcons name="work" size={16} color={colors.subtle} />
                    <Text style={styles.meta}>{vacancyCount} vacanc{vacancyCount === 1 ? 'y' : 'ies'} published</Text>
                  </View>
                </PressableScale>
              </Card>
              </Animated.View>
            )
          })}
        </QueryState>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  kicker: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  fairCard: { marginBottom: spacing.md },
  fairBanner: { width: '100%', height: 140, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, backgroundColor: colors.background },
  fairCardWithBanner: { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: 0 },
  fairHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  badgeStack: { alignItems: 'flex-end', gap: spacing.xs },
  fairTitle: { flex: 1, color: colors.textPrimary, fontSize: typography.title, lineHeight: 22, fontFamily: typography.family.bold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  meta: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 18 },
})
