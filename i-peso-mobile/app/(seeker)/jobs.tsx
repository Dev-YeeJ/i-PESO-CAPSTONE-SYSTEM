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
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Button } from '@/components/ui/Button'
import type { AxiosError } from 'axios'
import type { JobFilters } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useToggleSavedJob } from '@/hooks/use-toggle-saved-job'
import { AlertBox } from '@/components/ui/AlertBox'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Card } from '@/components/ui/Card'
import { PressableScale } from '@/components/ui/PressableScale'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { JobFeedCard } from '@/components/seeker/JobFeedCard'
import { JobFeedSkeleton } from '@/components/seeker/JobFeedSkeleton'
import { colors, gradients, radii, shadows, spacing, textStyles, typography } from '@/theme'

type FeedMode = NonNullable<JobFilters['feedMode']>

const SORT_OPTIONS: { label: string; value: NonNullable<JobFilters['sort']> }[] = [
  { label: 'Match', value: 'match' },
  { label: 'Distance', value: 'distance' },
  { label: 'Newest', value: 'newest' },
  { label: 'Salary', value: 'salary' },
]
const FEED_MODE_OPTIONS: { label: string; value: FeedMode }[] = [
  { label: 'Recommended', value: 'recommended' },
  { label: 'Nearby', value: 'nearby' },
  { label: 'Latest', value: 'latest' },
]
const MIN_MATCH_OPTIONS = [0, 50, 70, 80]
const RADIUS_OPTIONS = [5, 10, 15, 25, 50]
const JOB_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Permanent', value: 'Permanent/Regular' },
  { label: 'Contractual', value: 'Contractual' },
  { label: 'Part-time', value: 'Part-Time' },
  { label: 'Freelance', value: 'Freelance' },
]
const MIN_SALARY_OPTIONS = [15000, 20000, 25000, 30000]
const JOBS_PER_BATCH = 8

const DEFAULT_RADIUS = 15

export default function JobsScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [locationKeyword, setLocationKeyword] = useState('')
  const [feedMode, setFeedMode] = useState<FeedMode>('recommended')
  const [sort, setSort] = useState<NonNullable<JobFilters['sort']>>('match')
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS)
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
  const [filtersOpen, setFiltersOpen] = useState(false)

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

  // Counts only filters the seeker changed from the default, so the badge answers "how much
  // am I narrowing this?" rather than "how many controls exist?".
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (sort !== 'match') count += 1
    if (radiusKm !== DEFAULT_RADIUS) count += 1
    if (minMatch !== 0) count += 1
    if (jobType) count += 1
    if (salaryMin) count += 1
    if (savedOnly) count += 1
    if (hideApplied) count += 1
    if (certificateMatchOnly) count += 1
    if (jobFairOnly) count += 1
    return count
  }, [certificateMatchOnly, hideApplied, jobFairOnly, jobType, minMatch, radiusKm, salaryMin, savedOnly, sort])

  const resetFilters = () => {
    setSort('match')
    setRadiusKm(DEFAULT_RADIUS)
    setMinMatch(0)
    setJobType(undefined)
    setSalaryMin(undefined)
    setSavedOnly(false)
    setHideApplied(false)
    setCertificateMatchOnly(false)
    setJobFairOnly(false)
  }

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

  const toggleSavedMutation = useToggleSavedJob()

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
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.secondary} />}
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
            resultCount={jobs.length}
            isLoading={isLoading}
            locationRequired={locationRequired}
            errorMessage={errorMessage}
            onOpenMap={() => router.push('/(seeker)/job-map')}
            onOpenFilters={() => setFiltersOpen(true)}
            activeFilterCount={activeFilterCount}
            onClearFilters={resetFilters}
          />
        )}
        ListEmptyComponent={!isLoading && !jobsError ? <EmptyJobs onClearFilters={resetFilters} hasFilters={activeFilterCount > 0} /> : null}
        ListFooterComponent={isLoading ? <JobFeedSkeleton /> : visibleCount < jobs.length ? <JobFeedSkeleton rows={1} /> : <View style={styles.footerSpace} />}
      />

      <BottomSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        heightRatio={0.82}
        footer={(
          <View style={styles.sheetFooter}>
            <Button variant="outline" size="lg" onPress={resetFilters} style={styles.resetBtn}>
              Reset
            </Button>
            <Button size="lg" onPress={() => setFiltersOpen(false)} style={styles.applyBtn}>
              {isLoading ? 'Show jobs' : `Show ${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}`}
            </Button>
          </View>
        )}
      >
        <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
          <FilterLabel>Sort by</FilterLabel>
          <FilterSection>
            {SORT_OPTIONS.map((item) => (
              <Chip key={item.value} label={item.label} active={sort === item.value} onPress={() => setSort(item.value)} />
            ))}
          </FilterSection>

          <FilterLabel>Show only</FilterLabel>
          <FilterSection>
            <Chip label="Saved" active={savedOnly} onPress={() => setSavedOnly(!savedOnly)} />
            <Chip label="Hide applied" active={hideApplied} onPress={() => setHideApplied(!hideApplied)} />
            <Chip label="Certificate match" active={certificateMatchOnly} onPress={() => setCertificateMatchOnly(!certificateMatchOnly)} />
            <Chip label="Job fair" active={jobFairOnly} onPress={() => setJobFairOnly(!jobFairOnly)} />
          </FilterSection>

          <FilterLabel>Distance</FilterLabel>
          <FilterSection>
            {RADIUS_OPTIONS.map((value) => (
              <Chip key={value} label={`${value} km`} active={radiusKm === value} onPress={() => setRadiusKm(value)} />
            ))}
          </FilterSection>

          <FilterLabel>Minimum match</FilterLabel>
          <FilterSection>
            {MIN_MATCH_OPTIONS.map((value) => (
              <Chip key={value} label={value === 0 ? 'Any' : `${value}%+`} active={minMatch === value} onPress={() => setMinMatch(value)} />
            ))}
          </FilterSection>

          <FilterLabel>Employment type</FilterLabel>
          <FilterSection>
            <Chip label="All" active={!jobType} onPress={() => setJobType(undefined)} />
            {JOB_TYPE_OPTIONS.map((item) => (
              <Chip key={item.value} label={item.label} active={jobType === item.value} onPress={() => setJobType(item.value)} />
            ))}
          </FilterSection>

          <FilterLabel>Minimum salary</FilterLabel>
          <FilterSection>
            <Chip label="Any" active={!salaryMin} onPress={() => setSalaryMin(undefined)} />
            {MIN_SALARY_OPTIONS.map((value) => (
              <Chip key={value} label={`PHP ${(value / 1000).toFixed(0)}k+`} active={salaryMin === value} onPress={() => setSalaryMin(value)} />
            ))}
          </FilterSection>
        </ScrollView>
      </BottomSheet>
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
  resultCount,
  isLoading,
  locationRequired,
  errorMessage,
  onOpenMap,
  onOpenFilters,
  activeFilterCount,
  onClearFilters,
}: {
  query: string
  setQuery: (value: string) => void
  aiLoading: boolean
  aiNotice: string
  locationKeyword: string
  onAiSearch: () => void
  feedMode: FeedMode
  setFeedMode: (value: FeedMode) => void
  resultCount: number
  isLoading: boolean
  locationRequired: boolean
  errorMessage: string
  onOpenMap: () => void
  onOpenFilters: () => void
  activeFilterCount: number
  onClearFilters: () => void
}) {
  return (
    <View>
      {/* Gradient hero: the one place on this screen that carries brand weight, so the white
          list below stays quiet and the cards do the talking. */}
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroText}>
            <Text style={styles.kicker}>I-PESO JOBS</Text>
            <Text style={styles.title}>Find work that fits</Text>
            <Text style={styles.subtitle}>
              Ranked by how well each vacancy matches your skills, commute, and salary.
            </Text>
          </View>
          <View style={styles.resultPill}>
            <Text style={styles.resultValue}>{isLoading ? '—' : resultCount}</Text>
            <Text style={styles.resultLabel}>{resultCount === 1 ? 'JOB' : 'JOBS'}</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={colors.subtle} />
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
          <TouchableOpacity
            onPress={onAiSearch}
            disabled={aiLoading || !query.trim()}
            style={[styles.aiSearchBtn, (!query.trim() || aiLoading) && styles.aiSearchBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Search with AI"
          >
            <MaterialIcons name="auto-awesome" size={16} color={colors.blue700} />
            <Text style={styles.aiSearchBtnText}>{aiLoading ? '…' : 'AI'}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.controls}>
        <SegmentedControl options={FEED_MODE_OPTIONS} value={feedMode} onChange={setFeedMode} />

        <View style={styles.actionRow}>
          <PressableScale
            onPress={onOpenFilters}
            scaleTo="buttonPress"
            ripple={null}
            style={[styles.filterTrigger, activeFilterCount > 0 && styles.filterTriggerActive]}
            accessibilityRole="button"
            accessibilityLabel={
              activeFilterCount > 0 ? `Filters, ${activeFilterCount} applied` : 'Filters'
            }
          >
            <MaterialIcons
              name="tune"
              size={18}
              color={activeFilterCount > 0 ? colors.white : colors.blue700}
            />
            <Text style={[styles.filterTriggerText, activeFilterCount > 0 && styles.filterTriggerTextActive]}>
              Filters
            </Text>
            {activeFilterCount > 0 ? (
              <View style={styles.filterCount}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </PressableScale>

          <PressableScale
            onPress={onOpenMap}
            scaleTo="buttonPress"
            ripple={null}
            style={styles.mapTrigger}
            accessibilityRole="button"
            accessibilityLabel="View jobs on the map"
          >
            <MaterialIcons name="map" size={18} color={colors.blue700} />
            <Text style={styles.mapTriggerText}>Map</Text>
          </PressableScale>

          {activeFilterCount > 0 ? (
            <TouchableOpacity onPress={onClearFilters} hitSlop={8} accessibilityRole="button">
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {aiNotice ? <Text style={styles.noticeText}>{aiNotice}</Text> : null}
        {locationKeyword ? <Text style={styles.appliedText}>Location filter: {locationKeyword}</Text> : null}

        {locationRequired ? (
          <AlertBox variant="warning" style={styles.alertBox}>
            Update your address in Profile &gt; Edit &gt; Personal to see jobs near you.
          </AlertBox>
        ) : null}

        {errorMessage ? <AlertBox variant="warning" style={styles.alertBox}>{errorMessage}</AlertBox> : null}
      </View>
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
    <PressableScale
      scaleTo="buttonPress"
      ripple={null}
      style={[styles.filterBtn, active && styles.filterBtnActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </PressableScale>
  )
}

function EmptyJobs({ onClearFilters, hasFilters }: { onClearFilters: () => void; hasFilters: boolean }) {
  return (
    <Card style={styles.emptyCard} padding="md">
      <View style={styles.emptyIcon}>
        <MaterialIcons name="work-outline" size={28} color={colors.blue600} />
      </View>
      <Text style={styles.emptyTitle}>No jobs match this search</Text>
      <Text style={styles.emptySub}>
        {hasFilters
          ? 'Clear your filters, widen the distance, or switch to Latest to see more.'
          : 'Try another search term, or switch to Latest to see the newest postings.'}
      </Text>
      {hasFilters ? (
        <Button variant="outline" size="sm" onPress={onClearFilters} style={styles.emptyAction}>
          Clear filters
        </Button>
      ) : null}
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl + spacing.xl,
  },
  hero: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroText: {
    flex: 1,
  },
  kicker: {
    ...textStyles.label,
    color: colors.blue200,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  title: {
    ...textStyles.display,
    color: colors.white,
    lineHeight: 32,
  },
  subtitle: {
    marginTop: spacing.sm,
    ...textStyles.small,
    lineHeight: 18,
    color: colors.blue200,
  },
  resultPill: {
    minWidth: 62,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  resultValue: {
    ...textStyles.figureSmall,
    color: colors.white,
  },
  resultLabel: {
    ...textStyles.label,
    fontSize: 9,
    color: colors.blue200,
  },
  searchRow: {
    marginTop: spacing.lg,
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
    borderRadius: radii.md,
    backgroundColor: colors.surface,
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
    borderRadius: radii.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
  },
  aiSearchBtnDisabled: {
    opacity: 0.55,
  },
  aiSearchBtnText: {
    ...textStyles.smallBold,
    color: colors.blue700,
  },
  controls: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterTrigger: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.blue200,
    backgroundColor: colors.blue50,
    paddingHorizontal: spacing.lg,
  },
  filterTriggerActive: {
    backgroundColor: colors.blue600,
    borderColor: colors.blue600,
  },
  filterTriggerText: {
    ...textStyles.smallBold,
    color: colors.blue700,
  },
  filterTriggerTextActive: {
    color: colors.white,
  },
  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 5,
  },
  filterCountText: {
    ...textStyles.label,
    fontSize: 10,
    color: colors.blue700,
  },
  mapTrigger: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  mapTriggerText: {
    ...textStyles.smallBold,
    color: colors.blue700,
  },
  clearText: {
    ...textStyles.smallBold,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
  },
  noticeText: {
    ...textStyles.small,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  appliedText: {
    ...textStyles.smallBold,
    color: colors.blue700,
  },
  sheetBody: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  resetBtn: {
    flex: 1,
  },
  applyBtn: {
    flex: 2,
  },
  filterLabel: {
    ...textStyles.label,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  filterBtn: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
  },
  filterBtnActive: {
    backgroundColor: colors.blue600,
    borderColor: colors.blue600,
  },
  filterText: {
    ...textStyles.smallBold,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  alertBox: {
    marginTop: spacing.xs,
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
    backgroundColor: colors.blue50,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...textStyles.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySub: {
    ...textStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: spacing.lg,
  },
  footerSpace: {
    height: spacing.xxl,
  },
})
