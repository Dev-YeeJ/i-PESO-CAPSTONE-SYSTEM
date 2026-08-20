import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import MapView from 'react-native-map-clustering'
import { Marker } from 'react-native-maps'
import * as Location from 'expo-location'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { AxiosError } from 'axios'
import type { JobFilters, NearbyJob } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useToggleSavedJob } from '@/hooks/use-toggle-saved-job'
import { mergeParsedFilters } from '@/utils/mapQueryParser'
import { AlertBox } from '@/components/ui/AlertBox'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { JobFeedCard } from '@/components/seeker/JobFeedCard'
import { colors, radii, spacing, typography } from '@/theme'

// Urdaneta City, Pangasinan — sensible default center when no device/profile location is available yet.
const DEFAULT_REGION = { latitude: 15.9762, longitude: 120.5714, latitudeDelta: 0.15, longitudeDelta: 0.15 }

const RADIUS_OPTIONS = [5, 10, 15, 25, 50]
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

const DEFAULT_FILTERS: JobFilters = {
  radiusKm: 15,
  minMatch: 0,
  sort: 'distance',
  limit: 30,
  compact: false,
}

function matchColor(job: NearbyJob) {
  const match = Math.round(Number(job.match_percentage ?? job.match?.percentage ?? 0))
  if (match >= 80) return colors.success
  if (match >= 50) return colors.warning
  return colors.subtle
}

export default function JobMapScreen() {
  const router = useRouter()

  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS)
  const [debouncedFilters, setDebouncedFilters] = useState<JobFilters>(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNotice, setAiNotice] = useState('')
  const [locationNotice, setLocationNotice] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [region, setRegion] = useState(DEFAULT_REGION)

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

  const jobs = data?.jobs ?? []
  const jobsWithCoords = useMemo(
    () => (pinsData ?? []).filter((job) => job.latitude != null && job.longitude != null),
    [pinsData]
  )
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
      setAiNotice('AI search is unavailable right now — using keyword matching instead.')
    }
    updateFilters(merged)
  }

  const toggleSavedMutation = useToggleSavedJob()

  const openJob = (job: NearbyJob) => router.push(`/(seeker)/jobs/${job.post_id}`)

  const activeToggleCount = [
    filters.hideLowMatch, filters.hideApplied, filters.savedOnly, filters.jobFairOnly,
    filters.upskillRecommendedOnly, filters.certificateMatchOnly, filters.canApplyOnly, filters.coordinatesOnly,
  ].filter(Boolean).length

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Job Map" onBack={() => router.back()} />

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

      {aiNotice ? <Text style={styles.noticeText}>{aiNotice}</Text> : null}
      {locationNotice ? <Text style={styles.noticeText}>{locationNotice}</Text> : null}
      {data?.notice ? <Text style={styles.noticeText}>{data.notice}</Text> : null}

      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          radius={50}
        >
          {jobsWithCoords.map((job) => (
            <Marker
              key={String(job.post_id)}
              coordinate={{ latitude: Number(job.latitude), longitude: Number(job.longitude) }}
              pinColor={matchColor(job)}
              onPress={() => openJob(job)}
            />
          ))}
        </MapView>
        {isLoading ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={colors.info} />
          </View>
        ) : null}
      </View>

      {data?.summary ? (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            <Text style={styles.summaryStrong}>{data.summary.total_found ?? jobs.length} jobs</Text> found
            {typeof data.summary.high_match_count === 'number' ? ` · ${data.summary.high_match_count} high-match` : ''}
            {data.summary.nearest_distance_km != null ? ` · nearest ${Number(data.summary.nearest_distance_km).toFixed(1)} km` : ''}
          </Text>
        </View>
      ) : null}

      {errorMessage ? <AlertBox variant="danger" style={styles.alertBox}>{errorMessage}</AlertBox> : null}
      {locationRequired ? (
        <AlertBox variant="warning" style={styles.alertBox}>
          Update your address in Profile, or use your current location, to see jobs near you.
        </AlertBox>
      ) : null}

      <ScrollView style={styles.listWrap} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {!isLoading && !errorMessage && !locationRequired && jobs.length === 0 ? (
          <Text style={styles.emptyText}>No jobs found within {filters.radiusKm ?? 15} km. Try widening the radius.</Text>
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
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, backgroundColor: colors.surface, height: 44 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: typography.small },
  iconBtn: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  iconBtnOutline: { width: 44, height: 44, borderRadius: radii.md, borderWidth: 1, borderColor: colors.infoBorder, backgroundColor: colors.infoBackground, alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  noticeText: { color: colors.textSecondary, fontSize: typography.small, paddingHorizontal: spacing.lg, marginTop: spacing.xs },
  mapWrap: { height: 220, marginTop: spacing.md, marginHorizontal: spacing.lg, borderRadius: radii.md, overflow: 'hidden' },
  map: { flex: 1 },
  mapLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.4)' },
  summaryBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  summaryText: { color: colors.textSecondary, fontSize: typography.small },
  summaryStrong: { color: colors.textPrimary, fontFamily: typography.family.bold },
  alertBox: { marginHorizontal: spacing.lg, marginTop: spacing.sm },
  listWrap: { flex: 1, marginTop: spacing.sm },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
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
