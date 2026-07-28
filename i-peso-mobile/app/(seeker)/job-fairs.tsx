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
      <ScreenHeader title="Job Fairs" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.info} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>PESO Bulletin</Text>
        <Text style={styles.subtitle}>
          Upcoming and ongoing job fairs organized by PESO. Attendance is walk-in — there is no digital RSVP or check-in.
        </Text>

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
                  <Badge variant={statusVariant(fair.status)}>{titleCase(fair.status, 'Scheduled')}</Badge>
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
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  kicker: { color: colors.info, fontSize: typography.small, fontWeight: typography.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  subtitle: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  fairCard: { marginBottom: spacing.md },
  fairHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  fairTitle: { flex: 1, color: colors.primary, fontSize: typography.title, lineHeight: 22, fontWeight: typography.bold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  meta: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
})
