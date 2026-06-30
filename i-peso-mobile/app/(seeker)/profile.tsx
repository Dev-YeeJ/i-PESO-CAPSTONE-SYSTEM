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
  arrayFrom,
  recordText,
  seekerName,
  textFrom,
  titleCase,
} from '@/utils/seekerView'
import { AlertBox } from '@/components/ui/AlertBox'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressCard } from '@/components/ui/ProgressCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
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
  const hardSkills = [...(profile?.dole_skills ?? []), ...(profile?.technical_skills ?? [])]
  const softSkills = profile?.soft_skills ?? []
  
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
          Manage your personal information, skills, and experience to get better job matches.
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

        <Card padding="md" style={styles.profileHeaderCard}>
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

        {/* Profile Strength */}
        <ProgressCard 
          title="Profile Strength" 
          progress={strength}
          color={colors.info}
        />
        
        <Card padding="md" style={styles.checklistCard}>
          {checklist.slice(0, 5).map((item) => (
            <View key={item.key ?? item.label} style={styles.checkRow}>
              <View style={[styles.checkDot, item.complete && styles.checkDotDone]} />
              <Text style={[styles.checkText, item.complete && styles.checkTextDone]}>{item.label}</Text>
            </View>
          ))}
          <Button variant="outline" fullWidth onPress={() => router.push('/onboarding')} style={styles.updateBtn}>
            Update missing details
          </Button>
        </Card>

        {/* Personal & Preferences */}
        <SectionHeader title="Personal and Work Preferences" />
        <Card padding="md">
          <Info label="Mobile" value={textFrom(profile?.mobile_number)} />
          <Info label="Education" value={textFrom(profile?.educ_attainment)} />
          <Info label="Employment Status" value={titleCase(profile?.employment_status)} />
          <Info label="Preferred Work" value={titleCase(profile?.work_type_preference)} />
          <Info label="Preferred Location" value={titleCase(profile?.preferred_work_location)} />
        </Card>

        {/* Skills */}
        <SectionHeader title="Skills" />
        <Card padding="md">
          <Text style={styles.skillGroupTitle}>Technical & Hard Skills</Text>
          {hardSkills.length ? (
            <View style={styles.tagRow}>
              {hardSkills.slice(0, 24).map((skill) => (
                <Badge key={skill} variant="info" style={styles.skillBadge}>{skill}</Badge>
              ))}
            </View>
          ) : (
            <EmptyLine text="No technical skills listed." />
          )}

          <Text style={[styles.skillGroupTitle, { marginTop: spacing.lg }]}>Soft Skills</Text>
          {softSkills.length ? (
            <View style={styles.tagRow}>
              {softSkills.slice(0, 24).map((skill) => (
                <Badge key={skill} variant="success" style={styles.skillBadge}>{skill}</Badge>
              ))}
            </View>
          ) : (
            <EmptyLine text="No soft skills listed." />
          )}
        </Card>

        {/* Education */}
        <SectionHeader title="Education" />
        <View style={styles.cardList}>
          {educations.length ? (
            educations.map((education, index) => (
              <Card key={`${recordText(education, ['institution_name'], 'education')}-${index}`} padding="md">
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
            <Card padding="md"><EmptyLine text="No education records listed yet." /></Card>
          )}
        </View>

        {/* Work Experience */}
        <SectionHeader title="Work Experience" />
        <View style={styles.cardList}>
          {workExperiences.length ? (
            workExperiences.map((work, index) => (
              <Card key={`${recordText(work, ['company_name'], 'work')}-${index}`} padding="md">
                <Text style={styles.itemTitle}>{recordText(work, ['position', 'job_title'], 'Position not listed')}</Text>
                <Text style={styles.itemMeta}>{recordText(work, ['company_name'], 'Company not listed')}</Text>
                <Text style={styles.itemMeta}>{recordText(work, ['number_of_months'], 'Duration not listed')} months</Text>
              </Card>
            ))
          ) : (
            <Card padding="md"><EmptyLine text="No work experience listed yet." /></Card>
          )}
        </View>

        {/* Training & Certificates */}
        <SectionHeader title="Training and Certificates" />
        <View style={styles.cardList}>
          {trainings.length || certificates.length ? (
            <>
              {trainings.slice(0, 4).map((training, index) => (
                <Card key={`${recordText(training, ['course', 'name'], 'training')}-${index}`} padding="md">
                  <Text style={styles.itemTitle}>{recordText(training, ['course', 'name'], 'Training not listed')}</Text>
                  <Text style={styles.itemMeta}>{recordText(training, ['training_institution', 'institution'], 'Institution not listed')}</Text>
                </Card>
              ))}
              {certificates.slice(0, 4).map((certificate, index) => (
                <Card key={`${recordText(certificate, ['title'], 'certificate')}-${index}`} padding="md">
                  <Text style={styles.itemTitle}>{recordText(certificate, ['title'], 'Certificate not listed')}</Text>
                  <Text style={styles.itemMeta}>{recordText(certificate, ['issuing_body'], 'Issuer not listed')}</Text>
                </Card>
              ))}
            </>
          ) : (
            <Card padding="md"><EmptyLine text="No trainings or certificates listed yet." /></Card>
          )}
        </View>

        {/* Documents */}
        <SectionHeader title="Documents" />
        <Card padding="md">
          <Info label="Resume" value={profile?.has_resume ? 'Uploaded' : 'Not uploaded'} />
          <Info label="Profile Photo" value={profile?.has_profile_image ? 'Uploaded' : 'Not uploaded'} />
        </Card>

      </ScrollView>
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
  title: { color: colors.primary, fontSize: typography.display, fontWeight: typography.bold, marginBottom: spacing.xs },
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
  checklistCard: { marginTop: spacing.md, marginBottom: spacing.lg },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  checkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  checkDotDone: { backgroundColor: colors.success },
  checkText: { color: colors.secondaryText, fontSize: typography.body },
  checkTextDone: { color: colors.primary, fontWeight: typography.medium },
  updateBtn: { marginTop: spacing.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { color: colors.secondaryText, fontSize: typography.body },
  infoValue: { color: colors.primary, fontSize: typography.body, fontWeight: typography.medium, textAlign: 'right', flex: 1, marginLeft: spacing.md },
  skillGroupTitle: { color: colors.primary, fontSize: typography.title, fontWeight: typography.bold, marginBottom: spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skillBadge: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  emptyText: { color: colors.secondaryText, fontSize: typography.body, fontStyle: 'italic' },
  cardList: { gap: spacing.md },
  itemTitle: { color: colors.primary, fontSize: typography.title, fontWeight: typography.bold, marginBottom: spacing.xs },
  itemMeta: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20 },
})
