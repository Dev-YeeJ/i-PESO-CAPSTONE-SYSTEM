import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useMemo, useState } from 'react'
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

const SAVED_JOBS_KEY = 'ipeso_mobile_saved_jobs'
type Filter = 'all' | 'nearby' | 'saved'

export default function JobsScreen() {
  const [jobs, setJobs] = useState<NearbyJob[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [applyingIds, setApplyingIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')

  const loadSaved = useCallback(async () => {
    const raw = await AsyncStorage.getItem(SAVED_JOBS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    setSavedIds(Array.isArray(parsed) ? parsed.map(String) : [])
  }, [])

  const loadJobs = useCallback(async () => {
    setMessage('')
    try {
      const data = await seekerService.getNearbyJobs({ radiusKm: 20, limit: 30 })
      setJobs(data.jobs ?? [])
    } catch (caught: unknown) {
      const body = (caught as { response?: { data?: { message?: string } } }).response?.data
      setJobs([])
      setMessage(body?.message || 'Unable to load nearby jobs. Check the backend connection and your saved address.')
    }
  }, [])

  useEffect(() => {
    Promise.all([loadJobs(), loadSaved()]).finally(() => setLoading(false))
  }, [loadJobs, loadSaved])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadJobs(), loadSaved()])
    setRefreshing(false)
  }, [loadJobs, loadSaved])

  const toggleSaved = async (jobId: string) => {
    const next = savedIds.includes(jobId)
      ? savedIds.filter((id) => id !== jobId)
      : [...savedIds, jobId]

    setSavedIds(next)
    await AsyncStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(next))
  }

  const applyToJob = async (job: NearbyJob) => {
    const jobId = String(job.post_id)
    if (job.has_applied || applyingIds.includes(jobId)) return

    setApplyingIds((current) => [...current, jobId])
    try {
      const data = await seekerService.applyToJob(job.post_id)
      setJobs((current) => current.map((item) => (
        String(item.post_id) === jobId
          ? {
              ...item,
              has_applied: true,
              application_id: data.application?.apply_id ?? item.application_id,
              application_status: data.application?.status ?? 'pending',
            }
          : item
      )))
      Alert.alert('Application submitted', 'Your application is now visible to the employer and PESO admin.')
    } catch (caught: unknown) {
      const body = (caught as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data
      const firstError = body?.errors ? Object.values(body.errors)[0]?.[0] : ''
      Alert.alert('Application failed', firstError || body?.message || 'Unable to submit your application. Check your backend connection.')
    } finally {
      setApplyingIds((current) => current.filter((id) => id !== jobId))
    }
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

        {message ? (
          <AlertBox variant="warning" style={styles.alertBox}>
            {message}
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
          const expanded = expandedId === jobId
          const saved = savedIds.includes(jobId)
          const applied = Boolean(job.has_applied)
          const applying = applyingIds.includes(jobId)
          const requiredSkills = listFrom(job.required_skills).slice(0, 5)
          const softSkills = listFrom(job.soft_skills).slice(0, 4)

          return (
            <Card key={jobId} style={styles.jobCardTouch} padding="md">
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setExpandedId(expanded ? null : jobId)}
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

                {expanded ? (
                  <View style={styles.details}>
                    <Detail label="Deadline" value={formatDate(job.application_deadline)} />
                    <Detail label="Vacancies" value={textFrom(job.vacancies_count, 'Not listed')} />
                    <Detail label="Education" value={titleCase(job.minimum_education, 'Not listed')} />
                    <Detail label="Experience" value={titleCase(job.experience_level, 'Not listed')} />

                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.description}>{textFrom(job.job_description, 'No description provided.')}</Text>

                    {requiredSkills.length ? (
                      <>
                        <Text style={styles.detailLabel}>Required Skills</Text>
                        <View style={styles.tagRow}>
                          {requiredSkills.map((skill) => <Text key={skill} style={styles.tag}>{skill}</Text>)}
                        </View>
                      </>
                    ) : null}

                    {softSkills.length ? (
                      <>
                        <Text style={styles.detailLabel}>Soft Skills</Text>
                        <View style={styles.tagRow}>
                          {softSkills.map((skill) => <Text key={skill} style={styles.tagMuted}>{skill}</Text>)}
                        </View>
                      </>
                    ) : null}

                    <View style={styles.actions}>
                      <Button
                        variant="outline"
                        fullWidth
                        onPress={() => toggleSaved(jobId)}
                        style={styles.saveBtn}
                      >
                        {saved ? 'Remove saved' : 'Save job'}
                      </Button>
                      <Button
                        variant={applied ? 'secondary' : 'success'}
                        fullWidth
                        onPress={() => applyToJob(job)}
                        disabled={applied || applying}
                        style={styles.applyBtn}
                      >
                        {applied ? `Applied: ${titleCase(job.application_status, 'Pending')}` : applying ? 'Submitting...' : 'Apply now'}
                      </Button>
                      {applied ? (
                        <View style={styles.infoBox}>
                          <Text style={styles.infoText}>
                            Track employer updates in My Applications.
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.tapHint}>Tap for details</Text>
                )}
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
