import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import type { NearbyJob } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import {
  formatDate,
  formatSalary,
  jobCompany,
  jobLocation,
  listFrom,
  textFrom,
  titleCase,
} from '@/utils/seekerView'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { colors, radii, spacing, typography } from '@/theme'

type Filter = 'all' | 'nearby' | 'saved'

export default function JobsScreen() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const { data: savedJobsData, isLoading: isLoadingSaved, refetch: refetchSaved } = useQuery({
    queryKey: ['savedJobs'],
    queryFn: async () => {
      const profile = await seekerService.getProfile()
      return profile.dashboard_stats?.saved_jobs?.map(String) || []
    },
  })
  const savedIds = savedJobsData || []

  const {
    data: jobsData,
    isLoading: isLoadingJobs,
    error: jobsError,
    refetch: refetchJobs,
    isRefetching,
  } = useQuery({
    queryKey: ['nearbyJobs'],
    queryFn: () => seekerService.getNearbyJobs({ radiusKm: 20, limit: 30 }),
    retry: false,
  })
  const jobs = jobsData?.jobs || []

  const toggleSavedMutation = useMutation({
    mutationFn: (jobId: string) => seekerService.toggleSavedJob(jobId),
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: ['savedJobs'] })
      const previous = queryClient.getQueryData<string[]>(['savedJobs']) || []
      
      const isSaved = previous.includes(jobId)
      const next = isSaved ? previous.filter(id => id !== jobId) : [...previous, jobId]
      queryClient.setQueryData(['savedJobs'], next)
      
      return { previous }
    },
    onError: (err, jobId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['savedJobs'], context.previous)
      }
      Alert.alert('Error', 'Failed to update saved job status. Please try again.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['savedJobs'] })
    }
  })

  const loading = isLoadingJobs || isLoadingSaved
  const refreshing = isRefetching
  
  const errorMessage = jobsError 
    ? ((jobsError as any).response?.data?.message || 'Unable to load nearby jobs. Check the backend connection and your saved address.') 
    : ''

  const onRefresh = useCallback(() => {
    refetchJobs()
    refetchSaved()
  }, [refetchJobs, refetchSaved])

  const toggleSaved = (jobId: string) => {
    toggleSavedMutation.mutate(jobId)
  }

  const applyToJob = async (job: NearbyJob) => {
    // Moved to [id].tsx, keeping dummy to prevent reference errors if needed
  }

  const filteredJobs = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return jobs.filter((job) => {
      const jobId = String(job.post_id)
      const haystack = [
        job.job_title,
        jobCompany(job),
        jobLocation(job),
        job.employment_type,
        job.work_setup,
        ...listFrom(job.required_skills),
        ...listFrom(job.soft_skills),
      ].join(' ').toLowerCase()

      if (filter === 'saved' && !savedIds.includes(jobId)) return false
      if (filter === 'nearby' && Number(job.distance_km) > 20) return false
      return !needle || haystack.includes(needle)
    })
  }, [filter, jobs, query, savedIds])

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.info} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>Job Search</Text>
        <Text style={styles.title}>Find Jobs</Text>
        <Text style={styles.subtitle}>
          Browse active vacancies near your saved address and keep promising posts in Saved.
        </Text>

        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search job title, company, skill, or location"
          placeholderTextColor={colors.subtle}
        />

        <View style={styles.filters}>
          <FilterButton label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterButton label="Nearby" active={filter === 'nearby'} onPress={() => setFilter('nearby')} />
          <FilterButton label={`Saved (${savedIds.length})`} active={filter === 'saved'} onPress={() => setFilter('saved')} />
        </View>

        {loading ? (
          <Card style={styles.loadingCard} padding="md">
            <ActivityIndicator color={colors.info} />
            <Text style={styles.loadingText}>Loading nearby jobs...</Text>
          </Card>
        ) : null}

        {errorMessage ? (
          <AlertBox variant="warning" style={styles.alertBox}>
            {errorMessage}
          </AlertBox>
        ) : null}

        {!loading && !filteredJobs.length ? (
          <Card style={styles.emptyCard} padding="md">
            <Text style={styles.emptyTitle}>{filter === 'saved' ? 'No saved jobs yet' : 'No jobs found'}</Text>
            <Text style={styles.emptySub}>
              {filter === 'saved'
                ? 'Save jobs from the All tab so you can revisit them later.'
                : 'Try another search term, refresh, or update your address in onboarding.'}
            </Text>
          </Card>
        ) : null}

        {filteredJobs.map((job) => {
          const jobId = String(job.post_id)
          const saved = savedIds.includes(jobId)
          const requiredSkills = listFrom(job.required_skills).slice(0, 5)

          return (
            <Card key={jobId} style={styles.jobCardTouch} padding="md">
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push(`/jobs/${jobId}`)}
              >
                <View style={styles.jobHeader}>
                  <View style={styles.jobTitleWrap}>
                    <Text style={styles.jobTitle} numberOfLines={2}>{textFrom(job.job_title, 'Untitled job')}</Text>
                    <Text style={styles.company}>{jobCompany(job)}</Text>
                  </View>
                  <Badge variant="success" style={styles.matchBadge}>
                    {job.match?.percentage ?? 0}%
                  </Badge>
                </View>

                <Text style={styles.meta}>{jobLocation(job)}</Text>
                <Text style={styles.meta}>{formatSalary(job)}</Text>
                <Text style={styles.meta}>
                  {titleCase(job.employment_type, 'Employment type not listed')}
                  {job.distance_km ? ` - ${job.distance_km} km away` : ''}
                </Text>

                <View style={styles.tagRow}>
                  {requiredSkills.slice(0, 3).map((skill) => (
                    <Text key={skill} style={styles.tag}>{skill}</Text>
                  ))}
                </View>
              </TouchableOpacity>
            </Card>
          )
        })}
      </ScrollView>
    </View>
  )
}

function FilterButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.filterBtn, active && styles.filterBtnActive]} onPress={onPress}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.xxxl },
  kicker: { color: colors.info, fontSize: typography.small, fontWeight: typography.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  title: { color: colors.primary, fontSize: typography.heading, fontWeight: typography.bold, marginBottom: spacing.xs },
  subtitle: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  search: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.subtle, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.primary, fontSize: typography.body, marginBottom: spacing.md },
  filters: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterBtn: { flex: 1, borderWidth: 1, borderColor: colors.subtle, backgroundColor: colors.surface, borderRadius: radii.pill, paddingVertical: spacing.sm, alignItems: 'center' },
  filterBtnActive: { backgroundColor: colors.info, borderColor: colors.info },
  filterText: { color: colors.muted, fontSize: typography.small, fontWeight: typography.bold },
  filterTextActive: { color: colors.white },
  loadingCard: { marginBottom: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.semibold, marginTop: spacing.xs },
  alertBox: { marginBottom: spacing.lg },
  emptyCard: { alignItems: 'center' },
  emptyTitle: { color: colors.primary, fontSize: typography.title, fontWeight: typography.bold, marginBottom: spacing.xs },
  emptySub: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20, textAlign: 'center' },
  jobCardTouch: { marginBottom: spacing.sm },
  jobHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  jobTitleWrap: { flex: 1 },
  jobTitle: { color: colors.primary, fontSize: typography.title, lineHeight: 22, fontWeight: typography.bold },
  company: { color: colors.muted, fontSize: typography.small, fontWeight: typography.semibold, marginTop: spacing.xs },
  matchBadge: { alignSelf: 'flex-start' },
  meta: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18, marginTop: spacing.xs },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  tag: { backgroundColor: colors.infoBackground, color: colors.info, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontSize: typography.small, fontWeight: typography.semibold },
  tagMuted: { backgroundColor: colors.background, color: colors.muted, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontSize: typography.small, fontWeight: typography.semibold },
  tapHint: { color: colors.info, fontSize: typography.small, fontWeight: typography.bold, marginTop: spacing.md },
  details: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.md },
  detailRow: { marginBottom: spacing.sm },
  detailLabel: { color: colors.primary, fontSize: typography.small, fontWeight: typography.bold, marginBottom: spacing.xs },
  detailValue: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
  description: { color: colors.muted, fontSize: typography.small, lineHeight: 20 },
  actions: { marginTop: spacing.md, gap: spacing.sm },
  saveBtn: { marginBottom: 0 },
  applyBtn: { marginBottom: 0 },
  infoBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  infoText: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
})
