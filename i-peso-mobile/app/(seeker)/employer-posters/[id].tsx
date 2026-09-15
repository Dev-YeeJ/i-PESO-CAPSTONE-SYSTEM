import { useMemo, useState } from 'react'
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { JobFairPoster } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { QueryState } from '@/components/ui/QueryState'
import { JobCard } from '@/components/seeker/JobCard'
import { colors, radii, spacing, typography } from '@/theme'

function timeAgo(iso?: string | null): string {
  if (!iso) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  const units: Array<[string, number]> = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [label, secondsPerUnit] of units) {
    const value = Math.floor(seconds / secondsPerUnit)
    if (value >= 1) return `${value} ${label}${value === 1 ? '' : 's'} ago`
  }
  return 'just now'
}

export default function EmployerPosterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.token)

  // Fetch poster from list cache
  const posters = queryClient.getQueryData<JobFairPoster[]>(['jobFairPosters'])
  const poster = useMemo(() => posters?.find((p) => String(p.id) === id), [posters, id])

  const [refreshing, setRefreshing] = useState(false)

  // Fetch employer's specific vacancies using keyword search
  // The backend will filter by company_name matching the keyword
  const { data: jobResponse, isLoading: isLoadingJobs, error: jobsError, refetch } = useQuery({
    queryKey: ['employerJobs', poster?.company_name],
    queryFn: () => seekerService.searchJobs({ 
      keyword: poster?.company_name ?? '',
      limit: 20
    }),
    enabled: !!poster?.company_name,
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (!poster) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Employer Poster" onBack={() => router.replace('/(seeker)/employer-posters')} />
        <View style={styles.center}>
          <Text style={styles.notFoundTitle}>Poster not found</Text>
          <Text style={styles.notFoundSub}>
            This can happen if you opened a link before the posters list finished loading.
          </Text>
        </View>
      </View>
    )
  }

  const isImage = (poster.mime_type || '').startsWith('image/')
  const vacancies = jobResponse?.jobs ?? []

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Employer Profile" onBack={() => router.replace('/(seeker)/employer-posters')} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.info} />}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.posterCard} padding="md" contentStyle={{ gap: spacing.md }}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.companyTitle}>{poster.company_name || 'Employer'}</Text>
              <Text style={styles.metaText}>{poster.job_fair_title}</Text>
              <Text style={styles.metaText}>{poster.venue}</Text>
            </View>
          </View>

          {isImage && token ? (
            <Image
              source={{ uri: seekerService.jobFairPosterUrl(poster.id), headers: { Authorization: `Bearer ${token}` } }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.docRow}>
              <MaterialIcons name="description" size={32} color={colors.info} />
              <Text style={styles.docName}>{poster.original_filename || 'Poster Document'}</Text>
            </View>
          )}

          <View style={styles.footerRow}>
            <MaterialIcons name="verified" size={16} color={colors.subtle} />
            <Text style={styles.footerText}>Posted {timeAgo(poster.posted_at)}</Text>
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Vacancies</Text>
          <Text style={styles.sectionSubtitle}>Matches are calculated based on your profile.</Text>
        </View>

        <QueryState
          isLoading={isLoadingJobs}
          error={jobsError}
          errorFallback="Unable to load vacancies. Please try again."
          onRetry={refetch}
          isEmpty={!isLoadingJobs && vacancies.length === 0}
          emptyIcon="work-off"
          emptyTitle="No vacancies found"
          emptyMessage={`${poster.company_name} currently has no active job postings on the platform.`}
        >
          <View style={styles.vacanciesList}>
            {vacancies.map((job) => (
              <JobCard key={String(job.post_id)} job={job} />
            ))}
          </View>
        </QueryState>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  
  notFoundTitle: { color: colors.primary, fontSize: typography.title, fontFamily: typography.family.bold },
  notFoundSub: { color: colors.secondaryText, fontSize: typography.body, textAlign: 'center', marginTop: spacing.sm },

  posterCard: { marginBottom: spacing.lg, backgroundColor: colors.surface },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerText: { flex: 1 },
  companyTitle: { color: colors.textPrimary, fontSize: typography.heading, fontFamily: typography.family.bold, marginBottom: 2 },
  metaText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 18 },

  fullImage: { width: '100%', height: 400, borderRadius: radii.md, backgroundColor: colors.border },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background, borderRadius: radii.md },
  docName: { flex: 1, color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold },
  
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xs },
  footerText: { color: colors.subtle, fontSize: typography.small },

  sectionHeader: { marginBottom: spacing.md, paddingHorizontal: spacing.xs },
  sectionTitle: { color: colors.primary, fontSize: typography.title, fontFamily: typography.family.bold },
  sectionSubtitle: { color: colors.textSecondary, fontSize: typography.small, marginTop: 2 },

  vacanciesList: { gap: spacing.md },
})
