import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import * as Location from 'expo-location'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import * as Haptics from 'expo-haptics'
import Animated, { FadeInDown, FadeInUp, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import type { AxiosError } from 'axios'
import type { JobFair, JobFilters, NearbyJob } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useToggleSavedJob } from '@/hooks/use-toggle-saved-job'
import { useMotion } from '@/hooks/useMotion'
import { mergeParsedFilters } from '@/utils/mapQueryParser'
import { AlertBox } from '@/components/ui/AlertBox'
import { Button } from '@/components/ui/Button'
import { PressableScale } from '@/components/ui/PressableScale'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { JobFeedCard } from '@/components/seeker/JobFeedCard'
import { LeafletMap } from '@/components/seeker/LeafletMap'
import { colors, radii, shadows, spacing, typography } from '@/theme'

type MatchTier = 'high' | 'medium' | 'low'

const TIER_THRESHOLDS: { tier: MatchTier; min: number; label: string; color: string }[] = [
  { tier: 'high', min: 80, label: 'High', color: colors.success },
  { tier: 'medium', min: 50, label: 'Medium', color: colors.warning },
  { tier: 'low', min: 0, label: 'Low', color: colors.subtle },
]

function tierFor(job: NearbyJob): MatchTier {
  const match = Math.round(Number(job.match_percentage ?? job.match?.percentage ?? 0))
  if (match >= 80) return 'high'
  if (match >= 50) return 'medium'
  return 'low'
}

// Urdaneta City, Pangasinan — sensible default center when no device/profile location is available yet.
const DEFAULT_REGION = { latitude: 15.9762, longitude: 120.5714, latitudeDelta: 0.15, longitudeDelta: 0.15 }

// Widened to match backend's actual radius_km cap of 500km (SeekerNearbyJobController) —
// mirrors i-peso-frontend's jobMapService.js ALLOWED_RADII.
const RADIUS_OPTIONS = [5, 10, 15, 25, 50, 100, 200, 300]
const MIN_MATCH_OPTIONS = [0, 50, 70, 80]
const SORT_OPTIONS: Array<{ label: string; value: NonNullable<JobFilters['sort']> }> = [
  { label: 'Distance', value: 'distance' },
  { label: 'Match', value: 'match' },
  { label: 'Newest', value: 'newest' },
  { label: 'Salary', value: 'salary' },
]
const JOB_TYPE_OPTIONS = [
  { label: 'Permanent', value: 'Permanent/Regular' },
  { label: 'Contractual', value: 'Contractual' },
  { label: 'Part-time', value: 'Part-Time' },
  { label: 'Freelance', value: 'Freelance' },
]

const EMPTY_JOBS: NearbyJob[] = []
const SHEET_HEIGHT = 420
const PEEK_HEIGHT = 108

const DEFAULT_FILTERS: JobFilters = {
  radiusKm: 15,
  minMatch: 0,
  sort: 'distance',
  limit: 30,
  compact: false,
}

function matchColor(job: NearbyJob) {
  return TIER_THRESHOLDS.find((t) => t.tier === tierFor(job))!.color
}

// Where the header's back button should land, since job-map is a flat sibling in the Tabs
// navigator (see jobs/[id].tsx's backTargetFor for the same reasoning) — plain router.back()
// has no real history to pop and always falls through to the first tab (Home).
const BACK_DESTINATIONS: Record<string, string> = {
  jobs: '/(seeker)/jobs',
}

export default function JobMapScreen() {
  const router = useRouter()
  const { from } = useLocalSearchParams<{ from?: string }>()
  const backTarget = BACK_DESTINATIONS[from ?? ''] ?? '/(seeker)'

  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS)
  const [debouncedFilters, setDebouncedFilters] = useState<JobFilters>(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNotice, setAiNotice] = useState('')
  const [locationNotice, setLocationNotice] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [region, setRegion] = useState(DEFAULT_REGION)
  const [activeTiers, setActiveTiers] = useState<Set<MatchTier>>(new Set(['high', 'medium', 'low']))
  const [showJobFairPins, setShowJobFairPins] = useState(true)
  const [listExpanded, setListExpanded] = useState(false)
  const m = useMotion()
  const sheetProgress = useSharedValue(0)

  const toggleTier = (tier: MatchTier) => {
    Haptics.selectionAsync()
    setActiveTiers((current) => {
      const next = new Set(current)
      if (next.has(tier)) next.delete(tier)
      else next.add(tier)
      // Never allow the legend to filter everything out — that reads as a broken map, not a
      // narrowed one.
      return next.size === 0 ? current : next
    })
  }

  const toggleListExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setListExpanded((current) => {
      sheetProgress.value = withSpring(current ? 0 : 1, m.spring('snappy'))
      return !current
    })
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(filters), 400)
    return () => clearTimeout(timer)
  }, [filters])

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['jobMap', debouncedFilters],
    queryFn: async () => {
      try {
        const res = await seekerService.searchJobs(debouncedFilters)
        return { jobs: res.jobs ?? [], summary: res.summary, seekerLocation: res.seeker_location, notice: '', locationRequired: false }
      } catch (err) {
        const axiosErr = err as AxiosError<{ code?: string }>
        if (axiosErr.response?.data?.code === 'location_required') {
          try {
            const fallback = await seekerService.searchJobs({ ...debouncedFilters, feedMode: 'latest', sort: 'newest', limit: 30 })
            return {
              jobs: fallback.jobs ?? [],
              summary: fallback.summary,
              seekerLocation: fallback.seeker_location,
              notice: 'Showing latest active vacancies. Add your location to enable nearby map pins.',
              locationRequired: false,
            }
          } catch {
            return { jobs: [], summary: undefined, seekerLocation: null, notice: '', locationRequired: true }
          }
        }
        throw err
      }
    },
  })

  // Pins use compact payloads — a screen full of markers has no business pulling
  // full match/certificate/job-fair/upskill internals for every one of them.
  // Full detail is fetched lazily per-job when a pin is tapped (via the shared
  // job detail screen, GET /seeker/job-map/{id}).
  const { data: pinsData } = useQuery({
    queryKey: ['jobMapPins', debouncedFilters],
    queryFn: async () => {
      try {
        const res = await seekerService.searchJobs({ ...debouncedFilters, compact: true })
        return res.jobs ?? []
      } catch {
        return []
      }
    },
  })

  // Independent of vacancy filters — PESO job fairs are a small, fixed set of events, not
  // something to re-fetch every time the seeker adjusts a vacancy search. Mirrors
  // i-peso-frontend's JobMapPage.jsx; a failure here shouldn't block the primary job map.
  const { data: jobFairs = [] } = useQuery({
    queryKey: ['jobMapFairs'],
    queryFn: () => seekerService.getJobFairs(),
    select: (fairs: JobFair[]) => fairs.filter((fair) => fair.map_eligible && fair.latitude != null && fair.longitude != null),
  })

  const allJobs = data?.jobs ?? EMPTY_JOBS
  const jobs = useMemo(() => allJobs.filter((job) => activeTiers.has(tierFor(job))), [allJobs, activeTiers])
  const jobsWithCoords = useMemo(
    () => (pinsData ?? []).filter((job) => job.latitude != null && job.longitude != null && activeTiers.has(tierFor(job))),
    [pinsData, activeTiers]
  )
  const visibleJobFairs = showJobFairPins ? jobFairs : []
  const locationRequired = data?.locationRequired ?? false
  const errorMessage = error && !locationRequired
    ? ((error as AxiosError<{ message?: string }>).response?.data?.message || 'Unable to load nearby jobs. Please try again.')
    : ''

  useEffect(() => {
    if (jobsWithCoords.length > 0) {
      const first = jobsWithCoords[0]
      setRegion((current) => ({ ...current, latitude: Number(first.latitude), longitude: Number(first.longitude) }))
    } else if (data?.seekerLocation?.latitude != null && data.seekerLocation.longitude != null) {
      setRegion((current) => ({ ...current, latitude: Number(data.seekerLocation!.latitude), longitude: Number(data.seekerLocation!.longitude) }))
    }
    // Only re-center when the result set actually changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinsData, data?.seekerLocation])

  const updateFilters = (changes: Partial<JobFilters>) => setFilters((current) => ({ ...current, ...changes }))

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setLocationNotice('')
  }

  const useCurrentLocation = async () => {
    setIsLocating(true)
    setLocationNotice('')
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setLocationNotice('Location permission was denied. You can still use your saved address.')
        return
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      updateFilters({ lat: position.coords.latitude, lng: position.coords.longitude })
      setRegion((current) => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude }))
      setLocationNotice('Using your current location for this search. Your coordinates are not shared with employers.')
    } catch {
      setLocationNotice('Unable to get your current location. You can still use your saved address.')
    } finally {
      setIsLocating(false)
    }
  }

  const runAiSearch = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true)
    setAiNotice('')
    const parsed = await seekerService.parseJobSearchQuery(aiQuery.trim())
    const merged = mergeParsedFilters(parsed, aiQuery.trim())
    setAiLoading(false)

    if (!parsed) {
      setAiNotice('Smart search is unavailable right now — using keyword matching instead.')
    }
    updateFilters(merged)
  }

  const toggleSavedMutation = useToggleSavedJob()

  const openJob = (job: NearbyJob) => router.push({ pathname: '/(seeker)/jobs/[id]', params: { id: String(job.post_id), from: 'job-map' } })

  const activeToggleCount = [
    filters.hideLowMatch, filters.hideApplied, filters.savedOnly, filters.jobFairOnly,
    filters.upskillRecommendedOnly, filters.certificateMatchOnly, filters.canApplyOnly, filters.coordinatesOnly,
  ].filter(Boolean).length

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(sheetProgress.value, [0, 1], [SHEET_HEIGHT - PEEK_HEIGHT, 0]) }],
  }))
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(sheetProgress.value, [0, 1], [0, 180])}deg` }],
  }))

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Job Map" onBack={() => router.replace(backTarget as never)} />

      {/* Full-bleed map stage — every control below is an absolutely-positioned overlay on
          top of it, rather than a stacked layout that squeezes the map into a small box. */}
      <View style={styles.stage}>
        <LeafletMap
          region={region}
          markers={[
            ...jobsWithCoords.map((job) => ({
              postId: String(job.post_id),
              lat: Number(job.latitude),
              lng: Number(job.longitude),
              color: matchColor(job),
            })),
            // Prefixed so onMarkerPress can tell a job-fair pin apart from a vacancy pin —
            // LeafletMap's marker id is a single shared string channel back from the WebView.
            ...visibleJobFairs.map((fair) => ({
              postId: `fair:${fair.job_fair_id}`,
              lat: Number(fair.latitude),
              lng: Number(fair.longitude),
              color: colors.primary,
            })),
          ]}
          onMarkerPress={(postId) => {
            // Tapping a standalone PESO Job Fair pin goes to the same place "View event
            // details" already sends a seeker from a linked vacancy card — mirrors web's
            // handleJobFairPin in JobMapPage.jsx.
            if (postId.startsWith('fair:')) {
              router.push({ pathname: '/(seeker)/job-fairs', params: { from: 'job-map' } })
              return
            }
            const job = jobsWithCoords.find((j) => String(j.post_id) === postId)
            if (job) openJob(job)
          }}
        />
        {isLoading ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={colors.info} />
          </View>
        ) : null}

        {/* Floating search bar */}
        <Animated.View entering={m.enabled ? FadeInDown.duration(280) : undefined} style={styles.floatingTop}>
          <View style={styles.searchBar}>
            <View style={styles.searchInputWrap}>
              <MaterialIcons name="auto-awesome" size={16} color={colors.info} />
              <TextInput
                style={styles.searchInput}
                value={aiQuery}
                onChangeText={setAiQuery}
                placeholder="Try: high match jobs within 10km"
                placeholderTextColor={colors.subtle}
                returnKeyType="search"
                onSubmitEditing={runAiSearch}
              />
            </View>
            <TouchableOpacity onPress={runAiSearch} disabled={aiLoading || !aiQuery.trim()} style={styles.iconBtn}>
              {aiLoading ? <ActivityIndicator size="small" color={colors.white} /> : <MaterialIcons name="search" size={20} color={colors.white} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={useCurrentLocation} disabled={isLocating} style={styles.iconBtnOutline}>
              {isLocating ? <ActivityIndicator size="small" color={colors.info} /> : <MaterialIcons name="my-location" size={20} color={colors.info} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFiltersOpen(true)} style={styles.iconBtnOutline}>
              <MaterialIcons name="tune" size={20} color={colors.info} />
              {activeToggleCount > 0 ? <View style={styles.filterDot} /> : null}
            </TouchableOpacity>
          </View>

          {aiNotice ? <FloatingNotice text={aiNotice} /> : null}
          {locationNotice ? <FloatingNotice text={locationNotice} /> : null}
          {data?.notice ? <FloatingNotice text={data.notice} /> : null}
          {errorMessage ? <AlertBox variant="danger" style={styles.floatingAlert}>{errorMessage}</AlertBox> : null}
          {locationRequired ? (
            <AlertBox variant="warning" style={styles.floatingAlert}>
              Update your address in Profile, or use your current location, to see jobs near you.
            </AlertBox>
          ) : null}

          {data?.summary ? (
            <View style={styles.summaryPill}>
              <Text style={styles.summaryText}>
                <Text style={styles.summaryStrong}>{data.summary.total_found ?? allJobs.length} jobs</Text> found
                {typeof data.summary.high_match_count === 'number' ? ` · ${data.summary.high_match_count} high-match` : ''}
                {data.summary.nearest_distance_km != null ? ` · nearest ${Number(data.summary.nearest_distance_km).toFixed(1)} km` : ''}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Floating, interactive legend — tap a tier to filter both the pins and the list
            below to just that match band; tap "PESO Job Fair" to toggle those pins. Mirrors
            i-peso-frontend's JobVacancyMap.jsx MapLegend, made tappable for mobile. */}
        <Animated.View entering={m.enabled ? FadeInUp.delay(120).duration(280) : undefined} style={styles.legendCard}>
          <Text style={styles.legendTitle}>Match legend</Text>
          <View style={styles.legendRow}>
            {TIER_THRESHOLDS.map((tier) => (
              <LegendChip
                key={tier.tier}
                label={tier.label}
                color={tier.color}
                active={activeTiers.has(tier.tier)}
                onPress={() => toggleTier(tier.tier)}
              />
            ))}
            <LegendChip label="Job Fair" color={colors.primary} active={showJobFairPins} onPress={() => setShowJobFairPins((v) => !v)} />
          </View>
        </Animated.View>

        {/* Job list, as a sheet overlapping the bottom of the map — tap the handle to expand
            it over the map instead of it permanently eating screen space below the map. */}
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <PressableScale onPress={toggleListExpanded} ripple={null} style={styles.sheetHandleWrap} accessibilityRole="button" accessibilityLabel={listExpanded ? 'Collapse job list' : 'Expand job list'}>
            <View style={styles.sheetGrip} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetHeaderText}>{jobs.length} job{jobs.length === 1 ? '' : 's'} on this map</Text>
              <Animated.View style={chevronStyle}>
                <MaterialIcons name="keyboard-arrow-up" size={22} color={colors.textSecondary} />
              </Animated.View>
            </View>
          </PressableScale>

          <ScrollView
            style={styles.listWrap}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={listExpanded}
          >
            {!isLoading && !errorMessage && !locationRequired && jobs.length === 0 ? (
              <Text style={styles.emptyText}>
                {allJobs.length > 0
                  ? 'No jobs match the selected legend tiers. Tap a tier above to include it.'
                  : `No jobs found within ${filters.radiusKm ?? 15} km. Try widening the radius.`}
              </Text>
            ) : null}
            {jobs.map((job, index) => (
              <JobFeedCard
                key={String(job.post_id)}
                job={job}
                index={index}
                saving={toggleSavedMutation.isPending && String(toggleSavedMutation.variables) === String(job.post_id)}
                onPress={() => openJob(job)}
                onToggleSave={() => toggleSavedMutation.mutate(String(job.post_id))}
              />
            ))}
            {isFetching && !isLoading ? <ActivityIndicator color={colors.info} style={styles.footerSpinner} /> : null}
          </ScrollView>
        </Animated.View>
      </View>

      <Modal visible={filtersOpen} animationType="slide" transparent onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={resetFilters}><Text style={styles.resetText}>Reset</Text></TouchableOpacity>
            </View>
            <ScrollView>
              <FilterLabel>Radius</FilterLabel>
              <ChipRow>
                {RADIUS_OPTIONS.map((value) => (
                  <Chip key={value} label={`${value} km`} active={filters.radiusKm === value} onPress={() => updateFilters({ radiusKm: value })} />
                ))}
              </ChipRow>

              <FilterLabel>Minimum Match</FilterLabel>
              <ChipRow>
                {MIN_MATCH_OPTIONS.map((value) => (
                  <Chip key={value} label={value === 0 ? 'Any' : `${value}%+`} active={filters.minMatch === value} onPress={() => updateFilters({ minMatch: value })} />
                ))}
              </ChipRow>

              <FilterLabel>Sort by</FilterLabel>
              <ChipRow>
                {SORT_OPTIONS.map((item) => (
                  <Chip key={item.value} label={item.label} active={filters.sort === item.value} onPress={() => updateFilters({ sort: item.value })} />
                ))}
              </ChipRow>

              <FilterLabel>Employment Type</FilterLabel>
              <ChipRow>
                <Chip label="All" active={!filters.jobType} onPress={() => updateFilters({ jobType: undefined })} />
                {JOB_TYPE_OPTIONS.map((item) => (
                  <Chip key={item.value} label={item.label} active={filters.jobType === item.value} onPress={() => updateFilters({ jobType: item.value })} />
                ))}
              </ChipRow>

              <FilterLabel>Minimum Salary</FilterLabel>
              <TextInput
                style={styles.numberInput}
                value={filters.salaryMin ? String(filters.salaryMin) : ''}
                onChangeText={(v) => updateFilters({ salaryMin: v ? Number(v.replace(/\D/g, '')) : undefined })}
                placeholder="e.g. 15000"
                placeholderTextColor={colors.subtle}
                keyboardType="number-pad"
              />

              <FilterLabel>Maximum Salary</FilterLabel>
              <TextInput
                style={styles.numberInput}
                value={filters.salaryMax ? String(filters.salaryMax) : ''}
                onChangeText={(v) => updateFilters({ salaryMax: v ? Number(v.replace(/\D/g, '')) : undefined })}
                placeholder="e.g. 30000"
                placeholderTextColor={colors.subtle}
                keyboardType="number-pad"
              />

              <FilterLabel>Location Keyword</FilterLabel>
              <TextInput
                style={styles.numberInput}
                value={filters.locationKeyword ?? ''}
                onChangeText={(v) => updateFilters({ locationKeyword: v || undefined })}
                placeholder="e.g. Urdaneta City"
                placeholderTextColor={colors.subtle}
              />

              <FilterLabel>Max Missing Skills</FilterLabel>
              <TextInput
                style={styles.numberInput}
                value={filters.maxMissingSkills !== undefined ? String(filters.maxMissingSkills) : ''}
                onChangeText={(v) => updateFilters({ maxMissingSkills: v ? Number(v.replace(/\D/g, '')) : undefined })}
                placeholder="e.g. 2"
                placeholderTextColor={colors.subtle}
                keyboardType="number-pad"
              />

              <FilterLabel>Toggles</FilterLabel>
              <ChipRow>
                <Chip label="50%+ match only" active={Boolean(filters.hideLowMatch)} onPress={() => updateFilters({ hideLowMatch: !filters.hideLowMatch })} />
                <Chip label="Hide applied" active={Boolean(filters.hideApplied)} onPress={() => updateFilters({ hideApplied: !filters.hideApplied })} />
                <Chip label="Saved jobs" active={Boolean(filters.savedOnly)} onPress={() => updateFilters({ savedOnly: !filters.savedOnly })} />
                <Chip label="Job fairs" active={Boolean(filters.jobFairOnly)} onPress={() => updateFilters({ jobFairOnly: !filters.jobFairOnly })} />
                <Chip label="Upskill matches" active={Boolean(filters.upskillRecommendedOnly)} onPress={() => updateFilters({ upskillRecommendedOnly: !filters.upskillRecommendedOnly })} />
                <Chip label="Certificate matches" active={Boolean(filters.certificateMatchOnly)} onPress={() => updateFilters({ certificateMatchOnly: !filters.certificateMatchOnly })} />
                <Chip label="Can apply now" active={Boolean(filters.canApplyOnly)} onPress={() => updateFilters({ canApplyOnly: !filters.canApplyOnly })} />
                <Chip label="Has coordinates" active={Boolean(filters.coordinatesOnly)} onPress={() => updateFilters({ coordinatesOnly: !filters.coordinatesOnly })} />
              </ChipRow>
            </ScrollView>
            <Button onPress={() => setFiltersOpen(false)} style={styles.applyBtn}>Apply Filters</Button>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function FloatingNotice({ text }: { text: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(200)} style={styles.floatingNotice}>
      <Text style={styles.floatingNoticeText}>{text}</Text>
    </Animated.View>
  )
}

function LegendChip({ label, color, active, onPress }: { label: string; color: string; active: boolean; onPress: () => void }) {
  const scale = useSharedValue(1)
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: withTiming(active ? 1 : 0.4, { duration: 180 }) }))

  return (
    <TouchableOpacity
      onPressIn={() => { scale.value = withSpring(0.92, { damping: 14, stiffness: 260 }) }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 260 }) }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} match tier, ${active ? 'shown' : 'hidden'}`}
    >
      <Animated.View style={[styles.legendChip, style]}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text style={styles.legendLabel}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  )
}

function FilterLabel({ children }: { children: string }) {
  return <Text style={styles.filterLabel}>{children}</Text>
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  stage: { flex: 1, position: 'relative', overflow: 'hidden' },
  mapLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.4)' },

  floatingTop: { position: 'absolute', top: spacing.md, left: spacing.lg, right: spacing.lg, gap: spacing.xs },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.md, paddingHorizontal: spacing.md, backgroundColor: colors.surface, height: 44, ...shadows.md },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: typography.small },
  iconBtn: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  iconBtnOutline: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  filterDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },

  floatingNotice: { backgroundColor: colors.surface, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...shadows.sm },
  floatingNoticeText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 17 },
  floatingAlert: { ...shadows.sm },
  summaryPill: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, ...shadows.sm },
  summaryText: { color: colors.textSecondary, fontSize: typography.small },
  summaryStrong: { color: colors.textPrimary, fontFamily: typography.family.bold },

  legendCard: {
    position: 'absolute',
    left: spacing.lg,
    bottom: PEEK_HEIGHT + spacing.md,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.md,
  },
  legendTitle: { color: colors.textSecondary, fontSize: 9, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.xs },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, maxWidth: 220 },
  legendChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { color: colors.textPrimary, fontSize: 11, fontFamily: typography.family.medium },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    ...shadows.lg,
  },
  sheetHandleWrap: { paddingTop: spacing.sm },
  sheetGrip: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  sheetHeaderText: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold },
  listWrap: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  emptyText: { color: colors.textSecondary, fontSize: typography.body, textAlign: 'center', marginTop: spacing.xl },
  footerSpinner: { marginTop: spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.xl, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold },
  resetText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  filterLabel: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.bold, marginTop: spacing.md, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radii.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.medium },
  chipTextActive: { color: colors.white },
  numberInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary, fontSize: typography.body },
  applyBtn: { marginTop: spacing.lg, marginBottom: 0 },
})
