import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
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
import type { AxiosError } from 'axios'
import type { JobFilters, NearbyJob } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import {
  formatSalary,
  jobCompany,
  jobLocation,
  listFrom,
  textFrom,
  titleCase,
} from '@/utils/seekerView'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { MatchRing } from '@/components/ui/MatchRing'
import { colors, radii, spacing, typography } from '@/theme'

const SORT_OPTIONS: Array<{ label: string; value: NonNullable<JobFilters['sort']> }> = [
  { label: 'Distance', value: 'distance' },
  { label: 'Match', value: 'match' },
  { label: 'Newest', value: 'newest' },
  { label: 'Salary', value: 'salary' },
]
const MIN_MATCH_OPTIONS = [0, 50, 70, 80]
const RADIUS_OPTIONS = [5, 10, 15, 25, 50]
// Values must match the website's employment-type filter exactly (JobMapFilters.jsx) — the
// backend matches job_type as an exact string against JobVacancy.employment_type.
const JOB_TYPE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Permanent', value: 'Permanent/Regular' },
  { label: 'Contractual', value: 'Contractual' },
  { label: 'Part-time', value: 'Part-Time' },
  { label: 'Freelance', value: 'Freelance' },
]
const MIN_SALARY_OPTIONS = [15000, 20000, 25000, 30000]

export default function JobsScreen() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [locationKeyword, setLocationKeyword] = useState('')
  const [sort, setSort] = useState<NonNullable<JobFilters['sort']>>('distance')
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

  const filters: JobFilters = useMemo(() => ({
    keyword: query.trim() || undefined,
    locationKeyword: locationKeyword.trim() || undefined,
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
  }), [query, locationKeyword, sort, radiusKm, minMatch, savedOnly, hideApplied, certificateMatchOnly, jobFairOnly, jobType, salaryMin])

  const runAiSearch = async () => {
    if (!query.trim()) return
    setAiLoading(true)
    setAiNotice('')
    const parsed = await seekerService.parseJobSearchQuery(query.trim())
    setAiLoading(false)
    if (!parsed) {
      setAiNotice('AI search is unavailable right now — showing plain keyword results instead.')
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
  const locationRequired = (jobsError as AxiosError<{ code?: string }>)?.response?.data?.code === 'location_required'
  const errorMessage = jobsError && !locationRequired
    ? ((jobsError as AxiosError<{ message?: string }>).response?.data?.message || 'Unable to load jobs. Check the backend connection.')
    : ''

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

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.info} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>Job Search</Text>
        <Text style={styles.title}>Find Jobs</Text>
        <Text style={styles.subtitle}>Server-matched vacancies near your saved address.</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={[styles.search, styles.searchInput]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search, or ask AI: 'part-time jobs near me'"
            placeholderTextColor={colors.subtle}
            returnKeyType="search"
            onSubmitEditing={runAiSearch}
          />
          <TouchableOpacity onPress={runAiSearch} disabled={aiLoading || !query.trim()} style={styles.aiSearchBtn}>
            <Text style={styles.aiSearchBtnText}>{aiLoading ? '...' : 'Ask AI'}</Text>
          </TouchableOpacity>
        </View>
        {aiNotice ? <Text style={styles.aiNotice}>{aiNotice}</Text> : null}
        {locationKeyword ? <Text style={styles.aiAppliedFilter}>Location filter: {locationKeyword} (from AI search)</Text> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="Saved" active={savedOnly} onPress={() => setSavedOnly((v) => !v)} />
          <Chip label="Hide applied" active={hideApplied} onPress={() => setHideApplied((v) => !v)} />
          <Chip label="Certificate match" active={certificateMatchOnly} onPress={() => setCertificateMatchOnly((v) => !v)} />
          <Chip label="Job fair" active={jobFairOnly} onPress={() => setJobFairOnly((v) => !v)} />
        </ScrollView>

        <Text style={styles.filterLabel}>Sort by</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {SORT_OPTIONS.map((s) => (
            <Chip key={s.value} label={s.label} active={sort === s.value} onPress={() => setSort(s.value)} />
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Radius (km)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {RADIUS_OPTIONS.map((r) => (
            <Chip key={r} label={`${r} km`} active={radiusKm === r} onPress={() => setRadiusKm(r)} />
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Minimum Match</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {MIN_MATCH_OPTIONS.map((m) => (
            <Chip key={m} label={m === 0 ? 'Any' : `${m}%+`} active={minMatch === m} onPress={() => setMinMatch(m)} />
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Employment Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="All" active={!jobType} onPress={() => setJobType(undefined)} />
          {JOB_TYPE_OPTIONS.map((t) => (
            <Chip key={t.value} label={t.label} active={jobType === t.value} onPress={() => setJobType(t.value)} />
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Minimum Salary</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="Any" active={!salaryMin} onPress={() => setSalaryMin(undefined)} />
          {MIN_SALARY_OPTIONS.map((s) => (
            <Chip key={s} label={`₱${(s / 1000).toFixed(0)}k+`} active={salaryMin === s} onPress={() => setSalaryMin(s)} />
          ))}
        </ScrollView>

        {isLoading ? (
          <Card style={styles.loadingCard} padding="md">
            <ActivityIndicator color={colors.info} />
            <Text style={styles.loadingText}>Loading jobs...</Text>
          </Card>
        ) : null}

        {locationRequired ? (
          <AlertBox variant="warning" style={styles.alertBox}>
            Update your address in Profile &gt; Edit &gt; Personal to see jobs near you.
          </AlertBox>
        ) : null}

        {errorMessage ? (
          <AlertBox variant="warning" style={styles.alertBox}>{errorMessage}</AlertBox>
        ) : null}

        {!isLoading && !jobs.length && !jobsError ? (
          <Card style={styles.emptyCard} padding="md">
            <Text style={styles.emptyTitle}>No jobs found</Text>
            <Text style={styles.emptySub}>Try another search term, a wider radius, or refresh.</Text>
          </Card>
        ) : null}

        {jobs.map((job) => {
          const jobId = String(job.post_id)
          const requiredSkills = listFrom(job.required_skills).slice(0, 3)
          const missing = job.missing_skills?.slice(0, 2) ?? []

          return (
            <Card key={jobId} style={styles.jobCardTouch} padding="md">
              <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/(seeker)/jobs/${jobId}`)}>
                <View style={styles.jobHeader}>
                  <View style={styles.jobTitleWrap}>
                    <Text style={styles.jobTitle} numberOfLines={2}>{textFrom(job.job_title, 'Untitled job')}</Text>
                    <Text style={styles.company}>{jobCompany(job)}</Text>
                  </View>
                  <MatchRing percentage={job.match_percentage ?? job.match?.percentage ?? 0} size={44} strokeWidth={4} />
                </View>

                <View style={styles.metaRow}>
                  {job.has_applied ? <Badge variant="info">{titleCase(job.application_status, 'Applied')}</Badge> : null}
                  {job.job_fair?.is_available_at_job_fair ? <Badge variant="warning">Job Fair</Badge> : null}
                  <TouchableOpacity onPress={() => toggleSavedMutation.mutate(jobId)} hitSlop={8}>
                    <Badge variant={job.is_saved ? 'warning' : 'neutral'}>{job.is_saved ? 'Saved' : 'Save'}</Badge>
                  </TouchableOpacity>
                </View>

                <Text style={styles.meta}>{jobLocation(job)}{job.distance_km ? ` · ${job.distance_km} km away` : ''}</Text>
                <Text style={styles.meta}>{formatSalary(job)}</Text>
                <Text style={styles.meta}>{titleCase(job.employment_type, 'Employment type not listed')}</Text>

                {requiredSkills.length ? (
                  <View style={styles.tagRow}>
                    {requiredSkills.map((skill) => (
                      <Text key={skill} style={styles.tag}>{skill}</Text>
                    ))}
                  </View>
                ) : null}

                {missing.length ? (
                  <Text style={styles.missingText}>Missing: {missing.map((gap) => gap.skill).join(', ')}</Text>
                ) : null}
              </TouchableOpacity>
            </Card>
          )
        })}
      </ScrollView>
    </View>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.filterBtn, active && styles.filterBtnActive]} onPress={onPress}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  kicker: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.medium, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  title: { color: colors.textPrimary, fontSize: typography.heading, fontFamily: typography.family.medium, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  search: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.subtle, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.textPrimary, fontSize: typography.body },
  searchRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  searchInput: { flex: 1, marginBottom: 0 },
  aiSearchBtn: { backgroundColor: colors.accent, borderRadius: radii.md, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  aiSearchBtnText: { color: colors.white, fontSize: typography.small, fontFamily: typography.family.bold },
  aiNotice: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18, marginBottom: spacing.md },
  aiAppliedFilter: { color: colors.info, fontSize: typography.small, fontWeight: typography.semibold, marginBottom: spacing.md },
  filterLabel: { color: colors.muted, fontSize: typography.small, fontFamily: typography.family.bold, marginTop: spacing.sm, marginBottom: spacing.xs },
  chipRow: { gap: spacing.sm, paddingBottom: spacing.sm },
  filterBtn: { borderWidth: 1, borderColor: colors.subtle, backgroundColor: colors.surface, borderRadius: radii.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  filterBtnActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  filterText: { color: colors.muted, fontSize: typography.small, fontFamily: typography.family.bold },
  filterTextActive: { color: colors.white },
  loadingCard: { marginTop: spacing.md, marginBottom: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.semibold, marginTop: spacing.xs },
  alertBox: { marginBottom: spacing.lg },
  emptyCard: { alignItems: 'center' },
  emptyTitle: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold, marginBottom: spacing.xs },
  emptySub: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20, textAlign: 'center' },
  jobCardTouch: { marginBottom: spacing.md },
  jobHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  jobTitleWrap: { flex: 1 },
  jobTitle: { color: colors.textPrimary, fontSize: typography.title, lineHeight: 22, fontFamily: typography.family.bold },
  company: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.medium, marginTop: spacing.xs },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  meta: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 18, marginTop: spacing.xs },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  tag: { backgroundColor: colors.infoBackground, color: colors.info, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontSize: typography.small, fontFamily: typography.family.medium },
  missingText: { marginTop: spacing.sm, color: colors.error, fontSize: typography.small, fontFamily: typography.family.medium },
})
