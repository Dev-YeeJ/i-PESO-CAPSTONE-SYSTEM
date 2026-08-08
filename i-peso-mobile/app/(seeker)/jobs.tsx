import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import type { AxiosError } from 'axios'
import type { JobFilters, NearbyJob } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { AlertBox } from '@/components/ui/AlertBox'
import { Card } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { JobFeedCard } from '@/components/seeker/JobFeedCard'
import { JobFeedSkeleton } from '@/components/seeker/JobFeedSkeleton'
import { colors, radii, shadows, spacing, typography } from '@/theme'

type FeedMode = NonNullable<JobFilters['feedMode']>

const SORT_OPTIONS: Array<{ label: string; value: NonNullable<JobFilters['sort']> }> = [
  { label: 'Match', value: 'match' },
  { label: 'Distance', value: 'distance' },
  { label: 'Newest', value: 'newest' },
  { label: 'Salary', value: 'salary' },
]
const FEED_MODE_OPTIONS: Array<{ label: string; value: FeedMode }> = [
  { label: 'Recommended', value: 'recommended' },
  { label: 'Nearby', value: 'nearby' },
  { label: 'Latest', value: 'latest' },
]
const MIN_MATCH_OPTIONS = [0, 50, 70, 80]
const RADIUS_OPTIONS = [5, 10, 15, 25, 50]
const JOB_TYPE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Permanent', value: 'Permanent/Regular' },
  { label: 'Contractual', value: 'Contractual' },
  { label: 'Part-time', value: 'Part-Time' },
  { label: 'Freelance', value: 'Freelance' },
]
const MIN_SALARY_OPTIONS = [15000, 20000, 25000, 30000]
const JOBS_PER_BATCH = 8

export default function JobsScreen() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [locationKeyword, setLocationKeyword] = useState('')
  const [feedMode, setFeedMode] = useState<FeedMode>('recommended')
  const [sort, setSort] = useState<NonNullable<JobFilters['sort']>>('match')
  const [radiusKm, setRadiusKm] = useState(15)
  const [minMatch, setMinMatch] = useState(0)
  const [savedOnly, setSavedOnly] = useState(false)
  const [hideApplied, setHideApplied] = useState(false)
  const [certificateMatchOnly, setCertificateMatchOnly] = useState(false)
  const [jobFairOnly, setJobFairOnly] = useState(false)
  const [jobType, setJobType] = useState<string | undefined>(undefined)
  const [salaryMin, setSalaryMin] = useState<number | undefined>(undefined)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNotice, setAiNotice] = useState('')
  const [visibleCount, setVisibleCount] = useState(JOBS_PER_BATCH)

  const filters: JobFilters = useMemo(() => ({
    keyword: query.trim() || undefined,
    locationKeyword: locationKeyword.trim() || undefined,
    feedMode,
    sort,
    radiusKm,
    minMatch,
    savedOnly,
    hideApplied,
    certificateMatchOnly,
    jobFairOnly,
    jobType,
    salaryMin,
    limit: 40,
  }), [certificateMatchOnly, feedMode, hideApplied, jobFairOnly, jobType, locationKeyword, minMatch, query, radiusKm, salaryMin, savedOnly, sort])

  const {
    data: jobsData,
    isLoading,
    isRefetching,
    error: jobsError,
    refetch,
  } = useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => seekerService.searchJobs(filters),
    retry: false,
  })

  const jobs = jobsData?.jobs ?? []
  const visibleJobs = jobs.slice(0, visibleCount)
  const locationRequired = (jobsError as AxiosError<{ code?: string }>)?.response?.data?.code === 'location_required'
  const errorMessage = jobsError && !locationRequired
    ? ((jobsError as AxiosError<{ message?: string }>).response?.data?.message || 'Unable to load jobs. Check the backend connection.')
    : ''

  useEffect(() => {
    setVisibleCount(JOBS_PER_BATCH)
  }, [filters])

  const runAiSearch = async () => {
    if (!query.trim()) return

    setAiLoading(true)
    setAiNotice('')
    const parsed = await seekerService.parseJobSearchQuery(query.trim())
    setAiLoading(false)

    if (!parsed) {
      setAiNotice('AI search is unavailable right now. Showing plain keyword results instead.')
      return
    }

    if (parsed.radius_km) setRadiusKm(parsed.radius_km)
    if (parsed.min_match !== undefined) setMinMatch(parsed.min_match)
    if (parsed.sort) setSort(parsed.sort)
    if (parsed.location_keyword) setLocationKeyword(parsed.location_keyword)
    if (parsed.keyword !== undefined) setQuery(parsed.keyword)
    setSavedOnly(Boolean(parsed.saved_only))
    setHideApplied(Boolean(parsed.hide_applied))
    setCertificateMatchOnly(Boolean(parsed.certificate_match_only))
    setJobFairOnly(Boolean(parsed.job_fair_only))
  }

  const toggleSavedMutation = useMutation({
    mutationFn: (jobId: string) => seekerService.toggleSavedJob(jobId),
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: ['jobs'] })
      const previousQueries = queryClient.getQueriesData<{ jobs?: NearbyJob[] }>({ queryKey: ['jobs'] })
      previousQueries.forEach(([key, data]) => {
        if (!data?.jobs) return
        queryClient.setQueryData(key, {
          ...data,
          jobs: data.jobs.map((job) => (String(job.post_id) === jobId ? { ...job, is_saved: !job.is_saved } : job)),
        })
      })
      return { previousQueries }
    },
    onError: (_err, _jobId, context) => {
      context?.previousQueries?.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })

  const onRefresh = useCallback(() => { refetch() }, [refetch])
  const loadMore = () => {
    if (visibleCount < jobs.length) {
      setVisibleCount((current) => Math.min(current + JOBS_PER_BATCH, jobs.length))
    }
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={visibleJobs}
        keyExtractor={(job) => String(job.post_id)}
        renderItem={({ item, index }) => (
          <JobFeedCard
            job={item}
            index={index}
            saving={toggleSavedMutation.isPending && String(toggleSavedMutation.variables) === String(item.post_id)}
            onPress={() => router.push(`/(seeker)/jobs/${item.post_id}`)}
            onToggleSave={() => toggleSavedMutation.mutate(String(item.post_id))}
          />
        )}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.info} />}
        ListHeaderComponent={(
          <JobsHeader
            query={query}
            setQuery={setQuery}
            aiLoading={aiLoading}
            aiNotice={aiNotice}
            locationKeyword={locationKeyword}
            onAiSearch={runAiSearch}
            feedMode={feedMode}
            setFeedMode={setFeedMode}
            sort={sort}
            setSort={setSort}
            radiusKm={radiusKm}
            setRadiusKm={setRadiusKm}
            minMatch={minMatch}
            setMinMatch={setMinMatch}
            savedOnly={savedOnly}
            setSavedOnly={setSavedOnly}
            hideApplied={hideApplied}
            setHideApplied={setHideApplied}
            certificateMatchOnly={certificateMatchOnly}
            setCertificateMatchOnly={setCertificateMatchOnly}
            jobFairOnly={jobFairOnly}
            setJobFairOnly={setJobFairOnly}
            jobType={jobType}
            setJobType={setJobType}
            salaryMin={salaryMin}
            setSalaryMin={setSalaryMin}
            resultCount={jobs.length}
            isLoading={isLoading}
            locationRequired={locationRequired}
            errorMessage={errorMessage}
          />
        )}
        ListEmptyComponent={!isLoading && !jobsError ? <EmptyJobs /> : null}
        ListFooterComponent={isLoading ? <JobFeedSkeleton /> : visibleCount < jobs.length ? <JobFeedSkeleton rows={1} /> : <View style={styles.footerSpace} />}
      />
    </View>
  )
}

function JobsHeader({
  query,
  setQuery,
  aiLoading,
  aiNotice,
  locationKeyword,
  onAiSearch,
  feedMode,
  setFeedMode,
  sort,
  setSort,
  radiusKm,
  setRadiusKm,
  minMatch,
  setMinMatch,
  savedOnly,
  setSavedOnly,
  hideApplied,
  setHideApplied,
  certificateMatchOnly,
  setCertificateMatchOnly,
  jobFairOnly,
  setJobFairOnly,
  jobType,
  setJobType,
  salaryMin,
  setSalaryMin,
  resultCount,
  isLoading,
  locationRequired,
  errorMessage,
}: {
  query: string
  setQuery: (value: string) => void
  aiLoading: boolean
  aiNotice: string
  locationKeyword: string
  onAiSearch: () => void
  feedMode: FeedMode
  setFeedMode: (value: FeedMode) => void
  sort: NonNullable<JobFilters['sort']>
  setSort: (value: NonNullable<JobFilters['sort']>) => void
  radiusKm: number
  setRadiusKm: (value: number) => void
  minMatch: number
  setMinMatch: (value: number) => void
  savedOnly: boolean
  setSavedOnly: (value: boolean) => void
  hideApplied: boolean
  setHideApplied: (value: boolean) => void
  certificateMatchOnly: boolean
  setCertificateMatchOnly: (value: boolean) => void
  jobFairOnly: boolean
  setJobFairOnly: (value: boolean) => void
  jobType?: string
  setJobType: (value?: string) => void
  salaryMin?: number
  setSalaryMin: (value?: number) => void
  resultCount: number
  isLoading: boolean
  locationRequired: boolean
  errorMessage: string
}) {
  return (
    <View>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.kicker}>i-PESO Jobs</Text>
            <Text style={styles.title}>Find work that fits</Text>
          </View>
          <View style={styles.resultPill}>
            <Text style={styles.resultValue}>{isLoading ? '--' : resultCount}</Text>
            <Text style={styles.resultLabel}>jobs</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Smart matching ranks vacancies by merit, commute, salary, and profile fit.</Text>
      </View>

      <View style={styles.searchPanel}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search jobs, skills, or employers"
              placeholderTextColor={colors.subtle}
              returnKeyType="search"
              onSubmitEditing={onAiSearch}
            />
          </View>
          <TouchableOpacity onPress={onAiSearch} disabled={aiLoading || !query.trim()} style={[styles.aiSearchBtn, (!query.trim() || aiLoading) && styles.aiSearchBtnDisabled]}>
            <MaterialIcons name="auto-awesome" size={16} color={colors.white} />
            <Text style={styles.aiSearchBtnText}>{aiLoading ? '...' : 'AI'}</Text>
          </TouchableOpacity>
        </View>
        {aiNotice ? <Text style={styles.noticeText}>{aiNotice}</Text> : null}
        {locationKeyword ? <Text style={styles.appliedText}>Location filter: {locationKeyword}</Text> : null}
      </View>

      <SegmentedControl options={FEED_MODE_OPTIONS} value={feedMode} onChange={setFeedMode} style={styles.segmented} />

      <FilterSection>
        <Chip label="Saved" active={savedOnly} onPress={() => setSavedOnly(!savedOnly)} />
        <Chip label="Hide applied" active={hideApplied} onPress={() => setHideApplied(!hideApplied)} />
        <Chip label="Certificate match" active={certificateMatchOnly} onPress={() => setCertificateMatchOnly(!certificateMatchOnly)} />
        <Chip label="Job fair" active={jobFairOnly} onPress={() => setJobFairOnly(!jobFairOnly)} />
      </FilterSection>

      <FilterLabel>Sort by</FilterLabel>
      <FilterSection>
        {SORT_OPTIONS.map((item) => (
          <Chip key={item.value} label={item.label} active={sort === item.value} onPress={() => setSort(item.value)} />
        ))}
      </FilterSection>

      <FilterLabel>Radius</FilterLabel>
      <FilterSection>
        {RADIUS_OPTIONS.map((value) => (
          <Chip key={value} label={`${value} km`} active={radiusKm === value} onPress={() => setRadiusKm(value)} />
        ))}
      </FilterSection>

      <FilterLabel>Minimum Match</FilterLabel>
      <FilterSection>
        {MIN_MATCH_OPTIONS.map((value) => (
          <Chip key={value} label={value === 0 ? 'Any' : `${value}%+`} active={minMatch === value} onPress={() => setMinMatch(value)} />
        ))}
      </FilterSection>

      <FilterLabel>Employment Type</FilterLabel>
      <FilterSection>
        <Chip label="All" active={!jobType} onPress={() => setJobType(undefined)} />
        {JOB_TYPE_OPTIONS.map((item) => (
          <Chip key={item.value} label={item.label} active={jobType === item.value} onPress={() => setJobType(item.value)} />
        ))}
      </FilterSection>

      <FilterLabel>Minimum Salary</FilterLabel>
      <FilterSection>
        <Chip label="Any" active={!salaryMin} onPress={() => setSalaryMin(undefined)} />
        {MIN_SALARY_OPTIONS.map((value) => (
          <Chip key={value} label={`PHP ${(value / 1000).toFixed(0)}k+`} active={salaryMin === value} onPress={() => setSalaryMin(value)} />
        ))}
      </FilterSection>

      {locationRequired ? (
        <AlertBox variant="warning" style={styles.alertBox}>
          Update your address in Profile &gt; Edit &gt; Personal to see jobs near you.
        </AlertBox>
      ) : null}

      {errorMessage ? <AlertBox variant="warning" style={styles.alertBox}>{errorMessage}</AlertBox> : null}
    </View>
  )
}

function FilterLabel({ children }: { children: string }) {
  return <Text style={styles.filterLabel}>{children}</Text>
}

function FilterSection({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.filterBtn, active && styles.filterBtnActive]} onPress={onPress} activeOpacity={0.84}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function EmptyJobs() {
  return (
    <Card style={styles.emptyCard} padding="md">
      <View style={styles.emptyIcon}>
        <MaterialIcons name="work-outline" size={28} color={colors.info} />
      </View>
      <Text style={styles.emptyTitle}>No jobs found</Text>
      <Text style={styles.emptySub}>Try another search term, widen your radius, or switch to Latest.</Text>
    </Card>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl + spacing.xl,
  },
  hero: {
    marginBottom: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  kicker: {
    color: colors.secondary,
    fontSize: typography.label,
    fontFamily: typography.family.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.display,
    lineHeight: 32,
    fontFamily: typography.family.bold,
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 20,
  },
  resultPill: {
    minWidth: 64,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  resultValue: {
    color: colors.white,
    fontSize: typography.title,
    fontFamily: typography.family.bold,
  },
  resultLabel: {
    color: colors.subtle,
    fontSize: typography.label,
    fontFamily: typography.family.bold,
  },
  searchPanel: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.body,
    fontFamily: typography.family.medium,
  },
  aiSearchBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
  },
  aiSearchBtnDisabled: {
    opacity: 0.55,
  },
  aiSearchBtnText: {
    color: colors.white,
    fontSize: typography.small,
    fontFamily: typography.family.bold,
  },
  noticeText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 18,
  },
  appliedText: {
    marginTop: spacing.sm,
    color: colors.info,
    fontSize: typography.small,
    fontFamily: typography.family.bold,
  },
  segmented: {
    marginBottom: spacing.md,
  },
  filterLabel: {
    color: colors.muted,
    fontSize: typography.small,
    fontFamily: typography.family.bold,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  chipRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  filterBtn: {
    minHeight: 38,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.muted,
    fontSize: typography.small,
    fontFamily: typography.family.bold,
  },
  filterTextActive: {
    color: colors.white,
  },
  alertBox: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.infoBackground,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.title,
    fontFamily: typography.family.bold,
    marginBottom: spacing.xs,
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 20,
    textAlign: 'center',
  },
  footerSpace: {
    height: spacing.xxl,
  },
})
