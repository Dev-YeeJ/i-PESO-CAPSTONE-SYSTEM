import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { AxiosError } from 'axios'
import type { JobFilters, NearbyJob } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useToggleSavedJob } from '@/hooks/use-toggle-saved-job'
import { Button } from '@/components/ui/Button'
import { AlertBox } from '@/components/ui/AlertBox'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { PressableScale } from '@/components/ui/PressableScale'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { JobFeedCard } from '@/components/seeker/JobFeedCard'
import { JobFeedSkeleton } from '@/components/seeker/JobFeedSkeleton'
import { useEmployerRatings } from '@/hooks/useEmployerRatings'
import { colors, gradients, radii, shadows, spacing, textStyles, typography } from '@/theme'

// Redesigned Jobs tab (Superdesign drafts "10 — Jobs", "10b — Filter sheet", "10c — Saved").
// Search + one filter button up top; every filter lives in the sheet and shows back as a
// removable chip; All / Saved is the one view switch.

const EMPTY_JOBS: NearbyJob[] = []

type FeedMode = NonNullable<JobFilters['feedMode']>
type Sort = NonNullable<JobFilters['sort']>
type View_ = 'all' | 'saved'

const SORT_OPTIONS: { label: string; value: Sort }[] = [
  { label: 'Best match', value: 'match' },
  { label: 'Distance', value: 'distance' },
  { label: 'Newest', value: 'newest' },
  { label: 'Salary', value: 'salary' },
]
const FEED_MODE_OPTIONS: { label: string; value: FeedMode }[] = [
  { label: 'For you', value: 'recommended' },
  { label: 'Nearby', value: 'nearby' },
  { label: 'Latest', value: 'latest' },
]
const VIEW_OPTIONS: { label: string; value: View_ }[] = [
  { label: 'All jobs', value: 'all' },
  { label: 'Saved', value: 'saved' },
]
const MIN_MATCH_OPTIONS = [0, 50, 70, 80]
// Widened to match backend's actual radius_km cap of 500km (SeekerNearbyJobController) —
// mirrors i-peso-frontend's jobMapService.js ALLOWED_RADII.
const RADIUS_OPTIONS = [5, 10, 15, 25, 50, 100, 200, 300]
const JOB_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Permanent', value: 'Permanent/Regular' },
  { label: 'Contractual', value: 'Contractual' },
  { label: 'Part-time', value: 'Part-Time' },
  { label: 'Freelance', value: 'Freelance' },
]
const MIN_SALARY_OPTIONS = [15000, 20000, 25000, 30000]
const JOBS_PER_BATCH = 8

const DEFAULT_RADIUS = 15
const DEFAULT_FEED: FeedMode = 'recommended'

const peso = (value: number) => `₱${(value / 1000).toFixed(0)}k+`

export default function JobsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  const [locationKeyword, setLocationKeyword] = useState('')
  const [feedMode, setFeedMode] = useState<FeedMode>(DEFAULT_FEED)
  const [sort, setSort] = useState<Sort>('match')
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

  // Every filter the seeker changed from the default, as a removable chip. The count on the
  // filter button is this list's length — "how much am I narrowing this?". Saved is the view
  // switch, not a filter, so it isn't listed here.
  const activeFilters = useMemo(() => {
    const list: { key: string; label: string; clear: () => void }[] = []
    if (feedMode !== DEFAULT_FEED) list.push({ key: 'feed', label: FEED_MODE_OPTIONS.find((o) => o.value === feedMode)?.label ?? feedMode, clear: () => setFeedMode(DEFAULT_FEED) })
    if (sort !== 'match') list.push({ key: 'sort', label: `Sort: ${SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort}`, clear: () => setSort('match') })
    if (radiusKm !== DEFAULT_RADIUS) list.push({ key: 'radius', label: `Within ${radiusKm} km`, clear: () => setRadiusKm(DEFAULT_RADIUS) })
    if (minMatch !== 0) list.push({ key: 'match', label: `${minMatch}%+ match`, clear: () => setMinMatch(0) })
    if (jobType) list.push({ key: 'type', label: JOB_TYPE_OPTIONS.find((o) => o.value === jobType)?.label ?? jobType, clear: () => setJobType(undefined) })
    if (salaryMin) list.push({ key: 'salary', label: peso(salaryMin), clear: () => setSalaryMin(undefined) })
    if (hideApplied) list.push({ key: 'applied', label: 'Hide applied', clear: () => setHideApplied(false) })
    if (certificateMatchOnly) list.push({ key: 'cert', label: 'Certificate match', clear: () => setCertificateMatchOnly(false) })
    if (jobFairOnly) list.push({ key: 'fair', label: 'At a job fair', clear: () => setJobFairOnly(false) })
    if (locationKeyword.trim()) list.push({ key: 'place', label: locationKeyword.trim(), clear: () => setLocationKeyword('') })
    return list
  }, [certificateMatchOnly, feedMode, hideApplied, jobFairOnly, jobType, locationKeyword, minMatch, radiusKm, salaryMin, sort])

  const resetFilters = () => {
    setFeedMode(DEFAULT_FEED)
    setSort('match')
    setRadiusKm(DEFAULT_RADIUS)
    setMinMatch(0)
    setJobType(undefined)
    setSalaryMin(undefined)
    setHideApplied(false)
    setCertificateMatchOnly(false)
    setJobFairOnly(false)
    setLocationKeyword('')
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

  const jobs = jobsData?.jobs ?? EMPTY_JOBS
  const visibleJobs = jobs.slice(0, visibleCount)
  // One ratings request for the whole feed (not per "load more" page), like the website.
  const employerRatings = useEmployerRatings(jobs)
  const locationRequired = (jobsError as AxiosError<{ code?: string }>)?.response?.data?.code === 'location_required'
  const errorMessage = jobsError && !locationRequired
    ? ((jobsError as AxiosError<{ message?: string }>).response?.data?.message || 'Unable to load jobs. Check your connection and try again.')
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
      setAiNotice('Smart search is unavailable right now. Showing plain keyword results instead.')
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

  const resultLabel = isLoading
    ? 'Finding jobs…'
    : savedOnly
    ? `${jobs.length} saved`
    : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}`

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
            onPress={() => router.push({ pathname: '/(seeker)/jobs/[id]', params: { id: String(item.post_id), from: 'jobs' } })}
            onToggleSave={() => toggleSavedMutation.mutate(String(item.post_id))}
            rating={item.employer?.employer_id ? employerRatings[String(item.employer.employer_id)] : undefined}
          />
        )}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xs }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.secondary} colors={[colors.secondary]} />}
        ListHeaderComponent={(
          <View>
            {/* Tab header — white, the list carries the screen. */}
            <View style={styles.tabHead}>
              <View style={styles.flexOne}>
                <Text style={styles.kicker}>I-PESO JOBS</Text>
                <Text style={styles.title} accessibilityRole="header">{savedOnly ? 'Saved jobs' : 'Find work that fits'}</Text>
              </View>
              <PressableScale
                scaleTo="buttonPress"
                ripple={null}
                onPress={() => router.push({ pathname: '/(seeker)/job-map', params: { from: 'jobs' } })}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Open the job map"
              >
                <MaterialIcons name="map" size={24} color={colors.iconBlue} />
              </PressableScale>
            </View>

            {/* Search: keyword + smart (AI) search + the one filter button */}
            <View style={styles.search}>
              <MaterialIcons name="search" size={22} color={colors.subtle} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search jobs or skills"
                placeholderTextColor={colors.subtle}
                returnKeyType="search"
                numberOfLines={1}
                onSubmitEditing={runAiSearch}
                accessibilityLabel="Search jobs or skills"
              />
              <PressableScale
                scaleTo="buttonPress"
                ripple={null}
                onPress={runAiSearch}
                disabled={aiLoading || !query.trim()}
                hitSlop={2}
                style={[styles.searchAction, (!query.trim() || aiLoading) && styles.searchActionDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Smart search: understand my words, like “high match jobs within 10 km”"
              >
                {aiLoading ? <ActivityIndicator size="small" color={colors.iconBlue} /> : <MaterialIcons name="auto-awesome" size={20} color={colors.iconBlue} />}
              </PressableScale>
              <PressableScale
                scaleTo="buttonPress"
                ripple={null}
                onPress={() => setFiltersOpen(true)}
                hitSlop={2}
                style={styles.searchAction}
                accessibilityRole="button"
                accessibilityLabel={activeFilters.length ? `Filters, ${activeFilters.length} active` : 'Filters'}
              >
                <MaterialIcons name="tune" size={20} color={colors.iconBlue} />
                {activeFilters.length ? (
                  <View style={styles.filterCount}>
                    <Text style={styles.filterCountText}>{activeFilters.length}</Text>
                  </View>
                ) : null}
              </PressableScale>
            </View>

            <SegmentedControl options={VIEW_OPTIONS} value={savedOnly ? 'saved' : 'all'} onChange={(value) => setSavedOnly(value === 'saved')} style={styles.segment} />

            {activeFilters.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
                {activeFilters.map((item) => (
                  <Chip key={item.key} label={item.label} soft onRemove={item.clear} />
                ))}
                <PressableScale scaleTo="buttonPress" ripple={null} onPress={resetFilters} style={styles.clearAll} accessibilityRole="button" accessibilityLabel="Clear all filters">
                  <Text style={styles.clearAllText}>Clear all</Text>
                </PressableScale>
              </ScrollView>
            ) : null}

            <View style={styles.resultRow}>
              <Text style={styles.resultText}>
                <Text style={styles.resultStrong}>{resultLabel}</Text>
                {!isLoading && savedOnly ? ' · swipe a card to unsave' : ''}
              </Text>
              <PressableScale scaleTo="buttonPress" ripple={null} onPress={() => setFiltersOpen(true)} style={styles.sortBtn} accessibilityRole="button" accessibilityLabel={`Sort: ${SORT_OPTIONS.find((o) => o.value === sort)?.label}. Change`}>
                <MaterialIcons name="swap-vert" size={18} color={colors.iconBlue} />
                <Text style={styles.sortText}>{SORT_OPTIONS.find((o) => o.value === sort)?.label}</Text>
              </PressableScale>
            </View>

            {aiNotice ? <AlertBox variant="info" style={styles.alertBox}>{aiNotice}</AlertBox> : null}
            {locationRequired ? (
              <AlertBox variant="warning" style={styles.alertBox}>
                Add your address in Profile › Edit › Personal to see jobs near you.
              </AlertBox>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          isLoading ? null : errorMessage ? (
            <EmptyState
              art="cloud"
              title="Couldn't load jobs"
              message={errorMessage}
              action={<Button variant="outline" size="sm" icon="refresh" onPress={() => refetch()}>Try again</Button>}
            />
          ) : locationRequired ? null : savedOnly ? (
            <EmptyState
              art="star"
              title="No saved jobs yet"
              message="Tap the bookmark on any job, or swipe it, to keep it here for later."
              action={<Button size="md" onPress={() => setSavedOnly(false)}>Browse jobs</Button>}
            />
          ) : (
            <EmptyState
              art="search"
              title="No jobs match this search"
              message={
                activeFilters.length
                  ? 'Clear your filters, widen the distance, or switch to Latest to see more.'
                  : 'Try another word, or switch to Latest in Filters to see the newest postings.'
              }
              action={activeFilters.length ? <Button variant="outline" size="sm" onPress={resetFilters}>Clear filters</Button> : undefined}
            />
          )
        }
        ListFooterComponent={isLoading ? <JobFeedSkeleton /> : visibleCount < jobs.length ? <JobFeedSkeleton rows={1} /> : <View style={styles.footerSpace} />}
      />

      {/* Map shortcut, floating over the list's bottom edge. */}
      <PressableScale
        scaleTo="buttonPress"
        ripple={null}
        onPress={() => router.push({ pathname: '/(seeker)/job-map', params: { from: 'jobs' } })}
        style={styles.mapPillWrap}
        accessibilityRole="button"
        accessibilityLabel="View these jobs on the map"
      >
        <LinearGradient colors={[...gradients.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mapPill}>
          <MaterialIcons name="map" size={20} color={colors.white} />
          <Text style={styles.mapPillText}>Map</Text>
        </LinearGradient>
      </PressableScale>

      <BottomSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        heightRatio={0.86}
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
          <FilterLabel>Show me</FilterLabel>
          <SegmentedControl options={FEED_MODE_OPTIONS} value={feedMode} onChange={setFeedMode} />

          <FilterLabel>Sort by</FilterLabel>
          <ChipWrap>
            {SORT_OPTIONS.map((item) => (
              <Chip key={item.value} label={item.label} selected={sort === item.value} onPress={() => setSort(item.value)} />
            ))}
          </ChipWrap>

          <FilterLabel>Distance</FilterLabel>
          <ChipWrap>
            {RADIUS_OPTIONS.map((value) => (
              <Chip key={value} label={`${value} km`} selected={radiusKm === value} onPress={() => setRadiusKm(value)} />
            ))}
          </ChipWrap>

          <FilterLabel>Minimum match</FilterLabel>
          <ChipWrap>
            {MIN_MATCH_OPTIONS.map((value) => (
              <Chip key={value} label={value === 0 ? 'Any' : `${value}%+`} selected={minMatch === value} onPress={() => setMinMatch(value)} />
            ))}
          </ChipWrap>

          <FilterLabel>Employment type</FilterLabel>
          <ChipWrap>
            <Chip label="Any" selected={!jobType} onPress={() => setJobType(undefined)} />
            {JOB_TYPE_OPTIONS.map((item) => (
              <Chip key={item.value} label={item.label} selected={jobType === item.value} icon={jobType === item.value ? 'check' : undefined} onPress={() => setJobType(item.value)} />
            ))}
          </ChipWrap>

          <FilterLabel>Minimum salary (per month)</FilterLabel>
          <ChipWrap>
            <Chip label="Any" selected={!salaryMin} onPress={() => setSalaryMin(undefined)} />
            {MIN_SALARY_OPTIONS.map((value) => (
              <Chip key={value} label={peso(value)} selected={salaryMin === value} onPress={() => setSalaryMin(value)} />
            ))}
          </ChipWrap>

          <FilterLabel>Show only</FilterLabel>
          <ChipWrap>
            <Chip label="Hide jobs I applied to" selected={hideApplied} icon={hideApplied ? 'check' : undefined} onPress={() => setHideApplied(!hideApplied)} />
            <Chip label="Certificate match" selected={certificateMatchOnly} icon={certificateMatchOnly ? 'check' : undefined} onPress={() => setCertificateMatchOnly(!certificateMatchOnly)} />
            <Chip label="At a job fair" selected={jobFairOnly} icon={jobFairOnly ? 'check' : undefined} onPress={() => setJobFairOnly(!jobFairOnly)} />
          </ChipWrap>
        </ScrollView>
      </BottomSheet>
    </View>
  )
}

function FilterLabel({ children }: { children: string }) {
  return <Text style={styles.filterLabel}>{children}</Text>
}

/** Wrapping chip group — every option visible at once, no hidden horizontal scroll. */
function ChipWrap({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipWrap}>{children}</View>
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  flexOne: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 96, gap: 0 },

  tabHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md },
  kicker: { ...textStyles.label, color: colors.link },
  title: { ...textStyles.display, color: colors.textPrimary, marginTop: 2 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },

  // Fixed height (not minHeight) so the box never grows if text wraps during Android's first
  // layout pass with a flex: 1 TextInput beside other flexible siblings.
  search: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.sunken,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs + 2,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 15, fontFamily: typography.family.medium, paddingVertical: 0 },
  searchAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchActionDisabled: { opacity: 0.5 },
  filterCount: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: { fontSize: 10, fontFamily: typography.family.bold, color: colors.white },

  segment: { marginTop: spacing.md },
  chipScroll: { marginHorizontal: -spacing.lg, marginTop: spacing.md },
  chipRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: 'center' },
  clearAll: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.sm },
  clearAllText: { ...textStyles.smallBold, fontSize: 13, color: colors.link },

  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.sm },
  resultText: { ...textStyles.small, color: colors.textSecondary, flexShrink: 1 },
  resultStrong: { fontFamily: typography.family.bold, color: colors.textPrimary },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingLeft: spacing.sm },
  sortText: { ...textStyles.smallBold, fontSize: 13, color: colors.iconBlue },
  alertBox: { marginBottom: spacing.md },

  mapPillWrap: { position: 'absolute', alignSelf: 'center', bottom: spacing.lg, borderRadius: radii.pill, ...shadows.lg },
  mapPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, height: 44, paddingHorizontal: spacing.lg + 2, borderRadius: radii.pill },
  mapPillText: { ...textStyles.bodyBold, color: colors.white },

  sheetBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  sheetFooter: { flexDirection: 'row', gap: spacing.md },
  resetBtn: { flex: 1 },
  applyBtn: { flex: 1.6 },
  filterLabel: { fontSize: 13, lineHeight: 18, fontFamily: typography.family.bold, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footerSpace: { height: spacing.xxl },
})
