import { useCallback, useEffect, useState } from 'react'
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
import type { ProfileStrengthItem, SeekerProfile } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import {
  addressLine,
  allSkills,
  arrayFrom,
  recordText,
  seekerName,
  textFrom,
  titleCase,
} from '@/utils/seekerView'

export default function ProfileScreen() {
  const [profile, setProfile] = useState<SeekerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadProfile = useCallback(async () => {
    setError('')
    try {
      const data = await seekerService.getProfile()
      setProfile(data)
    } catch {
      setError('Unable to load your profile. Check the backend connection.')
    }
  }, [])

  useEffect(() => {
    loadProfile().finally(() => setLoading(false))
  }, [loadProfile])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadProfile()
    setRefreshing(false)
  }, [loadProfile])

  const strength = profile?.profile_strength?.percentage ?? 0
  const checklist = arrayFrom<ProfileStrengthItem>(profile?.profile_strength?.items)
  const skills = allSkills(profile)
  const educations = arrayFrom<Record<string, unknown>>(profile?.educations)
  const workExperiences = arrayFrom<Record<string, unknown>>(profile?.work_experiences)
  const trainings = arrayFrom<Record<string, unknown>>(profile?.trainings)
  const certificates = arrayFrom<Record<string, unknown>>(profile?.certificates)

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>My NSRP Profile</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          This is the mobile view of your job seeker profile used for matching and PESO assistance.
        </Text>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#1d4ed8" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{seekerName(profile).charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileHeaderText}>
            <Text style={styles.name}>{seekerName(profile)}</Text>
            <Text style={styles.muted}>{textFrom(profile?.email, 'Email not listed')}</Text>
            <Text style={styles.muted}>{addressLine(profile)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Profile Strength</Text>
            <Text style={styles.strength}>{strength}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, strength)}%` }]} />
          </View>
          {checklist.slice(0, 6).map((item) => (
            <View key={item.key ?? item.label} style={styles.checkRow}>
              <View style={[styles.checkDot, item.complete && styles.checkDotDone]} />
              <Text style={[styles.checkText, item.complete && styles.checkTextDone]}>{item.label}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/onboarding')}>
            <Text style={styles.primaryBtnText}>Update onboarding details</Text>
          </TouchableOpacity>
        </View>

        <Section title="Personal and Work Preferences">
          <Info label="Mobile" value={textFrom(profile?.mobile_number)} />
          <Info label="Education" value={textFrom(profile?.educ_attainment)} />
          <Info label="Employment Status" value={titleCase(profile?.employment_status)} />
          <Info label="Preferred Work" value={titleCase(profile?.work_type_preference)} />
          <Info label="Preferred Location" value={titleCase(profile?.preferred_work_location)} />
        </Section>

        <Section title="Skills">
          {skills.length ? (
            <View style={styles.tagRow}>
              {skills.slice(0, 24).map((skill) => <Text key={skill} style={styles.tag}>{skill}</Text>)}
            </View>
          ) : (
            <EmptyLine text="No skills listed yet. Add technical and soft skills in onboarding." />
          )}
        </Section>

        <Section title="Education">
          {educations.length ? educations.map((education, index) => (
            <MiniCard key={`${recordText(education, ['institution_name'], 'education')}-${index}`}>
              <Text style={styles.itemTitle}>{recordText(education, ['institution_name'], 'School not listed')}</Text>
              <Text style={styles.itemMeta}>{titleCase(recordText(education, ['level'], 'Level not listed'))}</Text>
              <Text style={styles.itemMeta}>{recordText(education, ['course_strand'], 'Course or strand not listed')}</Text>
              <Text style={styles.itemMeta}>
                {textFrom(education.year_started, '')}
                {education.year_graduated ? ` - ${textFrom(education.year_graduated, '')}` : ''}
              </Text>
            </MiniCard>
          )) : (
            <EmptyLine text="No education records listed yet." />
          )}
        </Section>

        <Section title="Work Experience">
          {workExperiences.length ? workExperiences.map((work, index) => (
            <MiniCard key={`${recordText(work, ['company_name'], 'work')}-${index}`}>
              <Text style={styles.itemTitle}>{recordText(work, ['position', 'job_title'], 'Position not listed')}</Text>
              <Text style={styles.itemMeta}>{recordText(work, ['company_name'], 'Company not listed')}</Text>
              <Text style={styles.itemMeta}>{recordText(work, ['number_of_months'], 'Duration not listed')} months</Text>
            </MiniCard>
          )) : (
            <EmptyLine text="No work experience listed yet." />
          )}
        </Section>

        <Section title="Training and Certificates">
          {trainings.length || certificates.length ? (
            <>
              {trainings.slice(0, 4).map((training, index) => (
                <MiniCard key={`${recordText(training, ['course', 'name'], 'training')}-${index}`}>
                  <Text style={styles.itemTitle}>{recordText(training, ['course', 'name'], 'Training not listed')}</Text>
                  <Text style={styles.itemMeta}>{recordText(training, ['training_institution', 'institution'], 'Institution not listed')}</Text>
                </MiniCard>
              ))}
              {certificates.slice(0, 4).map((certificate, index) => (
                <MiniCard key={`${recordText(certificate, ['title'], 'certificate')}-${index}`}>
                  <Text style={styles.itemTitle}>{recordText(certificate, ['title'], 'Certificate not listed')}</Text>
                  <Text style={styles.itemMeta}>{recordText(certificate, ['issuing_body'], 'Issuer not listed')}</Text>
                </MiniCard>
              ))}
            </>
          ) : (
            <EmptyLine text="No trainings or certificates listed yet." />
          )}
        </Section>

        <Section title="Documents">
          <Info label="Resume" value={profile?.has_resume ? 'Uploaded' : 'Not uploaded'} />
          <Info label="Profile Photo" value={profile?.has_profile_image ? 'Uploaded' : 'Not uploaded'} />
        </Section>
      </ScrollView>
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

function MiniCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.miniCard}>{children}</View>
}

function EmptyLine({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>
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
  profileHeader: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18, padding: 16, flexDirection: 'row', gap: 14, marginBottom: 14 },
  profileHeaderText: { flex: 1 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  name: { color: '#0f172a', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  muted: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, marginBottom: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  strength: { color: '#1d4ed8', fontSize: 22, fontWeight: '800' },
  progressTrack: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', backgroundColor: '#1d4ed8' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  checkDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#cbd5e1' },
  checkDotDone: { backgroundColor: '#16a34a' },
  checkText: { color: '#64748b', fontSize: 12, flex: 1 },
  checkTextDone: { color: '#0f172a', fontWeight: '700' },
  primaryBtn: { backgroundColor: '#1d4ed8', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  infoRow: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10, marginBottom: 10 },
  infoLabel: { color: '#64748b', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  infoValue: { color: '#0f172a', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: { backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11, fontWeight: '700' },
  miniCard: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginBottom: 9 },
  itemTitle: { color: '#0f172a', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  itemMeta: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  emptyText: { color: '#64748b', fontSize: 13, lineHeight: 19 },
})
