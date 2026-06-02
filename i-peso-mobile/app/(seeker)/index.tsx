import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
  StatusBar,
} from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'

interface AuthState {
  user: { name?: string; email?: string } | null
  logout: () => Promise<void>
}

const QUICK_ACTIONS = [
  { icon: '🔍', label: 'Find Jobs',      route: '/(seeker)/jobs',         color: '#eff6ff', border: '#bfdbfe' },
  { icon: '📋', label: 'Applications',   route: '/(seeker)/applications',  color: '#f0fdf4', border: '#bbf7d0' },
  { icon: '👤', label: 'My Profile',     route: '/(seeker)/profile',       color: '#faf5ff', border: '#e9d5ff' },
  { icon: '🏛️', label: 'Gov Programs',   route: '/(seeker)/jobs',          color: '#fff7ed', border: '#fed7aa' },
]

const STATS = [
  { label: 'Applied',    value: '0', icon: '📤', bg: '#eff6ff', text: '#1d4ed8' },
  { label: 'Interviews', value: '0', icon: '📅', bg: '#f0fdf4', text: '#15803d' },
  { label: 'Matches',    value: '0', icon: '✨', bg: '#faf5ff', text: '#7c3aed' },
]

export default function SeekerHomeScreen() {
  const user   = useAuthStore((s: AuthState) => s.user)
  const logout = useAuthStore((s: AuthState) => s.logout)

  const [refreshing, setRefreshing] = useState(false)
  const [greeting, setGreeting]     = useState('Good morning')

  const firstName = user?.name?.split(' ')[0] ?? 'Seeker'

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12)      setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else                setGreeting('Good evening')
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 1000))
    setRefreshing(false)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  return (
    <View style={s.flex}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />
        }
      >

        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarText}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={s.greetingText}>{greeting},</Text>
              <Text style={s.nameText}>{firstName} 👋</Text>
            </View>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Text style={s.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* ── HERO BANNER ── */}
        <View style={s.heroBanner}>
          <Text style={s.heroTitle}>Find your next{'\n'}opportunity</Text>
          <Text style={s.heroSub}>
            Powered by i-PESO — Urdaneta City PESO
          </Text>
          <TouchableOpacity
            style={s.heroBtn}
            onPress={() => router.push('/(seeker)/jobs')}
            activeOpacity={0.85}
          >
            <Text style={s.heroBtnText}>Browse Jobs →</Text>
          </TouchableOpacity>
          <View style={s.heroDots}>
            <View style={[s.dot, s.dotActive]} />
            <View style={s.dot} />
            <View style={s.dot} />
          </View>
        </View>

        {/* ── STATS ── */}
        <Text style={s.sectionTitle}>Your Activity</Text>
        <View style={s.statsRow}>
          {STATS.map((stat) => (
            <View
              key={stat.label}
              style={[s.statCard, { backgroundColor: stat.bg }]}
            >
              <Text style={s.statIcon}>{stat.icon}</Text>
              <Text style={[s.statValue, { color: stat.text }]}>
                {stat.value}
              </Text>
              <Text style={[s.statLabel, { color: stat.text }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── QUICK ACTIONS ── */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[s.actionCard, { backgroundColor: action.color, borderColor: action.border }]}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.8}
            >
              <Text style={s.actionIcon}>{action.icon}</Text>
              <Text style={s.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── PROFILE COMPLETION NUDGE ── */}
        <View style={s.nudgeCard}>
          <View style={s.nudgeLeft}>
            <Text style={s.nudgeTitle}>Complete your profile</Text>
            <Text style={s.nudgeSub}>
              Add skills and resume for better job matches
            </Text>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: '30%' }]} />
            </View>
            <Text style={s.progressLabel}>30% complete</Text>
          </View>
          <TouchableOpacity
            style={s.nudgeBtn}
            onPress={() => router.push('/(seeker)/profile')}
            activeOpacity={0.85}
          >
            <Text style={s.nudgeBtnText}>Update</Text>
          </TouchableOpacity>
        </View>

        {/* ── RECENT JOBS PLACEHOLDER ── */}
        <Text style={s.sectionTitle}>Recent Job Postings</Text>
        <View style={s.emptyCard}>
          <Text style={s.emptyIcon}>💼</Text>
          <Text style={s.emptyTitle}>No jobs yet</Text>
          <Text style={s.emptySub}>
            Job listings will appear here once employers post vacancies.
          </Text>
          <TouchableOpacity
            style={s.emptyBtn}
            onPress={() => router.push('/(seeker)/jobs')}
          >
            <Text style={s.emptyBtnText}>Search Jobs</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  flex           : { flex: 1, backgroundColor: '#f8fafc' },
  scroll         : { flex: 1 },
  content        : { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 32 },

  // Header
  header         : { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  headerLeft     : { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle   : { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1d4ed8', justifyContent: 'center', alignItems: 'center' },
  avatarText     : { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  greetingText   : { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  nameText       : { fontSize: 16, color: '#0f172a', fontWeight: '700' },
  logoutBtn      : { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  logoutText     : { color: '#ef4444', fontSize: 12, fontWeight: '600' },

  // Hero
  heroBanner     : { backgroundColor: '#1d4ed8', borderRadius: 20, padding: 22, marginBottom: 24 },
  heroTitle      : { color: '#ffffff', fontSize: 22, fontWeight: '700', lineHeight: 30, marginBottom: 6 },
  heroSub        : { color: '#93c5fd', fontSize: 12, marginBottom: 16, fontWeight: '500' },
  heroBtn        : { backgroundColor: '#ffffff', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 20, alignSelf: 'flex-start' },
  heroBtnText    : { color: '#1d4ed8', fontSize: 13, fontWeight: '700' },
  heroDots       : { flexDirection: 'row', gap: 5, marginTop: 16, justifyContent: 'flex-end' },
  dot            : { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6' },
  dotActive      : { backgroundColor: '#ffffff', width: 18 },

  // Stats
  sectionTitle   : { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  statsRow       : { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard       : { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statIcon       : { fontSize: 18, marginBottom: 4 },
  statValue      : { fontSize: 22, fontWeight: '700' },
  statLabel      : { fontSize: 10, fontWeight: '600', marginTop: 2 },

  // Quick Actions
  actionsGrid    : { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  actionCard     : { width: '47%', borderWidth: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  actionIcon     : { fontSize: 26, marginBottom: 8 },
  actionLabel    : { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },

  // Profile nudge
  nudgeCard      : { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  nudgeLeft      : { flex: 1 },
  nudgeTitle     : { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 3 },
  nudgeSub       : { fontSize: 12, color: '#64748b', lineHeight: 17, marginBottom: 10 },
  progressBar    : { height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, marginBottom: 4, overflow: 'hidden' },
  progressFill   : { height: '100%', backgroundColor: '#1d4ed8', borderRadius: 3 },
  progressLabel  : { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  nudgeBtn       : { backgroundColor: '#1d4ed8', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  nudgeBtnText   : { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  // Empty state
  emptyCard      : { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18, padding: 28, alignItems: 'center', marginBottom: 8 },
  emptyIcon      : { fontSize: 36, marginBottom: 12 },
  emptyTitle     : { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  emptySub       : { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  emptyBtn       : { backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 },
  emptyBtnText   : { color: '#1d4ed8', fontSize: 13, fontWeight: '600' },
})