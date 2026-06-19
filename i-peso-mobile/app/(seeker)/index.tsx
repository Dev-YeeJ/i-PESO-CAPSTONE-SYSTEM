import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import type { NearbyJob, SeekerProfile } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'
import {
  firstName,
  formatSalary,
  jobCompany,
  jobLocation,
  seekerName,
  textFrom,
  titleCase,
} from '@/utils/seekerView'

export default function SeekerHomeScreen() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const [profile, setProfile] = useState<SeekerProfile | null>(null)
  const [jobs, setJobs] = useState<NearbyJob[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [jobsMessage, setJobsMessage] = useState('')

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const loadDashboard = useCallback(async () => {
    setError('')
    setJobsMessage('')

    const [profileResult, jobsResult] = await Promise.allSettled([
      seekerService.getProfile(),
      seekerService.getNearbyJobs({ radiusKm: 20, limit: 8 }),
    ])

    if (profileResult.status === 'fulfilled') {
      setProfile(profileResult.value)
    } else {
      setError('Unable to load your profile. Check the backend connection.')
    }

    if (jobsResult.status === 'fulfilled') {
      setJobs(jobsResult.value.jobs ?? [])
    } else {
      setJobs([])
      setJobsMessage('Nearby jobs need your saved address location. Update onboarding if jobs do not load.')
    }
  }, [])

  useEffect(() => {
    loadDashboard().finally(() => setLoading(false))
  }, [loadDashboard])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadDashboard()
    setRefreshing(false)
  }, [loadDashboard])

  const handleLogout = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  const activeProfile = profile ?? user
  const strength = profile?.profile_strength?.percentage ?? 0
  const stats = profile?.dashboard_stats
  const topJobs = jobs.slice(0, 3)

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{firstName(activeProfile).charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.greetingText}>{greeting}</Text>
              <Text style={styles.nameText} numberOfLines={1}>{firstName(activeProfile)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#1d4ed8" />
            <Text style={styles.loadingText}>Loading your job seeker dashboard...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.hero}>
          <Text style={styles.heroKicker}>i-PESO Job Seeker</Text>
          <Text style={styles.heroTitle}>Find work that matches your profile.</Text>
          <Text style={styles.heroSub}>
            Keep your NSRP profile updated so PESO can match you with nearby opportunities.
          </Text>
          <TouchableOpacity style={styles.heroBtn} onPress={() => router.push('/(seeker)/jobs')}>
            <Text style={styles.heroBtnText}>Browse jobs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Applications" value={stats?.active_applications ?? 0} />
          <Stat label="Skills" value={stats?.skills ?? 0} />
          <Stat label="Matches" value={jobs.length} />
        </View>

        <View style={styles.profileCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.sectionTitle}>Profile Strength</Text>
              <Text style={styles.muted}>{seekerName(profile, textFrom(user?.name, 'Job Seeker'))}</Text>
            </View>
            <Text style={styles.strengthText}>{strength}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, strength)}%` }]} />
          </View>
          <Text style={styles.profileHint}>
            {strength >= 80
              ? 'Your profile is strong. Keep it current when your skills change.'
              : 'Add skills, education, work experience, and documents to improve matches.'}
          </Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(seeker)/profile')}>
            <Text style={styles.secondaryBtnText}>Review profile</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction label="Find Jobs" description="Nearby and matching jobs" onPress={() => router.push('/(seeker)/jobs')} />
          <QuickAction label="Applications" description="Track PESO activity" onPress={() => router.push('/(seeker)/applications')} />
          <QuickAction label="Onboarding" description="Update NSRP answers" onPress={() => router.push('/onboarding')} />
          <QuickAction label="Profile" description="Skills and documents" onPress={() => router.push('/(seeker)/profile')} />
        </View>

        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Nearby Matches</Text>
          <TouchableOpacity onPress={() => router.push('/(seeker)/jobs')}>
            <Text style={styles.linkText}>View all</Text>
          </TouchableOpacity>
        </View>

        {jobsMessage ? <Text style={styles.inlineNote}>{jobsMessage}</Text> : null}

        {topJobs.length ? topJobs.map((job) => (
          <TouchableOpacity
            key={String(job.post_id)}
            style={styles.jobCard}
            activeOpacity={0.86}
            onPress={() => router.push('/(seeker)/jobs')}
          >
            <View style={styles.cardHeader}>
              <View style={styles.jobTitleWrap}>
                <Text style={styles.jobTitle} numberOfLines={2}>{textFrom(job.job_title, 'Untitled job')}</Text>
                <Text style={styles.jobCompany}>{jobCompany(job)}</Text>
              </View>
              <View style={styles.matchPill}>
                <Text style={styles.matchText}>{job.match?.percentage ?? 0}%</Text>
              </View>
            </View>
            <Text style={styles.jobMeta}>{jobLocation(job)}</Text>
            <Text style={styles.jobMeta}>{formatSalary(job)}</Text>
            <Text style={styles.jobMeta}>{titleCase(job.employment_type, 'Employment type not listed')}</Text>
          </TouchableOpacity>
        )) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No nearby jobs yet</Text>
            <Text style={styles.emptySub}>
              Jobs will appear here when employers post active vacancies near your saved address.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function QuickAction({
  label,
  description,
  onPress,
}: {
  label: string
  description: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerText: { flex: 1 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1d4ed8', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  greetingText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  nameText: { fontSize: 17, color: '#0f172a', fontWeight: '800' },
  logoutBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  logoutText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  loadingCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 16, alignItems: 'center', gap: 8, marginBottom: 14 },
  loadingText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  errorCard: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 14, padding: 14, marginBottom: 14 },
  errorText: { color: '#991b1b', fontSize: 13, lineHeight: 18 },
  hero: { backgroundColor: '#1d4ed8', borderRadius: 18, padding: 20, marginBottom: 18 },
  heroKicker: { color: '#bfdbfe', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  heroTitle: { color: '#ffffff', fontSize: 24, lineHeight: 31, fontWeight: '800', marginBottom: 8 },
  heroSub: { color: '#dbeafe', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  heroBtn: { backgroundColor: '#ffffff', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, alignSelf: 'flex-start' },
  heroBtnText: { color: '#1d4ed8', fontSize: 13, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, alignItems: 'center' },
  statValue: { color: '#0f172a', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  profileCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  muted: { color: '#64748b', fontSize: 12, lineHeight: 17 },
  strengthText: { color: '#1d4ed8', fontSize: 22, fontWeight: '800' },
  progressTrack: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginTop: 10, marginBottom: 10 },
  progressFill: { height: '100%', backgroundColor: '#1d4ed8', borderRadius: 4 },
  profileHint: { color: '#475569', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  secondaryBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  secondaryBtnText: { color: '#1d4ed8', fontSize: 13, fontWeight: '800' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  actionCard: { width: '48%', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14 },
  actionLabel: { color: '#0f172a', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  actionDescription: { color: '#64748b', fontSize: 11, lineHeight: 16 },
  linkText: { color: '#1d4ed8', fontSize: 12, fontWeight: '800', marginTop: 2 },
  inlineNote: { color: '#92400e', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 17, marginBottom: 12 },
  jobCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, marginBottom: 12 },
  jobTitleWrap: { flex: 1 },
  jobTitle: { color: '#0f172a', fontSize: 15, fontWeight: '800', lineHeight: 21 },
  jobCompany: { color: '#475569', fontSize: 12, fontWeight: '700', marginTop: 3 },
  matchPill: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  matchText: { color: '#166534', fontSize: 11, fontWeight: '800' },
  jobMeta: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 6 },
  emptyCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 20, alignItems: 'center' },
  emptyTitle: { color: '#0f172a', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  emptySub: { color: '#64748b', fontSize: 12, lineHeight: 18, textAlign: 'center' },
})
