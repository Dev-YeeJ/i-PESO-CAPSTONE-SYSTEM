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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
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
          placeholderTextColor="#94a3b8"
        />

        <View style={styles.filters}>
          <FilterButton label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterButton label="Nearby" active={filter === 'nearby'} onPress={() => setFilter('nearby')} />
          <FilterButton label={`Saved (${savedIds.length})`} active={filter === 'saved'} onPress={() => setFilter('saved')} />
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#1d4ed8" />
            <Text style={styles.loadingText}>Loading nearby jobs...</Text>
          </View>
        ) : null}

        {message ? (
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>{message}</Text>
          </View>
        ) : null}

        {!loading && !filteredJobs.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{filter === 'saved' ? 'No saved jobs yet' : 'No jobs found'}</Text>
            <Text style={styles.emptySub}>
              {filter === 'saved'
                ? 'Save jobs from the All tab so you can revisit them later.'
                : 'Try another search term, refresh, or update your address in onboarding.'}
            </Text>
          </View>
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
            <TouchableOpacity
              key={jobId}
              style={styles.jobCard}
              activeOpacity={0.9}
              onPress={() => setExpandedId(expanded ? null : jobId)}
            >
              <View style={styles.jobHeader}>
                <View style={styles.jobTitleWrap}>
                  <Text style={styles.jobTitle} numberOfLines={2}>{textFrom(job.job_title, 'Untitled job')}</Text>
                  <Text style={styles.company}>{jobCompany(job)}</Text>
                </View>
                <View style={styles.matchPill}>
                  <Text style={styles.matchText}>{job.match?.percentage ?? 0}%</Text>
                </View>
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
                    <TouchableOpacity style={styles.saveBtn} onPress={() => toggleSaved(jobId)}>
                      <Text style={styles.saveBtnText}>{saved ? 'Remove saved' : 'Save job'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.applyBtn, applied && styles.applyBtnDone]}
                      onPress={() => applyToJob(job)}
                      disabled={applied || applying}
                    >
                      <Text style={[styles.applyBtnText, applied && styles.applyBtnTextDone]}>
                        {applied ? `Applied: ${titleCase(job.application_status, 'Pending')}` : applying ? 'Submitting...' : 'Apply now'}
                      </Text>
                    </TouchableOpacity>
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
  flex: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 34 },
  kicker: { color: '#1d4ed8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  title: { color: '#0f172a', fontSize: 27, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#64748b', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  search: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: '#0f172a', fontSize: 14, marginBottom: 12 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: 999, paddingVertical: 10, alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  filterText: { color: '#475569', fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#ffffff' },
  loadingCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 18, alignItems: 'center', gap: 8, marginBottom: 14 },
  loadingText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  noteCard: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 14, padding: 14, marginBottom: 14 },
  noteText: { color: '#92400e', fontSize: 12, lineHeight: 18 },
  emptyCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyTitle: { color: '#0f172a', fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptySub: { color: '#64748b', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  jobCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, marginBottom: 12 },
  jobHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  jobTitleWrap: { flex: 1 },
  jobTitle: { color: '#0f172a', fontSize: 16, lineHeight: 22, fontWeight: '800' },
  company: { color: '#475569', fontSize: 12, fontWeight: '700', marginTop: 4 },
  matchPill: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  matchText: { color: '#166534', fontSize: 11, fontWeight: '800' },
  meta: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 11, fontWeight: '700' },
  tagMuted: { backgroundColor: '#f1f5f9', color: '#475569', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 11, fontWeight: '700' },
  tapHint: { color: '#1d4ed8', fontSize: 12, fontWeight: '800', marginTop: 12 },
  details: { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 14, paddingTop: 14 },
  detailRow: { marginBottom: 9 },
  detailLabel: { color: '#0f172a', fontSize: 12, fontWeight: '800', marginBottom: 3 },
  detailValue: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  description: { color: '#475569', fontSize: 12, lineHeight: 19 },
  actions: { marginTop: 14, gap: 10 },
  saveBtn: { backgroundColor: '#1d4ed8', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  applyBtn: { backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  applyBtnDone: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac' },
  applyBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  applyBtnTextDone: { color: '#166534' },
  infoBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12 },
  infoText: { color: '#64748b', fontSize: 12, lineHeight: 18 },
})
