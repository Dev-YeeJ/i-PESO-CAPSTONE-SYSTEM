import { useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { JobFair } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { formatDate, textFrom, titleCase } from '@/utils/seekerView'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { QueryState } from '@/components/ui/QueryState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { PosterFeedCard } from '@/components/seeker/PosterFeedCard'
import { colors, spacing, typography } from '@/theme'

function statusVariant(status?: string | null): 'info' | 'success' | 'neutral' {
  const value = textFrom(status, '').toLowerCase()
  if (['published', 'accepting_employers', 'upcoming'].includes(value)) return 'info'
  if (['ongoing', 'active'].includes(value)) return 'success'
  return 'neutral'
}

export default function JobFairsScreen() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [view, setView] = useState<'fairs' | 'posters'>('fairs')

  const { data: jobFairs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['jobFairs'],
    queryFn: () => seekerService.getJobFairs(),
  })

  const { data: posters = [], isLoading: postersLoading, error: postersError, refetch: refetchPosters } = useQuery({
    queryKey: ['jobFairPosters'],
    queryFn: () => seekerService.getJobFairPosters(),
    enabled: view === 'posters',
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetch(), view === 'posters' ? refetchPosters() : Promise.resolve()])
    setRefreshing(false)
  }

  return (
    <View style={styles.flex}>
      {/* router.replace, not router.back(): job-fairs is a flat sibling in the
          Tabs navigator (not nested under Government Programs' own stack), so
          back() has nowhere real to return to and falls through to the first
          tab (Home) instead of wherever this screen was actually opened from. */}
      <ScreenHeader title="Job Fairs" onBack={() => router.replace('/(seeker)/government-programs')} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.info} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>PESO Bulletin</Text>
        <Text style={styles.subtitle}>
          Register for a digital QR pass to make check-in faster, or simply walk in on the day.
        </Text>

        <SegmentedControl
          style={styles.segmented}
          value={view}
          onChange={setView}
          options={[
            { label: 'Job Fairs', value: 'fairs' },
            { label: 'Employer Posters', value: 'posters' },
          ]}
        />

        {view === 'fairs' ? (
          <QueryState
            isLoading={isLoading}
            error={error}
            errorFallback="Unable to load job fairs. Please try again."
            isEmpty={!jobFairs.length}
            emptyIcon="event"
            emptyTitle="No upcoming job fairs right now"
            emptyMessage="Check back later or pull down to refresh."
          >
          {jobFairs.map((fair: JobFair) => {
            const employerCount = fair.participating_employers?.length ?? 0
            const vacancyCount = fair.published_vacancies?.length ?? 0

            return (
              <Card key={String(fair.job_fair_id)} style={styles.fairCard} padding="md">
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => router.push(`/(seeker)/job-fairs/${fair.job_fair_id}`)}
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
                    <Text style={styles.meta}>{employerCount} employer{employerCount === 1 ? '' : 's'} participating</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <MaterialIcons name="work" size={16} color={colors.subtle} />
                    <Text style={styles.meta}>{vacancyCount} vacanc{vacancyCount === 1 ? 'y' : 'ies'} published</Text>
                  </View>
                </TouchableOpacity>
              </Card>
            )
          })}
          </QueryState>
        ) : (
          <QueryState
            isLoading={postersLoading}
            error={postersError}
            errorFallback="Unable to load employer posters. Please try again."
            isEmpty={!posters.length}
            emptyIcon="image-not-supported"
            emptyTitle="No employer posters yet"
            emptyMessage="PESO-approved job vacancy posters from participating employers will appear here."
          >
            {posters.map((poster) => <PosterFeedCard key={String(poster.id)} poster={poster} />)}
          </QueryState>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  kicker: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  segmented: { marginBottom: spacing.lg },
  fairCard: { marginBottom: spacing.md },
  fairHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  badgeStack: { alignItems: 'flex-end', gap: spacing.xs },
  fairTitle: { flex: 1, color: colors.textPrimary, fontSize: typography.title, lineHeight: 22, fontFamily: typography.family.bold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  meta: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 18 },
})
