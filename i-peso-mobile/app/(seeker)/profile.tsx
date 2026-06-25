import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
import { AlertBox } from '@/components/ui/AlertBox'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { colors, radii, spacing, typography } from '@/theme'

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.info} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>My NSRP Profile</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          This is the mobile view of your job seeker profile used for matching and PESO assistance.
        </Text>

        {loading ? (
          <Card style={[styles.statusCard, styles.statusMessageCard]} padding="md">
            <ActivityIndicator color={colors.info} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </Card>
        ) : null}

        {error ? (
          <AlertBox variant="danger" style={styles.alertBox}>
            {error}
          </AlertBox>
        ) : null}

        <Card style={styles.profileHeaderCard} padding="md">
          <View style={styles.profileHeaderInner}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{seekerName(profile).charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.profileHeaderText}>
              <Text style={styles.name}>{seekerName(profile)}</Text>
              <Text style={styles.muted}>{textFrom(profile?.email, 'Email not listed')}</Text>
              <Text style={styles.muted}>{addressLine(profile)}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card} padding="md">
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
          <Button variant="secondary" fullWidth onPress={() => router.push('/onboarding')} style={styles.primaryBtn} textStyle={styles.primaryBtnText}>
            Update onboarding details
          </Button>
        </Card>

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
              {skills.slice(0, 24).map((skill) => (
                <Text key={skill} style={styles.tag}>
                  {skill}
                </Text>
              ))}
            </View>
          ) : (
            <EmptyLine text="No skills listed yet. Add technical and soft skills in onboarding." />
          )}
        </Section>

        <Section title="Education">
          {educations.length ? (
            educations.map((education, index) => (
              <Card key={`${recordText(education, ['institution_name'], 'education')}-${index}`} padding="sm" style={styles.miniCard}>
                <Text style={styles.itemTitle}>{recordText(education, ['institution_name'], 'School not listed')}</Text>
                <Text style={styles.itemMeta}>{titleCase(recordText(education, ['level'], 'Level not listed'))}</Text>
                <Text style={styles.itemMeta}>{recordText(education, ['course_strand'], 'Course or strand not listed')}</Text>
                <Text style={styles.itemMeta}>
                  {textFrom(education.year_started, '')}
                  {education.year_graduated ? ` - ${textFrom(education.year_graduated, '')}` : ''}
                </Text>
              </Card>
            ))
          ) : (
            <EmptyLine text="No education records listed yet." />
          )}
        </Section>

        <Section title="Work Experience">
          {workExperiences.length ? (
            workExperiences.map((work, index) => (
              <Card key={`${recordText(work, ['company_name'], 'work')}-${index}`} padding="sm" style={styles.miniCard}>
                <Text style={styles.itemTitle}>{recordText(work, ['position', 'job_title'], 'Position not listed')}</Text>
                <Text style={styles.itemMeta}>{recordText(work, ['company_name'], 'Company not listed')}</Text>
                <Text style={styles.itemMeta}>{recordText(work, ['number_of_months'], 'Duration not listed')} months</Text>
              </Card>
            ))
          ) : (
            <EmptyLine text="No work experience listed yet." />
          )}
        </Section>

        <Section title="Training and Certificates">
          {trainings.length || certificates.length ? (
            <>
              {trainings.slice(0, 4).map((training, index) => (
                <Card key={`${recordText(training, ['course', 'name'], 'training')}-${index}`} padding="sm" style={styles.miniCard}>
                  <Text style={styles.itemTitle}>{recordText(training, ['course', 'name'], 'Training not listed')}</Text>
                  <Text style={styles.itemMeta}>{recordText(training, ['training_institution', 'institution'], 'Institution not listed')}</Text>
                </Card>
              ))}
              {certificates.slice(0, 4).map((certificate, index) => (
                <Card key={`${recordText(certificate, ['title'], 'certificate')}-${index}`} padding="sm" style={styles.miniCard}>
                  <Text style={styles.itemTitle}>{recordText(certificate, ['title'], 'Certificate not listed')}</Text>
                  <Text style={styles.itemMeta}>{recordText(certificate, ['issuing_body'], 'Issuer not listed')}</Text>
                </Card>
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

function EmptyLine({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.xxxl },
  kicker: { color: colors.info, fontSize: typography.small, fontWeight: typography.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  title: { color: colors.primary, fontSize: typography.heading, fontWeight: typography.bold, marginBottom: spacing.xs },
  subtitle: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  statusCard: { marginBottom: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  statusMessageCard: { borderColor: colors.border, backgroundColor: colors.surface },
  loadingText: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.semibold, marginTop: spacing.xs },
  alertBox: { marginBottom: spacing.lg },
  profileHeaderCard: { marginBottom: spacing.lg },
  profileHeaderInner: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  profileHeaderText: { flex: 1 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.info, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.surface, fontSize: typography.title, fontWeight: typography.bold },
  name: { color: colors.primary, fontSize: typography.title, fontWeight: typography.bold, marginBottom: spacing.xs },
  muted: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.primary, fontSize: typography.title, fontWeight: typography.bold, marginBottom: spacing.sm },
  strength: { color: colors.info, fontSize: typography.heading, fontWeight: typography.bold },
  progressTrack: { height: 8, backgroundColor: colors.border, borderRadius: radii.sm, overflow: 'hidden', marginBottom: spacing.md },
  progressFill: { height: '100%', backgroundColor: colors.info },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  checkDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.border },
  checkDotDone: { backgroundColor: colors.success },
  checkText: { color: colors.secondaryText, fontSize: typography.small, flex: 1 },
  checkTextDone: { color: colors.primary, fontWeight: typography.bold },
  primaryBtn: { marginTop: spacing.md },
  primaryBtnText: { color: colors.primary },
  infoRow: { borderBottomWidth: 1, borderBottomColor: colors.background, paddingBottom: spacing.sm, marginBottom: spacing.sm },
  infoLabel: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.semibold, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing.xs },
  infoValue: { color: colors.primary, fontSize: typography.body, lineHeight: 20, fontWeight: typography.medium },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { backgroundColor: colors.infoBackground, color: colors.info, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontSize: typography.small, fontWeight: typography.semibold },
  miniCard: { marginBottom: spacing.sm },
  itemTitle: { color: colors.primary, fontSize: typography.body, fontWeight: typography.bold, marginBottom: spacing.xs },
  itemMeta: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
  emptyText: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20 },
})
