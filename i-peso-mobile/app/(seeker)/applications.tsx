import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import type { SeekerApplication, SeekerProfile } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { arrayFrom, formatDate, formatSalary, jobCompany, jobLocation, seekerName, textFrom, titleCase } from '@/utils/seekerView'

const SAVED_JOBS_KEY = 'ipeso_mobile_saved_jobs'

export default function ApplicationsScreen() {
  const [profile, setProfile] = useState<SeekerProfile | null>(null)
  const [applications, setApplications] = useState<SeekerApplication[]>([])
  const [savedCount, setSavedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')

    try {
      const [profileData, applicationsData, rawSaved] = await Promise.all([
        seekerService.getProfile(),
        seekerService.getApplications(),
        AsyncStorage.getItem(SAVED_JOBS_KEY),
      ])

      setProfile(profileData)
      setApplications(applicationsData.applications ?? [])
      setSavedCount(arrayFrom(rawSaved ? JSON.parse(rawSaved) : []).length)
    } catch {
      setError('Unable to load application activity. Check the backend connection.')
    }
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const activeApplications = useMemo(
    () => applications.filter((application) => !['hired', 'rejected'].includes(application.status)).length,
    [applications]
  )
  const hiredApplications = applications.filter((application) => application.status === 'hired').length
  const strength = profile?.profile_strength?.percentage ?? 0

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>Application Activity</Text>
        <Text style={styles.title}>My Applications</Text>
        <Text style={styles.subtitle}>
          Track submitted jobs, employer updates, interviews, and placements from i-PESO.
        </Text>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#1d4ed8" />
            <Text style={styles.loadingText}>Loading activity...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{seekerName(profile)}</Text>
          <Text style={styles.summaryTitle}>
            {applications.length
              ? `${activeApplications} active of ${applications.length} submitted`
              : 'No applications submitted yet'}
          </Text>
          <Text style={styles.summaryText}>
            Employers can now move your application from pending review to interview, hired, or rejected.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Active" value={activeApplications} />
          <Stat label="Hired" value={hiredApplications} />
          <Stat label="Saved" value={savedCount} />
          <Stat label="Profile" value={strength} suffix="%" />
        </View>

        {!loading && !applications.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Start Applying</Text>
            <Text style={styles.bodyText}>
              Open Find Jobs, choose a matching vacancy, and tap Apply now. Your application will appear here and on the employer ATS board.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(seeker)/jobs')}>
              <Text style={styles.primaryBtnText}>Find jobs</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {applications.map((application) => (
          <ApplicationCard key={String(application.apply_id)} application={application} />
        ))}
      </ScrollView>
    </View>
  )
}

function ApplicationCard({ application }: { application: SeekerApplication }) {
  const job = application.job

  return (
    <View style={styles.applicationCard}>
      <View style={styles.applicationHeader}>
        <View style={styles.applicationTitleWrap}>
          <Text style={styles.jobTitle}>{textFrom(job?.job_title, 'Untitled job')}</Text>
          <Text style={styles.company}>{job ? jobCompany(job) : 'Employer not listed'}</Text>
        </View>
        <View style={[styles.statusPill, statusStyle(application.status)]}>
          <Text style={[styles.statusText, statusTextStyle(application.status)]}>{application.status_label ?? titleCase(application.status)}</Text>
        </View>
      </View>

      {job ? (
        <>
          <Text style={styles.meta}>{jobLocation(job)}</Text>
          <Text style={styles.meta}>{formatSalary(job)}</Text>
        </>
      ) : null}

      <View style={styles.detailGrid}>
        <Detail label="Applied" value={formatDate(application.applied_at)} />
        <Detail label="Match" value={`${Math.round(Number(application.match_percentage ?? 0))}%`} />
      </View>

      {application.interview ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Interview Schedule</Text>
          <Text style={styles.infoText}>{titleCase(application.interview.mode_of_interview, 'Interview')}</Text>
          <Text style={styles.infoText}>{formatDate(application.interview.schedule)}</Text>
          <Text style={styles.infoText}>{textFrom(application.interview.venue_or_link, 'Venue or link to follow')}</Text>
          {application.interview.instructions ? <Text style={styles.infoText}>{application.interview.instructions}</Text> : null}
        </View>
      ) : null}

      {application.placement ? (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Placement Captured</Text>
          <Text style={styles.successText}>Start date: {formatDate(application.placement.start_date)}</Text>
          <Text style={styles.successText}>Salary: PHP {Number(application.placement.salary ?? 0).toLocaleString()}</Text>
        </View>
      ) : null}

      {application.employer_remarks ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Employer Remarks</Text>
          <Text style={styles.noteText}>{application.employer_remarks}</Text>
        </View>
      ) : null}
    </View>
  )
}

function Stat({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}{suffix}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

function statusStyle(status: string) {
  if (status === 'hired') return styles.statusSuccess
  if (status === 'rejected') return styles.statusDanger
  if (status === 'interview' || status === 'shortlisted') return styles.statusWarning
  return styles.statusNeutral
}

function statusTextStyle(status: string) {
  if (status === 'hired') return styles.statusTextSuccess
  if (status === 'rejected') return styles.statusTextDanger
  if (status === 'interview' || status === 'shortlisted') return styles.statusTextWarning
  return styles.statusTextNeutral
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 34 },
  kicker: { color: '#1d4ed8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  title: { color: '#0f172a', fontSize: 27, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#64748b', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  loadingCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 18, alignItems: 'center', gap: 8, marginBottom: 14 },
  loadingText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  errorCard: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 14, padding: 14, marginBottom: 14 },
  errorText: { color: '#991b1b', fontSize: 13, lineHeight: 18 },
  summaryCard: { backgroundColor: '#1d4ed8', borderRadius: 18, padding: 18, marginBottom: 14 },
  summaryLabel: { color: '#bfdbfe', fontSize: 12, fontWeight: '800', marginBottom: 8 },
  summaryTitle: { color: '#ffffff', fontSize: 22, lineHeight: 29, fontWeight: '800', marginBottom: 8 },
  summaryText: { color: '#dbeafe', fontSize: 13, lineHeight: 19 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, alignItems: 'center' },
  statValue: { color: '#0f172a', fontSize: 19, fontWeight: '800' },
  statLabel: { color: '#64748b', fontSize: 10, fontWeight: '800', marginTop: 3 },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, marginBottom: 14 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  bodyText: { color: '#475569', fontSize: 13, lineHeight: 20, marginBottom: 14 },
  primaryBtn: { backgroundColor: '#1d4ed8', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  applicationCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, marginBottom: 12 },
  applicationHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  applicationTitleWrap: { flex: 1 },
  jobTitle: { color: '#0f172a', fontSize: 16, lineHeight: 22, fontWeight: '800' },
  company: { color: '#475569', fontSize: 12, fontWeight: '700', marginTop: 4 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1 },
  statusNeutral: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  statusWarning: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  statusSuccess: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  statusDanger: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusTextNeutral: { color: '#475569' },
  statusTextWarning: { color: '#92400e' },
  statusTextSuccess: { color: '#166534' },
  statusTextDanger: { color: '#991b1b' },
  meta: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 6 },
  detailGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  detailItem: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 },
  detailLabel: { color: '#64748b', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 3 },
  detailValue: { color: '#0f172a', fontSize: 12, fontWeight: '800' },
  infoBox: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 12, marginTop: 12 },
  infoTitle: { color: '#1d4ed8', fontSize: 13, fontWeight: '800', marginBottom: 5 },
  infoText: { color: '#1e3a8a', fontSize: 12, lineHeight: 18 },
  successBox: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 12, padding: 12, marginTop: 12 },
  successTitle: { color: '#047857', fontSize: 13, fontWeight: '800', marginBottom: 5 },
  successText: { color: '#065f46', fontSize: 12, lineHeight: 18 },
  noteBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginTop: 12 },
  noteTitle: { color: '#0f172a', fontSize: 13, fontWeight: '800', marginBottom: 5 },
  noteText: { color: '#475569', fontSize: 12, lineHeight: 18 },
})
